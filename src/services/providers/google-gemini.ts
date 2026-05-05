import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult } from '../types.js';

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiGenerateRequest {
  contents: GeminiContent[];
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
}

interface GeminiModelInfo {
  name: string; // dạng "models/gemini-1.5-pro"
  displayName: string;
}

interface GeminiModelsListResponse {
  models?: GeminiModelInfo[];
}

/**
 * Provider cho Google Gemini API.
 * Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * List models: GET https://generativelanguage.googleapis.com/v1beta/models
 * API key truyền qua query string: ?key=...
 */
export class GoogleGeminiProvider extends BaseProvider {
  getType(): string {
    return 'google-gemini';
  }

  static override getDefaultBaseUrl(): string {
    return 'https://generativelanguage.googleapis.com';
  }

  /**
   * Chuyển đổi messages sang định dạng Gemini contents.
   * Gemini chỉ hỗ trợ role 'user' và 'model' (tương đương assistant).
   * Yêu cầu: phải xen kẽ user/model, bắt đầu bằng user.
   */
  private toGeminiContents(messages: Message[]): GeminiContent[] {
    const result: GeminiContent[] = [];

    for (const msg of messages) {
      const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';

      // Gộp các message liên tiếp cùng role (Gemini yêu cầu xen kẽ)
      const last = result[result.length - 1];
      if (result.length > 0 && last!.role === role) {
        last!.parts.push({ text: msg.content });
      } else {
        result.push({ role, parts: [{ text: msg.content }] });
      }
    }

    // Đảm bảo bắt đầu bằng user
    const first = result[0];
    if (result.length > 0 && first!.role !== 'user') {
      result.unshift({ role: 'user', parts: [{ text: '(start of conversation)' }] });
    }

    if (result.length === 0) {
      result.push({ role: 'user', parts: [{ text: '' }] });
    }

    return result;
  }

  async chat(messages: Message[], model?: string): Promise<string> {
    const modelId = model ?? this.defaultModel;
    const contents = this.toGeminiContents(messages);

    try {
      const response = await axios.post<GeminiGenerateResponse>(
        `${this.baseUrl}/v1beta/models/${modelId}:generateContent`,
        { contents } as GeminiGenerateRequest,
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 120_000,
        },
      );

      const candidate = response.data?.candidates?.[0];
      const parts = candidate?.content?.parts;

      if (!parts || parts.length === 0) {
        // Gemini có thể chặn phản hồi (safety filters)
        if (response.data?.candidates && response.data.candidates.length === 0) {
          return 'LunaCoding: Phản hồi bị chặn bởi bộ lọc an toàn của Google Gemini.';
        }
        return 'LunaCoding: Không nhận được phản hồi từ AI.';
      }

      const text = parts
        .filter((p) => typeof p.text === 'string')
        .map((p) => p.text)
        .join('\n');

      return text || 'LunaCoding: Phản hồi rỗng từ AI.';
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get<GeminiModelsListResponse>(
        `${this.baseUrl}/v1beta/models`,
        {
          params: { key: this.apiKey },
          timeout: 30_000,
        },
      );

      const models = response.data?.models;
      if (!models || !Array.isArray(models)) return [];

      // Lọc chỉ lấy model hỗ trợ generateContent, bỏ tiền tố "models/"
      return models
        .filter((m) => m.name && m.name.startsWith('models/') && !m.name.includes('embedding'))
        .map((m) => m.name.replace('models/', ''));
    } catch {
      // Fallback: danh sách model phổ biến
      return [
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ];
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const response = await axios.post<GeminiGenerateResponse>(
        `${this.baseUrl}/v1beta/models/${this.defaultModel}:generateContent`,
        {
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        } as GeminiGenerateRequest,
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 15_000,
        },
      );

      const parts = response.data?.candidates?.[0]?.content?.parts;
      if (parts && parts.length > 0) {
        const text = parts
          .filter((p) => typeof p.text === 'string')
          .map((p) => p.text)
          .join(' ')
          .slice(0, 100);
        return { success: true, message: `✅ Kết nối thành công! Phản hồi: "${text}"` };
      }
      return { success: false, message: '❌ Không nhận được phản hồi từ Google Gemini.' };
    } catch (error: unknown) {
      return { success: false, message: this.formatError(error) };
    }
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        // Gemini error format: { error: { code: 400, message: '...', status: 'INVALID_ARGUMENT' } }
        if (data?.error?.message) {
          return `LunaCoding: Lỗi Gemini (${status}): ${data.error.message}`;
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