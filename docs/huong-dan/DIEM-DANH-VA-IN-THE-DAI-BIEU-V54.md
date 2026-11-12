# Giao diện đại biểu V54 — độ tương phản, điểm danh thực dụng, in đúng một thẻ

Ngày: 12/11/2026. Phiên bản chỉ thay đổi giao diện và luồng in thẻ; không có thay đổi cơ sở dữ liệu, không cần SQL migration.

## Nguyên nhân

1. `src/app/editorial-v33.css` có selector `.delegate-portal .portal-congress-button` với độ ưu tiên cao, ép nền xanh đậm (`#0a334d`) ghi đè `bg-white` của Tailwind trong khi chữ đã đổi sang xanh đậm. Nền tối và chữ tối gây mất tương phản.
2. Trang điểm danh V53 có nhiều gradient, khối minh họa giả lập vùng quét, bước phụ dạng thẻ; làm lu mờ thao tác quét QR thực.
3. Nút “In thẻ” cũ gọi `window.print()` trên toàn bộ `/my-card`. Quy tắc `@media print` chỉ thu hẹp `.delegate-pass`, không cô lập trang; CSS dùng A4 ngang, đồng thời quy tắc chung `header{display:none!important}` có thể ẩn **chính phần đầu thẻ** và dẫn tới bố cục in sai.

## Thay đổi V54

- Bộ chọn Đại hội **nền trắng** `#ffffff`, chữ `#25485f`, nhãn `#416478`, viền `#d2e1e8`, hover `#f8fbfc`, bỏ đồ họa nền xanh trong `editorial-v33.css`. Màu nút đổi Đại hội theo thiết kế sáng.
- Trang `/my-card/checkin` chỉ giữ tiêu đề nhỏ với logo Đoàn/Hội, phiên và trạng thái từ máy chủ, thời gian, ghế, lịch sử, khu quét và hỗ trợ ở cột phụ. Bỏ hero gradient và phần “3 bước” trang trí. Dữ liệu thời gian theo `Asia/Ho_Chi_Minh`; API vẫn kiểm tra giờ mở/đóng.
- Trình quét giữ QR tracking, chọn camera, ảnh chụp, dán link, trạng thái thành công và lỗi. **Không** dựng khung camera giả khi chưa cấp quyền. Nút mở camera là hành động chính, dễ thấy ngay trên mobile.
- Đường dẫn **`/print/delegate/[id]`** độc lập `/my-card`; server dùng `getPortalViewerAuth()` và `getMyDelegateData()`, chỉ lấy đúng một `delegate.id` do tài khoản hiện tại sở hữu. Chưa đăng nhập chuyển sang trang login; ID sai hoặc không thuộc tài khoản trả 404.
- Giao diện bản in chỉ chứa một `DelegatePass`, không có `DelegateShell` (menu, bottom bar, lịch sử, tài liệu), có nút **In thẻ này** riêng. Đợi font, ảnh và một khung hình render trước khi gọi `window.print()`.
- Bản in: `@page A4 portrait; margin:10mm` **chỉ trong trang in chuyên dụng**. CSS trong `globals.css` điều chỉnh thẻ rộng 90 mm, bỏ scale, giữ barcode SVG và màu nền, tránh ngắt giữa thẻ, khôi phục phần `header` của chính thẻ đang bị quy tắc in chung ẩn. Các bản in báo cáo khác vẫn dùng quy tắc chung A4 ngang.
- Trên trang thẻ đại biểu, cả điện thoại và máy tính đều có liên kết **In thẻ** mở bản in riêng, và giữ xem toàn màn hình độc lập. Mỗi lần in chỉ dùng thẻ đang chọn.

## Kiểm thử tự động

- `node --test tests/delegate-ui-print-v54.test.mjs`: kiểm tra CSS tương phản, luồng QR, quyền truy cập bản in, đúng một thẻ, CSS cô lập.
- `node --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

## Kiểm thử thủ công khuyến nghị

1. Trên iPhone/Android và desktop, mở cổng đại biểu, chọn Đoàn và Hội; đọc được tên Đại hội đầy đủ.
2. Mở `/my-card/checkin`, quét camera/ảnh QR đúng/sai và kiểm tra trạng thái phiên đang mở, chưa mở và đã điểm danh.
3. Mở **Thẻ đại biểu → In thẻ → In thẻ này**, chọn xem trước PDF/A4 dọc; phải thấy đúng một thẻ, đủ huy hiệu, ảnh, tên, chỗ ngồi và barcode; không có menu hay các trang thừa.
4. In với và không có tùy chọn nền trên Chrome, Edge, Safari để xác nhận nhận diện in; vùng in / hộp thoại có thể thay đổi theo trình duyệt. Chưa nghiệm thu trên máy in thật nếu chưa có phiên truy cập thiết bị.
