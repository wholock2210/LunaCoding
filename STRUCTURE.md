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
    ├── services/              # Tầng dịch vụ (API, types, providers)
    │   ├── chat.ts            # Giao tiếp với AI proxy: trả về ChatCompletionResult (content + reasoning + usage)
    │   ├── config.ts          # Quản lý cấu hình: đọc/ghi file config, API keys
    │   ├── crypto.ts          # Mã hóa/giải mã API keys (AES-256-GCM)
    │   ├── types.ts           # Định nghĩa interface Message, ChatCompletionResult, ProviderConfig, v.v.
    │   │
    │   └── providers/         # Hệ thống multi-provider
    │       ├── base-provider.ts        # Abstract base class: chat() → ChatCompletionResult
    │       ├── registry.ts             # Provider registry: quản lý danh sách provider
    │       ├── openai-compatible.ts    # Provider cho OpenAI-compatible API (parse reasoning_content + usage)
    │       ├── anthropic.ts            # Provider cho Anthropic (Claude)
    │       ├── google-gemini.ts        # Provider cho Google Gemini
    │       └── cohere.ts               # Provider cho Cohere
    │
    └── ui/                    # Tầng giao diện (React components)
        ├── app.tsx            # Component gốc: state management + UI mode routing
        │                       #   - expandedThinkingIndices: Set<number> — trạng thái toggle thinking
        │                       #   - useInput bắt Ctrl+O: toggle tất cả khối suy nghĩ
        │                       #   - handleSendMessage: parse ChatCompletionResult → Message
        │
        └── components/        # Các component con
            ├── TerminalTop.tsx        # Header: ASCII art, thông tin hệ thống, đồng hồ
            ├── TerminalMid.tsx        # Router component: điều hướng giữa các màn hình
            │                           #   - ChatView: hiển thị messages + ResponseBlock + LoadingIndicator
            │                           #   - Khi loading: hiển thị "đang suy nghĩ..." + gợi ý Ctrl+O
            ├── TerminalBottom.tsx     # Input bar: nhập tin nhắn, gửi, parse lệnh /
            ├── ResponseBlock.tsx      # Hiển thị một phản hồi assistant:
            │                           #   - Thinking toggle (▶/▼) + reasoning content (màu xám)
            │                           #   - Token count footer (tk phản hồi · tổng tk)
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
│    - messages, isLoading, expandedThinkingIndices                 │
│    - Ctrl+O: toggle all thinking blocks                           │
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
| `ChatStreamChunk` | `type: 'reasoning' \| 'content' \| 'done'`, `text?`, `usage?` | Mỗi chunk trong streaming response |
| `Usage` | `promptTokens`, `completionTokens`, `reasoningTokens`, `totalTokens` | Thống kê token usage |
| `ProviderConfig` | `id`, `name`, `type`, `apiKey`, `endpoint?`, `models` | Cấu hình một provider AI |
| `ProviderType` | `'openai' \| 'anthropic' \| 'google-gemini' \| 'cohere'` | Loại provider được hỗ trợ |
| `UiMode` | `'chat' \| 'provider-list' \| 'provider-type-select' \| 'provider-add-form' \| 'model-list'` | Chế độ giao diện |

### `src/services/config.ts` – Quản lý cấu hình
- Đọc/ghi file cấu hình JSON (`~/.LunaCoding/setting.json`)
- Quản lý danh sách provider, model, API keys
- Hỗ trợ: `loadConfig()`, `saveConfig()`, `addProvider()`, `removeProvider()`, `setCurrentProvider()`, `setDefaultModel()`, `updateProviderModels()`
- Tự động tạo file config mặc định nếu chưa tồn tại

### `src/services/crypto.ts` – Mã hóa API Keys
- Mã hóa API keys trước khi lưu vào config file
- Dùng thuật toán **AES-256-GCM** với key derivation từ machine UUID
- Hỗ trợ: `encrypt(plainText)`, `decrypt(encryptedText)`
- Key được derive từ `os.hostname()` + `os.userInfo().username` để mỗi máy có key riêng

### `src/services/chat.ts` – API Service
- **Hàm:** `sendChatMessage(messages: Message[]): Promise<ChatCompletionResult>`
- Trả về `ChatCompletionResult` với `content`, `reasoning` (nếu có), và `usage` (nếu có)
- Nếu chưa có provider, trả về `{ content: '...hướng dẫn...' }`
- **Hàm:** `sendChatMessageStream(messages: Message[]): AsyncIterable<ChatStreamChunk>`
- Async generator gọi `provider.chatStream()` và yield từng chunk reasoning/content/done
- Nếu chưa có provider, yield chunk done rỗng

### `src/services/providers/` – Hệ thống Multi-Provider

#### `base-provider.ts` – Abstract Base Class
- Abstract class `BaseProvider` định nghĩa interface chung:
  - `getType(): string` — loại provider
  - `chat(messages, model?): Promise<ChatCompletionResult>` — gửi chat request, trả về kết quả có reasoning + usage
  - `chatStream(messages, model?): AsyncIterable<ChatStreamChunk>` — gửi chat request dạng streaming, trả về các chunk reasoning/content/done
  - `listModels(): Promise<string[]>` — lấy danh sách model
  - `testConnection(): Promise<TestConnectionResult>` — kiểm tra kết nối
