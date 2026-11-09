# Quy trình triển khai Đại hội số

> **Hướng dẫn hiện hành — 09/11/2026.** Bao gồm Supabase, Google Drive (Apps Script ưu tiên hoặc OAuth dự phòng), Next.js và Vercel. **Không suy đoán dự án đã được triển khai hoặc cấu hình đủ chỉ từ mã nguồn.**

## 1. Chuẩn bị mã nguồn và môi trường

Yêu cầu Node.js từ 20 trở lên, Git, một Supabase project đúng quyền, tài khoản lưu trữ Google Drive, và Vercel nếu dùng môi trường trực tuyến.

```bash
npm ci
npm run lint
npm run build
node --test tests/*.test.mjs
```

Tạo `.env.local` từ `.env.example` và đặt khóa chỉ phía server. Không bao giờ commit tệp môi trường thật. Chạy `npm run readiness` để kiểm tra tính đầy đủ cấu hình; nó không kiểm tra migration và tải thật từ Google Drive.

## 2. Supabase, phân quyền và migrations

1. Xác minh đúng project `pnxdxdagpeyqarucdphk`, sao lưu database và đối chiếu bảng, policies, migrations có sẵn.
2. Nếu database mới chưa có schema, dùng `supabase/schema.sql`; trên database đã có dữ liệu, chỉ dùng những migration phù hợp và **không chạy lại schema gốc tùy tiện**.
3. Theo [Checklist Supabase](SUPABASE-SETUP.md) để rà soát các phiên bản v2–v15 và trạng thái áp dụng thực tế.
4. Cấu hình biến server `SUPABASE_SECRET_KEY`, `QR_HMAC_SECRET`; **không** đặt chúng trong `NEXT_PUBLIC_`.
5. Kiểm tra RLS/role `admin`, `checkin`, `secretary`, `delegate`, `guest`, và chính sách tách dữ liệu các Đại hội.
6. Chạy `npm run check:supabase` và thử đăng nhập/quét điểm danh trên ít nhất hai tài khoản thật.

## 3. Google Drive — tài liệu chỉ hiển thị icon, tên và liên kết

**Dùng hướng dẫn hiện hành:** [Google Drive V18 — Apps Script](../tinh-nang/tai-lieu/GOOGLE-DRIVE-LINKS-V18.md).

Kiến trúc: BTC upload tài liệu → server gọi Google Drive, tự lưu `drive_file_id` + tên vào Supabase → khi BTC bật công bố, Google Drive cấp quyền xem bằng liên kết → đại biểu thấy danh sách **tên/icon**, bấm mở Google Drive ở tab mới. Website **không truyền byte tài liệu cho đại biểu**.

- **Cách được ưu tiên:** Apps Script. Chạy `scripts/google-drive-bridge/Code.gs` trong Google Apps Script; cấu hình `ROOT_FOLDER_ID` và `BRIDGE_SECRET` dưới Script Properties; triển khai Web App, sau đó đặt `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_SECRET` trên Vercel/máy local. **Không cần Refresh Token**.
- **Dự phòng:** Google Drive API OAuth dùng `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_ROOT_FOLDER_ID`. Tham khảo [V17 trong lịch sử](../lich-su/tai-lieu/GOOGLE-DRIVE-V17.md) cho phần xác thực; cách mở tài liệu hiện nay **vẫn là chuyển hướng liên kết**, không tải qua API.
- Upload qua Vercel Function hiện giới hạn **4 MiB/tệp**. Muốn tăng giới hạn cần thiết kế upload khác.
- Tài liệu được chia sẻ kiểu `Anyone with the link` có thể truy cập bằng link được chuyển tiếp, nên **chỉ công bố tệp được phép chia sẻ**.

**Kiểm tra kết nối trực tiếp:** Chạy `npm run check:drive`; kết quả `OK` xác nhận Web App đã xác thực HMAC và truy cập được thư mục gốc, **không thay thế kiểm tra giao diện website**. Trên máy local đã kiểm tra thành công status, upload, công bố, thu hồi và xóa tệp thử qua Apps Script (09/11/2026); Vercel Production vẫn cần cấu hình biến môi trường.

**Điều kiện nghiệm thu trên website:** Admin → Tài liệu Đại hội → trạng thái kết nối **Sẵn sàng** → upload file thử thật → công bố → đại biểu nhấn mở Google Drive → tắt công bố và xác nhận link hết quyền xem. Chưa hoàn tất bài thử giao diện này thì chưa được gọi là nghiệm thu toàn hệ thống.

## 4. Triển khai trên Vercel

1. Đảm bảo code sạch, tests/build đạt, không chứa secret; push nhánh được dùng cho deploy lên GitHub.
2. Kết nối repo vào Vercel (Next.js), thiết lập tất cả Environment Variables (Production và Preview nếu cần). Với Google Drive V18 dùng **hai biến Apps Script**.
3. Cập nhật Supabase Auth URL Configuration theo domain HTTPS của Vercel, kiểm tra cookie đăng nhập giữa các thiết bị.
4. Redeploy sau khi thay đổi biến môi trường, kiểm tra log server không chứa token và kiểm tra thử phân quyền.
5. Dùng điện thoại thật kiểm thử camera QR trên HTTPS; kiểm tra ghi điểm danh chống trùng ở các máy khác nhau.
6. Thử tải thực tế khoảng **200 đại biểu** vào chức năng cổng đại biểu, QR, thống kê và danh sách tài liệu; thử Wi-Fi yếu, mạng mất và cách điểm danh thủ công.

## 5. Tiêu chí sẵn sàng vận hành

- Supabase: migration phù hợp và RLS đã **xác minh trên đúng database thực tế**.
- Tài khoản: Admin/BTC/đại biểu/khách mời có đúng quyền; không truy cập chéo Đại hội.
- Google Drive: upload thật, tên/icon và link hoạt động, thu hồi quyền chia sẻ thành công.
- Vercel: domain HTTPS, biến môi trường, log, thời gian đáp ứng được kiểm tra.
- BTC diễn tập quy trình điểm danh, sơ đồ ghế, tài liệu và phương án dự phòng.
- Chức năng biểu quyết/bầu cử kín **chưa được mặc định xem là đã triển khai**; yêu cầu xác minh thể lệ và bảo mật riêng.

Mục lục kỹ thuật: [docs/README.md](../README.md).
