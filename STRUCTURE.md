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
    │   ├── chat.ts            # Giao tiếp với AI proxy (HTTP POST)
    │   ├── config.ts          # Quản lý cấu hình: đọc/ghi file config, API keys
    │   ├── crypto.ts          # Mã hóa/giải mã API keys (AES-256-GCM)
    │   ├── types.ts           # Định nghĩa interface Message, ApiMessage, ProviderConfig, v.v.
    │   │
    │   └── providers/         # Hệ thống multi-provider
    │       ├── base-provider.ts        # Abstract base class cho tất cả provider
    │       ├── registry.ts             # Provider registry: quản lý danh sách provider
    │       ├── openai-compatible.ts    # Provider cho OpenAI-compatible API
    │       ├── anthropic.ts            # Provider cho Anthropic (Claude)
    │       ├── google-gemini.ts        # Provider cho Google Gemini
    │       └── cohere.ts               # Provider cho Cohere
    │
    └── ui/                    # Tầng giao diện (React components)
        ├── app.tsx            # Component gốc: state management + orchestration
        │
        └── components/        # Các component con
            ├── TerminalTop.tsx        # Header: ASCII art, thông tin hệ thống, đồng hồ
            ├── TerminalMid.tsx        # Router component: điều hướng giữa các màn hình
            ├── TerminalBottom.tsx     # Input bar: nhập tin nhắn, gửi
            ├── ResponseBlock.tsx      # Hiển thị một tin nhắn (user/assistant) với border màu
            ├── LoadingIndicator.tsx   # Indicator loading khi AI đang trả lời
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
├──────────────────────────────────────────────────────────────────┤
│                       Service Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ chat.ts  │ │config.ts │ │ crypto.ts  │ │   providers/     │  │
│  │ (router) │ │(config)  │ │ (encrypt)  │ │ base, registry,  │  │
│  │          │ │          │ │            │ │ openai,anthropic, │  │
│  │          │ │          │ │            │ │ gemini, cohere    │  │
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
| `Message` | `role`, `content`, `timestamp` | Tin nhắn trong lịch sử chat |
| `ProviderConfig` | `id`, `name`, `type`, `apiKey`, `endpoint?`, `models` | Cấu hình một provider AI |
| `ModelConfig` | `id`, `name`, `providerId` | Cấu hình model thuộc provider |
| `AppConfig` | `providers`, `activeProvider`, `activeModel` | Cấu hình toàn ứng dụng |

### `src/services/config.ts` – Quản lý cấu hình
- Đọc/ghi file cấu hình JSON (`~/.lunacoding/config.json`)
- Quản lý danh sách provider, model, API keys
- Hỗ trợ: `loadConfig()`, `saveConfig()`, `addProvider()`, `removeProvider()`, `setActiveModel()`
- Tự động tạo file config mặc định nếu chưa tồn tại

### `src/services/crypto.ts` – Mã hóa API Keys
- Mã hóa API keys trước khi lưu vào config file
- Dùng thuật toán **AES-256-GCM** với key derivation từ machine UUID
- Hỗ trợ: `encrypt(plainText)`, `decrypt(encryptedText)`
- Key được derive từ `os.hostname()` + `os.userInfo().username` để mỗi máy có key riêng

### `src/services/providers/` – Hệ thống Multi-Provider

#### `base-provider.ts` – Abstract Base Class
- Định nghĩa interface chung cho tất cả provider: `sendMessage(messages, model, apiKey)`
- Các method abstract: `buildRequest()`, `parseResponse()`, `getHeaders()`
- Xử lý chung: retry logic, timeout, error normalization

#### `registry.ts` – Provider Registry
- Đăng ký và quản lý danh sách các provider implementation
- Hỗ trợ: `register()`, `getProvider(type)`, `listProviders()`
- Map type provider (string) → class implementation

#### `openai-compatible.ts` – OpenAI-Compatible Provider
- Hỗ trợ mọi API tương thích OpenAI (OpenAI, DeepSeek, xAI, v.v.)
- Endpoint: `{baseURL}/v1/chat/completions`
- Request format: `{ model, messages, temperature?, max_tokens? }`
- Response: `choices[0].message.content`

#### `anthropic.ts` – Anthropic Provider
- Hỗ trợ Anthropic Claude models
- Endpoint: `https://api.anthropic.com/v1/messages`
- Header: `x-api-key`, `anthropic-version: 2023-06-01`
- Request format: `{ model, max_tokens, messages }`
- Response: `content[0].text`

