# V72 – Chế độ đóng vai tài khoản (Super Admin)

## Phạm vi

- **RBAC → Chọn Đại hội → Chọn tài khoản → Đóng vai tài khoản**.
- Chỉ Super Admin đang đăng nhập có thể bắt đầu. Không được đóng vai chính mình hoặc một Super Admin khác; tài khoản đích phải có tư cách tham gia Đại hội hợp lệ, BTC không bị vô hiệu hóa.
- Đây là **phiên Supabase Auth thực** của tài khoản đích, không phải Preview. Mọi chức năng đọc/ghi do RBAC, RLS và API của tài khoản đích cho phép đều hoạt động thực: đại biểu, tài liệu, BCH, điểm danh, sơ đồ ghế, v.v.
- Một thanh cảnh báo màu vàng hiển thị liên tục trong giao diện BTC/đại biểu. **Thoát đóng vai** khôi phục phiên Auth của Admin.
- Lịch sử **audit_logs** và **system_logs** ghi cả sự kiện mở/đóng phiên (actor_id = Admin, targetId = tài khoản đích). Các sự kiện ứng dụng trong lúc đóng vai có actor_id là tài khoản đích; sự kiện đi qua `writeSystemLog` được bổ sung `actingAdminId` và `actingTargetId` trong context.

## Cơ chế xác thực và bảo vệ

1. Backend kiểm tra Origin, header ứng dụng, JWT của Admin, `profiles.platform_role=super_admin`, tư cách Đại hội và tình trạng BTC của tài khoản đích.
2. Auth Admin `generateLink(type=magiclink)` cấp token xác thực dành riêng cho **đúng ID** tài khoản đích; backend xác minh OTP qua Supabase Auth và kiểm tra lại UUID. Không gửi email, không tự sinh JWT hoặc chia sẻ service key.
3. Phiên Admin gốc (access + refresh token) được **mã hóa AES-256-GCM**, lưu cookie HTTP-only, Secure trên HTTPS, SameSite=Lax, có chia phần khi dài. Khóa mã hóa dùng `IMPERSONATION_ENCRYPTION_KEY` (nếu có) hoặc khóa server Supabase hiện tại. Tuyệt đối không đặt khóa ở `NEXT_PUBLIC_*`.
4. Trước khi chuyển sang token thật của tài khoản đích, hệ thống **bắt buộc** ghi thành công sự kiện `auth.impersonation_started` vào bảng `system_logs`; nếu lỗi ghi log, hủy và không cho đóng vai.
5. Phiên đóng vai giới hạn **30 phút**. Proxy chặn API và đưa về trang phục hồi sau khi hết hạn. Cookie phục hồi được lưu tối đa 10 giờ; nếu hết hạn hoàn toàn, hệ thống buộc đăng nhập lại, không giữ tài khoản đích tự do hoạt động.
6. Trong phiên đóng vai, đường dẫn tài khoản/bảo mật cá nhân bị khóa để tránh thay đổi mật khẩu hoặc thông tin nhận dạng Auth. Thao tác nghiệp vụ trong quyền của tài khoản đích vẫn ghi thật.
7. Khi đăng xuất hoặc đăng nhập mới, cookie đóng vai được xóa. Nút **Thoát đóng vai** là cách nên dùng để trở lại tài khoản gốc mà không nhập lại mật khẩu.

## Cần kiểm tra tại production

- Vercel phải có `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` hoặc `NEXT_PUBLIC_SUPABASE_ANON_KEY`, và `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY` **chỉ trên server**. Biến `IMPERSONATION_ENCRYPTION_KEY` là tùy chọn nhưng nên thiết lập giá trị ngẫu nhiên mạnh và **giữ ổn định qua các lần triển khai**.
- Supabase phải bật Email Auth cho các tài khoản này và hỗ trợ `generateLink` / `verifyOtp(type=magiclink)`. Tài khoản có xác thực nhiều bước hoặc xác minh bắt buộc vẫn phải đáp ứng chính sách Auth/RLS của nó.
- `system_logs` V36 phải tồn tại. Không cần migration mới.
- Kiểm thử thực địa sau deploy: Super Admin → đóng vai Trưởng BTC → vào Đại hội → tạo/sửa 1 bản ghi thử được phép → đối chiếu user_id, RBAC, `system_logs` → Thoát đóng vai → kiểm tra phiên Admin được khôi phục.
- Bài kiểm thử tự động kiểm tra mã hóa cookie, chống giả mạo, xác minh Admin, đúng UUID, ghi log trước chuyển phiên, đóng phiên và trả lại danh tính. **Không thay thế kiểm thử đăng nhập thực tế trên Supabase production**.

## Giới hạn cố ý

Không giả lập quyền Super Admin cho tài khoản đích; không cho đóng vai Super Admin khác; không dùng phiên đóng vai để đổi mật khẩu hoặc sở hữu Auth của người khác. Trình duyệt đang đóng vai có phiên JWT thực của tài khoản đích cho tới khi thoát/hết hạn; chỉ nên thao tác trên thiết bị Admin được tin cậy, không chia sẻ máy trong thời gian đóng vai.
