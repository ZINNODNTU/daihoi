# Quy trình triển khai ĐẠI HỘI SỐ

## Phạm vi chức năng đã có trong mã nguồn

- Next.js đa Đại hội, Supabase Auth/RLS theo Đại hội.
- Quản lý đại biểu, CSV/XLSX, QR cố định và QR phiên có HMAC, barcode Code 128.
- Mở/đóng quét theo giờ Việt Nam, chặn lượt trùng ở PostgreSQL và có phương án thủ công kèm lý do.
- Báo cáo phiên, phân loại đại biểu, xuất CSV và in PDF từ trình duyệt.
- Quản lý BTC theo email/vai trò; chỉnh sửa thông tin Đại hội.
- Google Drive qua OAuth, tải tệp tối đa 4 MB, đọc tài liệu qua API kiểm tra quyền.

## 1. Xác thực đúng Supabase

Chỉ làm trên project: pnxdxdagpeyqarucdphk. Không được chỉnh sửa project khác.

1. Sao lưu dữ liệu. Project hiện đã tạo 13 bảng bằng supabase/schema.sql.
2. Chạy supabase/upgrade-attendance-v2.sql trên SQL Editor để có QR phiên, barcode, cửa sổ điểm danh.
3. Chạy tiếp supabase/upgrade-management-v3.sql để vô hiệu ghi trực tiếp từ client vào congress_members, attendance_sessions, documents và congresses; trigger còn khóa thay đổi giờ/loại QR của phiên đã có lượt điểm danh.
4. Xác nhận attendance_sessions.qr_policy, delegates.barcode_code và checkins.qr_scope tồn tại, trigger validate_checkin_window_trigger chạy.
5. Chạy security advisor, kiểm tra RLS public và GRANT: authenticated không được INSERT checkins, ghi congress_members, attendance_sessions, documents hoặc UPDATE congresses.
6. Tạo user BTC ở Authentication → Users và cấp profiles.platform_role='super_admin' bằng SQL Editor.

**Không chạy lại schema.sql tùy tiện trên database đã có. Không chạy SQL v3 trước khi mã nguồn mới được deploy**, vì API cũ tạo thành viên bằng client và sẽ bị mất quyền.

## 2. Cấu hình môi trường

Trong .env.local và Vercel Environment Variables:

- NEXT_PUBLIC_SUPABASE_URL = https://pnxdxdagpeyqarucdphk.supabase.co
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY (chỉ server)
- QR_HMAC_SECRET (ít nhất 32 ký tự, chỉ server)

Không đưa các biến secret lên client hoặc Git. Khi đã in thẻ QR, không tùy tiện đổi QR_HMAC_SECRET.

Chạy: npm run readiness. Script chỉ in trạng thái cấu hình, không in giá trị khóa.

## 3. Google Drive

Bật Drive API và OAuth trên Google Cloud, cung cấp:
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_ROOT_FOLDER_ID.

Drive lưu tệp; Supabase chỉ lưu metadata và ID file. Không coi Drive cá nhân là CDN công khai. Giới hạn 4 MB để phù hợp giới hạn request của Vercel Functions; tệp lớn cần luồng upload trực tiếp/chia khối.

## 4. Deploy Vercel

1. Tạo Git repository, đẩy code đã rà soát; không đẩy .env.local.
2. Tạo project Vercel từ repo, Next.js framework.
3. Thiết lập Environment Variables ở cả Preview và Production phù hợp.
4. Cập nhật Authentication → URL Configuration trên Supabase theo domain HTTPS của Vercel.
5. Thử đăng nhập BTC, tạo Đại hội, mời người dùng, thiết lập phiên, quét QR, barcode, thao tác thủ công, báo cáo, Drive.
6. Kiểm thử camera Android Chrome/iOS Safari qua HTTPS, hai thiết bị quét cùng một QR (phải chống trùng).
7. Thử tải 200 người trong tình huống thực tế, theo dõi Vercel/Supabase logs, băng thông và giới hạn gói.

## Điều kiện để xác nhận sản phẩm sẵn sàng vận hành

Build, lint và kiểm thử đơn vị đạt chỉ chứng minh chất lượng code tại thời điểm kiểm tra. Muốn tuyên bố triển khai thành công phải có:
- SQL v2/v3 đã áp dụng live, RLS đã kiểm chứng bằng hai Đại hội và các vai trò khác nhau.
- Có Supabase Publishable Key, Secret Key, user Super Admin.
- Google Drive OAuth và Vercel project/domain thực tế.
- Camera thật, đồng thời nhiều máy điểm danh, báo cáo và phục hồi khi mất mạng được diễn tập.
- Các nghiệp vụ biểu quyết/bầu cử kín chưa triển khai và cần phê duyệt nghiệp vụ riêng.
