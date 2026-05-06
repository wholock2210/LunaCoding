import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult, ChatCompletionResult, ChatStreamChunk } from '../types.js';

interface CohereApiMessage {
  role: 'USER' | 'CHATBOT';
  message: string;
}

interface CohereChatRequest {
  model: string;
  messages: CohereApiMessage[];
}

interface CohereChatResponse {
  text: string;
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
 *
 * Cohere API v2 dùng role 'USER' và 'CHATBOT' (viết hoa).
 */
export class CohereProvider extends BaseProvider {
  getType(): string {
    return 'cohere';
  }

  static getDefaultBaseUrl(): string {
    return 'https://api.cohere.com';
  }

  /**
   * Chuyển đổi messages sang định dạng Cohere.
   * Cohere yêu cầu role 'USER' | 'CHATBOT' (viết hoa), xen kẽ, bắt đầu bằng USER.
   */
  private toCohereMessages(messages: Message[]): CohereApiMessage[] {
    const result: CohereApiMessage[] = [];

    for (const msg of messages) {
      const role: 'USER' | 'CHATBOT' = msg.role === 'assistant' ? 'CHATBOT' : 'USER';

      // Cohere yêu cầu xen kẽ USER/CHATBOT
      const last = result[result.length - 1];
      if (result.length > 0 && last!.role === role) {
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

  async *chatStream(messages: Message[], model?: string): AsyncIterable<ChatStreamChunk> {
    // Fallback: gọi chat() rồi yield toàn bộ content như 1 chunk
    const result = await this.chat(messages, model);
    if (result.content) {
      yield { type: 'content', text: result.content };
    }
    yield {
      type: 'done',
      usage: result.usage || { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    };
  }

  async chat(messages: Message[], model?: string): Promise<ChatCompletionResult> {
    const cohereMessages = this.toCohereMessages(messages);

    try {
      const response = await axios.post<CohereChatResponse>(
        `${this.baseUrl}/v2/chat`,
        {
          model: model ?? this.defaultModel,
          messages: cohereMessages,
        } as CohereChatRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 120_000,
        },
      );

      const data = response.data;
      const text = data?.text;
      const content = text || 'LunaCoding: Không nhận được phản hồi từ AI.';

      const meta = data?.meta;
      const usage = meta?.tokens
        ? {
            promptTokens: meta.tokens.input_tokens ?? 0,
            completionTokens: meta.tokens.output_tokens ?? 0,
            reasoningTokens: 0,
            totalTokens: (meta.tokens.input_tokens ?? 0) + (meta.tokens.output_tokens ?? 0),
          }
        : undefined;

      return { content, usage };
    } catch (error: unknown) {
      return { content: this.formatError(error) };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<CohereModelsListResponse>(
        `${this.baseUrl}/v1/models`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 30_000,
        },
      );

      const models = response.data?.models;
      if (!models || !Array.isArray(models)) return [];

      // Lọc model có endpoint 'chat'
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
        `${this.baseUrl}/v2/chat`,
        {
          model: this.defaultModel,
          messages: [{ role: 'USER', message: 'hi' }],
        } as CohereChatRequest,
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

        // Cohere error format: { message: '...' }
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