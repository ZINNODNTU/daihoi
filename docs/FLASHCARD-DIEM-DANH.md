# Nghiệp vụ điểm danh: Flashcard đại biểu vừa ghi nhận

Tại Đại hội → Điểm danh → chọn phiên. Khi BTC điểm danh thành công qua QR, barcode
dự phòng hoặc xác nhận thủ công, màn hình hiển thị ngay thẻ đại biểu mới nhất:
- Ảnh chân dung đã xóa nền/crop nếu hồ sơ có ảnh, ảnh mặc định nếu chưa tải lên.
- Họ tên, Đơn vị, mã đại biểu, loại đại biểu.
- Mã ghế và tên hội trường trong sơ đồ đã phân; nếu chưa có phân ghế hiển thị
  rõ "Chưa phân ghế" thay vì một vị trí giả.
- Thời gian (GMT+7), phương thức điểm danh; ba đại biểu gần nhất bên dưới.

Trên máy tính, flashcard và màn quét QR/Barcode nằm cạnh nhau; trên điện thoại
flashcard hiển thị phía trên phần quét, tự co theo chiều rộng màn hình.

Khi ghi nhận tại thiết bị hiện tại: hiển thị ngay sau phản hồi thành công của máy chủ.
Các thiết bị BTC khác tự đồng bộ lịch sử theo phiên sau mỗi khoảng 8 giây.
Không mở một kết nối Realtime công khai hoặc phát thông tin cá nhân ra trình duyệt chưa đăng nhập.

Thông tin ghế tra theo phân công thực tế tại những sơ đồ của Đại hội và ưu tiên
sơ đồ được cập nhật gần đây. Vì các bảng ghế bị khóa service_role,
server xác minh quyền thành viên trước khi đọc bảng ghế bằng server secret.
Nếu điều chỉnh sơ đồ trong khi màn điểm danh đang mở, tải lại trang để cập nhật
danh sách ghế mới nhất.

Điểm danh vẫn có giới hạn giờ mở/đóng, chống quét trùng và yêu cầu
xác minh danh tính trước điểm danh thủ công/barcode như phiên bản trước.
