import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult, ChatCompletionResult } from '../types.js';

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      reasoning_content?: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    completion_tokens_details?: {
      reasoning_tokens: number;
    };
    total_tokens: number;
  };
}

interface ModelsListResponse {
  data: Array<{
    id: string;
  }>;
}

/**
 * Provider cho OpenAI và các API tương thích (DeepSeek, Groq, Mistral, OpenRouter, xAI, Together, ...).
 * Dùng chuẩn `/v1/chat/completions` và `/v1/models`.
 */
export class OpenAICompatibleProvider extends BaseProvider {
  getType(): string {
    return 'openai-compatible';
  }

  static override getDefaultBaseUrl(): string {
    return 'https://api.openai.com';
  }

  private resolveApiPath(path: string): string {
    // Loại bỏ trailing slash của baseUrl
    let base = this.baseUrl.replace(/\/+$/, '');
    // Nếu baseUrl đã kết thúc bằng /v1 thì không thêm //v1 nữa
    if (base.endsWith('/v1')) {
      return `${base}${path}`;
    }
    return `${base}/v1${path}`;
  }

  async chat(messages: Message[], model?: string): Promise<ChatCompletionResult> {
    const apiMessages: ApiMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await axios.post<ChatCompletionResponse>(
        this.resolveApiPath('/chat/completions'),
        {
          model: model ?? this.defaultModel,
          messages: apiMessages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60_000,
        },
      );

      const data = response.data;
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        return { content: 'LunaCoding: Không nhận được phản hồi từ AI.' };
      }

      const reasoning = data?.choices?.[0]?.message?.reasoning_content ?? undefined;
      const usage = data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            reasoningTokens: data.usage.completion_tokens_details?.reasoning_tokens ?? 0,
            totalTokens: data.usage.total_tokens,
          }
        : undefined;

      return { content, reasoning, usage };
    } catch (error: unknown) {
      return { content: this.formatError(error) };
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<ModelsListResponse>(this.resolveApiPath('/models'), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: 30_000,
      });

      const models = response.data?.data;
      if (!models || !Array.isArray(models)) return [];
      return models.map((m) => m.id);
    } catch {
      return [];
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const response = await axios.post<ChatCompletionResponse>(
        this.resolveApiPath('/chat/completions'),
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
      return { success: false, message: '❌ Không nhận được phản hồi từ provider.' };
    } catch (error: unknown) {
      return { success: false, message: this.formatError(error) };
    }
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `LunaCoding: Lỗi server (${error.response.status}): ${JSON.stringify(error.response.data)}`;
      }
      if (error.request) {
        return `LunaCoding: Không thể kết nối đến ${this.baseUrl}. Kiểm tra Base URL và mạng.`;
      }
    }
    return `LunaCoding: Lỗi không xác định: ${String(error)}`;
  }
}