import { getCurrentProvider, getToolParseMode } from './config.js';
import { createProvider } from './providers/registry.js';
import {
  formatForNativeProvider,
  buildXmlSystemInstruction,
  executeToolCall,
} from './tools/index.js';
import { parseXmlToolCalls } from './xml-parser.js';
import { log, logError } from './logger.js';
import { randomUUID } from 'node:crypto';
import type { Message, ChatCompletionResult, ChatStreamChunk } from './types.js';
import type { ToolCall, ToolExecutionContext } from './tools/types.js';

// ============================================================
// Constants
// ============================================================

/** Số vòng lặp tool tối đa để tránh loop vô hạn */
const MAX_TOOL_LOOP = 10;
/** Thư mục làm việc hiện tại — dùng cho tool read_file */
const WORKING_DIR = process.cwd();

// ============================================================
// Helpers
// ============================================================

function createToolContext(messages: Message[]): ToolExecutionContext {
  return { workingDirectory: WORKING_DIR, messages };
}

/** Tạo message thông báo kết quả tool */
function buildToolResultMessage(
  toolName: string,
  _args: Record<string, unknown>,
  content: string,
): Message {
  return {
    role: 'user',
    content: `[Kết quả tool "${toolName}"]\n${content}`,
    timestamp: new Date(),
  } as Message;
}

/**
 * Quyết định có nên dùng native tool calling hay không,
 * dựa trên toolParseMode và khả năng của provider.
 */
function shouldUseNative(provider: ReturnType<typeof createProvider>): boolean {
  const mode = getToolParseMode();
  if (mode === 'xml') return false;
  if (mode === 'native') return true;
  // 'auto': dùng native nếu provider hỗ trợ
  return provider.supportsNativeToolCalling();
}

/** Format tools cho provider hiện tại (native) hoặc trả về undefined */
function getNativeTools(
  provider: ReturnType<typeof createProvider>,
): Record<string, unknown>[] | undefined {
  if (!shouldUseNative(provider)) return undefined;
  const format = provider.getNativeToolFormat();
  try {
    const tools = formatForNativeProvider(format);
    return tools.length > 0 ? tools : undefined;
  } catch (err) {
    logError('Lỗi format native tools', err);
    return undefined;
  }
}

/** Chèn XML system instruction vào đầu messages nếu cần */
function injectXmlInstruction(messages: Message[]): Message[] {
  const instruction = buildXmlSystemInstruction();
  if (!instruction) return messages;

  const systemMsg: Message = {
    role: 'user',
    content: `[HƯỚNG DẪN]\n${instruction}`,
    timestamp: new Date(),
  } as Message;

  return [systemMsg, ...messages];
}

// ============================================================
// Core: tool loop cho non-streaming
// ============================================================

