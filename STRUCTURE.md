# LunaCoding - Cấu trúc dự án

```
LunaCoding/
├── .editorconfig              # Cấu hình editor (indent, charset, etc.)
├── .gitattributes             # Cấu hình Git attributes
├── .gitignore                 # Danh sách file/thư mục bỏ qua bởi Git
├── .prettierignore            # File bỏ qua bởi Prettier
├── LICENSE                    # Giấy phép MIT
├── README.md                  # Giới thiệu ngắn: "AI Coding Agent Harness"
├── AGENTS.md                  # Hướng dẫn dành cho AI agent
├── DEV-LOG.md                 # Nhật ký phát triển (development log)
├── STRUCTURE.md               # File này - mô tả cấu trúc dự án
├── plan.md                    # Kế hoạch mở rộng Tool System
├── TOOL_AUDIT_REPORT.md       # Báo cáo kiểm tra triển khai Tool System
├── package.json               # Cấu hình Node.js, dependencies, scripts
├── package-lock.json          # Lock file npm
├── bun.lock                   # Lock file Bun (nếu dùng Bun)
├── tsconfig.json              # Cấu hình TypeScript
│
├── ascii-art.txt              # ASCII art logo chính (có tag màu)
├── ascii-art-example-colored.txt  # File mẫu hướng dẫn dùng tag màu
├── ascii-name.txt             # ASCII art chữ "LunaCoding" (có tag màu)
├── color-palette.md           # Bảng màu tham khảo
│
└── src/
    ├── index.tsx              # Entry point: render app bằng Ink
    │
    ├── services/              # Tầng dịch vụ (API, types, providers, tools)
    │   ├── chat.ts            # Giao tiếp với AI proxy: streaming + error handling + log
    │   ├── config.ts          # Quản lý cấu hình: đọc/ghi file config, API keys, tool parse mode
    │   ├── crypto.ts          # Mã hóa/giải mã API keys (AES-256-GCM)
    │   ├── logger.ts          # Hệ thống log xoay vòng vào ~/.LunaCoding/logs/
    │   ├── types.ts           # Định nghĩa interface Message, ChatStreamChunk, Command, ProviderConfig, Tool, v.v.
    │   ├── xml-parser.ts      # Parse XML tool call thô từ text response
    │   ├── commands.ts        # Đăng ký lệnh slash (/provider, /model, /help, /logs, /tool-mode) + autocomplete
    │   │
    │   ├── providers/         # Hệ thống multi-provider
    │   │   ├── base-provider.ts        # Abstract base class + resolveEndpoint() helper
    │   │   ├── registry.ts             # Provider registry + log khi tạo provider
    │   │   ├── openai-compatible.ts    # Provider cho OpenAI-compatible API (streaming SSE, reasoning, tool calls)
    │   │   ├── anthropic.ts            # Provider cho Anthropic (Claude)
    │   │   ├── google-gemini.ts        # Provider cho Google Gemini
    │   │   └── cohere.ts               # Provider cho Cohere
    │   │
    │   └── tools/             # Framework tool calling cho AI (13 tool + 3 helpers)
    │       ├── types.ts                  # Định nghĩa ToolDefinition, ToolParameter, ToolExecutionContext, ToolResult
    │       ├── registry.ts               # ToolRegistry: register, execute, getNativeTools, toToolMessages
    │       ├── index.ts                  # Export + auto-register tất cả 13 tool
    │       ├── path-utils.ts             # Helper resolve đường dẫn an toàn (chống path traversal)
    │       ├── command-security.ts       # Helper chặn lệnh nguy hiểm (rm -rf, sudo, v.v.)
    │       ├── search-utils.ts           # Helper tìm kiếm regex + glob pattern
    │       ├── read-file.ts              # Tool "read_file" — đọc file với giới hạn dòng/ký tự
    │       ├── write-to-file.ts          # Tool "write_to_file" — tạo/ghi đè file, tự động tạo thư mục
    │       ├── replace-in-file.ts        # Tool "replace_in_file" — thay thế code với SEARCH/REPLACE blocks
    │       ├── search-files.ts           # Tool "search_files" — tìm kiếm regex đệ quy, lọc glob
    │       ├── list-files.ts             # Tool "list_files" — liệt kê cấu trúc thư mục (đệ quy/top-level)
    │       ├── execute-command.ts        # Tool "execute_command" — thực thi CLI với phê duyệt + timeout
    │       ├── read-lints.ts             # Tool "read_lints" — đọc lỗi từ TypeScript/ESLint
    │       ├── list-code-definitions.ts  # Tool "list_code_definitions" — liệt kê class/function/interface
    │       ├── search-code-semantic.ts   # Tool "search_code_semantic" — tìm kiếm ngữ nghĩa nâng cao
    │       ├── manage-dependencies.ts    # Tool "manage_dependencies" — cài/gỡ/cập nhật packages (npm/pip/cargo)
    │       ├── run-tests.ts              # Tool "run_tests" — chạy test suite, trả kết quả có cấu trúc
    │       ├── git-operations.ts         # Tool "git_operations" — status/diff/log/branch/commit (có phê duyệt)
    │       ├── preview-web.ts            # Tool "preview_web" — mở URL/file HTML trong trình duyệt
    │       └── fetch-web-docs.ts         # Tool "fetch_web_docs" — tìm kiếm tài liệu từ MDN, DevDocs
    │
    └── ui/                    # Tầng giao diện (React components)
        ├── app.tsx            # Component gốc: state management + UI mode routing
        │                       #   - Stable mode (Ctrl+I): ổn định IME tiếng Việt khi streaming
        │                       #   - detailMode (Ctrl+O hoặc /expand): toggle chế độ Tóm tắt ↔ Chi tiết
        │                       #   - Xử lý chunk error, lệnh /logs, /tool-mode, /expand
        │
        └── components/        # Các component con
            ├── TerminalTop.tsx        # Header: ASCII art, thông tin hệ thống, đồng hồ
            ├── TerminalMid.tsx        # Router component: điều hướng giữa các màn hình
            │                           #   - ChatView: hiển thị messages + ResponseBlock + LoadingIndicator
            │                           #   - Khi loading: hiển thị "đang suy nghĩ..." + gợi ý Ctrl+O
            ├── TerminalBottom.tsx     # Input bar: nhập tin nhắn, gửi, gợi ý lệnh / (autocomplete + Tab)
            ├── ResponseBlock.tsx      # Hiển thị một phản hồi assistant (VIẾT LẠI):
            │                           #   - 2 chế độ: Tóm tắt (mặc định) & Chi tiết (detailMode)
            │                           #   - ThinkingSummary, ThinkingPanel, CompactToolRow, DetailToolRow
            │                           #   - StreamDot animation, token count footer, hint Ctrl+O
            ├── LoadingIndicator.tsx   # Indicator loading: spinner + text tùy chỉnh + hiệu ứng sóng màu
            ├── ProviderMenu.tsx       # Màn hình danh sách provider đã cấu hình
            ├── ProviderTypeSelect.tsx # Màn hình chọn loại provider để thêm mới
            ├── ProviderAddForm.tsx    # Form nhập thông tin provider mới
            ├── ModelMenu.tsx          # Màn hình danh sách model của một provider
            └── ModelAddInput.tsx      # Form nhập model mới cho provider
```

