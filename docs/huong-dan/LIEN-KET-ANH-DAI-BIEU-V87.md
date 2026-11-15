# V87 — Liên kết dùng lại ảnh đại biểu giữa các Đại hội (không nhân bản Storage)

## Vấn đề được giải quyết

Một người có thể tham gia Đại hội Đoàn và Đại hội Hội Sinh viên bằng hai hồ sơ `delegates` khác nhau, trong khi ảnh đã có tại một Đại hội. Ví dụ **Nguyễn Thị Liệu** xuất hiện ảnh mặc định ở danh sách Hội Sinh viên dù trước đó đã có ảnh trên hồ sơ Đại hội Đoàn.

Hệ thống không tự cho rằng hai bản ghi cùng MSSV là cùng người. Việc cấp tài khoản theo một số quy trình cũ có thể đồng bộ ảnh khi liên kết chung tài khoản, nhưng không xử lý mọi tổ hợp (một bên đã cấp tài khoản, bên kia chưa cấp; tạo đại biểu sau, nhập Excel riêng...).

## Cách dùng trên web BTC

1. Mở **Quản lý Đại hội → Danh sách đại biểu** của Đại hội cần dùng lại ảnh.
2. Tại đại biểu có **MSSV**, BTC chọn **Liên kết ảnh cũ** (nếu chưa có ảnh) hoặc **Dùng ảnh khác** (nếu đã có ảnh hoặc ảnh hiện tại bị lỗi) ở bảng máy tính hoặc thẻ điện thoại.
3. Hệ thống tìm hồ sơ có ảnh trong các Đại hội khác, xác minh **MSSV, họ tên chuẩn hóa, ngày sinh (nếu hai bên cùng có), trạng thái hoạt động**, tài khoản Auth (nếu hai hồ sơ đều đã cấp).
4. BTC có quyền đọc đại biểu trong Đại hội nguồn **hoặc** hai hồ sơ đã xác thực chung **một Supabase Auth user**. Nếu không, hệ thống không tiết lộ dữ liệu ảnh của Đại hội khác.
5. Chọn Đại hội nguồn trong hộp thoại, nhấn **Xác nhận dùng lại ảnh**.
6. Ảnh xuất hiện trên danh sách, thẻ đại biểu, điểm danh và các giao diện ảnh chung khi tải lại.

Nếu hồ sơ đã có ảnh, BTC vẫn có thể chọn **Dùng ảnh khác** để thay liên kết một cách chủ động. Hệ thống kiểm tra ảnh cũ không bị máy khác thay đổi trước khi lưu; nếu ảnh không còn được tham chiếu thì dọn tệp cũ một cách an toàn. Các nút **Thêm ảnh / Sửa ảnh** giữ nguyên.

## Cơ chế lưu trữ và quyền truy cập

- **Không upload/copy ảnh** khi liên kết. Chỉ cập nhật **`delegates.photo_path`** của hồ sơ đích thành khóa ảnh gốc đã hợp lệ.
- Ảnh được phục vụ qua `/api/delegates/[id]/photo`; API đọc sẽ kiểm tra hồ sơ nguồn **vẫn hợp lệ, còn hoạt động và khớp danh tính**. Không trả về đường dẫn Storage công khai.
- Khóa nguồn chấp nhận:
  - `<congress_id>/<source_delegate_id>.jpg` của **chính hồ sơ nguồn**;
  - `people/<auth_user_id>.jpg` nếu **đã xác thực dùng chung một tài khoản Auth**.
- Không chấp nhận đường dẫn Storage ngẫu nhiên, ảnh của người khác, tài khoản khác, tên khác hoặc ngày sinh mâu thuẫn.
- API liên kết yêu cầu `delegates.write` ở Đại hội đích. Với hai hồ sơ không dùng chung tài khoản Auth, yêu cầu thêm `delegates.read` ở Đại hội nguồn.
- Hỗ trợ liên kết cho đại biểu chưa có ảnh **hoặc thay liên kết ảnh đã có bằng lựa chọn rõ ràng của BTC**. Cập nhật có điều kiện theo giá trị cũ (compare-and-set) để chặn ghi đè khi BTC ở máy khác đã tải ảnh lên.
- Ảnh nguồn được kiểm tra tồn tại trước khi liên kết. Ghi log sự kiện `delegate.photo_reused` nhưng không ghi ảnh/bytes, số lượng lưu trữ không tăng.
- Khi ảnh nguồn bị xóa hoặc mất khóa gốc sau thao tác cập nhật, liên kết sẽ ngừng được xác thực, người dùng có thể chọn liên kết lại. Không hiển thị ảnh ngoài quyền truy cập.
- Không đổi mã đại biểu, MSSV, Auth, vai trò, điểm danh hay ảnh BCH.

## Triển khai

**Không cần migration Supabase**, không tạo bảng ảnh mới và không sửa chính sách Storage bucket. Cần triển khai mã nguồn Next.js lên Vercel; nếu gặp quyền truy cập Vercel hoặc Supabase hãy xác minh trước khi nói đã triển khai production.

## Kiểm thử

- Có hai hồ sơ cùng MSSV, họ tên: một bên đã cấp tài khoản, một bên chưa cấp, ảnh nguồn nằm ở Đoàn. Kiểm tra liên kết sang Hội thành công mà không có upload mới.
- Ảnh nguồn là khóa `people/<auth-user>`: chỉ cho liên kết khi hai hồ sơ có đúng cùng Auth ID.
- Hồ sơ khác họ tên, trùng MSSV nhưng khác ngày sinh, khác tài khoản Auth, nguồn không còn hoạt động, thiếu file Storage, hoặc không có quyền xem nguồn: không cho liên kết.
- Người không có `delegates.write` ở Đại hội đích không được xem tùy chọn hoặc cập nhật.
- Kiểm tra danh sách (desktop/mobile), thẻ (điện tử/bản in), màn hình điểm danh; ảnh thật được ưu tiên logo mặc định.

Tham chiếu: `src/lib/delegate-photo-reuse.ts`, `src/app/api/delegates/photo-links/route.ts`, `tests/delegate-photo-reuse-v87.test.mjs`.
