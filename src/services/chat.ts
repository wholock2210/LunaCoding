import { getCurrentProvider } from './config.js';
import { createProvider } from './providers/registry.js';
import type { Message, ChatCompletionResult, ChatStreamChunk } from './types.js';

/**
 * Gửi danh sách tin nhắn đến provider hiện tại và nhận phản hồi từ AI.
 * Nếu chưa có provider nào được chọn, trả về thông báo hướng dẫn.
 *
 * @param messages - Lịch sử chat
 * @returns Nội dung phản hồi từ AI
 */
export async function sendChatMessage(messages: Message[]): Promise<ChatCompletionResult> {
  const providerConfig = getCurrentProvider();

  if (!providerConfig) {
    return { content: 'LunaCoding: Chưa có provider nào được chọn. Dùng lệnh /provider để thêm hoặc chọn provider.' };
  }

  try {
    const provider = createProvider(providerConfig);
    return await provider.chat(messages);
  } catch (error: unknown) {
    return { content: `LunaCoding: Lỗi khởi tạo provider: ${String(error)}` };
  }
}

/**
 * Gửi danh sách tin nhắn đến provider hiện tại dưới dạng streaming.
 * Trả về AsyncIterable các chunk reasoning/content/done.
 *
 * @param messages - Lịch sử chat
 * @returns AsyncIterable các ChatStreamChunk
 */
export async function* sendChatMessageStream(messages: Message[]): AsyncIterable<ChatStreamChunk> {
  const providerConfig = getCurrentProvider();

  if (!providerConfig) {
    yield {
      type: 'done',
      usage: { promptTokens: 0, completionTokens: 0, reasoningTokens: 0, totalTokens: 0 },
    };
    return;
  }

  try {
    const provider = createProvider(providerConfig);
    yield* provider.chatStream(messages);
  } catch {
    yield { type: 'done' };
  }
}