async function runToolLoopNonStreaming(
  provider: ReturnType<typeof createProvider>,
  initialMessages: Message[],
): Promise<ChatCompletionResult> {
  let messages = [...initialMessages];
  const useNative = shouldUseNative(provider);
  const nativeTools = useNative ? getNativeTools(provider) : undefined;

  if (!useNative) {
    messages = injectXmlInstruction(messages);
  }

  let lastUsage: ChatCompletionResult['usage'] | undefined;
  let finalContent = '';
  let toolCalls: ToolCall[] = [];

  for (let i = 0; i < MAX_TOOL_LOOP; i++) {
    let result: ChatCompletionResult;
    try {
      result = await provider.chat(messages, undefined, nativeTools);
    } catch (err) {
      logError('Lỗi gọi provider.chat (non-streaming)', err);
      return {
        content: `LunaCoding: Lỗi khi gọi AI: ${err instanceof Error ? err.message : String(err)}`,
        usage: lastUsage,
      };
    }

    if (result.usage) lastUsage = result.usage;

    const nativeToolCalls = (result as any).toolCalls as
      | Array<{ id?: string; name: string; arguments: Record<string, unknown> }>
      | undefined;

    if (nativeToolCalls && nativeToolCalls.length > 0) {
      toolCalls = nativeToolCalls.map((tc) => ({
        id: tc.id || randomUUID(),
        name: tc.name,
        arguments: tc.arguments,
      }));

      const assistantMsg: Message = {
        role: 'assistant',
        content: result.content || '',
        timestamp: new Date(),
      } as any;
      (assistantMsg as any).toolCalls = nativeToolCalls;
      messages.push(assistantMsg);
    } else if (!useNative) {
      const parsed = parseXmlToolCalls(result.content);
      if (parsed.toolCalls.length > 0) {
        toolCalls = parsed.toolCalls;
        if (parsed.remainingText) {
          messages.push({
            role: 'assistant',
            content: parsed.remainingText,
            timestamp: new Date(),
          });
        }
      }
    }

    if (toolCalls.length === 0) {
      finalContent = result.content;
      break;
    }

    const ctx = createToolContext(messages);
    for (const tc of toolCalls) {
      try {
        const execResult = await executeToolCall(tc, ctx);
        log('INFO', `Tool executed: ${tc.name}`, { args: tc.arguments, isError: execResult.isError });
        messages.push(buildToolResultMessage(tc.name, tc.arguments, execResult.content));
      } catch (err) {
        logError(`Lỗi thực thi tool: ${tc.name}`, err);
        messages.push(buildToolResultMessage(tc.name, tc.arguments, `Lỗi: ${String(err)}`));
      }
    }

    if (!useNative) {
      messages.push({
        role: 'user',
        content: '(Tiếp tục dùng XML nếu cần gọi thêm tool, hoặc trả lời trực tiếp)',
        timestamp: new Date(),
      } as Message);
    }
  }

  if (!finalContent) {
    log('WARN', 'Tool loop đạt giới hạn MAX_TOOL_LOOP mà không có phản hồi cuối cùng', {
      loopCount: MAX_TOOL_LOOP,
    });
  }

  return {
    content: finalContent || 'LunaCoding: Tool loop đạt giới hạn mà không có phản hồi cuối cùng.',
    usage: lastUsage,
  };
}

// ============================================================
// Core: tool loop cho streaming
// ============================================================

