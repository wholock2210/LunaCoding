import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult, ChatCompletionResult } from '../types.js';

interface AnthropicContentBlock {
  type: 'text';
  text: string;
}

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicApiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Provider cho Anthropic Claude (Messages API).
 * Endpoint: POST https://api.anthropic.com/v1/messages
 * Header: x-api-key, anthropic-version: 2023-06-01
 */
export class AnthropicProvider extends BaseProvider {
  getType(): string {
    return 'anthropic';
  }

  static override getDefaultBaseUrl(): string {
    return 'https://api.anthropic.com';
  }

  /**
   * Đảm bảo messages hợp lệ cho Anthropic:
   * - Phải bắt đầu bằng role 'user'
   * - Xen kẽ user/assistant
   * - Không được có 2 message liên tiếp cùng role
   */
  private normalizeMessages(messages: Message[]): AnthropicApiMessage[] {
    const result: AnthropicApiMessage[] = [];

    for (const msg of messages) {
      const role = msg.role as 'user' | 'assistant';

      // Anthropic yêu cầu xen kẽ user/assistant
      // Nếu message hiện tại trùng role với message cuối, gộp content
      const last = result[result.length - 1];
      if (result.length > 0 && last!.role === role) {
        last!.content += '\n' + msg.content;
      } else {
        result.push({ role, content: msg.content });
      }
    }

    // Đảm bảo bắt đầu bằng user
    const first = result[0];
    if (result.length > 0 && first!.role !== 'user') {
      result.unshift({ role: 'user', content: '(start of conversation)' });
    }

    if (result.length === 0) {
      result.push({ role: 'user', content: '' });
    }

    return result;
  }

  async chat(messages: Message[], model?: string): Promise<ChatCompletionResult> {
    const apiMessages = this.normalizeMessages(messages);

    try {
      const response = await axios.post<AnthropicMessageResponse>(
        `${this.baseUrl}/v1/messages`,
        {
          model: model ?? this.defaultModel,
          max_tokens: 4096,
          messages: apiMessages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 120_000,
        },
      );

      const data = response.data;
      const contentBlocks = data?.content;
      if (!contentBlocks || contentBlocks.length === 0) {
        return { content: 'LunaCoding: Không nhận được phản hồi từ AI.' };
      }

      // Gộp tất cả text blocks
      const text = contentBlocks
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      const usage = data?.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            reasoningTokens: 0,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined;

      return { content: text || 'LunaCoding: Phản hồi rỗng từ AI.', usage };
    } catch (error: unknown) {
      return { content: this.formatError(error) };
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic không có endpoint /v1/models công khai
    // Trả về danh sách model phổ biến để người dùng tham khảo
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const response = await axios.post<AnthropicMessageResponse>(
        `${this.baseUrl}/v1/messages`,
        {
          model: this.defaultModel,
          max_tokens: 50,
          messages: [{ role: 'user', content: 'hi' }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          timeout: 15_000,
        },
      );

      const content = response.data?.content;
      if (content && content.length > 0) {
        const text = content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join(' ')
          .slice(0, 100);
        return { success: true, message: `✅ Kết nối thành công! Phản hồi: "${text}"` };
      }
      return { success: false, message: '❌ Không nhận được phản hồi từ Anthropic.' };
    } catch (error: unknown) {
      return { success: false, message: this.formatError(error) };
    }
  }

  private formatError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        // Anthropic trả về error object có dạng { type: 'error', error: { type: '...', message: '...' } }
        if (data?.error?.message) {
          return `LunaCoding: Lỗi Anthropic (${status}): ${data.error.message}`;
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