## Kiến trúc tổng quan

LunaCoding là ứng dụng **AI Chatbot chạy trên terminal** theo mô hình 3 lớp với kiến trúc multi-provider:

```
┌──────────────────────────────────────────────────────────────────┐
│                          UI Layer                                 │
│  (React + Ink)                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │TerminalTop│ │TerminalMid│ │TerminalBottom│ │ProviderMenu,...│  │
│  └──────────┘ └──────────┘ └──────────────┘ └───────────────┘  │
│                        ↕                                          │
│                App (state hub + router)                           │
│    - messages, isLoading, detailMode (boolean)                    │
│    - Ctrl+O hoặc /expand: toggle chế độ Tóm tắt ↔ Chi tiết       │
├──────────────────────────────────────────────────────────────────┤
│                       Service Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ chat.ts  │ │config.ts │ │ crypto.ts  │ │   providers/     │  │
│  │ (router) │ │(config)  │ │ (encrypt)  │ │ base, registry,  │  │
│  │ →ChatCompletionResult  │ │            │ │ openai,anthropic, │  │
│  │ {content,reasoning,    │ │            │ │ gemini, cohere    │  │
│  │  usage}                │ │            │ │                   │  │
│  └──────────┘ └──────────┘ └────────────┘ └──────────────────┘  │
│                        ↕                                          │
│              Multiple AI Providers (HTTP)                         │
│    OpenAI / Anthropic / Google Gemini / Cohere / Custom ...       │
└──────────────────────────────────────────────────────────────────┘
```

## Chi tiết từng file

### `src/index.tsx` – Entry Point
- Import `render` từ thư viện `ink`
- Render component `<App/>`
- `waitUntilExit()` đợi đến khi app thoát, sau đó in "app exit"

