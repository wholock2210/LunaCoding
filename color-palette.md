# 🌈 Bảng Màu LunaCoding - Hỗ Trợ ASCII Art

Hệ thống LunaCoding sử dụng `chalk` (qua Ink) để hiển thị màu trong terminal. Dưới đây là tất cả các màu được hỗ trợ.

---

## 🎨 Các Màu Cơ Bản (16 màu ANSI)

| Màu | Tên | Demo |
|-----|-----|------|
| Đen | `black` | ██████ |
| Đỏ | `red` | ██████ |
| Xanh lá | `green` | ██████ |
| Vàng | `yellow` | ██████ |
| Xanh dương | `blue` | ██████ |
| Đỏ tươi | `magenta` | ██████ |
| Xanh cyan | `cyan` | ██████ |
| Trắng | `white` | ██████ |
| Xám | `gray` / `grey` | ██████ |

---

## 🔆 Các Màu Sáng (16 màu Bright)

| Màu | Tên | Demo |
|-----|-----|------|
| Đen sáng | `blackBright` | ██████ |
| Đỏ sáng | `redBright` | ██████ |
| Xanh lá sáng | `greenBright` | ██████ |
| Vàng sáng | `yellowBright` | ██████ |
| Xanh dương sáng | `blueBright` | ██████ |
| Đỏ tươi sáng | `magentaBright` | ██████ |
| Xanh cyan sáng | `cyanBright` | ██████ |
| Trắng sáng | `whiteBright` | ██████ |

---

## 🎯 Màu Hex (bất kỳ màu nào)

Bạn có thể dùng mã hex 6 ký tự tùy ý:

```
[#ff5733]Chữ cam đậm[/#ff5733]
[#33ff57]Chữ xanh neon[/#33ff57]
[#5733ff]Chữ tím[/#5733ff]
```

**Một số mã hex phổ biến:**

| Màu | Mã Hex |
|-----|--------|
| Cam | `#ff8800` |
| Hồng | `#ff69b4` |
| Tím | `#8b00ff` |
| Xanh ngọc | `#00ff88` |
| Xanh da trời | `#00aaff` |
| Vàng gold | `#ffd700` |
| Đỏ đô | `#cc0000` |
| Xanh rêu | `#669900` |
| Nâu | `#996633` |
| Bạc | `#cccccc` |

---

## 🎭 Màu Gradient (Chủ đề có sẵn)

Dùng cú pháp `[gradient:theme]text[/gradient]`:

| Theme | Mô tả | Màu sắc |
|-------|-------|---------|
| `warm` | Tông ấm | Đỏ → Cam → Vàng |
| `cool` | Tông lạnh | Cyan → Xanh dương → Tím |
| `pastel` | Tông pastel | Hồng → Cam → Vàng → Xanh → Tím |
| `neon` | Neon rực rỡ | Hồng → Cam → Vàng → Xanh → Tím |
| `sunset` | Hoàng hôn | Hồng đậm → Đỏ → Cam |
| `ocean` | Đại dương | Xanh đậm → Xanh cyan |
| `forest` | Rừng cây | Xanh lá đậm → Xanh lá sáng |
| `fire` | Lửa | Đỏ đậm → Đỏ → Cam → Vàng |
| `rose` | Hoa hồng | Tím đậm → Hồng → Hồng sáng |

**Cách dùng gradient tự do:**
```
[gradient:#ff0000-#ffff00]text chuyển đỏ-vàng[/gradient]
[gradient:#ff0000-#ffff00-#00ff00]text 3 màu[/gradient]
```

---

## 🎲 Màu Ngẫu Nhiên

| Tag | Mô tả |
|-----|-------|
| `[random]text[/random]` | Màu chữ hoàn toàn ngẫu nhiên |
| `[random:bright]text[/random]` | Màu chữ ngẫu nhiên tông sáng |
| `[random:pastel]text[/random]` | Màu chữ ngẫu nhiên tông pastel |
| `[bg:random]text[/bg]` | Màu nền ngẫu nhiên |

---

## 🖼️ Màu Nền (Background)

Dùng prefix `bg:` trước tên màu:

```
[bg:red]Chữ trên nền đỏ[/bg]
[bg:#ff5733]Chữ trên nền cam[/bg]
[bg:greenBright]Chữ trên nền xanh sáng[/bg]
```

---

## 📝 Cú Pháp Tổng Quát

```
# Màu chữ dòng mặc định (comment)
#red
Dòng này sẽ màu đỏ

# Màu chữ nội tuyến
[green]Chữ xanh lá[/green]

# Màu nền
[bg:yellow]Chữ trên nền vàng[/bg]

# Gradient
[gradient:ocean]██████████[/gradient]

# Màu ngẫu nhiên
[random]★★★★★[/random]

# Kết hợp
[bg:blue][white]Chữ trắng nền xanh[/white][/bg]
```

---

## ⚙️ Ghi chú kỹ thuật

- Hệ thống dùng `chalk` v5.2.0 qua `ink` v4.4.1
- Màu hex hỗ trợ trong terminal hỗ trợ TrueColor (hầu hết terminal hiện đại)
- Terminal cũ (chỉ 16 màu) sẽ hiển thị màu gần đúng nhất (color approximation)
- Tag gradient phân bố màu đều trên từng ký tự
- Tag random tạo màu mới cho mỗi ký tự — rất phù hợp tạo hiệu ứng glitter