- `static getDefaultBaseUrl(): string` — URL mặc định cho từng provider

#### `registry.ts` – Provider Registry
- `createProvider(config: ProviderConfig): BaseProvider` — factory tạo provider instance
- Map type provider → class implementation

#### `openai-compatible.ts` – OpenAI-Compatible Provider
- Hỗ trợ mọi API tương thích OpenAI (OpenAI, DeepSeek, xAI, v.v.)
- Endpoint: `{baseURL}/v1/chat/completions`
- **Parse reasoning_content**: từ `message.reasoning_content`
- **Parse usage**: `prompt_tokens`, `completion_tokens`, `completion_tokens_details.reasoning_tokens`, `total_tokens`
- **Streaming**: `chatStream()` gọi API với `stream: true`, parse SSE chunks (`delta.reasoning_content` → reasoning, `delta.content` → content, chunk có `usage` → done)

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

### `src/ui/app.tsx` – Root Component
- **State:**
  - `messages: Message[]` — lịch sử chat
  - `isLoading: boolean` — trạng thái đang chờ AI trả lời
  - `isStreaming: boolean` — trạng thái đang streaming response
  - `streamingPhase: 'thinking' | 'responding' | null` — giai đoạn streaming hiện tại
  - `expandedThinkingIndices: Set<number>` — index của các message đang mở thinking
  - `uiMode: UiMode` — chế độ giao diện hiện tại
  - Các state cho provider/model management
- **Keyboard shortcut:**
  - `Ctrl+O`: toggle tất cả khối suy nghĩ (mở tất cả nếu có block đang đóng, đóng tất cả nếu tất cả đang mở); khi đang streaming, toggle thinking của message đang stream
- **Luồng xử lý gửi tin nhắn (streaming):**
  1. Tạo `userMessage` từ input
  2. Tạo placeholder `assistantMessage` (content rỗng) → append cùng userMessage
  3. `setIsStreaming(true)`, `setStreamingPhase(null)`
  4. `for await (chunk)` từ `sendChatMessageStream()`:
     - reasoning chunk → `setStreamingPhase('thinking')`, cập nhật `reasoningContent`
     - content chunk → `setStreamingPhase('responding')`, cập nhật `content`
     - done chunk → `setStreamingPhase(null)`, cập nhật token usage
  5. `setIsLoading(false)`, `setIsStreaming(false)`

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
  - Nhận `messages`, `isLoading`, `isStreaming`, `streamingPhase`, `expandedThinkingIndices`
  - Trạng thái rỗng: hiển thị "Chưa có tin nhắn nào..."
  - User message: `❯` prefix + nội dung trắng
  - Assistant message: render qua `<ResponseBlock>` với `isThinkingExpanded` và `isStreaming` (true cho message cuối cùng đang stream)
  - **LoadingIndicator** đặt ở dưới cùng khung chat, thay đổi theo `streamingPhase`:
    - `'thinking'` → `<LoadingIndicator text="thinking..." />`
    - `'responding'` → `<LoadingIndicator text="responding..." />`
    - Không streaming nhưng `isLoading` → `<LoadingIndicator text="đang suy nghĩ..." />`

### `src/ui/components/ResponseBlock.tsx` – Hiển thị phản hồi assistant
- Nhận props: `content`, `reasoningContent?`, `reasoningTokens?`, `completionTokens?`, `totalTokens?`, `isThinkingExpanded`, `isStreaming?`
- **Thinking toggle row:** Khi có `reasoningContent`, hiển thị:
  - `▶ Suy nghĩ` hoặc `▼ Suy nghĩ` + `(đang cập nhật...)` khi streaming, hoặc `(N tk)` khi đã có token count
- **Expanded thinking content:** Khi `isThinkingExpanded`, hiển thị toàn bộ `reasoningContent` với màu xám `#666666`, prefix `│`
- **Main response:** `●` xám + nội dung wrap + cursor `▍` khi đang streaming
- **Token info footer:** `{completionTokens} tk phản hồi · tổng {totalTokens} tk` (dimColor, canh phải) — ẩn khi đang streaming

### `src/ui/components/LoadingIndicator.tsx` – Loading Indicator
- Nhận prop: `text?: string` (mặc định: "LunaCoding đang trả lời")
- Hiển thị spinner động + text với **hiệu ứng sóng màu** chạy qua từng ký tự
- Màu tối (`#446688`) khi không có sóng, màu sáng (`#88ccff` → `#bbffff`) khi sóng đi qua

### `src/ui/components/TerminalBottom.tsx` – Input Bar
- Nhận props: `onSend`, `onCommand`, `isLoading`, `uiMode`
- Dùng `ink-text-input` cho ô nhập liệu
- Prompt `>` màu xanh lá (vàng khi loading)
- Parse input: lệnh `/` → gọi `onCommand`, text thường → gọi `onSend`
- Disable input khi `isLoading === true`

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
| `Ctrl+O` | Chat | Toggle tất cả khối suy nghĩ (reasoning) của assistant; khi đang streaming, toggle thinking của message đang stream |
| `Esc` | Provider/Model menu | Quay lại màn hình trước |
| `Enter` | Chat | Gửi tin nhắn |