### `src/services/types.ts` – Type Definitions
| Interface | Fields | Mô tả |
|-----------|--------|-------|
| `Message` | `role`, `content`, `timestamp`, `reasoningContent?`, `reasoningTokens?`, `completionTokens?`, `totalTokens?` | Tin nhắn trong lịch sử chat, hỗ trợ reasoning/thinking |
| `ChatCompletionResult` | `content`, `reasoning?`, `usage?` | Kết quả trả về từ provider chat |
| `ChatStreamChunk` | `type: 'reasoning' \| 'content' \| 'done' \| 'error' \| 'tool_call' \| 'tool_result'`, `text?`, `usage?`, `error?`, `toolCall?`, `toolResult?` | Mỗi chunk trong streaming response |
| `ToolParseMode` | `'auto' \| 'native' \| 'xml'` | Chế độ parse tool call |
| `Tool` | `name`, `description`, `parameters`, `execute` | Định nghĩa một tool cho AI gọi |
| `ToolCall` | `id`, `name`, `arguments` | Một lời gọi tool từ AI |
| `ToolResult` | `toolCallId`, `content`, `isError?` | Kết quả thực thi tool |
| `Usage` | `promptTokens`, `completionTokens`, `reasoningTokens`, `totalTokens` | Thống kê token usage |
| `ProviderConfig` | `id`, `name`, `type`, `apiKey`, `endpoint?`, `models` | Cấu hình một provider AI |
| `ProviderType` | `'openai' \| 'anthropic' \| 'google-gemini' \| 'cohere'` | Loại provider được hỗ trợ |
| `Command` | `name`, `description`, `aliases?` | Định nghĩa một lệnh slash |
| `UiMode` | `'chat' \| 'provider-list' \| 'provider-type-select' \| 'provider-add-form' \| 'model-list'` | Chế độ giao diện |

### `src/services/config.ts` – Quản lý cấu hình
- Đọc/ghi file cấu hình JSON (`~/.LunaCoding/setting.json`)
- Quản lý danh sách provider, model, API keys
- Hỗ trợ: `loadConfig()`, `saveConfig()`, `addProvider()`, `removeProvider()`, `setCurrentProvider()`, `setDefaultModel()`, `updateProviderModels()`
- `getToolParseMode()`: lấy chế độ parse tool hiện tại (`'auto' | 'native' | 'xml'`)
- `setToolParseMode(mode)`: lưu chế độ parse tool vào config
- Tự động tạo file config mặc định nếu chưa tồn tại

### `src/services/crypto.ts` – Mã hóa API Keys
- Mã hóa API keys trước khi lưu vào config file
- Dùng thuật toán **AES-256-GCM** với key derivation từ machine UUID
- Hỗ trợ: `encrypt(plainText)`, `decrypt(encryptedText)`
- Key được derive từ `os.hostname()` + `os.userInfo().username` để mỗi máy có key riêng

### `src/services/logger.ts` – Hệ thống Logging
- Ghi log xoay vòng vào `~/.LunaCoding/logs/lunacoding.log`
- Giới hạn **1000 dòng** cuối, tự động cắt dòng cũ
- `log(level, message, meta?)`: ghi log với timestamp, level (DEBUG/INFO/WARN/ERROR/FATAL) và metadata JSON
- `logError(context, error)`: ghi log ERROR kèm stack trace
- `getLogs(lines?)`: đọc N dòng log cuối (mặc định 50)
- `clearLogs()`: xóa toàn bộ file log
- Tự động tạo thư mục `~/.LunaCoding/logs/` với permission `0o700`

### `src/services/xml-parser.ts` – XML Parser cho Tool Calling
- Parse XML tool call thô từ text response (dành cho provider không hỗ trợ native tool calling)
- Hỗ trợ cú pháp `<tool_call><name>...</name><arguments>{...}</arguments></tool_call>`
- `parseXmlToolCalls(text)`: trả về mảng `ToolCall[]` từ text
- `hasXmlToolCalls(text)`: kiểm tra text có chứa tool call XML không
- Xử lý nhiều tool call trong cùng một response, hỗ trợ XML comment và khoảng trắng linh hoạt

### `src/services/chat.ts` – API Service
- **Hàm:** `sendChatMessage(messages: Message[]): Promise<ChatCompletionResult>`
- Trả về `ChatCompletionResult` với `content`, `reasoning` (nếu có), và `usage` (nếu có)
- Nếu chưa có provider, trả về `{ content: '...hướng dẫn...' }`
- **Hàm:** `sendChatMessageStream(messages: Message[]): AsyncIterable<ChatStreamChunk>`
- Async generator gọi `provider.chatStream()` với try-catch toàn diện
- Yield các chunk: `reasoning`, `content`, `tool_call`, `tool_result`, `error`, `done`
- Khi provider throw lỗi → yield chunk `error` + ghi log qua `logError()`
- Nếu chưa có provider, yield chunk done rỗng

### `src/services/providers/` – Hệ thống Multi-Provider

#### `base-provider.ts` – Abstract Base Class
- Abstract class `BaseProvider` định nghĩa interface chung:
  - `getType(): string` — loại provider
  - `chat(messages, model?): Promise<ChatCompletionResult>` — gửi chat request, trả về kết quả có reasoning + usage
  - `chatStream(messages, model?): AsyncIterable<ChatStreamChunk>` — gửi chat request dạng streaming, trả về các chunk reasoning/content/done
  - `listModels(): Promise<string[]>` — lấy danh sách model
  - `testConnection(): Promise<TestConnectionResult>` — kiểm tra kết nối
  - `resolveEndpoint(path: string): string` — helper nối baseUrl + path, tự động tránh duplicate `/v1`
- `static getDefaultBaseUrl(): string` — URL mặc định cho từng provider

