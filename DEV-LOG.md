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

## [5] 2026-05-06 — Streaming (Thinking + Response)
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Triển khai streaming cho cả thinking (reasoning) và response (nội dung chính), giúp người dùng thấy nội dung theo thời gian thực thay vì phải chờ toàn bộ phản hồi hoàn tất.

### Các thay đổi

#### 1. Types (`src/services/types.ts`)
- Thêm `ChatStreamChunk` interface với các type: `'reasoning' | 'content' | 'done'`
- Mỗi chunk có thể chứa `text?` và `usage?`

#### 2. Base Provider (`src/services/providers/base-provider.ts`)
- Thêm abstract method `chatStream(messages, model?): AsyncIterable<ChatStreamChunk>`
- Tất cả provider bắt buộc phải implement

#### 3. OpenAI Compatible Provider (`src/services/providers/openai-compatible.ts`)
- Implement `chatStream()` với SSE parsing:
  - Gọi API với `"stream": true`, `responseType: 'stream'`
  - Parse từng dòng SSE (`data: {...}`)
  - Phân biệt chunk: `delta.reasoning_content` → reasoning, `delta.content` → content
  - Chunk có `usage` → done kèm token count
  - Fallback done khi stream kết thúc hoặc lỗi

#### 4. Chat Service (`src/services/chat.ts`)
- Thêm `sendChatMessageStream(messages): AsyncIterable<ChatStreamChunk>`
- Async generator gọi `provider.chatStream()` và yield từng chunk

#### 5. App State (`src/ui/app.tsx`)
- Thêm state: `isStreaming: boolean`, `streamingPhase: 'thinking' | 'responding' | null`
- Viết lại `handleSendMessage`:
  - Tạo placeholder assistantMessage (content rỗng) → append ngay vào messages
  - `for await (chunk)` cập nhật trực tiếp `messages[N].content` và `messages[N].reasoningContent`
  - Khi gặp chunk reasoning đầu tiên → `setStreamingPhase('thinking')`
  - Khi gặp chunk content đầu tiên → `setStreamingPhase('responding')`
  - Khi chunk done → `setStreamingPhase(null)`, cập nhật token usage
- `Ctrl+O` khi đang streaming: toggle thinking của message đang được stream

#### 6. TerminalMid (`src/ui/components/TerminalMid.tsx`)
- `ChatModeProps` thêm `isStreaming: boolean`, `streamingPhase: 'thinking' | 'responding' | null`
- `ChatView`: LoadingIndicator đặt ở dưới cùng khung chat
  - `streamingPhase === 'thinking'` → hiển thị `<LoadingIndicator text="thinking..." />`
  - `streamingPhase === 'responding'` → hiển thị `<LoadingIndicator text="responding..." />`
  - Không streaming nhưng isLoading → hiển thị `<LoadingIndicator text="đang suy nghĩ..." />` (fallback)
- `ResponseBlock` nhận thêm prop `isStreaming` (true cho message cuối cùng đang stream)

#### 7. ResponseBlock (`src/ui/components/ResponseBlock.tsx`)
- Thêm prop `isStreaming?: boolean`
- Khi `isStreaming`:
  - Hiển thị cursor `▍` nhấp nháy ở cuối content
  - Ẩn token count footer (sẽ hiện khi stream hoàn tất)
  - Thinking header hiển thị "(đang cập nhật...)" thay vì token count

#### 8. Fallback cho Anthropic, Cohere, Gemini
- Cả 3 provider implement `chatStream()` dạng fallback:
  - Gọi `chat()` để lấy toàn bộ response
  - Yield 1 chunk `content` với toàn bộ nội dung
  - Yield 1 chunk `done` với usage
- Không hỗ trợ streaming thực sự, nhưng đảm bảo UI hoạt động nhất quán

### Trải nghiệm người dùng
| Thời điểm | Hiển thị |
|-----------|----------|
| Vừa gửi tin nhắn | Placeholder `● ▍` xuất hiện ngay |
| Model đang suy nghĩ | `▼ Suy nghĩ (đang cập nhật...)` + reasoning hiện dần |
| Model đang trả lời | Nội dung response xuất hiện từng chữ, cursor `▍` nhấp nháy |
| Ctrl+O lúc streaming | Toggle ẩn/hiện phần thinking của message đang stream |
| Hoàn tất | Token count xuất hiện, cursor biến mất |

