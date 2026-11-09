# Màn hình điểm danh V16 — giao diện trình chiếu Đại hội

## Bố cục mới
Mở từ `/congresses/[id]/attendance/live?sessionId=...`.

1. Thanh tiêu đề sử dụng huy hiệu Đoàn chính thức, tên Đại hội, tên phiên, nút **Chiếu toàn màn hình**.
2. Dải KPI tổng đại biểu / đã đến / tỷ lệ tham dự, có thanh tiến độ.
3. **Ưu tiên toàn chiều ngang** cho thông tin đại biểu vừa điểm danh: ảnh chân dung 3:4, họ tên lớn, đơn vị, loại đại biểu, ghế, thời gian đã xác nhận, lời chào Đại hội. Chưa có đại biểu sẽ hiển thị màn hình chào mừng trung tính.
4. **Phía dưới** là QR điểm danh bên trái và sơ đồ ghế bên phải trên màn hình lớn; trên điện thoại xếp lần lượt QR rồi sơ đồ. QR trên nền trắng, độ tương phản cao để camera đọc dễ hơn.
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
kiểm tra quyền truy cập màn hình. Để nghiệm thu trực quan, cần tài khoản BTC, một phiên mở và một đại biểu điểm danh thật trên điện thoại. Nên thử máy chiếu 1920×1080, 1366×768 và điện thoại 375px; cỡ nhỏ được cuộn dọc, không cắt nội dung.

Mã nguồn V16 đã được đưa vào repository ở các phiên bản sau đó. **Chưa có bằng chứng nghiệm thu máy chiếu/điện thoại thật hoặc xác minh Vercel production trong tài liệu này**; kiểm tra theo [quy trình triển khai](../../huong-dan/QUY-TRINH-TRIEN-KHAI.md).