#### `registry.ts` – Provider Registry
- `createProvider(config: ProviderConfig): BaseProvider` — factory tạo provider instance
- Ghi log khi tạo provider mới
- Map type provider → class implementation

#### `openai-compatible.ts` – OpenAI-Compatible Provider
- Hỗ trợ mọi API tương thích OpenAI (OpenAI, DeepSeek, xAI, v.v.)
- Endpoint: `resolveEndpoint('/v1/chat/completions')` — tránh duplicate `/v1`
- **Parse reasoning_content**: từ `message.reasoning_content`
- **Parse usage**: `prompt_tokens`, `completion_tokens`, `completion_tokens_details.reasoning_tokens`, `total_tokens`
- **Streaming**: `chatStream()` gọi API với `stream: true`, parse SSE chunks đúng cấu trúc `data?.choices?.[0]?.delta`:
  - `delta.reasoning_content` → reasoning
  - `delta.content` → content
  - `finish_reason` → kiểm tra kết thúc
  - chunk có `usage` → done
- **Log lỗi**: ghi `logError()` khi parse SSE thất bại hoặc axios request lỗi
- **`stream_options`**: đã comment `include_usage` để tương thích với proxy tự host

#### `anthropic.ts` – Anthropic Provider
- Hỗ trợ Anthropic Claude models
- Endpoint: `https://api.anthropic.com/v1/messages`
- Header: `x-api-key`, `anthropic-version: 2023-06-01`
- **Streaming**: `chatStream()` fallback — gọi `chat()` rồi yield toàn bộ content + done

#### `google-gemini.ts` – Google Gemini Provider
- Hỗ trợ Google Gemini models
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- API key truyền qua query param `?key=`
- **Streaming**: `chatStream()` fallback — gọi `chat()` rồi yield toàn bộ content + done

#### `cohere.ts` – Cohere Provider
- Hỗ trợ Cohere models
- Endpoint: `https://api.cohere.com/v2/chat`
- Role: `USER` / `CHATBOT` (viết hoa)
- **Streaming**: `chatStream()` fallback — gọi `chat()` rồi yield toàn bộ content + done

### `src/services/tools/` – Framework Tool Calling cho AI

Tool System gồm 13 tool (chia 3 giai đoạn) và 3 file helper, tuân thủ interface `ToolDefinition` chuẩn với example XML, xử lý lỗi try-catch, context-aware, và bảo mật.

#### Helper Files

##### `types.ts` – Tool Type Definitions
- `ToolDefinition`: `name`, `description`, `parameters: ToolParameter[]`, `example` (XML), `execute`
- `ToolParameter`: `name`, `type` (`'string' | 'number' | 'boolean' | 'array'`), `description`, `required?`, `default?`
- `ToolExecutionContext`: `workingDirectory`, `messages`
- `ToolResult`: `content`, `isError?`
- `NativeToolFormat`: `'openai' | 'anthropic' | 'cohere' | 'google-gemini'`

##### `registry.ts` – ToolRegistry Implementation
- Singleton `toolRegistry` instance
- `register(tool)`: đăng ký tool mới, kiểm tra trùng tên
- `get(name)`: lấy tool theo tên
- `getAll()`: lấy tất cả tool đã đăng ký
- `getNativeTools(format)`: trả về tool schema theo format native
- `execute(name, args, context)`: thực thi tool, bọc try-catch, trả về `ToolResult`
- `toToolMessages(results)`: chuyển `ToolResult[]` thành messages định dạng OpenAI

##### `index.ts` – Entry Point
- Export `toolRegistry` instance
- Auto-register tất cả 13 tool khi import

##### `path-utils.ts` – Helper resolve đường dẫn an toàn
- `resolveSafePath(basePath, targetPath)`: resolve đường dẫn, chống path traversal (không cho phép truy cập ngoài `basePath`)

##### `command-security.ts` – Helper chặn lệnh nguy hiểm
- `isDangerousCommand(command)`: kiểm tra lệnh có chứa pattern nguy hiểm (`rm -rf /`, `sudo`, `chmod 777 /`, `mkfs`, `dd if=`, `:(){ :|:& };:`, v.v.)
- `sanitizeCommand(command)`: làm sạch command string

##### `search-utils.ts` – Helper tìm kiếm regex + glob
- `matchesGlob(filename, pattern)`: kiểm tra filename khớp với glob pattern
- `searchInFile(filePath, regex)`: tìm kiếm regex trong một file, trả về các match kèm context

#### Giai đoạn 1: Tool thao tác file & hệ thống (P0)

##### `read-file.ts` – Tool "read_file"
- **Tham số:** `path` (string, required), `start_line?` (number), `end_line?` (number)
- **Chức năng:** Đọc nội dung file từ đường dẫn, giới hạn 50,000 ký tự, hỗ trợ đọc theo đoạn (start_line-end_line)
- **Xử lý lỗi:** File không tồn tại (`ENOENT`), không có quyền đọc (`EACCES`), path ngoài working directory

