# Màn hình điểm danh — giao diện trình chiếu Đại hội (bố cục desktop cập nhật V19)

## Bố cục mới
Mở từ `/congresses/[id]/attendance/live?sessionId=...`.

1. Thanh tiêu đề sử dụng huy hiệu Đoàn chính thức, tên Đại hội, tên phiên, nút **Chiếu toàn màn hình**.
2. Dải KPI tổng đại biểu / đã đến / tỷ lệ tham dự, có thanh tiến độ.
3. **Máy tính/máy chiếu đủ rộng:** cột trái gồm **thẻ đại biểu vừa đến phía trên, QR điểm danh bên dưới**; cột phải chiếm phần lớn diện tích để trình chiếu sơ đồ ghế. Thẻ giữ ảnh chân dung 3:4, họ tên, đơn vị, loại đại biểu, vị trí ghế, thời gian xác nhận và lời chào Đại hội. Chưa có đại biểu hiển thị trạng thái chào mừng trung tính.
4. **Điện thoại/màn hình hẹp:** xếp lần lượt thẻ đại biểu → QR → sơ đồ. Bố cục chuyển cột bằng **CSS container query 900px** đo theo diện tích thực của sân khấu (có tính sidebar/toàn màn hình), không chỉ dựa vào kích thước viewport. Kích thước chân dung, chữ và mã QR được thu gọn khi cột trái hẹp; lưới ghế giãn theo chiều ngang khả dụng và chỉ cuộn ngang khi sơ đồ quá nhiều cột.
5. Sơ đồ theo từng phiên tiếp tục dùng màu ghế và **viền vàng** để xác định vị trí đại biểu vừa đến; thay đổi theo dữ liệu điểm danh.
6. Phối màu xanh navy `#101f33`, vàng `#e7ca8e`, xanh dương và xanh lá trạng thái, không dùng hiệu ứng liên tục gây mất tập trung.

## Không thay đổi quy tắc nghiệp vụ
- Mã QR theo phiên dùng nguyên chuỗi ký bảo mật `se2`, không làm mới theo giây. Nút tải PNG/SVG, sao chép liên kết, truy cập phiên vẫn giữ nguyên.
- Hệ thống chỉ cho phép tự điểm danh khi phiên đang mở, còn trong giờ quy định và đúng tài khoản đại biểu. Chỉ BTC có quyền truy cập màn hình trình chiếu.
- API điểm danh trực tiếp được cập nhật cách 3 giây trong khi tab đang hiển thị; không cần tải lại trang.
- Khi đại biểu mới đến, thẻ chào mừng xuất hiện bằng chuyển động 420ms rồi dừng. Tôn trọng `prefers-reduced-motion`.
- Cảnh báo nếu QR trỏ về `localhost` để BTC tránh trình chiếu mã không truy cập được từ điện thoại.
- Sơ đồ ghế cần được BTC gắn với đúng phiên; thiếu sơ đồ sẽ hiển thị trạng thái hướng dẫn.

## Kiểm thử
`npm run build`, `npm run lint`, `node --test tests/*.test.mjs`;
kiểm tra quyền truy cập màn hình. Đã kiểm tra trực quan trực tiếp ở chế độ fullscreen desktop 1920×1080 trên Chrome local: flashcard và QR nằm cùng cột trái, sơ đồ ở cột phải, các KPI và ghế cập nhật hiển thị. Đây là kiểm thử trên trình duyệt local, không thay thế nghiệm thu máy chiếu thực tế. Để nghiệm thu trực quan, cần tài khoản BTC, một phiên mở và một đại biểu điểm danh thật trên điện thoại. Nên thử máy chiếu 1920×1080, 1366×768 và điện thoại 375px; cỡ nhỏ được cuộn dọc, không cắt nội dung.

Giao diện có thể thay đổi giữa các phiên bản nhưng không thay đổi cơ chế điểm danh. **Chưa nghiệm thu trên máy chiếu/điện thoại thực tế hoặc xác minh Vercel production trong tài liệu này**; kiểm tra theo [quy trình triển khai](../../huong-dan/QUY-TRINH-TRIEN-KHAI.md).
