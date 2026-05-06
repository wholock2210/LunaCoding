import axios from 'axios';
import { BaseProvider } from './base-provider.js';
import type { Message, TestConnectionResult, ChatCompletionResult, ChatStreamChunk } from '../types.js';
import type { NativeToolFormat } from '../tools/types.js';

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: { name: string; content: string };
  };
}

interface GeminiContent {
  role: 'user' | 'model' | 'function';
  parts: GeminiPart[];
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface GeminiModelInfo {
  name: string;
  displayName: string;
}

interface GeminiModelsListResponse {
  models?: GeminiModelInfo[];
}

interface GeminiToolDeclaration {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown> | null;
  }>;
}

/**
 * Provider cho Google Gemini API.
 * Endpoint: POST {baseUrl}/v1beta/models/{model}:generateContent
 * List models: GET {baseUrl}/v1beta/models
 * Auth: API key qua query param ?key=
 */
export class GoogleGeminiProvider extends BaseProvider {
  getType(): string {
    return 'google-gemini';
  }

  static getDefaultBaseUrl(): string {
    return 'https://generativelanguage.googleapis.com';
  }

  getNativeToolFormat(): NativeToolFormat {
    return 'google-gemini';
  }

  /**
   * Chuyển đổi messages sang định dạng Gemini contents.
   */
  private toGeminiContents(messages: Message[]): GeminiContent[] {
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      const role = msg.role === 'assistant' ? 'model' : 'user';

      // Nếu message có tool calls
      if ((msg as any).toolCalls && (msg as any).toolCalls.length > 0) {
        const parts: GeminiPart[] = (msg as any).toolCalls.map(
          (tc: { name: string; arguments: Record<string, unknown> }) => ({
            functionCall: { name: tc.name, args: tc.arguments },
          }),
        );
        if (msg.content) {
          parts.unshift({ text: msg.content });
        }
        contents.push({ role: 'model', parts });
        continue;
      }

      // Nếu message là tool result
      if ((msg as any).toolCallId) {
        contents.push({
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: (msg as any).toolCallName ?? 'unknown',
                response: { name: (msg as any).toolCallName ?? 'unknown', content: msg.content },
              },
            },
          ],
        });
        continue;
      }

      // Gộp các message liên tiếp cùng role
      const last = contents[contents.length - 1];
      if (contents.length > 0 && last!.role === role) {
        last!.parts.push({ text: msg.content });
      } else {
        contents.push({ role, parts: [{ text: msg.content }] });
      }
    }

    return contents;
  }

  /**
   * Chuyển đổi tools sang định dạng Gemini functionDeclarations.
   */
  private toGeminiTools(tools: Record<string, unknown>[]): GeminiToolDeclaration[] {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool['name'] as string,
          description: tool['description'] as string,
          parameters: tool['parameters'] ? (tool['parameters'] as Record<string, unknown>) : null,
        })),
      },
    ];
  }

  async *chatStream(messages: Message[], model?: string, tools?: Record<string, unknown>[]): AsyncIterable<ChatStreamChunk> {
    // Fallback: dùng generateContentStream
    const contents = this.toGeminiContents(messages);
    const modelId = model ?? this.defaultModel;

    const body: Record<string, unknown> = {
      contents,
    };

    if (tools && tools.length > 0) {
      body['tools'] = this.toGeminiTools(tools);
    }

    try {
      const response = await axios.post(
        this.resolveEndpoint(`/v1beta/models/${modelId}:streamGenerateContent`),
        body,
        {
          params: { key: this.apiKey, alt: 'sse' },
          headers: { 'Content-Type': 'application/json' },
          timeout: 120_000,
          responseType: 'stream',
        },
      );

      const stream = response.data;
      let chunkBuffer = '';
      let textBuffer = '';
      let finalUsage: ChatStreamChunk['usage'] | undefined;

      for await (const chunk of stream) {
        const text: string = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
        chunkBuffer += text;

        const lines = chunkBuffer.split('\n');
        chunkBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const candidate = json?.candidates?.[0];
            const parts = candidate?.content?.parts as GeminiPart[] | undefined;

            if (parts) {
              const textParts = parts.filter((p) => typeof p.text === 'string');
              const funcParts = parts.filter((p) => p.functionCall);

              for (const p of textParts) {
                if (p.text) {
                  textBuffer += p.text;
                  yield { type: 'content', text: p.text };
                }
              }

              for (const p of funcParts) {
                if (p.functionCall) {
                  yield {
                    type: 'tool_call',
                    toolCall: { name: p.functionCall.name, arguments: p.functionCall.args ?? {} },
                  };
                }
              }
            }

            if (json?.usageMetadata) {
              finalUsage = {
                promptTokens: json.usageMetadata.promptTokenCount ?? 0,
                completionTokens: json.usageMetadata.candidatesTokenCount ?? 0,
                reasoningTokens: 0,
                totalTokens: json.usageMetadata.totalTokenCount ?? 0,
              };
            }
          } catch {
            // Bỏ qua dòng parse lỗi
          }
        }
      }

      yield {
        type: 'done',
        usage: finalUsage || { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
      };
    } catch (error: unknown) {
      yield { type: 'error', error: this.formatError(error) };
      yield {
        type: 'done',
        usage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
      };
    }
  }

  async chat(messages: Message[], model?: string, tools?: Record<string, unknown>[]): Promise<ChatCompletionResult> {
    const contents = this.toGeminiContents(messages);
    const modelId = model ?? this.defaultModel;

    const body: Record<string, unknown> = {
      contents,
    };

    if (tools && tools.length > 0) {
      body['tools'] = this.toGeminiTools(tools);
    }

    try {
      const response = await axios.post<GeminiGenerateResponse>(
        this.resolveEndpoint(`/v1beta/models/${modelId}:generateContent`),
        body,
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 120_000,
        },
      );

      const data = response.data;
      const candidate = data?.candidates?.[0];
      const parts = candidate?.content?.parts;

      if (!parts || parts.length === 0) {
        if (data?.candidates && data.candidates.length === 0) {
          return { content: 'LunaCoding: Phản hồi bị chặn bởi bộ lọc an toàn của Google Gemini.' };
        }
        return { content: 'LunaCoding: Không nhận được phản hồi từ AI.' };
      }

      // Parse functionCalls từ parts
      const functionCalls = parts.filter((p) => p.functionCall);
      const toolCalls = functionCalls.map((fc) => ({
        name: fc.functionCall!.name,
        arguments: fc.functionCall!.args ?? {},
      }));

      // Gộp text
      const text = parts
        .filter((p) => typeof p.text === 'string')
        .map((p) => p.text!)
        .join('\n');

      const usageMeta = data?.usageMetadata;
      const usage = usageMeta
        ? {
            promptTokens: usageMeta.promptTokenCount ?? 0,
            completionTokens: usageMeta.candidatesTokenCount ?? 0,
            reasoningTokens: 0,
            totalTokens: usageMeta.totalTokenCount ?? 0,
          }
        : undefined;

      const result: ChatCompletionResult & { toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }> } = {
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
    try {
      const response = await axios.get<GeminiModelsListResponse>(
        this.resolveEndpoint('/v1beta/models'),
        {
          params: { key: this.apiKey },
          timeout: 30_000,
        },
      );

      const models = response.data?.models;
      if (!models || !Array.isArray(models)) return [];

      return models
        .filter((m) => m.name && m.name.startsWith('models/') && !m.name.includes('embedding'))
        .map((m) => m.name.replace('models/', ''));
    } catch {
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
        this.resolveEndpoint(`/v1beta/models/${this.defaultModel}:generateContent`),
        {
          contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        },
        {
          params: { key: this.apiKey },
          headers: { 'Content-Type': 'application/json' },
          timeout: 15_000,
        },
      );

      const candidate = response.data?.candidates?.[0];
      const text = candidate?.content?.parts
        ?.filter((p) => typeof p.text === 'string')
        .map((p) => p.text!)
        .join(' ')
        .slice(0, 100);

      if (text) {
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