## [6] 2026-05-06 — Gợi ý lệnh Slash (Autocomplete)
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Thêm chức năng tự động gợi ý lệnh khi người dùng nhập `/` trong input chat. Danh sách lệnh được đăng ký tập trung trong một file riêng, hỗ trợ tìm kiếm mờ, tự động hoàn thành bằng phím Tab.

### Các thay đổi

#### 1. File đăng ký lệnh (`src/services/commands.ts`) — MỚI
- Định nghĩa mảng `registeredCommands` chứa tất cả lệnh slash:
  - `/provider` (alias `/providers`) — Quản lý provider
  - `/model` (alias `/models`) — Quản lý model
  - `/help` (alias `/h`) — Trợ giúp
- Mỗi lệnh có `name`, `description` (tiếng Việt), và `aliases?` tùy chọn
- Hàm `filterCommands(query)`: lọc lệnh theo chuỗi sau dấu `/`, tìm kiếm mờ trên cả tên chính và alias
- Hàm `isKnownCommand(input)`: kiểm tra input có khớp chính xác với một lệnh đã đăng ký (hỗ trợ cả tên chính, alias, và lệnh kèm tham số)
- Hàm `getAllCommandNames()`: trả về mảng phẳng tất cả tên lệnh và alias

#### 2. Types (`src/services/types.ts`)
- Thêm interface `Command` với `name: string`, `description: string`, `aliases?: string[]`

#### 3. TerminalBottom (`src/ui/components/TerminalBottom.tsx`)
- **Import** `useCallback`, `useMemo`, `useInput` từ Ink; `filterCommands`, `isKnownCommand` từ `commands.ts`
- **State `showSuggestions`**: kiểm soát hiển thị khung gợi ý
- **`useMemo` tính `suggestions`**: lọc lệnh dựa trên input hiện tại (chỉ khi bắt đầu bằng `/`)
- **`handleChange`**: mở gợi ý khi input bắt đầu bằng `/` và chưa có khoảng trắng; đóng gợi ý khi ngược lại
- **`useInput` (Tab)**: khi đang hiện gợi ý và có ít nhất một lệnh khớp → tự động điền lệnh đầu tiên kèm dấu cách, đóng gợi ý
- **`renderSuggestions()`**: hiển thị danh sách lệnh khớp với `💡` màu vàng đậm, alias trong ngoặc đơn, mô tả dim; khi không có lệnh khớp hiện thông báo hướng dẫn gõ `/help`
- **`handleSubmit`**: thay thế mảng `knownCommands` cứng bằng `isKnownCommand()`, hành vi giữ nguyên
- Cập nhật placeholder và hint text phù hợp với tính năng mới

### Cách hoạt động
| Thao tác | Kết quả |
|----------|---------|
| Gõ `/` | Hiện toàn bộ danh sách lệnh kèm mô tả |
| Gõ `/pro` | Danh sách thu hẹp chỉ còn `/provider` |
| Nhấn **Tab** | Tự động điền lệnh đầu tiên + dấu cách (vd: `/provider `) |
| Nhấn **Enter** | Thực thi lệnh (hành vi không đổi) |
| Gõ lệnh không tồn tại + Enter | App hiển thị thông báo lỗi "Lệnh không được hỗ trợ" |

## [7] 2026-05-06 — Hệ thống Logging, Error Handling, Tool Calling & Stability
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Tích hợp hệ thống logging để debug, error handling toàn diện cho streaming, framework tool calling cho phép AI gọi công cụ (bắt đầu với `read-file`), XML parser thô cho provider không hỗ trợ native tool calling, stable mode giúp ổn định IME tiếng Việt, và sửa nhiều lỗi streaming + crash UI.

### Các thay đổi

#### 1. Hệ thống Logging (`src/services/logger.ts`) — MỚI
- Ghi log xoay vòng vào `~/.LunaCoding/logs/lunacoding.log`
- Giới hạn **1000 dòng** cuối, tự động cắt dòng cũ
- Hàm `log(level, message, meta?)`: ghi log với timestamp, level (DEBUG/INFO/WARN/ERROR/FATAL) và metadata JSON
- Hàm `logError(context, error)`: ghi log ERROR kèm stack trace
- Hàm `getLogs(lines?)`: đọc N dòng log cuối (mặc định 50)
- Hàm `clearLogs()`: xóa toàn bộ file log
- Tự động tạo thư mục `~/.LunaCoding/logs/` với permission `0o700`

