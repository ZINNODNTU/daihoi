# Sửa lỗi cập nhật hồ sơ đại biểu — V24 (09/11/2026)

## Triệu chứng
Trên trang `/account` điện thoại, nhấn "Lưu thông tin đại biểu" với dữ liệu hợp lệ nhưng nhận thông báo đỏ "Hồ sơ đại biểu không hợp lệ". Log của phiên web local cũ xác nhận `PATCH /api/my-card/profile` trả **HTTP 400**.

## Nguyên nhân gốc
Bản API đầu tiên dùng regex UUID sai `8-4-4-12` (28 ký tự hex và ba dấu nối), trong khi PostgreSQL/Supabase sử dụng `8-4-4-4-12` (32 ký tự hex và bốn dấu nối). Vì vậy hồ sơ thật bị từ chối ngay từ đầu, trước truy vấn database.

## Thay đổi
- `src/app/api/my-card/profile/route.ts`: xác minh UUID canonical đúng; parse JSON/giới hạn dữ liệu; phân biệt lỗi 400 validation, 401 session, 403 quyền, 409 hồ sơ thay đổi và 503 DB/config.
- Tiếp tục xác thực `getAuth().user.id`, lấy hồ sơ theo `id`, `auth_user_id`, `is_active`, và UPDATE theo cả `congress_id`. Không chấp nhận id người dùng hay Đại hội do client tự khai.
- Không cho tự cập nhật `student_id`, `barcode_code`, mã QR, quyền, số ghế, `congress_id` hoặc `auth_user_id`.
- `src/components/delegate-profile-editor.tsx`: hiển thị thông báo đúng khi mất mạng/hết đăng nhập/không đủ quyền/lỗi server; xử lý phản hồi không phải JSON; bổ sung nút tải lại trang; chặn đổi hồ sơ khi đang lưu.
- `src/app/account/page.tsx`: hiển thị lỗi nếu không tải được danh sách hồ sơ thay vì im lặng ẩn biểu mẫu.
- `tests/delegate-profile-route-integration-v24.test.mjs`: thực thi hàm route sau transpile với Auth và Database mô phỏng, kiểm tra nhánh thành công và các nhánh lỗi. Không có thao tác ghi dữ liệu thật.
- `scripts/check-delegate-profile-health.mjs`: công cụ kiểm tra schema/cấu trúc UUID ở chế độ chỉ đọc; không hiển thị dữ liệu cá nhân hay khóa truy cập.

## Xác minh
1. Supabase thật: `SELECT` read-only kiểm tra 9 cột hồ sơ, số tài khoản liên kết và hình thức UUID: đạt. Không cần migration mới.
2. 145/145 bài kiểm thử tự động đạt; `npm run lint`, `npm run build`, TypeScript và `git diff --check` đạt.
3. Hủy tiến trình local cũ và khởi động lại Next.js tại `0.0.0.0:3000`; truy cập `http://192.168.11.143:3000/login` trả HTTP 200.
4. Gọi `PATCH /api/my-card/profile` **không có cookie** qua HTTP trả 401 `login_required`, đúng cơ chế. Không ghi dữ liệu.
5. Kiểm thử nhánh thành công dùng database mô phỏng. **Chưa thực hiện PATCH thực tế bằng cookie tài khoản đại biểu trên điện thoại**, nên cần xác nhận cuối cùng trên thiết bị người dùng. Cũng chưa kiểm thử lại upload ảnh với bucket thật.

## Hướng dẫn xác nhận trên điện thoại
1. Mở lại trang `http://192.168.11.143:3000/account`, đăng nhập nếu được yêu cầu.
2. Thực hiện lưu một thay đổi nhỏ và xác nhận có thông báo "Đã cập nhật thông tin".
3. Tải lại trang để chắc chắn thay đổi đã lưu; xem lại thẻ tại `/my-card`.
4. Nếu thấy lỗi khác, ghi lại thông báo mới/cụ thể; không cần cung cấp mật khẩu.

**Trạng thái:** mã nguồn local, chưa commit/push GitHub và chưa deploy Vercel. Web local đã khởi động lại.
