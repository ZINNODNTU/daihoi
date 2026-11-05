# ĐẠI HỘI SỐ — Điểm danh hai loại QR và barcode dự phòng

Phiên bản: 05/11/2026. Mã nguồn triển khai ở `D:\daihoi`.

## Cách vận hành

**Mã định danh Đại hội:** `congresses.id` (UUID hệ thống) và `congresses.slug` (mã dễ đọc/đường dẫn; ví dụ `dai-hoi-doan-2027`).

**Mã đại biểu:** `delegates.code` (ví dụ `DB001`), duy nhất **trong Đại hội**. Mỗi hồ sơ còn có `delegates.barcode_code` (22 ký tự bắt đầu bằng `DB`), ngẫu nhiên, duy nhất toàn nền tảng, in dưới barcode Code 128. Barcode chỉ là khóa tra cứu; BTC phải đối chiếu người xuất trình.

**QR cá nhân cố định (dh2):** được ký HMAC, ràng buộc Đại hội + đại biểu + phiên bản thu hồi. Không có tên/SĐT trong mã. Cho phép in một lần và dùng lại ở các phiên có `qr_policy=fixed` hoặc `both`.

**QR theo phiên (dh3):** được ký HMAC, ràng buộc **cùng các thông tin trên + attendance_session.id**. Chỉ dùng được ở đúng phiên với `qr_policy=session` hoặc `both` và trong cửa sổ thời gian phiên. Truy cập **Đại biểu → QR / Barcode → Chọn QR phiên** để lấy.

**Mỗi phiên điểm danh:** BTC tạo tên, `starts_at`, `ends_at`, và `qr_policy` (`fixed`, `session`, `both`). Giờ nhập trên web được hiểu là giờ Việt Nam **GMT+7**, lưu UTC trong Supabase. Mở từ `starts_at` (bao gồm); đóng khi đến `ends_at` (không bao gồm). BTC có thể đóng sớm bằng `status=closed`. Mọi lượt check-in bị kiểm tra lại tại **API và PostgreSQL trigger**, không dựa vào đồng hồ điện thoại. Phiên chưa đặt cả hai giờ sẽ không thể điểm danh.

**Camera BTC:** một màn hình quét nhận QR và barcode Code 128. QR hợp lệ sẽ được ghi tự động khi có quyền và trong giờ. Nếu đọc barcode, ứng dụng **không điểm danh ngay** mà chuyển sang hộp xác nhận, hiển thị họ tên/mã/đơn vị. Khi camera hỏng, BTC dùng tab **Điểm danh dự phòng → Tra cứu bằng barcode**, có thể gõ tay hoặc máy quét barcode USB; hoặc tìm tên/mã và điểm danh thủ công. Cả barcode/thủ công đều bắt buộc xác nhận danh tính và nhập lý do.

**Chống trùng:** database `unique(session_id,delegate_id)` áp dụng **bất kể QR cố định/QR phiên/barcode/thủ công**. Phương thức, người thực hiện, thời gian, qr_scope và lý do lưu nhật ký.

## Cấu hình cần hoàn tất

**Bản upgrade cho database hiện có:** `supabase/upgrade-attendance-v2.sql`.

Dự án chỉ định: https://supabase.com/dashboard/project/pnxdxdagpeyqarucdphk

1. **Sao lưu dữ liệu** theo quy trình đơn vị. Nếu hệ thống đang được sử dụng, dừng check-in và tạo phiên thử nghiệm riêng, áp dụng migration trước khi chạy phiên thật.
2. Mở SQL Editor **đúng dự án pnxdxdagpeyqarucdphk**, xem kỹ script và chạy toàn bộ `supabase/upgrade-attendance-v2.sql` trong **một giao dịch**. Script không xóa hồ sơ đại biểu hoặc lượt điểm danh hiện có; các phiên cũ chưa có giờ mở/đóng cần được cập nhật trước khi dùng.
3. Kiểm tra schema:
   ```sql
   select column_name, data_type
     from information_schema.columns
    where table_schema='public'
      and table_name in ('delegates','attendance_sessions','checkins')
      and column_name in ('barcode_code','qr_policy','qr_scope')
    order by table_name,column_name;

   select has_table_privilege('authenticated','public.checkins','INSERT')
      as client_can_write_checkins; -- phải là false

   select policyname from pg_policies
     where schemaname='public' and tablename='checkins';
   ```
4. Tại **Project Settings → API Keys** lấy **Publishable Key** cho `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và **Secret Key** cho `SUPABASE_SECRET_KEY` (phần server; **không dùng NEXT_PUBLIC_**). Chỉ đặt khóa trong `.env.local` và Vercel Environment Variables. **Không gửi các khóa vào chat**.
5. Thiết lập `QR_HMAC_SECRET` bí mật, đồng nhất giữa các môi trường; thay đổi khóa sẽ vô hiệu tất cả QR đã in.
6. Tạo tài khoản BTC trong Supabase Auth, gán `congress_members` đúng quyền và cấp Super Admin qua SQL Editor an toàn. Đăng nhập và thử luồng với 3 đại biểu giả lập.
7. Chạy test tích hợp đa đại hội: quét QR phiên A tại phiên B phải bị từ chối; QR cố định bị từ chối nếu mode=session; cùng đại biểu quét QR rồi barcode phải bị từ chối trùng; trước giờ/đến hết giờ phải từ chối; barcode chỉ hiện xác nhận, không tự điểm danh.
8. Kiểm thử thực tế camera sau trên iPhone Safari, Android Chrome, USB barcode scanner; thử mạng yếu và 200 yêu cầu đồng thời trước khi sử dụng.

## Trạng thái thực thi

- **Đã xong ở mã nguồn:** giao diện, API, schema cho cài đặt mới, migration cho CSDL đang có, unit tests cho QR & giờ, production build.
- **Chưa hoàn thành trên Supabase trực tuyến:** migration **chưa được áp dụng**. Phiên truy cập Chrome đã được cấp phép không thể xác định đúng Chrome profile, nên hệ thống không tự thay đổi CSDL; Supabase plugin hiện kết nối các project khác, không có `pnxdxdagpeyqarucdphk`.
- **Chưa có:** xác nhận 2 khóa trên môi trường máy/Vercel, tài khoản BTC, thử camera/barcode thật, test tính toàn vẹn giao dịch trên Supabase và thử tải. Không sử dụng để điều hành chính thức trước khi hoàn tất.

## Chú ý bảo mật

- QR là mã xác thực đăng ký check-in, **không chứng minh người cầm thẻ đúng danh tính**; BTC phải kiểm tra người trực tiếp, nhất là khi nhập thủ công hoặc barcode.
- Barcode là khóa tìm hồ sơ, không phải mật khẩu và không tạo quyền biểu quyết.
- Không bật lại quyền `INSERT` trực tiếp cho `authenticated` trên bảng `checkins`; phải đi qua server API có kiểm tra chữ ký QR và vai trò BTC.
- `SUPABASE_SECRET_KEY` bypass RLS: không công khai, không sử dụng trong React Client Components, chỉ dùng sau khi xác thực session.
- QR cho đại biểu đang được cấp thông qua màn hình BTC; cổng đăng nhập độc lập cho từng đại biểu chưa được xây dựng.