#### 2. Lệnh `/logs` — Xem log hệ thống
- Đăng ký trong `commands.ts`: `/logs` (alias `/logs all`, `/logs clear`)
- Xử lý trong `app.tsx`:
  - `/logs` → hiển thị 50 dòng log cuối trong khung code block
  - `/logs all` → hiển thị toàn bộ log
  - `/logs clear` → xóa log và hiển thị thông báo xác nhận
- Log được format trong markdown code block để dễ đọc

#### 3. Error Handling trong Streaming
- **`types.ts`**: Thêm type `'error'` vào `ChatStreamChunk` với field `error?: string`
- **`chat.ts`**: `sendChatMessageStream()` bọc try-catch quanh `provider.chatStream()`, yield chunk `{ type: 'error', error: message }` khi có lỗi, ghi log lỗi qua `logError()`
- **`app.tsx`**: Xử lý chunk `error`:
  - Hiển thị nội dung lỗi thân thiện với prefix `● LunaCoding:`
  - Kèm gợi ý `💡 Dùng \`/logs\` để xem chi tiết lỗi.`
  - Kết thúc stream ngay, đặt `streamingPhase = null`
- **Tất cả provider**: Thêm `logError()` khi axios request thất bại (`chat()`, `testConnection()`, `listModels()`)
- **`registry.ts`**: Log khi tạo provider instance mới

#### 4. Tool Calling Framework (`src/services/tools/`) — MỚI
- **`types.ts`**: Định nghĩa interface `Tool`, `ToolCall`, `ToolResult`, `NativeToolFormat`, `ToolRegistry`
- **`registry.ts`**: `ToolRegistry` class quản lý danh sách tool:
  - `register(tool)`: đăng ký một tool mới
  - `get(name)`: lấy tool theo tên
  - `getAll()`: lấy tất cả tool đã đăng ký
  - `getNativeTools(format)`: trả về tool schema theo format native (OpenAI, Anthropic)
  - `execute(name, args)`: thực thi tool và trả về `ToolResult`
  - `toToolMessages(results)`: chuyển kết quả tool thành messages
- **`read-file.ts`**: Tool "read_file" — đọc nội dung file từ đường dẫn, giới hạn 50000 ký tự
- **`index.ts`**: Export toàn bộ tool system, tự động đăng ký `read-file`

#### 5. XML Parser thô (`src/services/xml-parser.ts`) — MỚI
- Parse XML tool call từ text response (dành cho provider không hỗ trợ native tool calling)
- Hỗ trợ cú pháp:
  ```xml
  <tool_call>
  <name>read_file</name>
  <arguments>{"path": "/path/to/file"}</arguments>
  </tool_call>
  ```
- Hàm `parseXmlToolCalls(text)`: trả về mảng `ToolCall[]` từ text
- Hàm `hasXmlToolCalls(text)`: kiểm tra text có chứa tool call XML không
- Xử lý nhiều tool call trong cùng một response
- Hỗ trợ XML comment và khoảng trắng linh hoạt

#### 6. Lệnh `/tool-mode` & `/tm` — Quản lý chế độ gọi tool
- Đăng ký trong `commands.ts`: `/tool-mode`, `/tm` (alias)
- Xử lý trong `app.tsx`:
  - `/tool-mode` hoặc `/tm` → hiển thị chế độ hiện tại và hướng dẫn các chế độ
  - `/tool-mode auto` → tự động dùng native nếu provider hỗ trợ, nếu không thì parse XML
  - `/tool-mode native` → luôn dùng native tool calling
  - `/tool-mode xml` → luôn parse XML tool call từ text
- Lưu chế độ vào config qua `setToolParseMode()`
- Thêm `ToolParseMode` type vào `types.ts`: `'auto' | 'native' | 'xml'`

#### 7. Stable Mode (`Ctrl+I`) — Ổn định IME tiếng Việt
- **Vấn đề**: Khi streaming, `setMessages()` gây re-render `TerminalBottom`, làm mất focus/con trỏ IME (fcitx-bamboo)
- **Giải pháp**: Stable Mode — khi bật (`Ctrl+I`), stream buffer thay đổi vào `streamBufferRef` thay vì gọi `setMessages()`. Khi tắt stable mode, `useEffect` flush buffer vào state.
- **State**: `stableMode: boolean` + `stableModeRef`
- **Buffer**: `streamBufferRef` chứa `messages`, `placeholderIdx`, `thinkingText`, `responseText`, `finalUsage`, `finished`
- **`Ctrl+I`**: toggle stable mode bất kỳ lúc nào
- **Khi tắt stable mode**: flush toàn bộ buffer vào state, cập nhật `streamingPhase` và `messages`

