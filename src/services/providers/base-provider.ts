import type { Message, TestConnectionResult } from '../types.js';

/**
 * Abstract base class cho tất cả các provider.
 * Mỗi provider type sẽ implement các phương thức này theo chuẩn API riêng.
 */
export abstract class BaseProvider {
  /** Base URL của provider (đã chuẩn hóa) */
  protected baseUrl: string;
  /** API key đã giải mã */
  protected apiKey: string;
  /** Model mặc định */
  protected defaultModel: string;

  constructor(baseUrl: string, apiKey: string, defaultModel: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Xóa trailing slash
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  /** Trả về loại provider */
  abstract getType(): string;

  /** Trả về URL mặc định nếu người dùng không nhập */
  static getDefaultBaseUrl(): string {
    return '';
  }

  /**
   * Gửi chat request đến provider.
   * @param messages - Lịch sử chat
   * @param model - Model ID (nếu không truyền, dùng defaultModel)
   * @returns Nội dung phản hồi từ AI
   */
  abstract chat(messages: Message[], model?: string): Promise<string>;

  /**
   * Lấy danh sách model từ endpoint /models của provider.
   * @returns Mảng tên model ID
   */
  abstract listModels(): Promise<string[]>;

  /**
   * Test kết nối đến provider bằng cách gửi request đơn giản.
   * @returns Kết quả test (success + message)
   */
  abstract testConnection(): Promise<TestConnectionResult>;
}