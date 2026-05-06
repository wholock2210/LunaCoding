import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult, ChatCompletionResult, ChatStreamChunk } from '../types.js';
import type { NativeToolFormat } from '../tools/types.js';

interface CohereApiMessage {
  role: 'USER' | 'CHATBOT' | 'TOOL';
  message?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_results?: Array<{
    call: { name: string; arguments: Record<string, unknown> };
    outputs: Array<{ text: string }>;
  }>;
}

interface CohereChatResponse {
  text: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  meta?: {
    tokens?: {
      input_tokens?: number;
      output_tokens?: number;
    };
    billed_units?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
}

interface CohereModelEntry {
  name: string;
  endpoints?: string[];
}

interface CohereModelsListResponse {
  models: CohereModelEntry[];
}

/**
 * Provider cho Cohere Chat API.
 * Endpoint: POST https://api.cohere.com/v2/chat
 * List models: GET https://api.cohere.com/v1/models
 * Header: Authorization: Bearer {apiKey}
 */
export class CohereProvider extends BaseProvider {
  getType(): string {
    return 'cohere';
  }

  static getDefaultBaseUrl(): string {
    return 'https://api.cohere.com';
  }

  getNativeToolFormat(): NativeToolFormat {
    return 'cohere';
  }

  /**
   * Chuyển đổi messages sang định dạng Cohere.
   */
  private toCohereMessages(messages: Message[]): CohereApiMessage[] {
    const result: CohereApiMessage[] = [];

    for (const msg of messages) {
      // Tool result
      if ((msg as any).toolCallId) {
        result.push({
          role: 'TOOL',
          tool_results: [
            {
              call: {
                name: (msg as any).toolCallName ?? 'unknown',
                arguments: (msg as any).toolCallArgs ?? {},
              },
              outputs: [{ text: msg.content }],
            },
          ],
        });
        continue;
      }

      // Assistant với tool calls
      if (msg.role === 'assistant' && (msg as any).toolCalls && (msg as any).toolCalls.length > 0) {
        const toolCalls = (msg as any).toolCalls.map(
          (tc: { id: string; name: string; arguments: Record<string, unknown> }) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments),
            },
          }),
        );
        result.push({
          role: 'CHATBOT',
          message: msg.content || '',
          tool_calls: toolCalls,
        });
        continue;
      }

      const role: 'USER' | 'CHATBOT' = msg.role === 'assistant' ? 'CHATBOT' : 'USER';

      const last = result[result.length - 1];
      if (result.length > 0 && last!.role === role && last!.message !== undefined) {
        last!.message += '\n' + msg.content;
      } else {
        result.push({ role, message: msg.content });
      }
    }

    const first = result[0];
    if (result.length > 0 && first!.role !== 'USER') {
      result.unshift({ role: 'USER', message: '(start of conversation)' });
    }

    if (result.length === 0) {
      result.push({ role: 'USER', message: '' });
    }

    return result;
  }

  async *chatStream(messages: Message[], model?: string, tools?: Record<string, unknown>[]): AsyncIterable<ChatStreamChunk> {
    const result = await this.chat(messages, model, tools);

    // Phát tool_calls nếu có
    if ((result as any).toolCalls && (result as any).toolCalls.length > 0) {
      for (const tc of (result as any).toolCalls) {
        yield {
          type: 'tool_call',
          toolCall: { name: tc.name, arguments: tc.arguments },
        };
      }
    }

    if (result.content) {
      yield { type: 'content', text: result.content };
    }
    yield {
      type: 'done',
      usage: result.usage || { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    };
  }

  async chat(messages: Message[], model?: string, tools?: Record<string, unknown>[]): Promise<ChatCompletionResult> {
    const cohereMessages = this.toCohereMessages(messages);

    const body: Record<string, unknown> = {
      model: model ?? this.defaultModel,
      messages: cohereMessages,
    };

    if (tools && tools.length > 0) {
      body['tools'] = tools;
    }

    try {
      const response = await axios.post<CohereChatResponse>(
        this.resolveEndpoint('/v2/chat'),
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
      const text = data?.text ?? '';

      // Parse tool_calls từ response
      const toolCalls = (data?.tool_calls ?? []).map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: safeJsonParse(tc.function.arguments),
      }));

      const meta = data?.meta;
      const usage = meta?.tokens
        ? {
            promptTokens: meta.tokens.input_tokens ?? 0,
            completionTokens: meta.tokens.output_tokens ?? 0,
            reasoningTokens: 0,
            totalTokens: (meta.tokens.input_tokens ?? 0) + (meta.tokens.output_tokens ?? 0),
          }
        : undefined;

      const result: ChatCompletionResult & { toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> } = {
        content: text || 'LunaCoding: Không nhận được phản hồi từ AI.',
        usage,
      };

      if (toolCalls.length > 0) {
        result.toolCalls = toolCalls;
      }

      return result;
    } catch (error: unknown) {
      return { content: this.formatError(error) };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<CohereModelsListResponse>(
        this.resolveEndpoint('/v1/models'),
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 30_000,
        },
      );

      const models = response.data?.models;
      if (!models || !Array.isArray(models)) return [];

      return models
        .filter((m) => m.name && m.endpoints?.includes('chat'))
        .map((m) => m.name);
    } catch {
      return [
        'command-r-plus',
        'command-r',
        'command',
        'command-light',
      ];
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const response = await axios.post<CohereChatResponse>(
        this.resolveEndpoint('/v2/chat'),
        {
          model: this.defaultModel,
          messages: [{ role: 'USER', message: 'hi' }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 15_000,
        },
      );

      const text = response.data?.text;
      if (text) {
        return { success: true, message: `✅ Kết nối thành công! Phản hồi: "${text.slice(0, 100)}"` };
      }
      return { success: false, message: '❌ Không nhận được phản hồi từ Cohere.' };
    } catch (error: unknown) {
      return { success: false, message: this.formatError(error) };
    }
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (typeof data?.message === 'string') {
          return `LunaCoding: Lỗi Cohere (${status}): ${data.message}`;
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