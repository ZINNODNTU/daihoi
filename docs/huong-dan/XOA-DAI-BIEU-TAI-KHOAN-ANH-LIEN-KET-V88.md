# V88 — Xóa đại biểu / thu hồi tài khoản và xem trước ảnh liên kết từ Đại hội khác

## 1. Xóa đại biểu

Vào **Quản lý Đại hội → Danh sách đại biểu**. Mỗi đại biểu có nút **Xóa** (máy tính) / **Xóa đại biểu** (điện thoại). Chỉ người có quyền `delegates.write` được thực hiện.

1. Chọn đại biểu, bấm **Xóa**.
2. Hộp thoại cho biết đại biểu, mã đại biểu và dữ liệu bị ảnh hưởng; phải **nhập chính xác mã đại biểu**.
3. Server kiểm tra lại quyền, đại biểu và toàn bộ quan hệ.
4. **Từ chối xóa vĩnh viễn** nếu có check-in hoặc phiếu bầu, để giữ nguyên số liệu đại hội; không tự xóa lịch sử.
5. **Từ chối** nếu ảnh gốc của đại biểu vẫn được hồ sơ tại Đại hội khác liên kết; chuyển liên kết trước khi xóa hồ sơ nguồn.
6. Nếu được phép, xóa đúng **một hồ sơ trong đúng Đại hội**. Phân ghế và quyền QR gắn với hồ sơ bị hủy theo ràng buộc; ảnh chỉ bị dọn khi không còn hồ sơ hoặc BCH khác sử dụng; Supabase Auth toàn cục luôn được giữ lại. Nếu không còn hồ sơ nào dùng tài khoản đó tại Đại hội, hệ thống thử thu hồi quyền thành viên `delegate`/`guest` (không làm ảnh hưởng BTC).

**Không sử dụng tính năng này để xóa hồ sơ đã điểm danh!** Muốn điều chỉnh số liệu đã chốt phải có quy trình nghiệp vụ và audit riêng.

## 2. Xóa / thu hồi tài khoản đại biểu

Vào **Quản lý Đại hội → Tài khoản đại biểu**. Với mỗi tài khoản đã cấp, chọn **Xóa tài khoản**.

- Xác nhận bằng **mã đại biểu**.
- Hệ thống gỡ `delegates.auth_user_id` của **một hồ sơ đích**, không xóa hồ sơ, MSSV, ảnh cục bộ, barcode hay lịch sử điểm danh.
- Nếu người đó không còn hồ sơ khác tại Đại hội, thu hồi `congress_members` thuộc vai trò `delegate`/`guest`; không đụng tài khoản BTC.
- Có lựa chọn **Thử xóa hẳn Supabase Auth nếu không còn được sử dụng**. Auth chỉ được xóa nếu **do daihoi tạo**, không còn bất kỳ hồ sơ, quyền, tài liệu hoặc lịch sử nghiệp vụ liên quan nào; nếu không sẽ **giữ lại** và thông báo rõ lý do. Tài khoản dùng chung ở Đại hội khác không bao giờ bị xóa.
- Tài khoản BTC/admin ở bất kỳ Đại hội nào, Super Admin và chính tài khoản đang đăng nhập không thể bị xóa từ khu vực này.
- Nếu ảnh dùng đường dẫn cá nhân Auth `people/<uid>.jpg` và liên kết Auth bị gỡ, hồ sơ cần dùng ảnh tại chính Đại hội hoặc liên kết lại từ hồ sơ nguồn hợp lệ. Hệ thống không nhân bản ảnh.
- Có ghi nhật ký hệ thống riêng cho mỗi thay đổi.

Nút **Xóa đại biểu** và **Xóa tài khoản** là **hai thao tác riêng**. Nếu muốn xóa cả hai, nên thu hồi tài khoản trước rồi xóa hồ sơ đại biểu (khi chưa có lịch sử điểm danh/bỏ phiếu).

## 3. Liên kết ảnh — chỉ hiển thị ảnh thật có nguồn hợp lệ

Ở màn hình danh sách, hệ thống tìm nguồn theo nhóm MSSV ở các Đại hội **khác**. Nút **Liên kết ảnh cũ / Dùng ảnh khác** chỉ xuất hiện khi ít nhất một nguồn:

- Có `photo_path`, đang hoạt động.
- Khớp **MSSV, họ tên (chuẩn hóa tiếng Việt)**, ngày sinh khi cả hai bên có, và ID tài khoản nếu cả hai đã liên kết.
- Có ảnh gốc thuộc hồ sơ nguồn hoặc ảnh Auth cá nhân được cả hai hồ sơ xác thực chung.
- BTC có quyền `delegates.read` ở Đại hội nguồn hoặc hai hồ sơ đã xác thực chung Auth account.

Hộp thoại hiện **ảnh xem trước** (proxy kiểm tra quyền tại `/api/delegates/photo-links/preview`), **họ tên, MSSV, đơn vị, chức vụ, ngày sinh nếu có và tên Đại hội nguồn**. Không hiển thị dữ liệu Đại hội nguồn cho quản trị viên không có quyền xem. Sau xác nhận chỉ ghi `photo_path` tham chiếu, **không sao chép ảnh hoặc tăng số tệp Storage**.

## Kỹ thuật và triển khai

- API `POST /api/delegates/remove`: xóa an toàn một hồ sơ.
- API `POST /api/delegates/accounts/remove`: thu hồi tài khoản, xóa Auth orphan nếu đủ điều kiện.
- API `GET /api/delegates/photo-links/preview`: xem trước ảnh nguồn sau khi kiểm tra hai phía.
- `src/lib/delegate-photo-availability.ts`: khám phá nguồn dùng lại có phân quyền theo lô trên server, không trả về hồ sơ Đại hội nguồn cho client nếu không đủ quyền.
- Các mutation có xác thực phiên Supabase, RBAC theo Đại hội, kiểm tra origin, giới hạn JSON, so khớp mã đại biểu, không nhận bất kỳ đường dẫn ảnh hoặc Auth ID tùy ý từ trình duyệt.
- **Không cần migration Supabase**: sử dụng các bảng và khóa ngoại hiện có. Cơ chế từ chối xóa hồ sơ có lịch sử giúp ngăn mất dữ liệu và tránh phải reset toàn bộ Đại hội.

## Kiểm thử vận hành

1. Đại biểu mới, chưa check-in: xóa hồ sơ, kiểm tra chỉ đúng một Đại hội bị thay đổi.
2. Đại biểu đã check-in: yêu cầu xóa bị từ chối, số liệu điểm danh còn nguyên.
3. Một MSSV ở cả Đoàn/Hội: thu hồi tài khoản Hội, Auth dùng ở Đoàn giữ nguyên.
4. Tài khoản do hệ thống cấp không còn bất kỳ ràng buộc nào: chọn xóa Auth orphan, kiểm tra kết quả.
5. BTC, tài khoản đang đăng nhập, người không có `delegates.write`: tất cả không được xóa.
6. Ảnh gốc đã liên kết: không xóa hồ sơ nguồn; chuyển liên kết trước.
7. Khi hồ sơ nguồn khớp và có quyền: xem ảnh, họ tên, MSSV, đơn vị/kỳ Đại hội nguồn; khi không khớp không hiện nút.
