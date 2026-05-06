import type {
  Message,
  TestConnectionResult,
  ChatCompletionResult,
  ChatStreamChunk,
} from '../types.js';
import type { NativeToolFormat } from '../tools/types.js';

/**
 * Abstract base class cho tất cả các provider.
 * Mỗi provider type sẽ implement các phương thức này theo chuẩn API riêng.
 */
export abstract class BaseProvider {
  /** Base URL của provider (đã chuẩn hóa, không có trailing slash) */
  protected baseUrl: string;
  /** API key đã giải mã */
  protected apiKey: string;
  /** Model mặc định */
  protected defaultModel: string;

  constructor(baseUrl: string, apiKey: string, defaultModel: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  /** Trả về loại provider */
  abstract getType(): string;

  /**
   * Provider có hỗ trợ native tool calling không?
   * Mặc định true cho hầu hết provider (OpenAI, Anthropic, Gemini, Cohere).
   * Ghi đè nếu provider không hỗ trợ (vd: OpenAI-compatible tự host).
   */
  supportsNativeToolCalling(): boolean {
    return true;
  }

  /**
   * Trả về định dạng tool cho provider này.
   * Mỗi provider ghi đè để trả về định dạng phù hợp.
   */
  abstract getNativeToolFormat(): NativeToolFormat;

  /**
   * Giải quyết endpoint URL, tránh duplicate path prefix.
   * 
   * Ví dụ: nếu baseUrl = "http://localhost:5001/v1" và path = "/v1/chat/completions",
   * kết quả sẽ là "http://localhost:5001/v1/chat/completions" (không duplicate /v1).
   *
   * Cơ chế: duyệt từ cuối path, tìm prefix dài nhất của path đã tồn tại ở cuối baseUrl,
   * sau đó chỉ nối phần còn lại.
   *
   * @param path - Đường dẫn endpoint (vd: "/v1/chat/completions")
   * @returns URL hoàn chỉnh không bị duplicate prefix
   */
  protected resolveEndpoint(path: string): string {
    // Chuẩn hóa path: đảm bảo bắt đầu bằng /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Duyệt từ dài đến ngắn, tìm overlap giữa cuối baseUrl và đầu path
    for (let i = normalizedPath.length; i > 0; i--) {
      const pathPrefix = normalizedPath.slice(0, i);
      if (this.baseUrl.endsWith(pathPrefix)) {
        // baseUrl đã chứa prefix này, chỉ nối phần còn lại
        return this.baseUrl + normalizedPath.slice(i);
      }
    }
    
    // Không có overlap, nối toàn bộ path
    return this.baseUrl + normalizedPath;
  }

  /**
   * Gửi chat request đến provider.
   * @param messages - Lịch sử chat
   * @param model - Model ID (nếu không truyền, dùng defaultModel)
   * @param tools - Tool definitions (nếu có và provider hỗ trợ)
   * @returns Nội dung phản hồi từ AI
   */
  abstract chat(
    messages: Message[],
    model?: string,
    tools?: Record<string, unknown>[],
  ): Promise<ChatCompletionResult>;

  /**
   * Gửi chat request dạng streaming đến provider.
   * @param messages - Lịch sử chat
   * @param model - Model ID (nếu không truyền, dùng defaultModel)
   * @param tools - Tool definitions (nếu có và provider hỗ trợ)
   * @returns AsyncIterable các chunk reasoning/content/done/tool_call/tool_result
   */
  abstract chatStream(
    messages: Message[],
    model?: string,
    tools?: Record<string, unknown>[],
  ): AsyncIterable<ChatStreamChunk>;

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