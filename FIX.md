# FIX.md — Thiết kế lại UI: Chế độ Tóm tắt / Chi tiết

## Vấn đề
- UI giật liên tục khi streaming
- Thinking không hiển thị (reasoningContent pipeline hoạt động nhưng UI không render đúng)
- Cơ chế `expandedThinkingIndices`/`expandedToolIndices` phức tạp, dễ lỗi stale closure
- Người dùng muốn giao diện đơn giản hơn: mặc định ẩn chi tiết, Ctrl+O để xem đầy đủ

## Giải pháp: Thiết kế lại với 2 chế độ view toàn cục

### Triết lý
Thay vì quản lý `expandedThinkingIndices`/`expandedToolIndices` phức tạp, dùng **1 state boolean duy nhất**:

| State | Ý nghĩa |
|-------|---------|
| `detailMode = false` | **Chế độ Tóm tắt** — Ẩn thinking, tool compact. Mặc định. |
| `detailMode = true` | **Chế độ Chi tiết** — Hiển thị toàn bộ thinking, tool args/result. |

`Ctrl+O` toggle giữa 2 chế độ. Lệnh `/expand` cũng toggle.

### Các file đã thay đổi

#### 1. `src/ui/app.tsx`
- Xóa state `expandedThinkingIndices`, `expandedToolIndices` và các Ref liên quan
- Thêm `const [detailMode, setDetailMode] = useState(false)`
- `Ctrl+O` handler: `setDetailMode(prev => !prev)`
- Xóa `useEffect` auto-expand
- Lệnh `/expand`: toggle `detailMode`
- Truyền `detailMode` thay vì `expandedThinkingIndices`/`expandedToolIndices` vào `chatProps`

#### 2. `src/ui/components/TerminalMid.tsx`
- Đổi `ChatModeProps`: bỏ `expandedThinkingIndices`, `expandedToolIndices`, thêm `detailMode: boolean`
- Truyền `detailMode` xuống `ResponseBlock`

#### 3. `src/ui/components/ResponseBlock.tsx` — Viết lại hoàn toàn

**Props mới:**
```typescript
interface ResponseBlockProps {
  content: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  detailMode: boolean;        // ← thay thế isThinkingExpanded + isToolExpanded
  isStreaming: boolean;
  toolCalls?: ToolCallRecord[];
}
```

**Chế độ Tóm tắt (`detailMode = false`):**
| Thành phần | Hiển thị |
|------------|----------|
| Thinking | `🧠 Đã suy nghĩ (847 tk)` hoặc `🧠 Đang suy nghĩ...` |
| Tool calls | Mỗi tool 1 dòng: `✓ Đọc file thành công (main.ts)` hoặc `▶ Đang tìm kiếm...` |
| Response text | Hiển thị đầy đủ |
| Hint | `└ Ctrl+O để xem chi tiết` |

**Chế độ Chi tiết (`detailMode = true`):**
| Thành phần | Hiển thị |
|------------|----------|
| Thinking | Toàn bộ nội dung với `▼ Suy nghĩ` header, mỗi dòng có `│ ` prefix |
| Tool calls | Đầy đủ: tên tool, arguments (JSON), result content, trạng thái |
| Response text | Hiển thị đầy đủ |

**Các sub-component:**
- `ThinkingSummary` — Dòng tóm tắt thinking
- `ThinkingPanel` — Panel chi tiết thinking
- `CompactToolRow` — Tool row gọn (chỉ 1 dòng + tên file)
- `DetailToolRow` — Tool row chi tiết (args + result)
- `StreamDot` — Animation "..." cho tool đang chạy

### Cách test
```bash
npm run dev
```
1. Gửi tin nhắn cho AI (model có reasoning)
2. Mặc định: thấy dòng `🧠 Đang suy nghĩ...` và tool compact
3. Nhấn `Ctrl+O` → chuyển sang Chi tiết, thấy toàn bộ thinking + tool args/result
4. Nhấn `Ctrl+O` lần nữa → về Tóm tắt
5. Gõ `/expand` → toggle tương tự

### Kết quả type-check
```
npm run typecheck  →  ✅ Pass (không lỗi)
```

---

## Lịch sử các phương án đã thử (để tham khảo, không dùng lại)

### Các phương án Ctrl+O (đã thất bại)
1. ❌ `useInput` trong App + cơ chế Ctrl‑hold — Ink không gửi sự kiện cho phím modifier đơn lẻ.
2. ❌ `useInput` trong TerminalBottom + `onCtrlO` — `ink-text-input` nuốt hết sự kiện.
3. ❌ `useInput` trong App + `stty -ixon` — `stty -ixon` chỉ tắt XON/XOFF (Ctrl+S/Ctrl+Q), không liên quan đến Ctrl+O; `useInput` vẫn bị `TextInput` chặn.
4. ❌ Raw stdin listener (#1) — Ink đã đăng ký listener `'data'` trước, listener của ta không nhận được dữ liệu.
5. ❌ Intercept `'data'` listener (#2) — Ink không dùng event `'data'` cho input bàn phím, mà dùng `'keypress'`.
6. ❌ Intercept `'keypress'` listener (#3) — Handler chạy được nhưng UI không phản hồi đúng do stale closure trong `useInput`.

### Các phương án thinking/tool display (đã thay thế)
7. ❌ `useEffect` auto-expand — Set state trong khi streaming gây giật UI.
8. ❌ `/expand` command với `expandedThinkingIndices` — Phức tạp, dễ lỗi.
9. ❌ Debug log reasoningContent — Pipeline hoạt động nhưng UI không render đúng do React.memo + comparator.
10. ✅ **Thiết kế lại hoàn toàn với `detailMode`** — Hiện tại đang triển khai.

### Phương án #10: Thiết kế lại UI (HIỆN TẠI) ✅
Xem chi tiết ở đầu file này.