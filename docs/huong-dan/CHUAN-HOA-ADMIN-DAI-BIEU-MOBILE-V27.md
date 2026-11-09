# V27 — Quản lý sơ đồ, Excel tài khoản, reset mặc định và chọn Đại hội trên điện thoại

**Cập nhật:** 09/11/2026. **Mã nguồn:** local `D:\daihoi`. Không có migration mới.

## 1. Quản lý sơ đồ ghế tại Admin

Vào `/congresses/[id]/seating`. Trang có khu vực **Sơ đồ đã tạo** liệt kê tên, kích thước lưới, phiên bản và các nút **Sửa sơ đồ** / **Xóa**.

- **Sửa:** mở sơ đồ đã lưu vào canvas, chuyển chế độ chỉnh sửa, có thể thay tên, sân khấu, bố cục, loại ghế; nhấn Lưu để cập nhật (API dùng optimistic version).
- **Xóa:** yêu cầu xác nhận rõ ràng. API kiểm tra quyền admin và chính xác `congressId`, `layoutId`, `expectedVersion`; ngăn xóa khi có bất kỳ `seat_assignments` hoặc `attendance_sessions.seating_layout_id` nào tham chiếu, kể cả phiên đã kết thúc. Không xóa lịch sử check-in.
- Các ghế của sơ đồ trống chưa dùng sẽ được xóa theo FK `ON DELETE CASCADE` đã có; những Đại hội khác và các bản sao được tái sử dụng không bị ảnh hưởng.
- Ghi audit `seating.layout_deleted` (chỉ metadata, không ghi dữ liệu đại biểu).
- **Lưu ý về tính đồng thời:** API có kiểm tra ràng buộc trước thao tác xóa và dùng version; chưa có RPC transaction riêng cho xóa. Khi vận hành nhiều admin cùng lúc, BTC cần tránh vừa phân ghế/gắn phiên vừa xóa cùng sơ đồ. Đây là giới hạn cần xem xét trước khi mở thao tác xóa cho nhiều người đồng thời.

## 2. Excel tài khoản

Trang `/congresses/[id]/delegates/accounts` → **Xuất Excel + mật khẩu** có hai cột mới: `Mật khẩu vừa cấp/reset` và `Ghi chú mật khẩu`. Mật khẩu chỉ điền với tài khoản **vừa cấp hoặc reset thành công trong phiên thao tác hiện tại**; các tài khoản đã tạo từ trước để trống, kèm chú thích không thể đọc lại mật khẩu hiện tại của Supabase Auth.

- Sau khi tạo tài khoản mới, tự tải Excel một lần có mật khẩu cấp mới (giữ cơ chế khởi tạo ngẫu nhiên cho bảo mật).
- Sau khi reset, tự tải Excel một lần có mật khẩu mặc định chính xác.
- Không lưu mật khẩu trong database, audit log, localStorage hoặc sessionStorage; đóng/tải lại trang là không còn mật khẩu dạng đọc được.
- Tệp Excel chứa mật khẩu nên được lưu/bàn giao kín, xóa bản tải xuống sau khi cấp phát; tránh gửi chung cho tất cả đại biểu.

## 3. Reset mật khẩu

- Với tài khoản delegate đang hoạt động thuộc Đại hội admin quản trị, nút **Reset về mặc định** luôn gọi Supabase Auth Admin để đặt mật khẩu thành `Abc@123456` đúng theo yêu cầu.
- API **không** chấp nhận mật khẩu ngẫu nhiên hoặc tự nhập khi reset nữa.
- Giữ kiểm tra quyền admin, cấm tự reset và không cho admin Đại hội reset tài khoản BTC/siêu quản trị.
- Khi một tài khoản tham dự nhiều Đại hội, reset sẽ ảnh hưởng **toàn bộ các Đại hội cùng tài khoản**.
- **Rủi ro:** đây là mật khẩu mặc định chung, dễ bị đoán khi biết quy tắc. BTC cần yêu cầu đại biểu đổi mật khẩu ngay lần đăng nhập tiếp theo. Có thể dùng chức năng Đổi mật khẩu trong `/account`.

## 4. Chuẩn hóa giao diện chọn Đại hội trên mobile

- Trang đầu `/my-card` chưa chọn Đại hội hiển thị danh sách dạng card, tìm theo tên/nhiệm kỳ/role **không dấu**.
- Khi đã chọn, khu vực đầu trang chỉ hiển thị Đại hội đang xem (tối đa 2 dòng) và nút **Đổi** đủ vùng chạm. Trên mobile, nút mở **bottom sheet** theo safe area, có danh sách Đại hội được cấp quyền, bộ lọc tìm kiếm, active state, Escape, focus trap và nút đóng.
- Không hiển thị song song thanh chọn dạng nhỏ khi đang ở màn hình chào chọn Đại hội.
- Chuyển Đại hội qua API được kiểm quyền trên server, `router.replace("/my-card")` + `router.refresh()`; các trang chuyên biệt vẫn lọc theo Đại hội, điểm danh/lịch sử và thông tin tài khoản dùng chung.

## Kiểm thử và phạm vi triển khai

- Tests `tests/admin-seating-mobile-v27.test.mjs`: thực thi route xóa với mock Supabase, kiểm tra admin, FK usage, optimistic version, audit và UI mobile.
- Tests `tests/password-default-excel-v27.test.mjs`: thực thi route reset, xác minh chính xác mật khẩu `Abc@123456`, không ghi vào audit, chặn override client, chặn reset staff.
- Kiểm thử tự động/lint/build được chạy trong mã nguồn local. **Chưa thử xóa thật sơ đồ có dữ liệu hay reset mật khẩu thật để tránh thao tác phá hủy trên hệ thống vận hành**; cần E2E với tài khoản test do BTC kiểm soát.
- Không thay đổi cấu trúc Supabase. Thư viện mẫu V26 vẫn yêu cầu migration nếu muốn dùng độc lập với sơ đồ nguồn; sao chép trực tiếp giữa các Đại hội không cần migration.

**Trạng thái:** local, chưa push GitHub/Vercel.
