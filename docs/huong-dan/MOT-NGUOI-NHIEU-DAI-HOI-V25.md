# V25 — Một người, nhiều Đại hội: chọn Đại hội trước, hồ sơ chung, lịch sử toàn bộ

**Cập nhật:** 09/11/2026. **Mã nguồn:** local `D:\daihoi`. Không có migration SQL mới; chưa push GitHub/Vercel.

## Phạm vi dữ liệu
| Dữ liệu | Phạm vi |
| --- | --- |
| Supabase Auth user + mật khẩu | Dùng chung giữa mọi Đại hội đã cấp quyền |
| Họ tên, ảnh, đơn vị, chức vụ, giới tính, ngày sinh | Thông tin cá nhân của **một người**; khi tự cập nhật sẽ đồng bộ sang mọi hồ sơ `delegates` đang hoạt động có đúng `auth_user_id`; ảnh cập nhật cùng đường dẫn private `people/<auth_user_id>.jpg` cho tất cả bản ghi đã liên kết |
| `delegates.id`, `congress_id`, mã đại biểu, barcode, vai trò, vị trí/phiên ghế | **Riêng** từng Đại hội |
| Quét QR/điểm danh | Một trang `/my-card/checkin` cho mọi phiên hợp lệ của các Đại hội người đó tham dự; QR chứa mã phiên và server xác minh người có hồ sơ tại đúng Đại hội |
| Thẻ `/my-card`, ghế `/my-card/seats`, tài liệu `/my-card/documents`, nhân sự `/my-card/bch` | **Chỉ** Đại hội đang chọn trên server |
| Lịch sử `/my-card/history` | **Tất cả** Đại hội, cả đại biểu từng liên kết nhưng nay đã inactive; tải phân trang checkin để không cắt cứng ở 1.500 lượt |
| Khách mời | Chọn Đại hội có role guest; chỉ xem BCH và tài liệu được công bố, không có thẻ/ghế/điểm danh đại biểu |

## Hành trình sử dụng
1. Đăng nhập ở `/login`. Nếu chưa có Đại hội đang chọn, cổng `/my-card` hiển thị màn hình **Chọn Đại hội** (kể cả khi chỉ có một Đại hội).
2. Chọn Đại hội → server xác minh `auth_user_id` hoặc quyền guest rồi lưu cookie HttpOnly, SameSite=Lax. Cookie chưa xác minh không bao giờ cho phép truy cập. Chọn lại Đại hội ở thanh phía trên cổng.
3. Các mục Thẻ, Ghế, Tài liệu, BCH đọc dữ liệu **duy nhất** theo Đại hội đang chọn. Thay Đại hội tự quay lại trang Thẻ và nạp dữ liệu mới.
4. Mục Điểm danh và Lịch sử luôn mang phạm vi **toàn bộ tài khoản**, không yêu cầu chọn Đại hội cụ thể trước khi quét.
5. Vào `/account` để sửa **một hồ sơ cá nhân chung**, không chọn riêng Đại hội khi chỉnh ảnh/thông tin. Thay đổi được đồng bộ theo tài khoản.
6. Khi đăng xuất, cookie chọn Đại hội bị xóa để lần đăng nhập kế tiếp chọn lại.

## Kiểm soát danh tính
- BTC vẫn nhập danh sách Excel **riêng** theo Đại hội. Không tự gộp hồ sơ chỉ theo họ tên.
- Khi cấp tài khoản ở Đại hội mới, xác minh email theo MSSV và so sánh những hồ sơ đã liên kết vào Auth user: MSSV, họ tên (bỏ dấu/chuẩn hóa khoảng trắng), ngày sinh nếu hai phía có dữ liệu. Nếu lệch, **dừng liên kết và yêu cầu BTC xác minh đúng người**.
- Nếu xác minh trùng tài khoản cũ: giữ nguyên mật khẩu, sao chép thông tin cá nhân/ảnh đã liên kết vào hồ sơ vừa được cấp quyền.
- API tự sửa chỉ chấp nhận `delegateId` thuộc `auth_user_id` đã đăng nhập, sau đó UPDATE tất cả bản ghi đang hoạt động cùng user; không chạm barcode, seat, QR, vai trò.
- Ảnh chỉ tự đồng bộ toàn tài khoản **khi chủ tài khoản tải lên**; BTC tải ảnh người khác ở một Đại hội chỉ được sửa ảnh trong Đại hội BTC có quyền quản trị.

## Kiểm thử
- Các kiểm thử cũ phải được cập nhật theo bộ chọn server, không còn phụ thuộc `?congressId=` trên URL làm nguồn dữ liệu.
- Test V25: API chọn Đại hội từ chối ID không hợp lệ/không có quyền và CSRF, chỉ đặt cookie HttpOnly sau xác thực; các trang dữ liệu lọc đúng Đại hội; lịch sử toàn bộ, không bỏ inactive; thông tin và ảnh được đồng bộ theo auth user; kiểm tra tên tránh ghép nhầm.
- Kiểm thử chuyên biệt API cập nhật dùng cơ sở dữ liệu mô phỏng, xác nhận UPDATE đồng thời hai Đại hội của cùng người và không thay đổi người khác.
- Kiểm thử thực tế cần dùng hai Đại hội và hai tài khoản; sửa tên/ảnh rồi tải lại, kiểm tra thẻ thuộc từng Đại hội, đúng mã và ghế, quét QR cả hai, lịch sử cũ, trường hợp Guest.

**Giới hạn:** Không tự ý ghi dữ liệu đại biểu thật để thử thay tên/ảnh hoặc check-in. Những trường hợp end-to-end bằng tài khoản thực cần xác minh trên thiết bị thật trước khi công bố production.
