# Đại hội số v13 — thẻ đại biểu ID, camera và sơ đồ hội trường

> **Tài liệu lịch sử** — Ghi lại một phiên bản/thời điểm cũ; thông tin cấu hình, giao diện và trạng thái triển khai có thể đã thay đổi. Ưu tiên [mục lục hiện hành](../../README.md).

## Huy hiệu Đoàn

Logo website, trang đăng nhập, thanh điều hướng, bản xem trước và favicon đã chuyển sang **Huy hiệu Đoàn TNCS Hồ Chí Minh**, không còn biểu tượng sân khấu tự vẽ. Huy hiệu dùng nguyên màu xanh lá/đỏ/vàng/trắng.

- Mẫu chuẩn được Trung ương Đoàn công bố: https://doanthanhnien.vn/chi-tiet/thong-bao-trung-uong-doan-tncs-ho-chi-minh-thong-nhat-mau-huy-hieu-doan-5412
- Bản PNG tham chiếu sử dụng trong phần mềm từ nguồn giáo dục: https://student.tdtu.edu.vn/sites/student/files/Student/Doan%20Hoi/Huy%20hieu%20Doan.png
- Asset trong dự án: `public/branding/huy-hieu-doan.png`, favicon: `src/app/icon.png`, component: `src/components/brand-mark.tsx`.
- Sử dụng huy hiệu Đoàn làm biểu trưng nhận diện phần mềm **không có nghĩa website là trang thông tin chính thức của Trung ương Đoàn**.

## Thiết kế thẻ ID dọc

- Thẻ credential dọc, thiết kế tinh giản gợi liên tưởng thẻ đeo đại biểu: viền thanh đỏ, đầu thẻ xanh navy, huy hiệu nguyên màu, tên Đại hội/nhiệm kỳ, ảnh chân dung ở trung tâm, loại đại biểu, họ tên, đơn vị, chức vụ, chip ghế, barcode CODE128.
- Bỏ hoàn toàn nhãn `Thẻ đại biểu số 01`, bỏ QR cá nhân, không nhồi lịch sử/công cụ vào trong thẻ.
- Tiện ích `Điểm danh`, `Chỗ ngồi`, `Lịch sử` nằm ngoài thẻ và có màn hình riêng.
- Chế độ in dùng bản thẻ rộng 86 mm và giữ màu nền, huy hiệu, barcode.

## Quét QR có thể chọn camera

- Tại `/my-card/checkin`, có danh sách camera `BrowserQRCodeReader.listVideoInputDevices()` và lựa chọn camera thật thông qua `decodeFromVideoDevice(deviceId,...)`.
- Khi chưa chọn thiết bị, trình duyệt tự ưu tiên camera sau bằng `facingMode: environment`.
- Danh sách có thể trống/ẩn nhãn trước khi cho phép camera, được tải lại sau khi cấp quyền. Chọn camera mới tự dừng thiết bị cũ trước khi quét tiếp. Nút làm mới camera.
- Vẫn giữ chức năng chụp/chọn ảnh QR và dán URL khi không thể dùng trình duyệt camera trực tiếp qua HTTP LAN. Camera trực tiếp trên điện thoại cần HTTPS.
- **Bàn quét BTC** (`src/components/attendance-client.tsx`) cũng có danh sách chọn camera và nút làm mới; có thể đổi thiết bị khi đang quét. Dùng `BrowserMultiFormatReader` vì BTC cần quét cả QR đại biểu và mã vạch.

## Sơ đồ ghế toàn hội trường dành cho đại biểu

- `/my-card/seats` hiển thị bản đồ tất cả ghế theo tọa độ `x,y` thực tế đã cấu hình ở BTC, bao gồm các ghế ngoài lưới truyền thống, lối đi thể hiện qua khoảng cách ghế và sân khấu phía trước.
- Chọn phiên trong menu: **mỗi phiên dùng đúng layout được gắn trong attendance_sessions.seating_layout_id**. Không tự lấy layout của phiên khác.
- Ghế của chính đại biểu nổi bật màu vàng với viền sáng; ghế thường màu xanh nhạt, ghế khóa màu xám. Có nút thu/phóng, **Tìm ghế** tự căn vị trí ghế vào giữa viewport, cuộn ngang/dọc trên màn hình nhỏ.
- Server chỉ lấy sơ đồ đã thuộc về một phiên của chính tài khoản sau khi xác thực. Gửi **mã ghế, vị trí, trạng thái khóa, loại ghế**, tuyệt đối không gửi tên/đơn vị người ngồi ở các ghế khác. Mã ghế riêng được lấy từ bản phân công được kiểm tra theo chủ sở hữu trước đó.

## Kiểm tra

Chạy `npm run lint`, `npm run build`, `node --test tests/*.test.mjs`; kiểm tra thực tế bằng tài khoản đại biểu có được gán ghế ở nhiều phiên khác nhau, smartphone 320/375/390/430px, lựa chọn hai camera trên thiết bị có hỗ trợ, in thẻ và favicon trên trình duyệt.

**Lưu ý:** Xác minh trên điện thoại và dữ liệu thật còn cần thực hiện tại chỗ sau khi có tài khoản đại biểu; mã nguồn local chưa phải bản đã deploy GitHub/Vercel.
