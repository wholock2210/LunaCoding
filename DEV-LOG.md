# DEV-LOG — LunaCoding

## [1] 2026-05-05 — Quản lý Provider & Model
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Tích hợp hệ thống quản lý nhiều AI provider (4 loại) và model, cho phép người dùng chuyển đổi linh hoạt giữa các provider ngay trong terminal. API key được mã hóa an toàn bằng AES-256-GCM.

### Các bước đã triển khai

#### 1. Types & Cấu trúc dữ liệu (`src/services/types.ts`)
- Thêm `ProviderType`: `'openai' | 'anthropic' | 'google-gemini' | 'cohere'`
- Thêm `ProviderConfig`: cấu hình provider (id, type, name, endpoint, apiKey, models)
- Thêm `ModelInfo`: thông tin model (id, name, providerId)
- Thêm `AppConfig`: cấu trúc setting.json (providers, currentProvider, currentModel)
- Thêm `UiMode`: `'chat' | 'provider-menu' | 'provider-select' | 'provider-add' | 'model-menu' | 'model-add'`

#### 2. Mã hóa API Key (`src/services/crypto.ts`)
- AES-256-GCM encrypt/decrypt qua Node.js `crypto`
- Key derivation từ machine ID (hostname + username + arch)
- Base64 encode/decode cho ciphertext

#### 3. Quản lý cấu hình (`src/services/config.ts`)
- Đọc/ghi `~/.LunaCoding/setting.json`
- Tự động tạo config mặc định nếu chưa có
- Mã hóa API key khi ghi, giải mã khi đọc
- Các hàm: `loadConfig()`, `saveConfig()`, `addProvider()`, `removeProvider()`, `setCurrentProvider()`, `addModelToProvider()`

#### 4. Base Provider (`src/services/providers/base-provider.ts`)
- Abstract class `BaseProvider` với các method:
  - `chat(messages, modelId)`: gửi chat request
  - `listModels()`: lấy danh sách model
  - `testConnection()`: kiểm tra kết nối

#### 5. OpenAI Compatible (`src/services/providers/openai-compatible.ts`)
- Hỗ trợ OpenAI và mọi API tương thích (OpenRouter, Together, v.v.)
- Chat completions endpoint: `/v1/chat/completions`
- List models endpoint: `/v1/models`

#### 6. Anthropic (`src/services/providers/anthropic.ts`)
- Anthropic Messages API
- Header `x-api-key` + `anthropic-version: 2023-06-01`

#### 7. Google Gemini (`src/services/providers/google-gemini.ts`)
- Google Generative Language API
- Generate content endpoint với model path

#### 8. Cohere (`src/services/providers/cohere.ts`)
- Cohere Chat API v2
- Bearer token authentication

#### 9. Provider Registry (`src/services/providers/registry.ts`)
- Factory function tạo provider instance từ `ProviderConfig`
- `getAvailableProviderTypes()`: danh sách 4 loại

#### 10. Chat Service (`src/services/chat.ts`)
- Sửa: dùng `currentProvider` từ config thay vì hằng số cứng
- Tự động chọn model hiện tại từ provider

#### 11. UI — Provider Menu (`src/ui/components/`)
- `ProviderMenu.tsx`: danh sách provider, scroll 5 items/trang, ký hiệu ↑↓
- `ProviderTypeSelect.tsx`: chọn 1 trong 4 loại provider
- `ProviderAddForm.tsx`: form nhập name, endpoint, API key, model

#### 12. UI — Model Menu (`src/ui/components/`)
- `ModelMenu.tsx`: danh sách model, scroll 5 items/trang, merge trùng tên
- `ModelAddInput.tsx`: input thêm model thủ công

#### 13. Tích hợp UI (`src/ui/`)
- `app.tsx`: thêm `UiMode` state machine, xử lý navigation giữa các màn hình
- `TerminalMid.tsx`: render theo `uiMode` (chat hoặc menu)
- `TerminalBottom.tsx`: parse lệnh `/provider`, `/model`; dual mode input

### Kiến trúc thư mục
```
src/
├── services/
│   ├── types.ts              ← Đã sửa: thêm ProviderConfig, ModelInfo, AppConfig
│   ├── config.ts             ← MỚI: đọc/ghi ~/.LunaCoding/setting.json
│   ├── crypto.ts             ← MỚI: AES-256-GCM encrypt/decrypt
│   ├── providers/
│   │   ├── base-provider.ts  ← MỚI: abstract class
│   │   ├── openai-compatible.ts ← MỚI
│   │   ├── anthropic.ts      ← MỚI
│   │   ├── google-gemini.ts  ← MỚI
│   │   ├── cohere.ts         ← MỚI
│   │   └── registry.ts      ← MỚI: factory
│   └── chat.ts               ← Đã sửa: dùng currentProvider
├── ui/
│   ├── app.tsx               ← Đã sửa: UiMode state machine
│   └── components/
│       ├── TerminalMid.tsx   ← Đã sửa: render theo uiMode
│       ├── TerminalBottom.tsx ← Đã sửa: lệnh /provider, /model
│       ├── ProviderMenu.tsx  ← MỚI
│       ├── ProviderTypeSelect.tsx ← MỚI
│       ├── ProviderAddForm.tsx ← MỚI
│       ├── ModelMenu.tsx     ← MỚI
│       └── ModelAddInput.tsx ← MỚI
```

## [2] 2026-05-06 — Tinh chỉnh UI Chat & Tổ chức component
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Tách nhỏ component chat, đơn giản hóa giao diện hiển thị tin nhắn.

