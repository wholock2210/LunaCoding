import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult } from '../types.js';

interface ApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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

  async chat(messages: Message[], model?: string): Promise<string> {
    const apiMessages: ApiMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const response = await axios.post<ChatCompletionResponse>(
        `${this.baseUrl}/v1/chat/completions`,
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

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        return 'LunaCoding: Không nhận được phản hồi từ AI.';
      }
      return content;
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<ModelsListResponse>(`${this.baseUrl}/v1/models`, {
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
        `${this.baseUrl}/v1/chat/completions`,
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