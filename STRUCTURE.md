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
    ├── services/              # Tầng dịch vụ (API, types)
    │   ├── chat.ts            # Giao tiếp với AI proxy (HTTP POST)
    │   └── types.ts           # Định nghĩa interface Message, ApiMessage, etc.
    │
    └── ui/                    # Tầng giao diện (React components)
        ├── app.tsx            # Component gốc: state management + orchestration
        │
        └── components/        # Các component con
            ├── TerminalTop.tsx    # Header: ASCII art, thông tin hệ thống, đồng hồ
            ├── TerminalMid.tsx    # Vùng chat: hiển thị lịch sử tin nhắn
            └── TerminalBottom.tsx # Input bar: nhập tin nhắn, gửi
```

## Kiến trúc tổng quan

LunaCoding là ứng dụng **AI Chatbot chạy trên terminal** theo mô hình 3 lớp:

```
┌─────────────────────────────────────────────────┐
│                    UI Layer                       │
│  (React + Ink)                                   │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │TerminalTop │ │TerminalMid │ │TerminalBottom│ │
│  └────────────┘ └────────────┘ └──────────────┘ │
│                      ↕                           │
│              App (state hub)                     │
├─────────────────────────────────────────────────┤
│                  Service Layer                    │
│  ┌──────────────────┐ ┌────────────────────┐    │
│  │  chat.ts         │ │  types.ts          │    │
│  │  sendChatMessage │ │  Message interface │    │
│  └──────────────────┘ └────────────────────┘    │
│                      ↕                           │
│              AI Proxy (HTTP)                      │
│         http://127.0.0.1:8080                    │
└─────────────────────────────────────────────────┘
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

### `src/ui/components/TerminalMid.tsx` – Chat History
- Nhận props: `messages: Message[]`, `isLoading: boolean`
- Trạng thái rỗng: hiển thị "Chưa có tin nhắn nào..."
- Trạng thái loading: hiển thị "🤖 LunaCoding đang trả lời..."
- Mỗi tin nhắn được bọc trong border `single`:
  - User: border xanh lá, icon 👤
  - Assistant: border vàng, icon 🤖
- Hiển thị timestamp mỗi tin nhắn

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