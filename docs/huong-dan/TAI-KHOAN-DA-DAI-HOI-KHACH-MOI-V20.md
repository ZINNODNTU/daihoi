# V20 — Tài khoản đại biểu đa Đại hội, hồ sơ tự cập nhật và khách mời

## Kiến trúc
- Một Supabase Auth user có thể liên kết với nhiều `delegates.auth_user_id` ở **nhiều** `congress_id` khác nhau.
- Mỗi hồ sơ đại biểu, barcode, ghế, lịch sử điểm danh và ảnh giữ riêng theo Đại hội.
- BTC nhập Excel theo Đại hội. API cấp tài khoản có sẵn cơ chế tìm tài khoản cũ theo danh tính đăng nhập và **không tạo lại mật khẩu** khi liên kết thành công.
- Trường hợp trùng MSSV nhưng sai danh tính cần BTC xác minh trước khi cấp quyền. Không dùng họ tên để tự động ghép.

## Thao tác của đại biểu
1. Đăng nhập tài khoản được BTC cấp tại `/login`.
2. Tại `/my-card`, nếu tham dự nhiều Đại hội, chọn đúng Đại hội để xem thẻ.
3. Tại `/account`, ở mục **Ảnh và thông tin đại biểu**, chọn Đại hội rồi chỉnh họ tên, đơn vị, chức vụ, giới tính hoặc ngày sinh.
4. Dùng **Đổi ảnh đại biểu**; trình xử lý ảnh tạo JPEG trắng nền 600 × 800 và thumbnail ở Supabase Storage.
5. Mật khẩu chung đổi tại phần **Đổi mật khẩu** của trang tài khoản; không đổi khi thêm Đại hội.

### Giới hạn an toàn
- Endpoint `PATCH /api/my-card/profile` chỉ cho phép hồ sơ đang hoạt động có `auth_user_id` trùng người đăng nhập. Yêu cầu cùng origin; kiểm tra kích thước và kiểu dữ liệu.
- Endpoint `PUT /api/delegates/[id]/photo` cho phép **chủ hồ sơ đang hoạt động hoặc BTC có quyền admin tại Đại hội đó**, không mở quyền sửa ảnh người khác.
- Đại biểu không tự sửa MSSV, mã QR, barcode, loại đại biểu, vai trò, Đại hội hay ghế. Ảnh lưu theo `congress_id/delegate_id.jpg`.
- Thay thông tin tại một Đại hội **không** cập nhật đồng thời các Đại hội khác.

## Chế độ khách mời có đăng nhập
1. Quản trị Đại hội vào mục **Nhân sự / phân quyền** và thêm email với vai trò **Khách mời (chỉ xem)**. Tài khoản có sẵn được tái sử dụng; email mới được Supabase mời (yêu cầu cấu hình gửi email).
2. Khách đăng nhập và được chuyển đến `/my-card` với trang chào và điều hướng rút gọn.
3. Khách được xem `/my-card/bch` và `/my-card/documents` **chỉ trong các Đại hội mà họ có vai trò guest**.
4. Tài liệu phải bật `delegate_visible=true`. Nhấn tài liệu sẽ được xác thực lại ở `/api/documents/[id]`, sau đó chuyển hướng Google Drive. Quyền chia sẻ của Google Drive cũng phải cho phép xem.
5. Danh sách và ảnh ứng viên BCH cũng được xác thực theo Đại hội trước khi dùng khóa service trên server để đọc.
6. Chế độ khách này **không phải truy cập ẩn danh công khai**; không tự được quyền quản trị, điểm danh hoặc xem hồ sơ đại biểu khác.

## Kiểm tra triển khai
- Không cần migration SQL mới cho V20 nếu các migration delegate accounts v5, delegate photos v7, BCH v8/v9, documents v14, demographics v15 đã được áp dụng.
- Kiểm tra build: `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`.
- Kiểm tra thực tế với ít nhất hai Đại hội, một đại biểu chung tài khoản và một khách mời chỉ thuộc một Đại hội; xác nhận không xem hoặc sửa chéo.
- Kiểm tra tài liệu Drive đã công bố/không công bố, xác nhận danh sách và đường dẫn đích đúng quyền chia sẻ.

**Phạm vi:** Mã nguồn cục bộ. Không đồng nghĩa đã đồng bộ GitHub, triển khai Vercel hay kiểm thử đăng nhập end-to-end trên Supabase thật.
