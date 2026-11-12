# Giao diện điểm danh đại biểu và thẻ sáng theo Đoàn/Hội — V53

Ngày cập nhật: 12/11/2026. Chỉ thay đổi giao diện và lựa chọn phiên; không thêm migration, không thay đổi API, không mở quyền Storage.

## Định hướng

Tham khảo cấu trúc vé điện tử responsive và trạng thái xác nhận của Hi.Events, Ticket và EventFlow:

- https://github.com/HiEventsDev/Hi.Events
- https://github.com/toaandri/ticket
- https://github.com/Priyanka170974/Event-Registration-Smart-Checkin

Giữ nguyên mã nguồn, nhận diện và bảo mật riêng của Đại hội. Không đưa luồng thanh toán/vé thương mại vào điểm danh.

## Thiết kế theo thương hiệu

- **Đại hội Đoàn:** nền giấy trắng/ngà, bề mặt hồng đào rất nhạt, đỏ Đoàn là màu CTA, viền vàng và xanh dương làm điểm nhấn; logo Đoàn đúng theo dữ liệu `congress.kind`.
- **Đại hội Hội Sinh viên:** nền trắng/xanh trời rất nhạt, xanh Hội là màu CTA, vàng nhạt làm điểm nhấn; logo Hội Sinh viên đúng theo `congress.kind`.
- Bộ lớp Tailwind được tập trung tại `src/lib/delegate-brand-theme.ts`. Cả thẻ, trang điểm danh, camera và trang xác nhận qua QR đều lấy cùng theme.
- Trên thẻ: huy hiệu nổi trên nền sáng, ảnh chân dung và vai trò rõ, ghế ở vùng nhấn nhẹ, barcode có nền trắng để dễ quét. Giữ chế độ xem toàn màn hình, thu vừa màn hình, in và aria label.
- Trên mobile: thao tác quét camera chính chiếm chiều ngang, tối thiểu 58 px cao. Các phương án quét từ ảnh, dán link và chọn camera có sẵn nhưng phân cấp thứ yếu. Hỗ trợ trạng thái lỗi camera/QR/success và `aria-live`.
- Trang `/checkin/s/[sessionId]` trả kết quả trên nền sáng, đủ phân biệt đang xử lý / đã điểm danh / lỗi. Chỉ dữ liệu được server kiểm tra trước mới xuất hiện.

## Luồng nghiệp vụ

1. Trang `/my-card/checkin` lấy Đại hội đã chọn thông qua `getPortalCongressContext(user.id)` (cookie không được xem là quyền truy cập). Danh sách phiên **hiển thị** được lọc theo hồ sơ đại biểu thuộc Đại hội đó, đồng thời báo số phiên khác đang mở. API quét QR vẫn được phép xử lý phiên thuộc các Đại hội khác mà chính tài khoản này được cấp quyền, giữ nguyên nghiệp vụ đa Đại hội.
2. Hiển thị trạng thái mở/đóng và lượt tham dự từ dữ liệu thực; giờ phiên theo `Asia/Ho_Chi_Minh`. Nút quét có thể mở ngay; nếu phiên chưa mở, API vẫn áp dụng chính sách từ chối ở server.
3. Camera chỉ đọc QR trên thiết bị, giải mã qua `startTrackedScanner`; ảnh chụp dự phòng qua `@zxing/browser`; nhận diện người điểm danh vẫn được kiểm tra từ cookie/Auth và bảng delegates phía server. Mã vạch cá nhân vẫn chỉ dùng cho BTC đối chiếu.
4. Điểm danh trùng trả trạng thái đã điểm danh thay vì báo ghi nhận mới. Không thay đổi `/api/attendance/self-checkin`.
5. Bộ chọn Đại hội có độ tương phản đủ đọc trên nền trắng, sửa chữ trắng trên trắng ở phiên bản trước.

## Checklist kiểm chứng

- `node --test tests/delegate-checkin-light-brand-v53.test.mjs`: hai theme thực sự khác nhau, định danh Đại hội, ưu tiên camera, giữ dự phòng ảnh/QR, không đổi API điểm danh.
- `node --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Trên máy thật: xác nhận màu/ảnh/logo của một Đại hội Đoàn và một Đại hội Hội, tối thiểu 320/375/390 px, kiểm tra thiết bị iOS/Android với HTTPS camera; thử camera bị từ chối, QR sai, QR quá giờ, quét lặp và phương án ảnh chụp.
- Chưa có kết quả kiểm thử bằng thiết bị thật thì không coi khả năng tương thích camera là đã nghiệm thu.
