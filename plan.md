# Kế hoạch triển khai: UI chuyển Agent Mode (Tab)

## Tổng quan

Thêm thanh chuyển đổi **Agent Mode** nằm trong `TerminalBottom`, cho phép người dùng nhấn **Tab** để xoay vòng qua 6 chế độ điều khiển mức độ tự động hóa của AI agent khi gọi tool.

---

## Danh sách AgentMode (6 chế độ)

```
normal → plan → accept-edit → bypass → fix → god-mode
```

| # | Mode | Mô tả |
|---|------|-------|
| 1 | `normal` | Chế độ thông thường — hỏi trước khi chạy mọi tool |
| 2 | `plan` | Chỉ lên kế hoạch, không chạy tool |
| 3 | `accept-edit` | Tự động chạy tool sửa file (write/replace), lệnh bash vẫn phải hỏi |
| 4 | `bypass` | Tự động tất cả tool, không cần xác nhận |
| 5 | `fix` | Chế độ sửa lỗi lặp — đọc FIX.md, thử phương án mới sau mỗi lần thất bại |
| 6 | `god-mode` | Vòng lặp agent vô tận — tự chạy và test đến khi hoàn thành mục tiêu |

---

## Các bước thực hiện

### Bước 1: Thêm type `AgentMode` vào `src/services/types.ts`

```typescript
/** Các chế độ điều khiển agent */
export type AgentMode = 'normal' | 'plan' | 'accept-edit' | 'bypass' | 'fix' | 'god-mode';
```

Đặt sau dòng `export type UiMode = ...` hiện tại (dòng 75).

---

### Bước 2: Tạo component `src/ui/components/AgentModeBar.tsx`

**Đường dẫn:** `src/ui/components/AgentModeBar.tsx`

**Props:**
```typescript
interface AgentModeBarProps {
  currentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
}
```

**Cấu trúc hiển thị:**
```
◉ Normal  ○ Plan  ○ Accept Edit  ○ Bypass  ○ Fix  ○ God Mode
```

**Chi tiết:**
- Hiển thị tất cả 6 mode trên một hàng ngang (`<Box flexDirection="row">`)
- Mode hiện tại: màu **cyan bold**, có ký hiệu `◉`
- Các mode khác: màu **dimColor**, ký hiệu `○`
- Các mode cách nhau bởi 2-3 khoảng trắng
- Bên dưới hàng mode có dòng gợi ý nhỏ: `Tab để chuyển mode · /mode để đổi nhanh`
- Sử dụng `React.memo` để tránh re-render không cần thiết
- Mảng thứ tự mode cố định:
  ```typescript
  const MODE_ORDER: AgentMode[] = ['normal', 'plan', 'accept-edit', 'bypass', 'fix', 'god-mode'];
  ```

**Hàm helper lấy mode kế tiếp:**
```typescript
function getNextMode(current: AgentMode): AgentMode {
  const idx = MODE_ORDER.indexOf(current);
  return MODE_ORDER[(idx + 1) % MODE_ORDER.length];
}
```

---

### Bước 3: Chỉnh sửa `TerminalBottom.tsx`

**3a. Thêm props mới:**
```typescript
interface TerminalBottomProps {
  onSend: (input: string) => void;
  onCommand: (command: string) => void;
  isLoading: boolean;
  uiMode: UiMode;
  stableMode: boolean;
  agentMode: AgentMode;                    // ← mới
  onAgentModeChange: (mode: AgentMode) => void;  // ← mới
}
```

**3b. Import component mới:**
```typescript
import AgentModeBar from './AgentModeBar.js';
import type { AgentMode } from '../../services/types.js';
```

**3c. Sửa logic `useInput` cho Tab:**

Hiện tại Tab chỉ dùng để autocomplete. Cần phân biệt:
```typescript
useInput(
  (_input, key) => {
    if (key.tab) {
      if (showSuggestions && suggestions.length > 0) {
        // Có suggestions → autocomplete (giữ nguyên)
        const top = suggestions[0];
        if (top) {
          setInputValue(top.name + ' ');
          setShowSuggestions(false);
        }
      } else {
        // Không có suggestions → chuyển AgentMode
        onAgentModeChange(getNextMode(agentMode));
      }
    }
  },
  { isActive: true },  // Luôn active để bắt Tab
);
```

> **Lưu ý:** Cần import `getNextMode` hoặc tính mode kế tiếp ngay trong TerminalBottom. Tốt nhất import `getNextMode` từ `AgentModeBar.tsx` (export named) hoặc định nghĩa một utility shared.

**3d. Render AgentModeBar trong phần chat mode:**

Chèn `<AgentModeBar>` vào giữa `<TextInput>` và `renderSuggestions()` trong block return của chat mode:

```tsx
<Box>
  <Text color={...} bold>{'> '}</Text>
  <TextInput ... />
</Box>
<AgentModeBar currentMode={agentMode} onModeChange={onAgentModeChange} />
{renderSuggestions()}
```

**3e. Destructure props mới:**
```typescript
const TerminalBottom = ({
  onSend,
  onCommand,
  isLoading,
  uiMode,
  stableMode,
  agentMode,          // ← thêm
  onAgentModeChange,  // ← thêm
}: TerminalBottomProps) => {
```

