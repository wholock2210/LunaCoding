import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import { logError } from '../logger.js';
import type { Message, TestConnectionResult, ChatCompletionResult, ChatStreamChunk } from '../types.js';
import type { NativeToolFormat } from '../tools/types.js';

interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OpenAIChoice {
  message?: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  };
  delta?: {
    role?: string;
    content?: string | null;
    tool_calls?: Array<{
      index?: number;
      id?: string;
      type?: 'function';
      function?: { name?: string; arguments?: string };
    }>;
  };
  finish_reason?: string;
}

interface OpenAIChatResponse {
  choices?: OpenAIChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

interface OpenAIModelInfo {
  id: string;
}

interface OpenAIModelsListResponse {
  data?: OpenAIModelInfo[];
}

/**
 * Provider cho OpenAI-compatible API.
 * Endpoint: POST {baseUrl}/v1/chat/completions
 * List models: GET {baseUrl}/v1/models
 */
export class OpenAICompatibleProvider extends BaseProvider {
  getType(): string {
    return 'openai-compatible';
  }

  static getDefaultBaseUrl(): string {
    return 'https://api.openai.com';
  }

  getNativeToolFormat(): NativeToolFormat {
    return 'openai';
  }

  /**
   * Chuyển đổi messages sang định dạng OpenAI.
   */
  private toOpenAIMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map((msg) => {
      // Nếu message có tool calls từ assistant
      if ((msg as any).toolCalls && (msg as any).toolCalls.length > 0) {
        return {
          role: 'assistant',
          content: msg.content || null,
          tool_calls: (msg as any).toolCalls.map(
            (tc: { id: string; name: string; arguments: Record<string, unknown> }) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
              },
            }),
          ),
        };
      }

