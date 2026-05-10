import type { Message } from '../types.js';

// ============================================================
// Tool System Types
// ============================================================

/** Mô tả một tham số của tool */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string; // Mô tả NGẮN (1 dòng)
  required?: boolean; // Mặc định true
  default?: unknown;
}

/** Context được truyền vào khi thực thi tool */
export interface ToolExecutionContext {
  /** Thư mục làm việc hiện tại, dùng để giới hạn path traversal */
  workingDirectory: string;
  /** Lịch sử tin nhắn hiện tại (read-only) */
  messages: ReadonlyArray<Message>;
}

/** Kết quả thực thi tool */
export interface ToolResult {
  /** Nội dung kết quả (text) */
  content: string;
  /** Có lỗi không */
  isError?: boolean;
}

/** Định nghĩa một tool */
export interface ToolDefinition {
  /** Tên tool duy nhất */
  name: string;
  /** Mô tả NGẮN (1-2 dòng) */
  description: string;
  /** Danh sách tham số */
  parameters: ToolParameter[];
  /** Ví dụ XML mẫu để AI tham khảo khi dùng chế độ XML */
  example: string;
  /** Hàm thực thi tool */
  execute: (args: Record<string, unknown>, context: ToolExecutionContext) => Promise<ToolResult>;
}

/** Một lời gọi tool đã được parse từ response */
export interface ToolCall {
  /** ID của tool call (dùng làm key React) */
  id: string;
  /** Tên tool cần gọi */
  name: string;
  /** Tham số đã parse */
  arguments: Record<string, unknown>;
}

/** Định dạng tool definitions cho native provider */
export type NativeToolFormat =
  | 'openai'       // OpenAI, OpenAI-compatible
  | 'anthropic'    // Anthropic Claude
  | 'google-gemini'// Google Gemini
  | 'cohere';      // Cohere

// Re-export for convenience - ToolCall type được dùng bởi xml-parser