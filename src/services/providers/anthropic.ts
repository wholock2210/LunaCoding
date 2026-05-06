import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult, ChatCompletionResult, ChatStreamChunk } from '../types.js';
import type { NativeToolFormat } from '../tools/types.js';

interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicMessageResponse {
  content: AnthropicContentBlock[];
  stop_reason?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicApiMessage {
  role: 'user' | 'assistant';
  content: string | Array<AnthropicContentBlock>;
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

  static getDefaultBaseUrl(): string {
    return 'https://api.anthropic.com';
  }

  getNativeToolFormat(): NativeToolFormat {
    return 'anthropic';
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
      const last = result[result.length - 1];

      // Nếu message có tool calls, giữ nguyên content array
      if ((msg as any).toolCalls && (msg as any).toolCalls.length > 0) {
        const blocks: AnthropicContentBlock[] = (msg as any).toolCalls.map(
          (tc: { id: string; name: string; arguments: Record<string, unknown> }) => ({
            type: 'tool_use' as const,
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          }),
        );
        // Thêm text block nếu có content
        if (msg.content) {
          blocks.unshift({ type: 'text', text: msg.content });
        }
        result.push({ role: 'assistant', content: blocks });
        continue;
      }

      // Nếu message là tool result
      if ((msg as any).toolCallId) {
        result.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: (msg as any).toolCallId,
              content: msg.content,
            } as any,
          ],
        });
        continue;
      }

      // Message thông thường: gộp nếu trùng role
      if (result.length > 0 && last!.role === role && typeof last!.content === 'string') {
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

  async *chatStream(messages: Message[], model?: string, tools?: Record<string, unknown>[]): AsyncIterable<ChatStreamChunk> {
    // Fallback: gọi chat() rồi yield toàn bộ content như 1 chunk
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
    const apiMessages = this.normalizeMessages(messages);

    const body: Record<string, unknown> = {
      model: model ?? this.defaultModel,
      max_tokens: 4096,
      messages: apiMessages,
    };

    if (tools && tools.length > 0) {
      body['tools'] = tools;
    }

    try {
      const response = await axios.post<AnthropicMessageResponse>(
        this.resolveEndpoint('/v1/messages'),
        body,
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

      // Parse tool_use blocks
      const toolUses = contentBlocks.filter((b) => b.type === 'tool_use');
      const toolCalls = toolUses.map((tu) => ({
        id: (tu as AnthropicToolUseBlock).id,
        name: (tu as AnthropicToolUseBlock).name,
        arguments: (tu as AnthropicToolUseBlock).input,
      }));

      // Gộp tất cả text blocks
      const text = contentBlocks
        .filter((block) => block.type === 'text')
        .map((block) => (block as AnthropicTextBlock).text)
        .join('\n');

      const usage = data?.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            reasoningTokens: 0,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined;

      const result: ChatCompletionResult & { toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> } = {
        content: text || 'LunaCoding: Phản hồi rỗng từ AI.',
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
    // Anthropic không có endpoint /v1/models công khai
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
        this.resolveEndpoint('/v1/messages'),
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
          .map((block) => (block as AnthropicTextBlock).text)
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
