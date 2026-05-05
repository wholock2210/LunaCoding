## Kế hoạch cuối cùng — Quản lý Provider & Model

### Đã chốt:
- **4 provider types:** OpenAI Compatible, Anthropic, Google Gemini, Cohere
- **Scroll:** 5 items/trang, có ký hiệu ↑↓ báo còn item
- **Mã hóa API key:** Dùng AES-256-GCM qua Node.js `crypto`, key derivation từ machine ID

---

### Cấu trúc thư mục mới:

```
src/
├── services/
│   ├── types.ts                      # SỬA: thêm interface ProviderConfig, ModelInfo, AppConfig
│   ├── config.ts                     # MỚI: đọc/ghi ~/.LunaCoding/setting.json + mã hóa
│   ├── crypto.ts                     # MỚI: mã hóa/giải mã API key (AES-256-GCM)
│   ├── providers/
│   │   ├── base-provider.ts          # MỚI: abstract class, định nghĩa interface chung
│   │   ├── openai-compatible.ts      # MỚI: xử lý OpenAI & mọi API tương thích
│   │   ├── anthropic.ts              # MỚI: Anthropic Messages API
│   │   ├── google-gemini.ts          # MỚI: Google Gemini API
│   │   ├── cohere.ts                 # MỚI: Cohere Chat API
│   │   └── registry.ts              # MỚI: factory tạo provider từ config
│   └── chat.ts                       # SỬA: dùng provider hiện tại thay vì hằng số cứng
├── ui/
│   ├── app.tsx                       # SỬA: thêm UiMode state, xử lý command
│   └── components/
│       ├── TerminalMid.tsx           # SỬA: render theo uiMode (chat / menu)
│       ├── TerminalBottom.tsx        # SỬA: parse lệnh /provider, /model; dual mode input
│       ├── ProviderMenu.tsx          # MỚI: danh sách provider (scroll 5 items)
│       ├── ProviderTypeSelect.tsx    # MỚI: chọn loại provider (4 options)
│       ├── ProviderAddForm.tsx       # MỚI: form nhập thông tin provider mới
│       ├── ModelMenu.tsx             # MỚI: danh sách model (scroll, merge trùng)
│       └── ModelAddInput.tsx         # MỚI: input thêm model thủ công
```

---

### 13 bước triển khai (theo thứ tự):

| Bước | Nội dung |
|------|---------|
| 1 | Thêm types: `ProviderType`, `ProviderConfig`, `ModelInfo`, `AppConfig` vào `types.ts` |
| 2 | Tạo `crypto.ts` — encrypt/decrypt API key bằng AES-256-GCM |
| 3 | Tạo `config.ts` — đọc/ghi `~/.LunaCoding/setting.json`, tích hợp mã hóa |
| 4 | Tạo `base-provider.ts` — abstract class với `chat()`, `listModels()`, `testConnection()` |
| 5 | Tạo `openai-compatible.ts` — implementation cho OpenAI & tương thích |
| 6 | Tạo `anthropic.ts` — implementation cho Anthropic |
| 7 | Tạo `google-gemini.ts` — implementation cho Google Gemini |
| 8 | Tạo `cohere.ts` — implementation cho Cohere |
| 9 | Tạo `registry.ts` — factory + type registry |
| 10 | Sửa `chat.ts` — dùng `currentProvider` từ config |
| 11 | Tạo `ProviderMenu.tsx`, `ProviderTypeSelect.tsx`, `ProviderAddForm.tsx` (3 files) |
| 12 | Tạo `ModelMenu.tsx`, `ModelAddInput.tsx` (2 files) |
| 13 | Sửa `app.tsx`, `TerminalMid.tsx`, `TerminalBottom.tsx` — tích hợp toàn bộ luồng |

---

### Sẵn sàng triển khai.

Vui lòng chuyển sang **ACT MODE** để tôi bắt đầu thực hiện từng bước.