#### 8. Sửa lỗi streaming — Parse sai cấu trúc JSON SSE
- **`openai-compatible.ts` — `chatStream()`**:
  - **Lỗi**: Code cũ parse `json?.delta` nhưng dữ liệu thực tế từ proxy có cấu trúc `{ choices: [{ delta: {...} }] }`
  - **Sửa**: Parse đúng `data?.choices?.[0]?.delta` thay vì `json?.delta`
  - **`finish_reason`**: Lấy từ `choice?.finish_reason` thay vì `json?.finish_reason`
  - **`stream_options`**: Comment `stream_options: { include_usage: true }` vì không tương thích với một số proxy tự host (DeepSeek, v.v.)
  - **Log lỗi parse**: Thêm `logError()` khi parse dòng SSE thất bại để dễ debug

#### 9. Sửa crash `ResponseBlock` — Guard clause cho content undefined
- **Lỗi**: `Cannot read properties of undefined (reading 'split')` tại `ResponseBlock.tsx:27`
- **Nguyên nhân**: `msg.content` có thể là `undefined` khi stream bị gián đoạn trước chunk content đầu tiên
- **Sửa**:
  - `splitContent()`: Thêm `if (!content) return [];` ở đầu hàm
  - `reasoningContent`: Thay `reasoningContent.split('\n')` thành `(reasoningContent || '').split('\n')`

#### 10. `resolveEndpoint()` helper — Tránh duplicate `/v1`
- **`base-provider.ts`**: Thêm method `resolveEndpoint(path: string): string`
  - Nếu `path` bắt đầu bằng `/v1` VÀ `baseUrl` đã kết thúc bằng `/v1` → tự động cắt bỏ `/v1` khỏi path
  - Ngược lại, nối bình thường: `baseUrl + path`
- **Tất cả provider**: Sử dụng `this.resolveEndpoint('/v1/...')` thay vì nối thủ công `${this.baseUrl}/v1/...`

### Kiến trúc thư mục (cập nhật)
```
src/
├── services/
│   ├── types.ts              ← Đã sửa: thêm ChatStreamChunk type 'error', 'tool_call'; ToolParseMode
│   ├── chat.ts               ← Đã sửa: error handling try-catch, yield chunk error, log lỗi
│   ├── logger.ts             ← MỚI: hệ thống log xoay vòng
│   ├── xml-parser.ts         ← MỚI: parse XML tool call thô từ text
│   ├── commands.ts           ← Đã sửa: thêm lệnh /logs, /tool-mode, /tm
│   ├── config.ts             ← Đã sửa: thêm getToolParseMode(), setToolParseMode()
│   ├── providers/
│   │   ├── base-provider.ts  ← Đã sửa: thêm resolveEndpoint() helper
│   │   ├── registry.ts       ← Đã sửa: log khi tạo provider
│   │   ├── openai-compatible.ts ← Đã sửa: parse đúng SSE, comment stream_options, resolveEndpoint, log lỗi
│   │   ├── anthropic.ts      ← Đã sửa: resolveEndpoint, log lỗi
│   │   ├── google-gemini.ts  ← Đã sửa: resolveEndpoint, log lỗi
│   │   └── cohere.ts         ← Đã sửa: resolveEndpoint, log lỗi
│   └── tools/                ← MỚI: framework tool calling
│       ├── types.ts          ← Định nghĩa Tool, ToolCall, ToolResult
│       ├── registry.ts       ← ToolRegistry class
│       ├── read-file.ts      ← Tool "read_file"
│       └── index.ts          ← Export + auto-register
└── ui/
    ├── app.tsx               ← Đã sửa: xử lý chunk error, lệnh /logs, /tool-mode, stable mode (Ctrl+I)
    └── components/
        └── ResponseBlock.tsx ← Đã sửa: guard clause cho content undefined
```

### Lệnh slash mới
| Lệnh | Alias | Chức năng |
|------|-------|-----------|
| `/logs` | — | Xem 50 dòng log cuối |
| `/logs all` | — | Xem toàn bộ log |
| `/logs clear` | — | Xóa log |
| `/tool-mode` | `/tm` | Xem chế độ gọi tool hiện tại |
| `/tool-mode auto` | `/tm auto` | Tự động chọn native/xml |
| `/tool-mode native` | `/tm native` | Luôn dùng native tool calling |
| `/tool-mode xml` | `/tm xml` | Luôn parse XML từ text |

