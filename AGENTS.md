# AGENTS.md - Hướng dẫn cho AI Agent làm việc với LunaCoding

## Tổng quan dự án

LunaCoding là **AI Coding Agent Harness** - chatbot AI chạy trên terminal, xây dựng bằng **React + Ink v4** và **TypeScript**. Ứng dụng giao tiếp với AI proxy qua HTTP để cung cấp trải nghiệm chat ngay trong terminal.

- **Stack:** React 18 + Ink 4 + TypeScript 5 + Axios
- **Runtime:** Node.js >= 16, ESM (`"type": "module"`)
- **Package manager:** npm (có sẵn `package-lock.json` và `bun.lock`)

## Quy tắc chung

1. **Luôn dùng TypeScript** - không viết file `.js` thuần
2. **Luôn dùng ESM import/export** - dự án cấu hình `"type": "module"`
3. **Giữ component nhỏ gọn, single responsibility**
4. **Không thay đổi cấu trúc thư mục** trừ khi có lý do chính đáng
5. **Giữ nguyên coding style hiện tại**: functional components, arrow functions, TypeScript interfaces
6. **Tất cả text trong UI phải là tiếng Việt** (ngoại trừ tên riêng, thuật ngữ kỹ thuật)

## Cấu trúc thư mục

```
src/
├── index.tsx                 # Entry point - KHÔNG sửa trừ khi thay đổi cách bootstrap
├── services/                 # Tầng dịch vụ, xử lý API
│   ├── chat.ts               # Gọi AI proxy, xử lý response/lỗi
│   └── types.ts              # Interface Message và các type liên quan
└── ui/                       # Tầng giao diện (React components)
    ├── app.tsx               # Root component, state management
    └── components/
        ├── TerminalTop.tsx    # Header: ASCII art + thông tin hệ thống
        ├── TerminalMid.tsx    # Chat history display
        └── TerminalBottom.tsx # Input bar + gửi tin nhắn
```

## Cách chạy dự án

```bash
# Dev (hot-reload với tsx)
npm run dev

# Build TypeScript → dist/
npm run build

# Type-check không emit
npm run typecheck

# Format + lint + test
npm test
```

**Lưu ý:** Ứng dụng cần AI proxy chạy tại `http://127.0.0.1:8080` để hoạt động. Nếu proxy không chạy, app vẫn mở được nhưng sẽ báo lỗi kết nối khi gửi tin nhắn.

## Component Tree & Data Flow

```
<App>                              ← State: messages[], isLoading
  ├── <TerminalTop />              ← Static (chỉ đọc file ASCII, đồng hồ)
  ├── <TerminalMid                 ← Props: messages, isLoading
  │     messages={messages}
  │     isLoading={isLoading}
  │   />
  └── <TerminalBottom              ← Props: onSend, isLoading
        onSend={handleSendMessage}
        isLoading={isLoading}
      />
```

### Luồng gửi tin nhắn:
```
1. User nhập text ở TerminalBottom → Enter
2. TerminalBottom gọi onSend(input)
3. App.handleSendMessage:
   a. Tạo userMessage: Message { role: 'user', content: input, timestamp: Date }
   b. setMessages(prev => [...prev, userMessage])
   c. setLoading(true)
   d. Gọi sendChatMessage([...messages, userMessage])
   e. Tạo assistantMessage: Message { role: 'assistant', content: response, timestamp: Date }
   f. setMessages(prev => [...prev, assistantMessage])
   g. setLoading(false)
4. TerminalMid re-render với messages mới
```

## Patterns & Conventions

### TypeScript
- Interface cho props của mỗi component (đặt tên `{ComponentName}Props`)
- Dùng `type` cho union types, `interface` cho object types
- File `.ts` cho pure logic/services, `.tsx` cho React components
- Import extension: luôn dùng `.js` (vd: `'./types.js'`) - đây là quy ước ESM của TypeScript

### React / Ink
- **Functional components** với arrow functions: `const Component = () => {}`
- **Default export** cho components
- **Named export** cho utility functions
- Không dùng class components
- `useState` cho state local của component
- `useEffect` cho side effects (đọc file, setInterval...)
- Props truyền trực tiếp, không dùng Context API

### Styling trong Ink
- Dùng các component của Ink: `<Box>`, `<Text>`
- Props layout: `flexDirection`, `padding`, `paddingX`, `paddingY`, `margin`, `marginBottom`, `marginTop`, `marginX`, `marginY`, `flexGrow`, `justifyContent`, `alignItems`
- Props text: `color`, `backgroundColor`, `bold`, `dimColor`, `wrap`
- Props border: `borderStyle` ('single', 'round'), `borderColor`
- Màu sắc: tên màu chuẩn (red, green, yellow, blue, magenta, cyan, white, gray) hoặc mã hex

### API Service (chat.ts)
- Endpoint: `http://127.0.0.1:8080/v1/chat/completions`
- Model: `DeepSeek-R1-expert-search`
- API Key: `123456`
- Request format: `{ model, messages: [{ role, content }] }`
- Response format: `{ choices: [{ message: { content } }] }`
- Xử lý lỗi: trả về string thông báo lỗi (không throw), để UI hiển thị

## Những điều cần lưu ý

### Khi thêm tính năng mới:
1. **Type trước, code sau** - định nghĩa interface/types trong `types.ts` hoặc file types riêng
2. **Service trong `src/services/`** - logic gọi API, xử lý dữ liệu
3. **UI trong `src/ui/components/`** - React components thuần UI
4. **Kết nối trong `app.tsx`** - state management và orchestration

### Khi sửa TerminalTop.tsx:
- File này phức tạp nhất dự án (~467 dòng), chứa toàn bộ logic parse ASCII art và màu sắc
- Hệ thống tag màu: `[color]text[/color]`, `[random]`, `[bg:color]`, `[gradient:...]`
- Theme màu định nghĩa trong object `THEME_COLORS`
- Command `#color` trong file ASCII để đổi màu mặc định
- Đọc file bất đồng bộ với `fs/promises`

### Khi sửa TerminalMid.tsx:
- Messages hiển thị với border màu khác nhau cho user (green) và assistant (yellow)
- Có trạng thái empty state và loading state
- Timestamp format: `toLocaleTimeString('vi-VN')`

### Khi sửa TerminalBottom.tsx:
- Dùng `ink-text-input` (không phải input HTML thông thường)
- Tự quản lý state `inputValue` nội bộ
- Disable input khi `isLoading === true`

### Những thứ KHÔNG nên làm:
- **Không** thêm dependency mới mà không có lý do rõ ràng
- **Không** đổi ESM sang CJS (`"type": "module"` là bắt buộc)
- **Không** thay đổi API endpoint/model trừ khi được yêu cầu
- **Không** bọc App trong StrictMode - Ink không tương thích
- **Không** dùng CSS hoặc classNames - Ink không hỗ trợ

## File dữ liệu tĩnh

| File | Định dạng | Mục đích |
|------|-----------|----------|
| `ascii-art.txt` | Text + tag màu | Logo trang trí bên trái TerminalTop |
| `ascii-name.txt` | Text + tag màu | Chữ "LunaCoding" bên phải TerminalTop |
| `ascii-art-example-colored.txt` | Text + tag màu | File mẫu hướng dẫn cú pháp |
| `color-palette.md` | Markdown | Tài liệu tham khảo màu sắc |