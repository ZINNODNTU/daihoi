# Khách xem công khai các Đại hội đang diễn ra (V67)

## Hành vi hiện hành

Từ V67, người dùng **không cần tài khoản, mật khẩu, mã đường dẫn, mã QR hay cookie khách**. Tại trang chủ hoặc trang đăng nhập, bấm **Xem với tư cách khách** để vào `/guest`. Danh sách tự lấy **toàn bộ Đại hội có `congresses.status = 'live'`**. Chọn một Đại hội để vào `/guest/<slug>`; chỉ đường dẫn trang, không phải mã bảo mật. Bất cứ lúc nào BTC đổi trạng thái thành `preparing` hoặc `completed`, Đại hội sẽ biến mất khỏi danh sách công khai và mọi lần yêu cầu tài liệu/ảnh BCH kế tiếp đều bị chặn.

Khách công khai có thể xem tên Đại hội, nhiệm kỳ, địa điểm; tài liệu **chỉ khi BTC đã đặt `documents.delegate_visible=true`**, cùng hồ sơ và ảnh ứng viên giới thiệu BCH. Khách không được xem thông tin danh sách đại biểu, thẻ đại biểu, ghế cá nhân, điểm danh, phiếu bầu, công cụ quản trị hoặc dữ liệu phân tích.

**Đại biểu khách mời là loại người dùng khác**: tài khoản đại biểu khách mời thực vẫn đăng nhập tại `/login`, được xem thẻ, sơ đồ ghế và tự điểm danh theo RBAC và phiên điểm danh; không tính vào phân tích chất lượng đại biểu.

## Phân quyền / an toàn dữ liệu

- Trang `/guest` chỉ đọc các trường công khai từ `congresses` có `status='live'`; **không truy vấn bảng `congress_guest_links`**.
- Trang `/guest/<slug>` đọc lại trạng thái `live` tại server. Trạng thái khác trả 404, không mở nội dung công khai.
- Mỗi lần API lấy đường dẫn Google Drive của tài liệu được công bố hoặc ảnh BCH, server kiểm tra `congresses.status='live'` theo `congress_id`. Các tài liệu chưa công bố vẫn bị chặn; đường dẫn Drive không được trả về ngoài phạm vi quyền.
- Các API ghi, quản trị, quyền RBAC, tạo phiên và điểm danh **không thay đổi**, vẫn yêu cầu user hợp lệ và quyền được cấp.
- Bỏ trang nhập mã khách, nút cấp/thu hồi mã, API cấp mã khách, API đổi mã lấy cookie. Bảng `congress_guest_links` V66 vẫn còn ở Supabase để bảo toàn dữ liệu lịch sử và RLS, nhưng không còn được đọc/ghi từ tính năng xem công khai. Không cần thêm SQL migration cho V67.

## Quy trình BTC

BTC chuyển trạng thái Đại hội sang **Đang diễn ra** ở phần cài đặt Đại hội; những Đại hội khác (`preparing`, `completed`) không hiện. Đối với mỗi tài liệu muốn công khai, bật **Hiển thị cho đại biểu**. Khi hết Đại hội, chuyển sang **Đã kết thúc** để ngừng toàn bộ khả năng xem công khai không cần đăng nhập.

Để kiểm tra: `npm run build`, `npm run lint`, `node --test tests/guest-portal-v66.test.mjs`, `node --test tests/*.test.mjs`. Các kiểm thử bao gồm trạng thái live, giới hạn tài liệu Drive, phân biệt khách vãng lai với đại biểu khách mời, và RBAC.