### Phím tắt mới
| Phím | Chức năng |
|------|-----------|
| `Ctrl+I` | Toggle Stable Mode — ổn định IME tiếng Việt khi streaming |

## [8] 2026-05-09 — Thiết kế lại UI: Chế độ Tóm tắt / Chi tiết
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Thiết kế lại toàn bộ hệ thống hiển thị thinking và tool calls. Thay thế cơ chế `expandedThinkingIndices`/`expandedToolIndices` phức tạp bằng **1 state boolean `detailMode`** duy nhất. Người dùng có 2 chế độ view:
- **Tóm tắt (mặc định):** Ẩn nội dung thinking, tool hiển thị compact 1 dòng
- **Chi tiết:** Hiển thị toàn bộ suy nghĩ và tool args/result
- **Ctrl+O** hoặc lệnh **`/expand`** toggle giữa 2 chế độ

### Các thay đổi

#### 1. `src/ui/app.tsx`
- Xóa state `expandedThinkingIndices`, `expandedToolIndices` và các Ref liên quan
- Xóa `useEffect` auto-expand
- Thêm `const [detailMode, setDetailMode] = useState(false)`
- `Ctrl+O` handler: `setDetailMode(prev => !prev)`
- Lệnh `/expand`: toggle `detailMode`, hiển thị thông báo chế độ mới
- Truyền `detailMode` thay vì `expandedThinkingIndices`/`expandedToolIndices` vào `chatProps`
- Xóa logic tự động mở thinking khi bắt đầu stream (`setExpandedThinkingIndices`)

#### 2. `src/ui/components/TerminalMid.tsx`
- `ChatModeProps`: bỏ `expandedThinkingIndices: Set<number>`, `expandedToolIndices: Set<number>`, thêm `detailMode: boolean`
- `ChatView`: nhận và truyền `detailMode` xuống `ResponseBlock`
- Router: truyền `detailMode={chatProps.detailMode}` thay vì các expanded sets

#### 3. `src/ui/components/ResponseBlock.tsx` — Viết lại hoàn toàn
- **Props mới:** `detailMode: boolean` thay thế `isThinkingExpanded` + `isToolExpanded`
- **6 sub-components mới:**
  - `ThinkingSummary` — Dòng tóm tắt: `🧠 Đã suy nghĩ (N tk)` hoặc `🧠 Đang suy nghĩ...`
  - `ThinkingPanel` — Panel chi tiết: `▼ Suy nghĩ` + toàn bộ nội dung với prefix `│`
  - `CompactToolRow` — Tool gọn: `✓ Đọc file thành công (main.ts)` hoặc `▶ Đang tìm kiếm...`
  - `DetailToolRow` — Tool chi tiết: tên, arguments (JSON), result, trạng thái
  - `StreamDot` — Animation "..." cho tool đang chạy
- **Helpers:** `getStateColor()`, `getStateIcon()`, `getToolDisplayName()`, `getFileName()`, `formatArgs()`
- **Footer:** Token count + hint `Ctrl+O để xem chi tiết` (chỉ hiện ở chế độ Tóm tắt khi có thinking/tool)
- Xóa toàn bộ code cũ: `splitContent()`, tool block parsing inline, logic toggle phức tạp

### Kiến trúc thư mục (cập nhật)
```
src/
├── ui/
│   ├── app.tsx               ← Đã sửa: detailMode thay expanded sets
│   └── components/
│       ├── TerminalMid.tsx   ← Đã sửa: ChatModeProps đổi interface
│       └── ResponseBlock.tsx ← VIẾT LẠI: 2 chế độ view + 6 sub-components
```

### Cách hoạt động
| Chế độ | Thinking | Tool calls | Response text |
|--------|----------|------------|---------------|
| **Tóm tắt** (`detailMode=false`) | `🧠 Đã suy nghĩ (847 tk)` | `✓ Đọc file thành công (main.ts)` | Hiển thị đầy đủ |
| **Chi tiết** (`detailMode=true`) | `▼ Suy nghĩ` + toàn bộ nội dung | Tên, args, result, trạng thái | Hiển thị đầy đủ |