async function* runToolLoopStreaming(
  provider: ReturnType<typeof createProvider>,
  initialMessages: Message[],
): AsyncIterable<ChatStreamChunk> {
  let messages = [...initialMessages];
  const useNative = shouldUseNative(provider);
  const nativeTools = useNative ? getNativeTools(provider) : undefined;

  if (!useNative) {
    messages = injectXmlInstruction(messages);
  }

  let lastUsage: ChatStreamChunk['usage'] | undefined;

  for (let i = 0; i < MAX_TOOL_LOOP; i++) {
    const toolCallsReceived: ToolCall[] = [];
    let contentText = '';
    let streamError: string | undefined;

    try {
      for await (const chunk of provider.chatStream(messages, undefined, nativeTools)) {
        if (chunk.type === 'reasoning') {
          yield chunk;
        } else if (chunk.type === 'content') {
          contentText += chunk.text ?? '';
          yield chunk;
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          toolCallsReceived.push({
            id: (chunk.toolCall as any).id || randomUUID(),
            name: chunk.toolCall.name,
            arguments: chunk.toolCall.arguments,
          });
          yield chunk;
        } else if (chunk.type === 'done') {
          if (chunk.usage) lastUsage = chunk.usage;
        } else if (chunk.type === 'error') {
          logError('Lỗi từ provider stream', chunk.error);
          streamError = chunk.error;
          yield chunk;
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logError('Lỗi trong vòng lặp stream của provider', err);
      yield { type: 'error', error: `Lỗi kết nối provider: ${errorMsg}` };
      yield {
        type: 'done',
        usage: lastUsage || { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
      };
      return;
    }

    // Nếu có lỗi từ stream, kết thúc luôn
    if (streamError) {
      yield {
        type: 'done',
        usage: lastUsage || { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
      };
      return;
    }

    // Nếu không có tool calls từ stream, kiểm tra XML
    if (toolCallsReceived.length === 0 && !useNative) {
      const parsed = parseXmlToolCalls(contentText);
      if (parsed.toolCalls.length > 0) {
        for (const tc of parsed.toolCalls) {
          toolCallsReceived.push(tc);
          yield {
            type: 'tool_call',
            toolCall: { name: tc.name, arguments: tc.arguments },
          };
        }
        if (parsed.remainingText) {
          contentText = parsed.remainingText;
        }
      }
    }

    // Không có tool calls → kết thúc
    if (toolCallsReceived.length === 0) {
      yield {
        type: 'done',
        usage: lastUsage || {
          promptTokens: 0,
          completionTokens: 0,
          reasoningTokens: 0,
          totalTokens: 0,
        },
      };
      return;
    }

    // Lưu assistant message với tool calls
    const assistantMsg: Message = {
      role: 'assistant',
      content: contentText || '',
      timestamp: new Date(),
    } as any;
    if (useNative && toolCallsReceived.length > 0) {
      (assistantMsg as any).toolCalls = toolCallsReceived.map((tc) => ({
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: tc.name,
        arguments: tc.arguments,
      }));
    }
    messages.push(assistantMsg);

    // Thực thi tools
    const ctx = createToolContext(messages);
    for (const tc of toolCallsReceived) {
      let execResult;
      try {
        execResult = await executeToolCall(tc, ctx);
        log('INFO', `Tool executed (stream): ${tc.name}`, { args: tc.arguments, isError: execResult.isError });
      } catch (err) {
        logError(`Lỗi thực thi tool (stream): ${tc.name}`, err);
        execResult = { content: `Lỗi: ${String(err)}`, isError: true };
      }
      yield {
        type: 'tool_result',
        toolResult: { content: execResult.content, isError: execResult.isError },
      };
      messages.push(buildToolResultMessage(tc.name, tc.arguments, execResult.content));
    }

    if (!useNative) {
      messages.push({
        role: 'user',
        content: '(Tiếp tục dùng XML nếu cần gọi thêm tool, hoặc trả lời trực tiếp)',
        timestamp: new Date(),
      } as Message);
    }
  }

  yield {
    type: 'done',
    usage: lastUsage || {
      promptTokens: 0,
      completionTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
    },
  };
}

// ============================================================
// Public API
// ============================================================

/**
 * Gửi danh sách tin nhắn đến provider hiện tại và nhận phản hồi từ AI.
 * Hỗ trợ tool calling (native hoặc XML tùy theo cấu hình).
 */
export async function sendChatMessage(messages: Message[]): Promise<ChatCompletionResult> {
  const providerConfig = getCurrentProvider();

  if (!providerConfig) {
    return {
      content:
        'LunaCoding: Chưa có provider nào được chọn. Dùng lệnh /provider để thêm hoặc chọn provider.',
    };
  }

  try {
    log('INFO', 'Bắt đầu chat request (non-streaming)', {
      provider: providerConfig.name,
      model: providerConfig.defaultModel,
    });
    const provider = createProvider(providerConfig);
    const result = await runToolLoopNonStreaming(provider, messages);
    log('INFO', 'Kết thúc chat request (non-streaming)', { tokens: result.usage?.totalTokens });
    return result;
  } catch (error: unknown) {
    logError('Lỗi khởi tạo provider', error);
    return { content: `LunaCoding: Lỗi khởi tạo provider: ${String(error)}` };
  }
}

/**
 * Gửi danh sách tin nhắn đến provider hiện tại dưới dạng streaming.
 * Hỗ trợ tool calling (native hoặc XML tùy theo cấu hình).
 */
export async function* sendChatMessageStream(
  messages: Message[],
): AsyncIterable<ChatStreamChunk> {
  const providerConfig = getCurrentProvider();

  if (!providerConfig) {
    yield {
      type: 'done',
      usage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    };
    return;
  }

  try {
    log('INFO', 'Bắt đầu chat request (streaming)', {
      provider: providerConfig.name,
      model: providerConfig.defaultModel,
      messageCount: messages.length,
    });
    const provider = createProvider(providerConfig);
    yield* runToolLoopStreaming(provider, messages);
    log('INFO', 'Kết thúc chat request (streaming)');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logError('Lỗi khởi tạo provider hoặc stream', err);
    yield { type: 'error', error: `Lỗi: ${errorMsg}. Dùng /logs để xem chi tiết.` };
    yield { type: 'done' };
  }
}