# FIX.md — Sửa lỗi Ctrl+O không mở được thinking

## Vấn đề
- Người dùng nhấn `Ctrl+O` trong giao diện chat, nhưng thinking/tool details không toggle mở/đóng.
- `Ctrl+I` (toggle stable mode) hoạt động bình thường.
- Đã thử nhiều phương án: `useInput` trong TerminalBottom, `useInput` trong App, `stty -ixon` (XON/XOFF) — đều thất bại.

## Gốc rễ
Khi `TextInput` của Ink đang render và được "focus", nó độc chiếm toàn bộ sự kiện bàn phím. Các `useInput` khác trong cây component (dù ở App hay bất kỳ đâu) đều không nhận được sự kiện `Ctrl+O`. Đây là hành vi thiết kế của Ink.

---

## Phương án #1: Raw stdin listener (ĐÃ THẤT BẠI) ❌
**Ý tưởng:** Lắng nghe trực tiếp `process.stdin` ở chế độ raw để bắt byte `0x0F` (mã ASCII của Ctrl+O) trước khi Ink kịp xử lý.

**Tại sao thất bại:** Ink đã bật raw mode và đăng ký listener `'data'` trên `process.stdin` trước khi `useEffect` của ta chạy. Listener của ta được thêm sau, nhưng dữ liệu vẫn đến Ink trước hoặc bị xung đột — byte `0x0F` không bao giờ đến được handler của ta.

---

## Phương án #2: Intercept stdin listener `'data'` (Monkey-patch) — ĐÃ THẤT BẠI ❌
**Ý tưởng:** Thay thế listener `'data'` gốc của Ink bằng listener của ta. Listener của ta lọc bỏ byte Ctrl+O (`0x0F`) và forward toàn bộ dữ liệu còn lại cho listener gốc của Ink.

**Tại sao thất bại:** **Ink KHÔNG sử dụng event `'data'` để nhận input bàn phím.** Ink dùng `readline.emitKeypressEvents(process.stdin)` để chuyển đổi dữ liệu thô thành các sự kiện `'keypress'`, và lắng nghe chính event `'keypress'`. Việc can thiệp `'data'` là can thiệp sai event ngay từ đầu.

---

## Phương án #3: Intercept event `'keypress'` — ĐÃ TRIỂN KHAI, CHỜ TEST
**Ý tưởng:** Thay vì can thiệp `'data'`, ta sẽ intercept chính event **`'keypress'`** — nơi mỗi phím được biểu diễn dưới dạng object với `name`, `ctrl`, `meta`, `shift`, `sequence`. Ctrl+O sẽ có `ctrl: true, name: 'o'`.

**Cơ chế:**
1. Lưu lại tất cả listener `'keypress'` gốc của Ink từ `process.stdin.listeners('keypress')`.
2. Gỡ toàn bộ listener `'keypress'` khỏi stdin.
3. Đăng ký listener mới của ta — kiểm tra `key?.ctrl && key?.name === 'o'`:
   - Nếu đúng → gọi `handleCtrlORef.current()`, **nuốt phím** (không forward).
   - Nếu sai → forward `(chunk, key)` cho từng listener gốc của Ink.
4. Khi unmount: gỡ listener của ta, khôi phục tất cả listener gốc.

**Khác biệt cốt lõi với tất cả phương án trước:**

| # | Phương án | Event bị can thiệp | Kết quả |
|---|-----------|-------------------|---------|
| 1 | `useInput` trong các component | – | ❌ `TextInput` chặn |
| 2 | `useInput` + `stty -ixon` | – | ❌ `stty` không liên quan |
| 3 | Raw `'data'` listener (#1) | `'data'` | ❌ Ink không dùng `'data'` |
| 4 | Intercept `'data'` (#2) | `'data'` | ❌ Ink không dùng `'data'` |
| **5** | **Intercept `'keypress'` (#3)** | **`'keypress'`** | **Đã triển khai, chờ test** |

Đây là lần đầu tiên chúng ta can thiệp đúng event mà Ink thực sự sử dụng để nhận input bàn phím.

**Đoạn code đã thêm vào `app.tsx`:**
```typescript
useEffect(() => {
  const stdin = process.stdin;
  if (!stdin.isTTY) return;

  // Lưu lại tất cả listener 'keypress' gốc của Ink
  const originalListeners = stdin.listeners('keypress');

  // Gỡ toàn bộ listener gốc khỏi stdin
  stdin.removeAllListeners('keypress');

  // Đăng ký listener của ta – lọc Ctrl+O, forward phần còn lại
  const onKeypress = (chunk: any, key: any) => {
    if (key?.ctrl && key?.name === 'o') {
      console.log('[Ctrl+O] handleCtrlO called');
      handleCtrlORef.current();
      return; // Nuốt phím Ctrl+O
    }
    for (const listener of originalListeners) {
      try {
        (listener as Function)(chunk, key);
      } catch { /* bỏ qua lỗi */ }
    }
  };

  stdin.on('keypress', onKeypress);

  return () => {
    stdin.off('keypress', onKeypress);
    for (const listener of originalListeners) {
      stdin.on('keypress', listener as Function);
    }
  };
}, []);
```

## Kết quả test
- **Ngày:** (chưa test)
- **Kết quả:** (chưa test)

## Cách test
```bash
npm run dev
```
1. Gửi 1 tin nhắn để AI phản hồi (có suy nghĩ).
2. Nhấn `Ctrl+O`.
3. Quan sát console — nếu hiện `[Ctrl+O] handleCtrlO called` là handler đã chạy.
4. Thinking sẽ toggle mở/đóng toàn bộ.

## Nếu vẫn không hoạt động
Ghi kết quả test vào đây (có hoạt động hay không). Nếu không, tôi sẽ phân tích sâu hơn về cơ chế xử lý input của Ink để tìm hướng tiếp cận mới.

---

**Các phương án đã thử và thất bại (không dùng lại):**
1. ❌ `useInput` trong App + cơ chế Ctrl‑hold — Ink không gửi sự kiện cho phím modifier đơn lẻ.
2. ❌ `useInput` trong TerminalBottom + `onCtrlO` — `ink-text-input` nuốt hết sự kiện.
3. ❌ `useInput` trong App + `stty -ixon` — `stty -ixon` chỉ tắt XON/XOFF (Ctrl+S/Ctrl+Q), không liên quan đến Ctrl+O; `useInput` vẫn bị `TextInput` chặn.
4. ❌ Raw stdin listener (#1) — Ink đã đăng ký listener `'data'` trước, listener của ta không nhận được dữ liệu.
5. ❌ Intercept `'data'` listener (#2) — Ink không dùng event `'data'` cho input bàn phím, mà dùng `'keypress'`.