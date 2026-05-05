import { getCurrentProvider } from './config.js';
import { createProvider } from './providers/registry.js';
import type { Message } from './types.js';

/**
 * Gửi danh sách tin nhắn đến provider hiện tại và nhận phản hồi từ AI.
 * Nếu chưa có provider nào được chọn, trả về thông báo hướng dẫn.
 *
 * @param messages - Lịch sử chat
 * @returns Nội dung phản hồi từ AI
 */
export async function sendChatMessage(messages: Message[]): Promise<string> {
  const providerConfig = getCurrentProvider();

  if (!providerConfig) {
    return 'LunaCoding: Chưa có provider nào được chọn. Dùng lệnh /provider để thêm hoặc chọn provider.';
  }

  try {
    const provider = createProvider(providerConfig);
    return await provider.chat(messages);
  } catch (error: unknown) {
    return `LunaCoding: Lỗi khởi tạo provider: ${String(error)}`;
  }
}