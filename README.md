# 🔋 Trạm Sạc Cảm Xúc

Landing page hòm thư tâm tư nội bộ: một không gian ấm áp, an toàn để nhân sự (đặc biệt là nhóm làm việc từ xa và các bạn Gen Z) **xả stress, góp ý và gửi lời cảm ơn**, có thể **ẩn danh** hoặc **ghi tên**. Mọi phản hồi được lưu vào **Google Sheets** để HCNS theo dõi.

- ⚡ HTML/CSS/JS thuần: không framework, không bước build, deploy thẳng lên Vercel.
- 📱 Thiết kế ưu tiên điện thoại, đầy đủ animation, tự giảm chuyển động khi người dùng bật chế độ giảm chuyển động.
- 🔒 Không cần server riêng và không lộ API key: backend là Google Apps Script chạy dưới tài khoản chủ Sheet.

---

## Mục lục
1. [Hành trình người dùng](#1-hành-trình-người-dùng)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Chạy thử trên máy](#3-chạy-thử-trên-máy)
4. [Kết nối Google Sheet](#4-kết-nối-google-sheet)
5. [Deploy lên Vercel](#5-deploy-lên-vercel)
6. [Theo dõi dữ liệu trên Sheet](#6-theo-dõi-dữ-liệu-trên-sheet)
7. [Tuỳ biến](#7-tuỳ-biến)
8. [Validate & bảo mật](#8-validate--bảo-mật)
9. [Xử lý sự cố](#9-xử-lý-sự-cố)

---

## 1. Hành trình người dùng

| Trang | Nội dung | Bắt buộc |
|---|---|---|
| **Header** | Tiêu đề “TRẠM SẠC CẢM XÚC”, lời giới thiệu, minh hoạ trạm sạc có animation | — |
| **Check-in cảm xúc** | Thanh kéo mức pin 0–100% và 5 nút mặt cười chọn nhanh; cục pin đổi màu, đổi nét mặt theo mức pin | Luôn có giá trị |
| **Bước 1 · Thở phào** | Bài thở 4 giây và ô xả tâm sự | ≥ 10 ký tự |
| **Bước 2 · Góp ý** | Chọn bộ phận (Ban Giám Đốc / HCNS / Chuyên môn / Tất cả) và ô góp ý | Bộ phận + ≥ 10 ký tự |
| **Bước 3 · Cảm ơn** | Tên người nhận, lời nhắn, chọn **🥷 Ẩn danh** hoặc **🙋 Ghi tên** | Tên ≥ 2, lời nhắn ≥ 10 ký tự; tên người gửi nếu chọn Ghi tên |
| **Thank-you** | Pin đầy 100% nhấp nháy, pháo giấy, mã phản hồi, nút “Gửi thêm một tâm tư khác” | — |

Thanh tiến trình “Bước x/3” luôn hiển thị ở đầu form, với nút **Quay lại** và **Tiếp theo** ở mỗi bước.

**Hai chế độ gửi** (áp dụng cho toàn bộ lượt gửi):
- **Ẩn danh** (mặc định): cột *Tên người gửi* để trống. Không lưu email, IP hay thông tin thiết bị.
- **Ghi tên**: lưu tên người gửi vào Sheet.

---

## 2. Cấu trúc thư mục

```
landing-feedback/
├── index.html          # Trang chính (toàn bộ các bước của form)
├── styles.css          # Giao diện + animation
├── app.js              # Logic: chuyển bước, slider, validate, gửi dữ liệu, pháo giấy
├── config.js           # ⚙ URL Google Sheet + danh sách bộ phận
├── apps-script/
│   ├── Code.gs         # Backend Google Apps Script (dán vào Sheet, không chạy trên Vercel)
│   └── appsscript.json # Manifest: chỉ xin quyền truy cập đúng Sheet đó
└── README.md
```

---

## 3. Chạy thử trên máy

Mở trực tiếp `index.html` bằng trình duyệt là chạy được.

Khi `SHEET_ENDPOINT` trong `config.js` còn trống, trang chạy **chế độ demo**: vẫn đi hết các bước và ra trang cảm ơn, hiện thông báo “Chế độ demo”, còn dữ liệu chỉ in ra Console (F12) mà **không lưu ở đâu cả**.

> Muốn chạy qua một server local (giống môi trường thật hơn), có thể dùng: `npx serve .` hoặc `npx vercel dev`.

---

## 4. Kết nối Google Sheet

Mất khoảng 5 phút và chỉ cần làm một lần.

1. Tạo một **Google Sheet** mới (ví dụ “Trạm Sạc Cảm Xúc - Dữ liệu”).
2. Vào **Tiện ích mở rộng → Apps Script**, xoá code mẫu, dán toàn bộ nội dung `apps-script/Code.gs`, rồi bấm 💾 **Lưu**.
3. Ở thanh công cụ, chọn hàm **`setup`** rồi bấm **▶ Chạy**.
   - Google sẽ hỏi cấp quyền. Nếu hiện *“Google chưa xác minh ứng dụng này”*, bấm **Nâng cao → Đi tới … (không an toàn)**. Bước này bình thường vì đây là script do chính bạn tạo.
   - Chạy xong, Sheet sẽ có 2 tab **Phản hồi** và **Thống kê**.
4. Bấm **Triển khai → Tùy chọn triển khai mới → ⚙ Ứng dụng web** và chọn:
   - *Thực thi dưới dạng:* **Tôi**
   - *Người có quyền truy cập:* **Bất kỳ ai**
5. Bấm **Triển khai**, rồi copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
6. Mở `config.js` và dán URL vào:
   ```js
   SHEET_ENDPOINT: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
7. **Kiểm tra:** mở URL `/exec` trên trình duyệt. Thấy `{"ok":true,"service":"Trạm Sạc Cảm Xúc",...}` là backend đã chạy.

> ⚠️ Mỗi lần **sửa `Code.gs`**, cần vào **Triển khai → Quản lý triển khai → ✏ Chỉnh sửa → Phiên bản: Phiên bản mới → Triển khai** thì thay đổi mới có hiệu lực. URL giữ nguyên.

### Quyền tối thiểu (tránh bị Google chặn)
Script chỉ xin **một quyền duy nhất**: đọc/ghi *đúng Google Sheet chứa nó* (`spreadsheets.currentonly`). Nó không đụng tới Drive, Gmail hay dữ liệu nào khác. Để khoá cứng điều này, làm thêm bước sau **trước khi chạy `setup`**:

1. Trong Apps Script, vào **⚙ Cài đặt dự án** và tick **“Hiển thị tệp kê khai appsscript.json trong trình chỉnh sửa”**.
2. Quay lại **Trình chỉnh sửa**, mở `appsscript.json` và thay toàn bộ nội dung bằng file `apps-script/appsscript.json` trong repo, rồi bấm Lưu.

> Nếu gặp lỗi *“Ứng dụng này đã cố truy cập thông tin nhạy cảm… Google đã chặn”*, xem mục [Xử lý sự cố](#9-xử-lý-sự-cố).

---

## 5. Deploy lên Vercel

Không cần Vite hay bất kỳ bước build nào, vì Vercel phục vụ trực tiếp các file HTML tĩnh.

### Cách A: qua GitHub (khuyên dùng)
1. Đưa thư mục này lên một repo GitHub.
2. Vào [vercel.com](https://vercel.com), chọn **Add New → Project** rồi chọn repo.
3. Cấu hình:

   | Mục | Giá trị |
   |---|---|
   | Framework Preset | `Other` |
   | Root Directory | thư mục chứa `index.html` |
   | Build Command | *(để trống)* |
   | Output Directory | *(để trống)* |
   | Install Command | *(để trống)* |

4. Bấm **Deploy** để nhận link `ten-du-an.vercel.app`.
5. Từ đó về sau, mỗi lần `git push` Vercel tự deploy lại.

### Cách B: dùng Vercel CLI
```bash
cd landing-feedback
npx vercel          # lần đầu: đăng nhập, chọn các mặc định → bản preview
npx vercel --prod   # deploy bản chính thức
```

### Ghi chú
- **Nhớ điền `SHEET_ENDPOINT` trong `config.js` trước khi deploy**, nếu không trang sẽ ở chế độ demo.
- URL Apps Script nằm công khai trong `config.js` là **bình thường**: người khác chỉ gửi được phản hồi qua URL đó, không đọc được Sheet.
- Thư mục `apps-script/` không ảnh hưởng gì đến trang. Muốn không đưa nó lên Vercel thì tạo file `.vercelignore`:
  ```
  apps-script
  README.md
  ```
- Tên miền riêng: **Project → Settings → Domains** trên Vercel.

---

## 6. Theo dõi dữ liệu trên Sheet

### Tab “Phản hồi”
Mỗi lượt gửi là một dòng:

| Thời gian | Mức pin (%) | Tâm trạng | Thở phào | Góp ý - Bộ phận | Góp ý - Nội dung | Cảm ơn - Gửi tới | Cảm ơn - Lời nhắn | Chế độ gửi | Tên người gửi | Mã phản hồi | Trạng thái xử lý |
|---|---|---|---|---|---|---|---|---|---|---|---|

- **Trạng thái xử lý** là dropdown *Mới / Đang xử lý / Đã phản hồi / Lưu trữ* để HCNS đánh dấu tiến độ.
- Mức pin ≤ 40% được tô cam, > 80% tô xanh để dễ nhận ra người đang “cạn pin”.
- **Mã phản hồi** cũng hiện trên trang cảm ơn, để người gửi (kể cả ẩn danh) có thể nhắc lại khi cần.

### Tab “Thống kê”
Tự cập nhật bằng công thức:
- Tổng phản hồi, số phản hồi 7 ngày qua
- Mức pin trung bình (toàn bộ và 7 ngày qua)
- Số lượt ẩn danh và có tên
- Số lượt có chia sẻ Thở phào, Góp ý, Cảm ơn
- Số phản hồi chưa xử lý
- Phân bố tâm trạng (biểu đồ cột) và góp ý theo bộ phận (biểu đồ tròn)

> Muốn dựng lại tab Thống kê (ví dụ sau khi đổi danh sách bộ phận), chạy lại hàm `setup` trong Apps Script. Dữ liệu ở tab Phản hồi **không bị ảnh hưởng**.

---

## 7. Tuỳ biến

| Muốn đổi | Sửa ở đâu |
|---|---|
| URL backend | `config.js` → `SHEET_ENDPOINT` |
| Danh sách bộ phận | `config.js` → `DEPARTMENTS` **và** `Code.gs` → `DEPARTMENTS` (phải giống nhau) |
| Màu sắc | Biến CSS đầu file `styles.css`: `--terra`, `--butter`, `--mint`, `--lilac`… |
| Câu chữ, tiêu đề, câu hỏi | `index.html` |
| Câu nhắc khi validate | `app.js` → object `CUTE` và mảng `OK` |
| Câu động viên theo mức pin | `app.js` → mảng `MOODS` |
| Số ký tự tối thiểu | `data-min` trong `index.html` **và** phần “Kiểm tra nội dung bắt buộc” trong `Code.gs` |

> Sau khi sửa `Code.gs`, nhớ **triển khai phiên bản mới** (xem mục 4).

---

## 8. Validate & bảo mật

**Validate trên trang:**
- Thiếu nội dung thì hiện bong bóng nhắc dễ thương (vài câu ngẫu nhiên cho mỗi ô), ô nhập lắc nhẹ và mascot của bước đó “giật mình”.
- Bộ đếm hiện “Thêm x ký tự nữa ✍️” trong lúc gõ.
- Sửa đúng thì bong bóng chuyển xanh, khen một câu rồi tự ẩn.

**Bảo vệ ở backend (`Code.gs`):**
- Kiểm tra lại các trường bắt buộc (không tin hoàn toàn vào trình duyệt).
- Chống chèn công thức vào Sheet (nội dung bắt đầu bằng `= + - @`).
- Ô ẩn bẫy bot (honeypot), giới hạn độ dài mọi trường, chỉ chấp nhận tâm trạng và bộ phận nằm trong danh sách cho phép.
- `LockService` tránh mất dữ liệu khi nhiều người gửi cùng lúc.
- Web App chạy dưới quyền chủ Sheet nên **không biết danh tính người gửi**. Chế độ ẩn danh thực sự ẩn danh.

---

## 9. Xử lý sự cố

| Hiện tượng | Nguyên nhân & cách xử lý |
|---|---|
| Google báo *“Ứng dụng này đã cố truy cập thông tin nhạy cảm… đã chặn”* khi chạy `setup` | (1) Dùng `Code.gs` bản mới nhất (đã bỏ quyền gửi email) và dán `appsscript.json` như mục 4. Sau đó chạy lại `setup`. (2) Nếu vẫn bị chặn và bạn đang dùng **tài khoản Google công ty (Workspace)**: quản trị viên đang chặn mọi ứng dụng chưa xác minh. Hãy tạo Sheet bằng **tài khoản Gmail cá nhân**, hoặc nhờ admin vào *Admin Console → Bảo mật → Kiểm soát API → Quyền truy cập ứng dụng* để cho phép. (3) Tài khoản đang bật *Chương trình Bảo vệ Nâng cao* cũng chặn kiểu này, nên dùng tài khoản khác. |
| Hiện thông báo “Chế độ demo” | `SHEET_ENDPOINT` còn trống, cần dán URL `/exec` vào `config.js` rồi deploy lại. |
| Báo “Trạm đang mất sóng…” khi gửi | URL sai (phải kết thúc bằng `/exec`, không phải `/dev`), hoặc quyền truy cập Web App chưa đặt là **Bất kỳ ai**. Mở URL trên trình duyệt để kiểm tra. |
| Sửa `Code.gs` mà không thấy thay đổi | Chưa triển khai **phiên bản mới** (mục 4). |
| Gửi được nhưng Sheet không có dòng mới | Script đang gắn với một Sheet khác. Mở Apps Script từ đúng Sheet (Tiện ích mở rộng → Apps Script). |
| Backend báo “Thiếu nội dung bắt buộc” | `data-min` trên trang và điều kiện trong `Code.gs` không khớp, cần chỉnh cho giống nhau. |
| Đổi bộ phận nhưng góp ý không lưu bộ phận | Danh sách `DEPARTMENTS` ở `config.js` và `Code.gs` chưa giống nhau. |

---

Made with 💛 · Trạm Sạc Cảm Xúc