---

### Bước 4: Cập nhật `app.tsx`

**4a. Thêm import:**
```typescript
import type { Message, UiMode, ProviderConfig, ProviderType, ChatStreamChunk, ToolParseMode, ToolCallRecord, AgentMode } from '../services/types.js';
```

**4b. Thêm state:**
```typescript
const [agentMode, setAgentMode] = useState<AgentMode>('normal');
```

Đặt gần dòng `const [uiMode, setUiMode] = useState<UiMode>('chat');` (dòng 47).

**4c. Thêm handler:**
```typescript
const handleAgentModeChange = useCallback((mode: AgentMode) => {
  setAgentMode(mode);
}, []);
```

**4d. Truyền props xuống TerminalBottom:**
```tsx
<TerminalBottom
  onSend={handleSendMessage}
  onCommand={handleCommand}
  isLoading={isLoading}
  uiMode={uiMode}
  stableMode={stableMode}
  agentMode={agentMode}                  // ← thêm
  onAgentModeChange={handleAgentModeChange}  // ← thêm
/>
```

---

### Bước 5: Thêm lệnh slash `/mode`

Thêm vào `handleCommand` trong `app.tsx`:

```typescript
// ── /mode — hiển thị hoặc chuyển AgentMode ─────────────────
if (normalized === '/mode') {
  const modeList = MODE_LABELS.map(({ mode, label, desc }) =>
    `${agentMode === mode ? '◉' : '○'} **${mode}** — ${label}: ${desc}`
  ).join('\n');
  const modeMsg: Message = {
    role: 'assistant',
    content: `⚙️ **Chế độ agent hiện tại: \`${agentMode}\`**\n\n${modeList}\n\nDùng \`/mode <tên-mode>\` để chuyển. Hoặc nhấn **Tab** để xoay vòng mode.`,
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, modeMsg]);
  return;
}

// /mode <tên-mode>
const modeMatch = normalized.match(/^\/mode\s+(normal|plan|accept-edit|bypass|fix|god-mode)$/);
if (modeMatch) {
  const newMode = modeMatch[1] as AgentMode;
  setAgentMode(newMode);
  const confirmMsg: Message = {
    role: 'assistant',
    content: `⚙️ Đã chuyển chế độ agent sang **\`${newMode}\`**.`,
    timestamp: new Date(),
  };
  setMessages((prev) => [...prev, confirmMsg]);
  return;
}
```

Cần định nghĩa `MODE_LABELS` (có thể import từ `AgentModeBar.tsx` hoặc định nghĩa trong file types/constants riêng):

```typescript
const MODE_LABELS: { mode: AgentMode; label: string; desc: string }[] = [
  { mode: 'normal', label: 'Thông thường', desc: 'Hỏi trước khi chạy mọi tool' },
  { mode: 'plan', label: 'Lên kế hoạch', desc: 'Chỉ lên kế hoạch, không chạy tool' },
  { mode: 'accept-edit', label: 'Chấp nhận sửa', desc: 'Tự động sửa file, bash vẫn hỏi' },
  { mode: 'bypass', label: 'Tự động', desc: 'Tự động tất cả tool không cần hỏi' },
  { mode: 'fix', label: 'Sửa lỗi', desc: 'Vòng lặp sửa lỗi với FIX.md' },
  { mode: 'god-mode', label: 'God Mode', desc: 'Vòng lặp agent vô tận đến khi xong' },
];
```

---

## Vị trí trong TerminalBottom (mockup)

```
┌───────────────────────────────────────────────────┐
│ > Nhập tin nhắn hoặc lệnh...                      │
│                                                   │
│ ◉ Normal  ○ Plan  ○ Accept Edit  ○ Bypass  ...   │
│ Tab để chuyển mode · /mode để đổi nhanh           │
│                                                   │
│ 💡 /help — Xem danh sách lệnh                     │
└───────────────────────────────────────────────────┘
```

---

## Luồng hoạt động

```
Người dùng nhấn Tab
  ├─ Có suggestions (đang gõ /...) 
  │    → Autocomplete lệnh (giữ nguyên hành vi cũ)
  │
  └─ Không có suggestions
       → Gọi onAgentModeChange(mode kế tiếp)
       → app.tsx setAgentMode(newMode)
       → AgentModeBar re-render, highlight mode mới
       → Tab lần nữa → xoay vòng qua mode tiếp theo
```

---

## File thay đổi

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/services/types.ts` | Sửa | Thêm type `AgentMode` |
| `src/ui/components/AgentModeBar.tsx` | **Tạo mới** | Component hiển thị thanh mode |
| `src/ui/components/TerminalBottom.tsx` | Sửa | Thêm props, logic Tab, render AgentModeBar |
| `src/ui/app.tsx` | Sửa | Thêm state, handler, lệnh /mode, truyền props |

---

## Ghi chú

- AgentModeBar luôn hiển thị trong chat mode (`uiMode === 'chat'`), ẩn khi ở các UI mode khác
- Khi `isLoading === true`, vẫn cho phép chuyển mode (không disable Tab)
- Logic xử lý tool dựa trên `agentMode` sẽ được triển khai trong task riêng sau khi UI hoàn thiện
- Mặc định khởi tạo: `'normal'`