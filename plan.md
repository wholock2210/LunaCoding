# Kế hoạch mở rộng Tool System cho LunaCoding

## Hiện trạng
- Đã có nền tảng vững chắc: `ToolDefinition`, `ToolExecutionContext`, `ToolParameter`, hỗ trợ 4 native format (OpenAI, Anthropic, Gemini, Cohere) + XML mode
- Tool duy nhất hiện tại: `read_file` - đọc file với giới hạn dòng và số ký tự

---

## Giai đoạn 1: Tool thao tác file & hệ thống (P0 - 5 tool)
Bộ công cụ thiết yếu để AI có thể đọc, ghi, sửa code và tương tác với hệ thống.

| # | Tool | Mô tả | Tham số chính |
|---|------|-------|---------------|
| 1 | `write_to_file` | Tạo mới hoặc ghi đè file, tự động tạo thư mục cha nếu chưa tồn tại | `path`, `content` |
| 2 | `replace_in_file` | Thay thế chính xác đoạn code trong file bằng cơ chế SEARCH/REPLACE blocks | `path`, `diff` |
| 3 | `search_files` | Tìm kiếm regex đệ quy trong thư mục, hỗ trợ lọc theo glob pattern | `path`, `regex`, `file_pattern?` |
| 4 | `list_files` | Liệt kê cấu trúc thư mục, có tùy chọn đệ quy | `path`, `recursive?` |
| 5 | `execute_command` | Thực thi lệnh CLI với cơ chế phê duyệt an toàn (`requires_approval`) | `command`, `requires_approval` |

## Giai đoạn 2: Tool phân tích & quản lý code (P1 - 4 tool)
Các tool giúp AI hiểu sâu hơn về codebase và quản lý môi trường phát triển.

| # | Tool | Mô tả |
|---|------|-------|
| 6 | `read_lints` | Đọc lỗi và cảnh báo từ TypeScript compiler (`tsc --noEmit`) hoặc ESLint |
| 7 | `list_code_definitions` | Liệt kê các định nghĩa (class, function, method, interface) ở top-level của thư mục |
| 8 | `search_code_semantic` | Tìm kiếm ngữ nghĩa nâng cao (pattern + context lines + file grouping) |
| 9 | `manage_dependencies` | Cài đặt, gỡ bỏ, cập nhật packages (npm, pip, cargo tùy project type) |

## Giai đoạn 3: Tool DevOps & automation (P2 - 4 tool)
Các tool tự động hóa quy trình phát triển, kiểm thử và tra cứu.

| # | Tool | Mô tả |
|---|------|-------|
| 10 | `run_tests` | Chạy test suite và trả về kết quả có cấu trúc (passed/failed/errors) |
| 11 | `git_operations` | Thao tác git cơ bản: status, diff, log, branch, commit (có phê duyệt cho lệnh phá hoại) |
| 12 | `preview_web` | Mở URL hoặc file HTML trong trình duyệt để xem trước kết quả |
| 13 | `fetch_web_docs` | Tìm kiếm tài liệu từ web (MDN, DevDocs) cho ngôn ngữ/framework đang dùng |

---

## Quy tắc triển khai chung cho mọi tool

1. **Tuân thủ `ToolDefinition` interface** - `name`, `description`, `parameters[]`, `example` (XML), `execute`
2. **Tham số mô tả NGẮN** (1 dòng), có `required`, `default` rõ ràng
3. **Ví dụ XML đầy đủ** trong `example` để AI tham khảo khi dùng XML mode
4. **Xử lý lỗi toàn diện** - try-catch, trả về `ToolResult` với `isError: true` khi lỗi
5. **Giới hạn output** - file quá lớn thì giới hạn số dòng/ký tự (như `read_file` giới hạn 50k ký tự)
6. **Context-aware** - dùng `context.workingDirectory` để resolve đường dẫn tương đối
7. **Bảo mật** - `execute_command` và `git_operations` phải có `requires_approval`, chặn lệnh nguy hiểm (`rm -rf /`, `sudo`, v.v.)
8. **Đăng ký qua `registerTool()`** - thêm vào mảng `allTools` trong `src/services/tools/registry.ts`
9. **kiểm thử** sau khi triển khai xong 1 tool hãy thực hiện kiểm thử tool đó có hoạt động ở mọi trường hợp hay không đảm bảo không lỗi phát sinh

## Cấu trúc file cho mỗi tool mới

Mỗi tool được đặt trong file riêng tại `src/services/tools/`:
```
src/services/tools/
├── types.ts              # Đã có - Type definitions
├── registry.ts           # Đã có - Đăng ký tool
├── index.ts              # Đã có - Export + auto-register
├── read-file.ts          # Đã có - Tool đọc file
├── write-to-file.ts      # Mới
├── replace-in-file.ts    # Mới
├── search-files.ts       # Mới
├── list-files.ts         # Mới
├── execute-command.ts    # Mới
└── ...                   # Các tool giai đoạn 2, 3
```

## Lộ trình thời gian dự kiến

| Giai đoạn | Số tool | Thời gian dự kiến |
|-----------|---------|-------------------|
| Giai đoạn 1 | 5 tool | 3 ngày |
| Giai đoạn 2 | 4 tool | 2 ngày |
| Giai đoạn 3 | 4 tool | 3 ngày |
| **Tổng** | **13 tool** | **8 ngày** |