### Phím tắt & Lệnh
| Thao tác | Chức năng |
|----------|-----------|
| `Ctrl+O` | Toggle giữa chế độ Tóm tắt và Chi tiết |
| `/expand` hoặc `/e` | Tương tự Ctrl+O (có thông báo xác nhận) |

### Kết quả type-check
```
npm run typecheck → ✅ Pass (0 lỗi)
```

## [9] 2026-05-11 — Kiểm tra triển khai Tool System
**Trạng thái:** ✅ Hoàn thành

### Tổng quan
Kiểm tra toàn bộ 13 tool trong plan.md để xác nhận tất cả đã được triển khai đầy đủ, bao gồm kiểm tra interface, xử lý lỗi, giới hạn output, bảo mật, và đăng ký trong registry. Chạy typecheck và build để xác minh không có lỗi.

### Các bước đã thực hiện

#### 1. Đọc và phân tích plan.md
- Xác nhận kế hoạch yêu cầu **13 tool** chia làm 3 giai đoạn
- Giai đoạn 1 (P0): 5 tool thao tác file & hệ thống
- Giai đoạn 2 (P1): 4 tool phân tích & quản lý code
- Giai đoạn 3 (P2): 4 tool DevOps & automation

#### 2. Phân tích toàn bộ 13 file tool (qua subagents)
- Kiểm tra từng tool theo 8 tiêu chí: tên file, tool name, tham số, example XML, xử lý lỗi, giới hạn output, context-aware, mức độ hoàn thiện
- Kiểm tra registry.ts xác nhận tất cả tool đã được đăng ký

#### 3. Đối chiếu với plan.md
- **Giai đoạn 1:** `write_to_file`, `replace_in_file`, `search_files`, `list_files`, `execute_command` — đầy đủ
- **Giai đoạn 2:** `read_lints`, `list_code_definitions`, `search_code_semantic`, `manage_dependencies` — đầy đủ
- **Giai đoạn 3:** `run_tests`, `git_operations`, `preview_web`, `fetch_web_docs` — đầy đủ
- Tất cả 13 tool đều tuân thủ 8 quy tắc triển khai chung trong plan.md

#### 4. Xác minh chất lượng code
- `npm run typecheck` (`tsc --noEmit`): ✅ Pass, 0 lỗi
- `npm run build` (`tsc`): ✅ Biên dịch thành công

#### 5. Tạo báo cáo kiểm tra
- File `TOOL_AUDIT_REPORT.md` được tạo với báo cáo chi tiết từng tool, đối chiếu tiêu chí, và khuyến nghị

### Cấu trúc thư mục tools/ (cập nhật)
```
src/services/tools/
├── types.ts                  ← Định nghĩa ToolDefinition, ToolParameter, ToolExecutionContext, ToolResult
├── registry.ts               ← ToolRegistry: register, execute, getNativeTools, toToolMessages
├── index.ts                  ← Export + auto-register tất cả tool
├── path-utils.ts             ← Helper resolve path an toàn
├── command-security.ts       ← Helper chặn lệnh nguy hiểm
├── search-utils.ts           ← Helper cho search_files
├── read-file.ts              ← Tool "read_file" (gốc)
├── write-to-file.ts          ← Tool "write_to_file"
├── replace-in-file.ts        ← Tool "replace_in_file" (SEARCH/REPLACE blocks)
├── search-files.ts           ← Tool "search_files" (regex + glob)
├── list-files.ts             ← Tool "list_files" (đệ quy/top-level)
├── execute-command.ts        ← Tool "execute_command" (phê duyệt + timeout)
├── read-lints.ts             ← Tool "read_lints" (tsc --noEmit)
├── list-code-definitions.ts  ← Tool "list_code_definitions"
├── search-code-semantic.ts   ← Tool "search_code_semantic" (pattern + context)
├── manage-dependencies.ts    ← Tool "manage_dependencies" (npm/pip/cargo)
├── run-tests.ts              ← Tool "run_tests"
├── git-operations.ts         ← Tool "git_operations" (status/diff/log/branch/commit)
├── preview-web.ts            ← Tool "preview_web"
└── fetch-web-docs.ts         ← Tool "fetch_web_docs" (MDN, DevDocs)
```

### Kết quả
- **13/13 tool** đã triển khai đầy đủ (100%)
- TypeScript typecheck và build đều thành công
- Báo cáo chi tiết lưu tại `TOOL_AUDIT_REPORT.md`
