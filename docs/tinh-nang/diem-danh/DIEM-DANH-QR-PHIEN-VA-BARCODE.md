# Điểm danh Đại hội — QR phiên, barcode và phương án dự phòng

> **Tài liệu hiện hành (09/11/2026).** Tập trung vào luồng điểm danh đang có trong mã nguồn. Cách phát QR cá nhân của giai đoạn V2 được lưu tại [tài liệu lịch sử](../../lich-su/diem-danh/DIEM-DANH-QR-PHIEN-VA-BARCODE-V2.md).

## 1. Ba cơ chế cần phân biệt

| Cơ chế | Mục đích | Dành cho |
| --- | --- | --- |
| **QR điểm danh phiên `se2`** | Mã HMAC **cố định theo phiên**, được BTC chiếu để đại biểu dùng camera điện thoại quét | Đại biểu tự điểm danh |
| **Barcode Code 128 trên thẻ ID** | Mã nhận diện đại biểu, phục vụ BTC tra cứu và xác nhận thủ công | BTC/Bàn tiếp đón |
| **QR cá nhân `dh2` / `dh3`** | Phương án hệ thống hỗ trợ kiểm tra mã cũ/cơ chế tại bàn quét; không còn hiển thị như QR trên thẻ ID đại biểu | BTC, tương thích dữ liệu trước |

**Thẻ ID hiện hành chỉ hiển thị barcode**, không chứa QR. Đại biểu quét **QR của phiên được chiếu ở hội trường**, không cần QR riêng trên thẻ.

## 2. Quy trình điều hành

1. BTC mở **Trung tâm điểm danh** `/congresses/[id]/attendance`, tạo phiên và cấu hình `starts_at`, `ends_at`, trạng thái, `qr_policy`, sơ đồ ghế áp dụng cho phiên (nếu có).
2. Mở **Màn hình điểm danh** `/congresses/[id]/attendance/live?sessionId=...`; API `/api/attendance/session-qr` cung cấp cùng một mã QR `se2` theo Đại hội + phiên, dùng HMAC `QR_HMAC_SECRET`.
3. Đại biểu đăng nhập trên điện thoại, vào `/my-card/checkin`, chọn camera và quét mã QR phiên. Trình duyệt đi qua `/checkin/s/[sessionId]` rồi gửi yêu cầu xác minh về server.
4. Server kiểm tra **đúng Đại hội, đúng phiên, quyền đại biểu, giờ mở/đóng, trạng thái phiên và mã QR**. Đến đúng thời điểm đóng hoặc khi BTC đóng sớm, yêu cầu điểm danh phải bị từ chối. Điểm danh thành công ghi vào `checkins`.
5. Trường hợp điện thoại/camera lỗi: BTC dùng `/congresses/[id]/attendance/desk` để quét thẻ, barcode hoặc sử dụng thao tác thủ công có xác nhận danh tính/lý do.
6. Dashboard trực tiếp hiển thị đại biểu vừa đến, ảnh/họ tên/đơn vị, số ghế và sơ đồ ghế theo phiên. Màn hình làm mới dữ liệu qua API khoảng mỗi 3 giây, không bắt toàn bộ đại biểu mở Realtime connection.

Mã `se2` **không tự hết hạn chỉ vì qua một chu kỳ làm mới màn hình**. Tính hợp lệ của lượt điểm danh vẫn do cửa sổ thời gian và trạng thái phiên được kiểm tra tại server quyết định.

## 3. Vai trò và bảo mật

- **Admin/BTC được phân quyền** có thể tạo và điều hành phiên, phát QR và xử lý điểm danh tại bàn; đại biểu/khách mời không có quyền vào nghiệp vụ quản lý Đại hội.
- Đại biểu chỉ xem và tương tác với chức năng được cấp quyền trong cổng đại biểu.
- `QR_HMAC_SECRET` tối thiểu 32 ký tự, chỉ có ở server; thay đổi khóa có thể vô hiệu các mã trước đó.
- Barcode không chứng minh danh tính và không tạo quyền biểu quyết. BTC phải đối chiếu người xuất trình, đặc biệt khi xử lý thủ công.
- Cơ sở dữ liệu cần ràng buộc chống điểm danh trùng trong cùng phiên; kiểm tra bằng nhiều thiết bị cùng lúc, không chỉ dựa vào nút bị vô hiệu trên giao diện.

## 4. Liên quan đến cơ sở dữ liệu

Các mốc SQL liên quan: `supabase/upgrade-attendance-v2.sql`, `supabase/upgrade-management-v3.sql`, `supabase/upgrade-attendance-session-seating-v10.sql`, `supabase/upgrade-delegate-portal-v11.sql`. Kiểm tra các schema/policies thật theo [checklist Supabase](../../huong-dan/SUPABASE-SETUP.md) trước khi vận hành.

## 5. Kiểm thử hội trường

1. Một phiên đang mở, một phiên đã đóng, hai đại biểu; thử QR đúng và sai phiên.
2. Một đại biểu quét hai lần: chỉ lưu một lượt theo phiên.
3. Thử BTC quét barcode, nhập thủ công, xác nhận danh tính và lý do.
4. Thử trên Chrome Android và Safari iOS. **Camera web từ điện thoại thường cần HTTPS**, ngay cả khi truy cập server qua địa chỉ LAN.
5. Thử màn hình trình chiếu trên máy chiếu, Wi-Fi yếu/mất mạng, thông báo lỗi và sơ đồ ghế đổi theo từng phiên.

Hướng dẫn bố cục trình chiếu: [Màn hình điểm danh V16](MAN-HINH-DIEM-DANH-V16.md). Mục lục: [Tài liệu Đại hội số](../../README.md).