#### `google-gemini.ts` – Google Gemini Provider
- Hỗ trợ Google Gemini models
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- API key truyền qua query param `?key=`
- Request format: `{ contents: [{ parts: [{ text }] }] }`
- Response: `candidates[0].content.parts[0].text`

#### `cohere.ts` – Cohere Provider
- Hỗ trợ Cohere models
- Endpoint: `https://api.cohere.ai/v1/chat`
- Header: `Authorization: Bearer {API_KEY}`
- Request format: `{ model, message, chat_history? }`
- Response: `text`

### `src/services/chat.ts` – API Service
- **Endpoint:** `POST http://127.0.0.1:8080/v1/chat/completions`
- **Model:** `DeepSeek-R1-expert-search`
- **API Key:** `123456`
- **Header:** `Authorization: Bearer {API_KEY}`, `Content-Type: application/json`
- **Request body:** `{ model, messages }`
- **Response:** Lấy `choices[0].message.content`, nếu lỗi trả về thông báo lỗi thân thiện

### `src/ui/app.tsx` – Root Component
- **State:** `messages: Message[]`, `isLoading: boolean`
- **Luồng xử lý gửi tin nhắn:**
  1. Tạo `userMessage` từ input
  2. Append vào `messages`
  3. `setLoading(true)`
  4. Gọi `sendChatMessage([...messages, userMessage])`
  5. Nhận response, tạo `assistantMessage`
  6. Append vào `messages`
  7. `setLoading(false)`

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
- Nhận props: `uiMode`, `messages`, `isLoading`, và các callback điều hướng
- **Các mode (switch/case):**
  | Mode | Component render | Mô tả |
  |------|-----------------|-------|
  | `chat` | `ChatView` (internal) | Hiển thị lịch sử chat + loading indicator |
  | `provider-list` | `ProviderMenu` | Danh sách provider đã cấu hình |
  | `provider-type-select` | `ProviderTypeSelect` | Chọn loại provider để thêm |
  | `provider-add-form` | `ProviderAddForm` | Form nhập thông tin provider mới |
  | `model-list` | `ModelMenu` / `ModelAddInput` | Danh sách model hoặc form thêm model |
- **ChatView (internal component):**
  - Trạng thái rỗng: hiển thị "Chưa có tin nhắn nào..."
  - Mỗi tin nhắn được render qua `<ResponseBlock>`:
    - User: border xanh lá, icon 👤
    - Assistant: border vàng, icon 🤖
  - Khi `isLoading === true`: hiển thị `<LoadingIndicator>` thay vì text loading cũ

### `src/ui/components/ResponseBlock.tsx` – Hiển thị tin nhắn
- Nhận props: `message: Message`
- Bọc mỗi tin nhắn trong border `single` với màu theo role
- User: border xanh lá (`green`), icon 👤, role label "Bạn"
- Assistant: border vàng (`yellow`), icon 🤖, role label "LunaCoding"
- Hiển thị timestamp định dạng `toLocaleTimeString('vi-VN')`
- Wrap nội dung tin nhắn với `wrap="wrap"` để tự động xuống dòng

### `src/ui/components/LoadingIndicator.tsx` – Loading Indicator
- Hiển thị khi AI đang xử lý phản hồi
- Gồm icon 🤖 + text "LunaCoding đang trả lời..." + spinner động
- Dùng `ink-spinner` để hiển thị animation loading
- Màu sắc: dimColor cho text, icon 🤖 màu trắng

### `src/ui/components/TerminalBottom.tsx` – Input Bar
- Nhận props: `onSend: (input: string) => void`, `isLoading: boolean`
- Dùng `ink-text-input` cho ô nhập liệu
- Prompt `>` màu xanh lá (vàng khi loading)
- Placeholder thay đổi theo trạng thái loading
- Khi submit: gọi `onSend(value)` rồi reset input

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
| ink-spinner | (built-in) | Spinner loading |
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
sendChatMessage([...messages, userMessage])
        │
        ├─► POST → http://127.0.0.1:8080/v1/chat/completions
        │
        ▼
Response content
        │
        ├─► Tạo assistantMessage: Message
        ├─► setMessages(prev => [...prev, assistantMessage])
        ├─► setLoading(false)
        │
        ▼
TerminalMid re-render ← messages updated
TerminalBottom re-render ← isLoading = false