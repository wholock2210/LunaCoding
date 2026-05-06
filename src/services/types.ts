export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reasoningContent?: string;
  reasoningTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

// ============================================================
// Provider & Model types
// ============================================================

/** Các loại provider được hỗ trợ */
export type ProviderType = 'openai-compatible' | 'anthropic' | 'google-gemini' | 'cohere';

/** Chế độ parse tool: auto (tự phát hiện), native (dùng API), xml (parse XML từ text) */
export type ToolParseMode = 'auto' | 'native' | 'xml';

/** Cấu hình một model */
export interface ModelInfo {
  id: string;
  name: string; // tên hiển thị, có thể trùng với id
}

/** Cấu hình một provider */
export interface ProviderConfig {
  id: string; // UUID
  name: string; // tên hiển thị cho người dùng
  type: ProviderType;
  baseUrl: string; // base URL, nếu rỗng sẽ dùng mặc định của type
  apiKey: string; // API key đã mã hóa
  defaultModel: string; // model mặc định để chat
  models: string[]; // danh sách model ID
  createdAt: string; // ISO timestamp
}

/** Cấu hình toàn ứng dụng lưu trong ~/.LunaCoding/setting.json */
export interface AppConfig {
  currentProviderId: string | null;
  providers: ProviderConfig[];
  toolParseMode?: ToolParseMode;
}

/** Kết quả test connection */
export interface TestConnectionResult {
  success: boolean;
  message: string;
}

/** Định nghĩa một lệnh slash */
export interface Command {
  name: string;
  description: string;
  aliases?: string[];
}

/** Các chế độ UI */
export type UiMode = 'chat' | 'provider-list' | 'provider-type-select' | 'provider-add-form' | 'model-list';

/** Trạng thái form thêm provider */
export interface ProviderFormState {
  name: string;
  type: ProviderType | null;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  testPassed: boolean;
  testMessage: string;
}

/** Kết quả trả về từ chat completion API */
export interface ChatCompletionResult {
  content: string;
  reasoning?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    reasoningTokens: number;
    totalTokens: number;
  };
}

/** Mỗi chunk trong streaming response */
export interface ChatStreamChunk {
  type: 'reasoning' | 'content' | 'done' | 'tool_call' | 'tool_result' | 'error';
  text?: string;
  error?: string;
  toolCall?: { name: string; arguments: Record<string, unknown> };
  toolResult?: { content: string; isError?: boolean };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    reasoningTokens: number;
    totalTokens: number;
  };
}