      // Tool result message
      if ((msg as any).toolCallId) {
        return {
          role: 'tool',
          content: msg.content,
          tool_call_id: (msg as any).toolCallId,
          name: (msg as any).toolCallName ?? 'unknown',
        };
      }

      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  async *chatStream(messages: Message[], model?: string, tools?: Record<string, unknown>[]): AsyncIterable<ChatStreamChunk> {
    const openaiMessages = this.toOpenAIMessages(messages);

    const body: Record<string, unknown> = {
      model: model ?? this.defaultModel,
      messages: openaiMessages,
      stream: true,
      // stream_options: { include_usage: true }, // Không tương thích với một số proxy tự host
    };

    if (tools && tools.length > 0) {
      body['tools'] = tools;
      body['tool_choice'] = 'auto';
    }

    let textBuffer = '';
    let reasoningBuffer = '';
    let finalUsage: ChatStreamChunk['usage'] | undefined;

    // Buffer cho tool call delta merging
    const tcBuffer: Record<
      number,
      { id?: string; name?: string; arguments?: string }
    > = {};

    try {
      const response = await axios.post(
        this.resolveEndpoint('/v1/chat/completions'),
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 120_000,
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let chunkBuffer = '';

      for await (const chunk of stream) {
        // Axios stream trả về Buffer, cần decode
        const text: string = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
        chunkBuffer += text;

        // Xử lý từng dòng SSE
        const lines = chunkBuffer.split('\n');
        // Giữ lại dòng cuối cùng (có thể chưa hoàn chỉnh)
        chunkBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(trimmed.slice(6));
            const choice = data?.choices?.[0] as OpenAIChoice | undefined;
            const delta = choice?.delta;
            const choiceUsage = data?.usage as OpenAIChatResponse['usage'] | undefined;

            // Usage chunk (OpenAI trả về usage trong chunk cuối cùng với stream_options)
            if (choiceUsage) {
              finalUsage = {
                promptTokens: choiceUsage.prompt_tokens ?? 0,
                completionTokens: choiceUsage.completion_tokens ?? 0,
                reasoningTokens: choiceUsage.completion_tokens_details?.reasoning_tokens ?? 0,
                totalTokens: choiceUsage.total_tokens ?? 0,
              };
              continue;
            }

            if (delta) {
              // Reasoning content (DeepSeek, v.v.)
              if ((delta as any).reasoning_content) {
                reasoningBuffer += (delta as any).reasoning_content;
                yield { type: 'reasoning', text: (delta as any).reasoning_content as string };
                continue;
              }

              // Tool calls từ delta
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!tcBuffer[idx]) {
                    tcBuffer[idx] = {};
                  }
                  if (tc.id) tcBuffer[idx]!.id = tc.id;
                  if (tc.function?.name) {
                    tcBuffer[idx]!.name = (tcBuffer[idx]!.name ?? '') + tc.function.name;
                  }
                  if (tc.function?.arguments) {
                    tcBuffer[idx]!.arguments = (tcBuffer[idx]!.arguments ?? '') + tc.function.arguments;
                  }
                }
                continue;
              }

              // Text content
              if (delta.content) {
                textBuffer += delta.content;
                yield { type: 'content', text: delta.content };
              }
            }

            // Finish reason → flush tool calls nếu có
            if (choice?.finish_reason === 'tool_calls' || choice?.finish_reason === 'stop') {
              // Flush tool calls
              for (const idx of Object.keys(tcBuffer)) {
                const tc = tcBuffer[Number(idx)]!;
                if (tc.name && tc.arguments) {
                  yield {
                    type: 'tool_call',
                    toolCall: { name: tc.name, arguments: safeJsonParse(tc.arguments) },
                  };
                }
              }
            }
          } catch (e) {
            logError('openai-compatible', { message: 'Lỗi parse dòng SSE', line: trimmed.slice(0, 200), parseError: (e as Error).message });
          }
        }
      }
    } finally {
      // Không cần hủy stream, nó đã kết thúc
    }

    // Fallback: xử lý tool call từ buffer sau khi stream kết thúc
    if (textBuffer.length === 0 && Object.keys(tcBuffer).length > 0) {
      for (const idx of Object.keys(tcBuffer)) {
        const tc = tcBuffer[Number(idx)]!;
        if (tc.name && tc.arguments) {
          yield {
            type: 'tool_call',
            toolCall: { name: tc.name, arguments: safeJsonParse(tc.arguments) },
          };
        }
      }
    }

    yield {
      type: 'done',
      usage: finalUsage || { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    };
  }

  async chat(messages: Message[], model?: string, tools?: Record<string, unknown>[]): Promise<ChatCompletionResult> {
    const openaiMessages = this.toOpenAIMessages(messages);

    const body: Record<string, unknown> = {
      model: model ?? this.defaultModel,
      messages: openaiMessages,
    };

    if (tools && tools.length > 0) {
      body['tools'] = tools;
      body['tool_choice'] = 'auto';
    }

    try {
      const response = await axios.post<OpenAIChatResponse>(
        this.resolveEndpoint('/v1/chat/completions'),
        body,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 120_000,
        },
      );

      const data = response.data;
      const choice = data?.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        return { content: 'LunaCoding: Không nhận được phản hồi từ AI.' };
      }

      // Parse tool_calls
      const toolCalls = (msg.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeJsonParse(tc.function.arguments),
      }));

      const usage = data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            reasoningTokens: data.usage.completion_tokens_details?.reasoning_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined;

      const result: Record<string, unknown> & ChatCompletionResult = {
        content: msg.content || 'LunaCoding: Phản hồi rỗng từ AI.',
        usage,
      };

      if (toolCalls.length > 0) {
        result['toolCalls'] = toolCalls;
      }

      return result;
    } catch (error: unknown) {
      logError(`Lỗi API ${this.getType()} (chat)`, error);
      return { content: this.formatError(error) };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<OpenAIModelsListResponse>(
        this.resolveEndpoint('/v1/models'),
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 30_000,
        },
      );

      const models = response.data?.data;
      if (!models || !Array.isArray(models)) return [];

      return models
        .filter((m) => m.id)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((m) => m.id);
    } catch (err) {
      logError(`Lỗi lấy danh sách model ${this.getType()}`, err);
      return [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
      ];
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const response = await axios.post<OpenAIChatResponse>(
        this.resolveEndpoint('/v1/chat/completions'),
        {
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'hi' }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 15_000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        return { success: true, message: `✅ Kết nối thành công! Phản hồi: "${content.slice(0, 100)}"` };
      }
      return { success: false, message: '❌ Không nhận được phản hồi từ API.' };
    } catch (error: unknown) {
      logError(`Lỗi test connection ${this.getType()}`, error);
      return { success: false, message: this.formatError(error) };
    }
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (data?.error?.message) {
          return `LunaCoding: Lỗi API (${status}): ${data.error.message}`;
        }

        return `LunaCoding: Lỗi server (${status}): ${JSON.stringify(data)}`;
      }
      if (error.request) {
        return `LunaCoding: Không thể kết nối đến ${this.baseUrl}. Kiểm tra Base URL và mạng.`;
      }
    }
    return `LunaCoding: Lỗi không xác định: ${String(error)}`;
  }
}

function safeJsonParse(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}