##### `write-to-file.ts` – Tool "write_to_file"
- **Tham số:** `path` (string, required), `content` (string, required)
- **Chức năng:** Tạo mới hoặc ghi đè file, tự động tạo thư mục cha nếu chưa tồn tại
- **Giới hạn:** Nội dung tối đa 1MB (`MAX_FILE_SIZE = 1_000_000`)
- **Xử lý lỗi:** Path rỗng, nội dung quá lớn, lỗi ghi file, path ngoài working directory

##### `replace-in-file.ts` – Tool "replace_in_file"
- **Tham số:** `path` (string, required), `diff` (string, required)
- **Chức năng:** Thay thế chính xác đoạn code bằng cơ chế SEARCH/REPLACE blocks
- **Cơ chế:** Parse `diff` string thành các block `------- SEARCH` / `=======` / `+++++++ REPLACE`, kiểm tra SEARCH tồn tại duy nhất một lần trong file, sau đó thay thế
- **Xử lý lỗi:** Thiếu delimiter, block không đóng, SEARCH không tìm thấy, SEARCH xuất hiện nhiều lần, file không tồn tại, không có quyền ghi

##### `search-files.ts` – Tool "search_files"
- **Tham số:** `path` (string, required), `regex` (string, required), `file_pattern?` (string)
- **Chức năng:** Tìm kiếm regex đệ quy trong thư mục, hỗ trợ lọc theo glob pattern (`*.ts`, `*.tsx`, v.v.)
- **Output:** Mỗi match kèm file path, line number, và context (các dòng xung quanh)

##### `list-files.ts` – Tool "list_files"
- **Tham số:** `path` (string, required), `recursive?` (boolean, default: false)
- **Chức năng:** Liệt kê cấu trúc thư mục, `recursive: true` hiển thị toàn bộ cây thư mục, `recursive: false` chỉ hiển thị top-level
- **Output:** Danh sách file/thư mục với ký hiệu `📁` cho thư mục, `📄` cho file

##### `execute-command.ts` – Tool "execute_command"
- **Tham số:** `command` (string, required), `requires_approval` (boolean, required)
- **Chức năng:** Thực thi lệnh CLI với cơ chế phê duyệt an toàn
- **Bảo mật:** Chặn lệnh nguy hiểm qua `command-security.ts`, timeout mặc định 30 giây, `requires_approval: true` cho lệnh có thể gây hại
- **Output:** stdout, stderr, exit code

#### Giai đoạn 2: Tool phân tích & quản lý code (P1)

##### `read-lints.ts` – Tool "read_lints"
- **Tham số:** `path?` (string)
- **Chức năng:** Đọc lỗi và cảnh báo từ TypeScript compiler (`tsc --noEmit`) hoặc ESLint
- **Output:** Danh sách lỗi/cảnh báo kèm file, dòng, cột, và message

##### `list-code-definitions.ts` – Tool "list_code_definitions"
- **Tham số:** `path` (string, required)
- **Chức năng:** Liệt kê các định nghĩa (class, function, method, interface, type, enum) ở top-level của thư mục, dùng regex để parse
- **Output:** Danh sách definitions kèm tên, loại, và file path

##### `search-code-semantic.ts` – Tool "search_code_semantic"
- **Tham số:** `path` (string, required), `pattern` (string, required), `context_lines?` (number, default: 2)
- **Chức năng:** Tìm kiếm ngữ nghĩa nâng cao: tìm pattern, gom nhóm theo file, hiển thị context lines xung quanh mỗi match
- **Output:** Kết quả được nhóm theo file, mỗi match kèm line number và context

##### `manage-dependencies.ts` – Tool "manage_dependencies"
- **Tham số:** `action` (`'install' | 'remove' | 'update'`, required), `package` (string, required), `package_manager?` (`'npm' | 'pip' | 'cargo'`, default: auto-detect)
- **Chức năng:** Cài đặt, gỡ bỏ, hoặc cập nhật packages
- **Auto-detect:** Tự phát hiện package manager dựa trên file lock (`package-lock.json` → npm, `requirements.txt` → pip, `Cargo.toml` → cargo)

#### Giai đoạn 3: Tool DevOps & automation (P2)

##### `run-tests.ts` – Tool "run_tests"
- **Tham số:** `test_command?` (string), `path?` (string)
- **Chức năng:** Chạy test suite và trả về kết quả có cấu trúc (passed/failed/errors)
- **Auto-detect:** Tự phát hiện test framework dựa trên project type (`npm test`, `pytest`, `cargo test`)
- **Output:** Số lượng test passed/failed, danh sách lỗi chi tiết, exit code

##### `git-operations.ts` – Tool "git_operations"
- **Tham số:** `operation` (`'status' | 'diff' | 'log' | 'branch' | 'commit'`, required), `message?` (string, cho commit), `path?` (string)
- **Chức năng:** Thao tác git cơ bản:
  - `status`: trạng thái working tree
  - `diff`: xem thay đổi (staged + unstaged)
  - `log`: lịch sử commit (giới hạn 20 dòng)
  - `branch`: danh sách branch
  - `commit`: tạo commit mới (yêu cầu `requires_approval`)
