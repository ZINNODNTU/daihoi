# Tài khoản BTC độc lập theo từng Đại hội — V45 (11/11/2026)

## Nguyên nhân lỗi
Trước V45, `/api/congress-members` hiển thị **mọi** vai trò trong `congress_members`, bao gồm `delegate` và `guest`. Giao diện gán mặc định những vai trò không có trong dropdown thành `admin`, tạo cảm giác đại biểu là thành viên BTC. Ngoài ra, lệnh mời email có thể tái sử dụng danh tính Supabase Auth đã có, khiến tài khoản đại biểu hoặc BTC Đại hội khác bị cấp quyền quản trị nhầm.

Kiểm tra dữ liệu thực tế 11/11/2026 cho thấy 1 tài khoản Super Admin (không liên kết hồ sơ đại biểu) được gán `admin` ở 2 Đại hội và 2 tài khoản đại biểu thuộc cả 2 Đại hội với vai trò `delegate`. Không có tài khoản BTC độc lập. Super Admin vẫn quản trị toàn nền tảng qua `profiles.platform_role`, không cần xuất hiện trong danh sách BTC từng Đại hội.

## Quy tắc nghiệp vụ mới
- BTC đăng nhập bằng **mã email nội bộ riêng** dạng `btc-xxxxxxxx-xxxxxxxxxxxxxx@staff.daihoi.invalid`, không tái sử dụng email cá nhân hay tài khoản sinh viên. Mỗi tài khoản chỉ thuộc **một** Đại hội, do hệ thống tạo; mật khẩu ngẫu nhiên mạnh chỉ hiển thị khi cấp/reset.
- Tài khoản đại biểu và khách mời tiếp tục sử dụng luồng MSSV và cổng đại biểu hiện có, có thể tham gia nhiều Đại hội; không xuất hiện trong danh sách BTC.
- Super Admin là tài khoản quản trị nền tảng, không phải tài khoản BTC của mỗi Đại hội; không hiển thị trong danh sách BTC, không cần `congress_members` để quản trị.
- **Admin BTC:** quản lý Đại hội, đại biểu, tài liệu, nhân sự BCH, sơ đồ, điểm danh, báo cáo, nhân sự BTC và nhật ký kỹ thuật. **Check-in BTC:** nghiệp vụ điểm danh. **Thư ký BTC:** xem dữ liệu và báo cáo; không cấp tài khoản, không thay đổi cấu hình.
- Chỉ admin BTC của **chính Đại hội** hoặc Super Admin mới tạo tài khoản, cấp lại mật khẩu, sửa vai trò và thu hồi quyền BTC.
- Thu hồi: xóa membership, đánh dấu disabled, yêu cầu Supabase Auth ban tài khoản; không xóa Auth user, đại biểu hay audit log. Trạng thái ban bổ sung cho cơ chế kiểm tra quyền live qua membership + `btc_accounts.disabled_at`.

## Migration dữ liệu V45
SQL `supabase/upgrade-btc-independent-accounts-v45.sql` tạo `btc_accounts` (RLS, chỉ chủ tài khoản có quyền SELECT của chính mình), unique trên Auth user và email nội bộ; partial unique index trên `congress_members.user_id` dành cho role staff. Trigger chặn user BTC thành đại biểu/khách mời và ngược lại.

**Chuyển đổi an toàn:** migration loại bỏ membership BTC thừa của Super Admin (quyền quản trị nền tảng vẫn còn) và chuyển membership staff vô tình gán cho người có hồ sơ đại biểu cùng Đại hội về `delegate` hoặc `guest`. **Không xóa Auth user, delegates, checkins hoặc audit.** Nếu có staff cũ không phải tài khoản BTC độc lập, migration dừng với lỗi và rollback; cần xử lý nhận dạng thủ công, không tùy tiện mất quyền.

**RLS:** `private.has_congress_role` vẫn hỗ trợ delegate/guest viewer trong portal; quyền staff chỉ hợp lệ khi có `btc_accounts` đúng congress, chưa disabled. Logic server `isStaffUser`, `hasRole`, `getSystemLogAccess` đồng bộ với quy tắc này.

## Triển khai
1. Kiểm tra dự án `pnxdxdagpeyqarucdphk`, chạy `npm run backup:supabase` và bảo đảm khả năng phục hồi PostgreSQL qua snapshot thực.
2. Áp dụng V45 bằng SQL Editor **đúng project**. Nếu bị chặn legacy membership, rollback an toàn và xử lý từng account sau đối chiếu dữ liệu.
3. Chạy `npm run check:production-schema` cần **20/20**; kiểm tra policy, trigger/unique index qua SQL Editor.
4. Kiểm thử: `node --test tests/btc-independent-v45.test.mjs`, test đầy đủ, lint, build; phát hành nhánh `main`.
5. Vào Admin → **Nhân sự BTC**. Danh sách BTC mặc định chỉ tài khoản độc lập, Super Admin và đại biểu không còn xuất hiện. Tạo 1 tài khoản mẫu khi được phép và xác nhận đăng nhập vào Dashboard; tài khoản đó chỉ truy cập đúng Đại hội. Không lưu mật khẩu vào email, log, ảnh hoặc bảng tính công khai.
6. Thử một tài khoản đại biểu cũ: vẫn truy cập `/my-card` và không xem được `/dashboard` hoặc `/congresses/{id}/team`.

Không dùng danh sách email để làm căn cứ phân quyền; email chỉ là định danh đăng nhập. Mọi quyền dựa trên mapping Auth UUID + SQL RLS + kiểm tra server.
