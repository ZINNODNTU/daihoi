# Màn hình điểm danh và vận hành trong LAN

> **Tài liệu lịch sử** — Ghi lại một phiên bản/thời điểm cũ; thông tin cấu hình, giao diện và trạng thái triển khai có thể đã thay đổi. Ưu tiên [mục lục hiện hành](../../README.md).

## Luồng vận hành một cửa

Vào **Đại hội → Trung tâm điểm danh** (`/congresses/[id]/attendance`). Chọn phiên tại **Điều khiển điểm danh**. Các thao tác của phiên tập trung trong một khu vực: **Mở/Đóng điểm danh**, **Màn hình điểm danh**, **Quét tại bàn BTC**, **Cấu hình phiên**. Danh sách bên dưới chỉ dùng để chọn phiên. Không còn một màn hình QR riêng.

**Màn hình điểm danh** ở `/congresses/[id]/attendance/live?sessionId=...` hiển thị mã QR duy nhất, cố định theo phiên, flashcard ảnh/họ tên/đơn vị/vị trí ghế của người vừa tới và sơ đồ ghế riêng của phiên trong cùng màn hình. Bấm trực tiếp QR hoặc **Tải mã QR** để xuất PNG/SVG, không cần tải lại trang hay cấp lại mã. URL cũ `/attendance/qr` sẽ chuyển hướng sang màn hình này. Bảng thông tin chào mừng không hiển thị mã định danh cá nhân.

Mã QR `se2` ký HMAC theo `congressId` và `sessionId` (không chứa thông tin cá nhân và không quay vòng). **Không đồng nghĩa cho phép điểm danh ngoài giờ**: trang quét và API tự điểm danh kiểm tra tài khoản đại biểu, trạng thái và khung giờ máy chủ của phiên; khóa trùng trong cơ sở dữ liệu vẫn có hiệu lực. Để thu hồi QR, cần đóng phiên hoặc thay khóa HMAC (việc thay khóa có thể vô hiệu các QR đang sử dụng).

## Truy cập trên máy khác cùng Wi-Fi

- Tại thư mục dự án chạy `npm run dev`. Kịch bản dev bind `0.0.0.0`, cho phép kết nối từ thiết bị khác, không chỉ `localhost`.
- Máy chủ Windows đang có IPv4 LAN `192.168.1.72` tại thời điểm cấu hình. Nếu IP không đổi và chạy cổng 3000, các máy trong cùng Wi-Fi nhập `http://192.168.1.72:3000`. Kiểm tra lại IP bằng `ipconfig` nếu không truy cập được.
- Cần cho phép kết nối vào cổng 3000 trong Windows Defender Firewall trên mạng **Private**; không mở cổng ra Internet. Nếu Wi-Fi bật chế độ tách khách (AP/client isolation), các thiết bị cũng không thể kết nối.
- Nếu truy cập mã QR qua điện thoại, API cố gắng chuyển URL `localhost` thành IP LAN trên máy chủ dev. Có thể cấu hình chính xác `SESSION_QR_BASE_URL=http://192.168.1.72:3000` trong `.env.local` để tránh chọn sai card mạng (khởi động lại Next.js sau khi sửa biến môi trường).
- Camera **quét trực tiếp trong trình duyệt** trên thiết bị khác cần HTTPS và quyền Camera theo bảo mật trình duyệt; HTTP LAN phục vụ trang web và camera của app điện thoại để quét QR, nhưng thường không mở được `getUserMedia` trong trình duyệt. Dùng HTTPS/Vercel hoặc reverse proxy HTTPS khi cần quét camera tại bàn BTC trên điện thoại.
- Mỗi thiết bị đăng nhập tài khoản được cấp quyền. Không chia sẻ tài khoản BTC cho đại biểu. Dữ liệu vẫn dùng chung Supabase (không phụ thuộc LAN của mỗi thiết bị).

## Hiệu năng ảnh và dữ liệu

Flashcard ưu tiên ảnh JPEG thu nhỏ 160px, endpoint có cache bộ nhớ ngắn hạn và browser cache riêng tư; sơ đồ và flashcard tự đồng bộ khoảng 3 giây, không tải lại toàn trang. Ảnh chỉ được phục vụ sau xác minh quyền truy cập. Ảnh cập nhật sẽ làm sạch cache của phiên máy chủ nhận thao tác upload.

## Kiểm thử

Chạy `npm run lint`, `npm run build`, `node --test tests/*.test.mjs`. Kiểm tra vận hành trên ít nhất hai thiết bị trong cùng LAN, một tài khoản BTC đang chiếu màn hình và một tài khoản đại biểu dùng điện thoại quét. Thử ngoài giờ phiên để xác nhận server từ chối dù QR vẫn hiển thị.