- **Bảo mật:** `commit` cần phê duyệt, chặn `push --force`, `hard reset`

##### `preview-web.ts` – Tool "preview_web"
- **Tham số:** `url_or_path` (string, required)
- **Chức năng:** Mở URL hoặc file HTML trong trình duyệt để xem trước kết quả
- **Xử lý:** Nếu là URL (`http://` hoặc `https://`) → mở trực tiếp; nếu là file `.html` → resolve path và mở bằng `file://`

##### `fetch-web-docs.ts` – Tool "fetch_web_docs"
- **Tham số:** `query` (string, required), `source?` (`'mdn' | 'devdocs' | 'auto'`, default: `'auto'`)
- **Chức năng:** Tìm kiếm tài liệu từ web (MDN, DevDocs) cho ngôn ngữ/framework đang dùng
- **Output:** Tóm tắt tài liệu, URL gốc, và code examples (nếu có)

### `src/ui/app.tsx` – Root Component
- **State:**
  - `messages: Message[]` — lịch sử chat
  - `isLoading: boolean` — trạng thái đang chờ AI trả lời
  - `isStreaming: boolean` — trạng thái đang streaming response
  - `streamingPhase: 'thinking' | 'responding' | null` — giai đoạn streaming hiện tại
  - `detailMode: boolean` — chế độ hiển thị: `false` = Tóm tắt (mặc định), `true` = Chi tiết
  - `uiMode: UiMode` — chế độ giao diện hiện tại
  - `stableMode: boolean` — chế độ ổn định IME tiếng Việt khi streaming
  - Các state cho provider/model management
- **Keyboard shortcut:**
  - `Ctrl+I`: toggle Stable Mode — khi bật, stream buffer thay đổi vào `streamBufferRef` thay vì gọi `setMessages()`, giúp ổn định con trỏ IME tiếng Việt (fcitx-bamboo). Khi tắt, `useEffect` flush buffer vào state.
  - `Ctrl+O`: toggle `detailMode` (Tóm tắt ↔ Chi tiết) — ảnh hưởng đến toàn bộ message trong lịch sử chat
- **Xử lý lệnh slash:**
  - `/logs` → hiển thị 50 dòng log cuối
  - `/logs all` → hiển thị toàn bộ log
  - `/logs clear` → xóa log
  - `/tool-mode` hoặc `/tm` → xem chế độ gọi tool hiện tại
  - `/tool-mode auto|native|xml` hoặc `/tm auto|native|xml` → đổi chế độ gọi tool
  - `/expand` hoặc `/e` → toggle `detailMode` (tương tự Ctrl+O), kèm thông báo xác nhận
- **Xử lý chunk error:** hiển thị thông báo lỗi thân thiện với prefix `● LunaCoding:` kèm gợi ý `💡 Dùng \`/logs\` để xem chi tiết lỗi.`
- **Luồng xử lý gửi tin nhắn (streaming):**
  1. Tạo `userMessage` từ input
  2. Tạo placeholder `assistantMessage` (content rỗng) → append cùng userMessage
  3. `setIsStreaming(true)`, `setStreamingPhase(null)`
  4. `for await (chunk)` từ `sendChatMessageStream()`:
     - reasoning chunk → `setStreamingPhase('thinking')`, cập nhật `reasoningContent`
     - content chunk → `setStreamingPhase('responding')`, cập nhật `content`
     - tool_call chunk → thêm bản ghi vào `toolCalls` của assistantMessage
     - tool_result chunk → cập nhật state và resultContent của tool call tương ứng
     - error chunk → hiển thị lỗi, kết thúc stream
     - done chunk → `setStreamingPhase(null)`, cập nhật token usage
  5. Nếu không có phản hồi và không có lỗi → fallback message
  6. `setIsLoading(false)`, `setIsStreaming(false)`

### `src/ui/components/TerminalTop.tsx` – Header
- Đọc 2 file ASCII art (`ascii-art.txt`, `ascii-name.txt`)
- Hỗ trợ **tag màu** trong file ASCII:
  | Tag | Ý nghĩa |
  |-----|---------|
  | `[color]text[/color]` | Màu chữ (tên hoặc hex) |
  | `[random]text[/random]` | Màu chữ ngẫu nhiên |
  | `[random:bright]` | Màu sáng ngẫu nhiên |
  | `[random:pastel]` | Màu pastel ngẫu nhiên |
  | `[bg:color]text[/bg]` | Màu nền |
  | `[bg:random]text[/bg]` | Nền ngẫu nhiên |
  | `[gradient:color1-color2]text[/gradient]` | Gradient 2 màu |
  | `[gradient:theme]text[/gradient]` | Gradient theo theme (warm, cool, pastel, neon, sunset, ocean, forest, fire, rose) |