### Các thay đổi
- **ResponseBlock.tsx**: Tách component hiển thị phản hồi AI riêng (`●` xám + nội dung wrap)
- **LoadingIndicator.tsx**: Tách component loading spinner riêng
- **TerminalMid.tsx**:
  - Import và dùng `<ResponseBlock />` thay cho code inline
  - Import và dùng `<LoadingIndicator />` thay cho text "🤖 Đang trả lời..."
  - User message giữ `❯` prefix, không border, không background, không timestamp
   - Container ngoài giữ `borderStyle="round" borderColor="blue"`

## [3] 2026-05-06 — Sửa xung đột phím Q trong input UI Provider
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Sửa lỗi phím `Q` bị bắt bởi `useInput` toàn cục khi người dùng đang gõ trong `TextInput`, khiến form bị quay lại bước trước không mong muốn. Thay thế toàn bộ phím `Q` bằng phím `Esc` (`key.escape`).

### Các thay đổi
- **ProviderAddForm.tsx**: Xóa block bắt `q`/`Q`, giữ lại block `key.escape` có sẵn. Cập nhật hướng dẫn UI `Q` → `Esc`.
- **ModelAddInput.tsx**: Thay `input === 'q'` bằng `key.escape`. Cập nhật text thông báo thành công và hướng dẫn UI `Q` → `Esc`.
- **ProviderTypeSelect.tsx**: Thay `input === 'q'` bằng `key.escape`. Cập nhật hướng dẫn UI `Q` → `Esc`.

### Lý do
Phím `Esc` không bao giờ xung đột với `TextInput` vì `TextInput` không nhận ký tự Escape làm input text, trong khi `Q` là ký tự thông thường dễ bị gõ khi nhập liệu.

## [4] 2026-05-06 — Hiển thị Reasoning/Thinking & Token Count
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Tích hợp hiển thị quá trình suy nghĩ (reasoning/thinking) của model và thống kê token usage cho từng phản hồi. Người dùng có thể bật/tắt xem suy nghĩ bằng phím `Ctrl+O`.

### Các thay đổi

#### 1. Types & Data Flow (`src/services/types.ts`)
- **`Message`**: Thêm các field tùy chọn:
  - `reasoningContent?: string` — nội dung suy nghĩ của model
  - `reasoningTokens?: number` — số token dành cho suy nghĩ
  - `completionTokens?: number` — số token của phản hồi (không tính suy nghĩ)
  - `totalTokens?: number` — tổng token đã dùng
- **`ChatCompletionResult`**: Interface mới cho kết quả chat:
  - `content: string` — nội dung phản hồi
  - `reasoning?: string` — nội dung suy nghĩ (nếu có)
  - `usage?: { promptTokens, completionTokens, reasoningTokens, totalTokens }`

#### 2. Base Provider & Tất cả Provider (`src/services/providers/`)
- **`base-provider.ts`**: Đổi signature `chat()` trả về `Promise<ChatCompletionResult>` (trước đây là `Promise<string>`)
- **`openai-compatible.ts`**: Parse `reasoning_content` và `usage` (bao gồm `reasoning_tokens`) từ response OpenAI-compatible
- **`anthropic.ts`**, **`cohere.ts`**, **`google-gemini.ts`**: Cập nhật trả về `ChatCompletionResult` với `usage` khi có

#### 3. Chat Service (`src/services/chat.ts`)
- `sendChatMessage()` trả về `ChatCompletionResult` thay vì `string`

#### 4. UI — App State (`src/ui/app.tsx`)
- Thêm state `expandedThinkingIndices: Set<number>` để theo dõi index nào đang mở thinking
- Thêm `useInput` bắt `Ctrl+O`: toggle tất cả các khối suy nghĩ (mở tất cả hoặc đóng tất cả)
- `handleSendMessage`: parse `ChatCompletionResult`, tạo `Message` với đầy đủ `reasoningContent`, `reasoningTokens`, `completionTokens`, `totalTokens`

#### 5. UI — Loading Indicator (`src/ui/components/LoadingIndicator.tsx`)
- Thêm prop `text?: string` cho phép tùy chỉnh text loading (mặc định "LunaCoding đang trả lời")
- Hiệu ứng sóng màu chạy qua text

#### 6. UI — Chat View (`src/ui/components/TerminalMid.tsx`)
- `ChatView` component nhận thêm `expandedThinkingIndices` prop
- Truyền `isThinkingExpanded` và `onToggleThinking` vào từng `ResponseBlock`
- Khi `isLoading`: hiển thị `<LoadingIndicator text="đang suy nghĩ..." />` kèm dòng hướng dẫn `ctrl + o để xem suy nghĩ`

#### 7. UI — Response Block (`src/ui/components/ResponseBlock.tsx`)
- Viết lại hoàn toàn component:
  - **Thinking toggle row**: Hiển thị `▶ Suy nghĩ (N tk) (ctrl+o để mở/đóng)` khi có reasoning content
  - **Expanded thinking content**: Khi mở, hiển thị toàn bộ `reasoningContent` với màu xám, prefix `│`
  - **Token info footer**: Hiển thị `{completionTokens} tk phản hồi · tổng {totalTokens} tk` ở góc phải
  - Bỏ `index` và `onToggleThinking` props (toggle được xử lý qua Ctrl+O toàn cục)

### Trải nghiệm người dùng
- Nhấn `Ctrl+O` để toggle tất cả khối suy nghĩ trong lịch sử chat
- Mỗi phản hồi assistant hiển thị token count đầy đủ
- Khi AI đang trả lời, loading text là "đang suy nghĩ..." kèm gợi ý phím tắt