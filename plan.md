## Kế hoạch sửa UI TerminalMid

### Phân tích hiện trạng
Hiện tại `ChatView` trong `TerminalMid.tsx` (dòng 78-124) render mỗi message với:
- Container Box có `borderStyle="single"`, màu border green/yellow
- Header: icon role + timestamp
- Content: `Text wrap="wrap"`

### Các thay đổi cụ thể

#### 1. Tạo file mới `src/ui/components/ResponseBlock.tsx`
- Tách logic render khối AI response ra component riêng
- Bỏ khung border bao quanh
- Hiển thị: **icon hình tròn màu xám** (`●` hoặc `⬤`) → **nội dung response**
- Props: `content: string`, `timestamp: Date`

#### 2. Sửa `ChatView` trong `TerminalMid.tsx`

**User message block:**
- Bỏ toàn bộ khung border
- Chỉ hiển thị: `❯ {content}` (dấu prompt + nội dung)
- Tô `backgroundColor="blue"` cho dòng user
- Không hiển thị timestamp
- Không hiển thị label "👤 Bạn"

**Assistant message block:**
- Dùng component `<ResponseBlock />` thay vì code inline hiện tại
- Import từ file mới

**Giữ nguyên:**
- Container ngoài cùng (bỏ borderStyle="round" để phù hợp thiết kế mới)
- Loading state: "🤖 LunaCoding đang trả lời..."
- Empty state: "Chưa có tin nhắn nào..."

### Cây component sau khi thay đổi
```
ChatView
├── Loading indicator (giữ nguyên)
├── Empty state (giữ nguyên)
└── messages.map()
    ├── [user] → Box backgroundColor="blue", Text "❯ content"
    └── [assistant] → ResponseBlock (file mới)
                        └── ● màu xám + nội dung response
```

Bạn có muốn tôi giữ nguyên `borderStyle="round" borderColor="blue"` ở container ngoài cùng của ChatView không? Hay bỏ luôn border này? Hiện tại container ngoài cùng đang có border màu xanh bo tròn.