- **Command màu:** Dòng bắt đầu bằng `#color` đặt màu mặc định cho các dòng tiếp theo
- Hiển thị: ASCII art bên trái, ASCII name bên phải, kèm border bo tròn, đường dẫn hiện tại, đồng hồ thời gian thực, phiên bản

### `src/ui/components/TerminalMid.tsx` – Router Component
- **Vai trò:** Router chính, dispatch sang component con dựa trên `uiMode` prop
- Nhận props: `uiMode`, `chatProps`, `providerListProps`, `providerTypeSelectProps`, `providerAddFormProps`, `modelListProps`
- **Các mode (switch/case):**
  | Mode | Component render | Mô tả |
  |------|-----------------|-------|
  | `chat` | `ChatView` (internal) | Hiển thị lịch sử chat + loading indicator |
  | `provider-list` | `ProviderMenu` | Danh sách provider đã cấu hình |
  | `provider-type-select` | `ProviderTypeSelect` | Chọn loại provider để thêm |
  | `provider-add-form` | `ProviderAddForm` | Form nhập thông tin provider mới |
  | `model-list` | `ModelMenu` / `ModelAddInput` | Danh sách model hoặc form thêm model |
- **ChatView (internal component):**
  - Nhận `messages`, `isLoading`, `isStreaming`, `streamingPhase`, `detailMode`
  - Trạng thái rỗng: hiển thị "Chưa có tin nhắn nào..."
  - User message: `❯` prefix + nội dung trắng
  - Assistant message: render qua `<ResponseBlock>` với `detailMode` và `isStreaming` (true cho message cuối cùng đang stream)
  - **LoadingIndicator** đặt ở dưới cùng khung chat, thay đổi theo `streamingPhase`:
    - `'thinking'` → `<LoadingIndicator text="thinking..." />`
    - `'responding'` → `<LoadingIndicator text="responding..." />`
    - Không streaming nhưng `isLoading` → `<LoadingIndicator text="đang suy nghĩ..." />`

### `src/ui/components/ResponseBlock.tsx` – Hiển thị phản hồi assistant (VIẾT LẠI)
- Nhận props: `content`, `reasoningContent?`, `reasoningTokens?`, `completionTokens?`, `totalTokens?`, `detailMode`, `isStreaming?`, `toolCalls?: ToolCallRecord[]`
- **2 chế độ hiển thị dựa trên `detailMode`:**
  - **Tóm tắt (`detailMode=false`):**
    - Thinking: `ThinkingSummary` — `🧠 Đã suy nghĩ (N tk)` hoặc `🧠 Đang suy nghĩ...`
    - Tool calls: `CompactToolRow` — mỗi tool 1 dòng gọn: `✓ Đọc file thành công (main.ts)`
    - Hint: `└ Ctrl+O để xem chi tiết` khi có thinking hoặc tool
  - **Chi tiết (`detailMode=true`):**
    - Thinking: `ThinkingPanel` — `▼ Suy nghĩ` + toàn bộ nội dung, prefix `│`
    - Tool calls: `DetailToolRow` — tên, arguments (JSON), result content, trạng thái
- **Sub-components:**
  - `ThinkingSummary` — Dòng tóm tắt thinking
  - `ThinkingPanel` — Panel chi tiết thinking với nội dung đầy đủ
  - `CompactToolRow` — Tool row gọn (1 dòng + tên file nếu có)
  - `DetailToolRow` — Tool row chi tiết (args + result)
  - `StreamDot` — Animation "..." cho tool đang chạy
- **Helpers:** `getStateColor()`, `getStateIcon()`, `getToolDisplayName()`, `getFileName()`, `formatArgs()`
- **Main response:** `●` xám + nội dung wrap
- **Token info footer:** `{completionTokens} tk phản hồi · tổng {totalTokens} tk` (dimColor, canh phải) — ẩn khi đang streaming

### `src/ui/components/LoadingIndicator.tsx` – Loading Indicator
- Nhận prop: `text?: string` (mặc định: "LunaCoding đang trả lời")
- Hiển thị spinner động + text với **hiệu ứng sóng màu** chạy qua từng ký tự
- Màu tối (`#446688`) khi không có sóng, màu sáng (`#88ccff` → `#bbffff`) khi sóng đi qua

### `src/ui/components/TerminalBottom.tsx` – Input Bar
- Nhận props: `onSend`, `onCommand`, `isLoading`, `uiMode`, `stableMode`
- Dùng `ink-text-input` cho ô nhập liệu
- Prompt `>` màu xanh lá (vàng khi loading)
- Parse input: lệnh `/` → gọi `onCommand`, text thường → gọi `onSend`
- Disable input khi `isLoading === true`
- **Gợi ý lệnh slash:** khi gõ `/` (chưa có khoảng trắng) hiện danh sách lệnh khớp từ `commands.ts`, nhấn **Tab** để tự động hoàn thành lệnh đầu tiên

### `src/services/commands.ts` – Đăng ký & Gợi ý lệnh Slash
- Mảng `registeredCommands` định nghĩa tất cả lệnh slash:
  - `/provider` (alias `/providers`) — Quản lý provider
  - `/model` (alias `/models`) — Quản lý model
  - `/logs` — Xem log hệ thống
  - `/tool-mode` (alias `/tm`) — Xem/đổi chế độ gọi tool (auto/native/xml)
  - `/expand` (alias `/e`) — Toggle chế độ Tóm tắt ↔ Chi tiết
  - `/help` (alias `/h`) — Trợ giúp
- Hàm `filterCommands(query)`: lọc lệnh theo chuỗi sau dấu `/`, tìm kiếm mờ trên tên chính và alias
- Hàm `isKnownCommand(input)`: kiểm tra input có khớp với lệnh đã đăng ký (hỗ trợ cả lệnh kèm tham số)
- Hàm `getAllCommandNames()`: trả về mảng phẳng tất cả tên lệnh và alias

### `src/ui/components/ProviderMenu.tsx` – Danh sách Provider
- Hiển thị danh sách provider đã cấu hình
- Scroll 5 items/trang, ký hiệu ↑↓
- Phím tắt: `A` thêm mới, `Esc` quay lại

### `src/ui/components/ProviderTypeSelect.tsx` – Chọn loại Provider
- Hiển thị 4 loại provider: OpenAI, Anthropic, Google Gemini, Cohere
- Mỗi loại có mô tả ngắn

### `src/ui/components/ProviderAddForm.tsx` – Form thêm Provider
- Các trường: Tên, Base URL, API Key, Default Model
- Tự động điền Base URL mặc định theo loại provider
- Validate: không được để trống các trường bắt buộc

### `src/ui/components/ModelMenu.tsx` – Danh sách Model
- Hiển thị danh sách model của provider hiện tại
- Scroll 5 items/trang
- Chức năng: chọn model, đặt làm mặc định, xóa model, fetch model từ API, thêm model thủ công

### `src/ui/components/ModelAddInput.tsx` – Form thêm Model
- Nhập tên model mới
- Validate: không trùng với model đã có, không được để trống

### File dữ liệu tĩnh
| File | Mục đích |
|------|----------|
| `ascii-art.txt` | Logo ASCII art trang trí, dùng tag màu |
| `ascii-name.txt` | Chữ "LunaCoding" ASCII art, tag màu |
| `ascii-art-example-colored.txt` | File mẫu minh họa cú pháp tag màu |
| `color-palette.md` | Tài liệu tham khảo bảng màu |

### Scripts (package.json)
| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy ứng dụng với tsx (hot reload) |
| `npm run build` | Biên dịch TypeScript → `dist/` |
| `npm run typecheck` | Kiểm tra kiểu (không emit file) |
| `npm test` | Format check (prettier) + lint (xo) + test (ava) |

## Công nghệ sử dụng

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| React | ^18.2.0 | UI framework |
| Ink | ^4.1.0 | React renderer cho terminal |
| ink-text-input | ^6.0.0 | Component input text cho Ink |
| axios | ^1.16.0 | HTTP client gọi AI proxy |
| TypeScript | ^5.0.3 | Type system |
| tsx | ^4.21.0 | Dev runner TypeScript |
| Prettier | ^2.8.7 | Code formatter |
| xo | ^0.53.1 | Linter |
| ava | ^5.2.0 | Test framework |

## Luồng dữ liệu

```
User Input (TerminalBottom)
        │
        ▼
App.handleSendMessage(input)
        │
        ├─► Tạo userMessage: Message
        ├─► setMessages(prev => [...prev, userMessage])
        ├─► setLoading(true)
        │
        ▼
sendChatMessage([...messages, userMessage]) → ChatCompletionResult
        │
        │  { content, reasoning?, usage? }
        │
        ▼
Tạo assistantMessage: Message
  - content = result.content
  - reasoningContent = result.reasoning
  - reasoningTokens = result.usage?.reasoningTokens
  - completionTokens = result.usage ? usage.completionTokens - reasoningTokens : undefined
  - totalTokens = result.usage?.totalTokens
        │
        ├─► setMessages(prev => [...prev, assistantMessage])
        ├─► setLoading(false)
        │
        ▼
TerminalMid re-render ← messages updated
  → ResponseBlock: hiển thị content + reasoning toggle + token count
TerminalBottom re-render ← isLoading = false
```

## Phím tắt

| Phím | Chế độ | Chức năng |
|------|--------|-----------|
| `Ctrl+I` | Chat | Toggle Stable Mode — ổn định IME tiếng Việt khi streaming, buffer thay đổi thay vì re-render liên tục |
| `Ctrl+O` | Chat | Toggle chế độ hiển thị Tóm tắt ↔ Chi tiết (thinking + tool calls) — ảnh hưởng đến toàn bộ lịch sử chat |
| `Tab` | Chat (gợi ý lệnh) | Tự động hoàn thành lệnh slash đầu tiên trong danh sách gợi ý |
| `Esc` | Provider/Model menu | Quay lại màn hình trước |
| `Enter` | Chat | Gửi tin nhắn |