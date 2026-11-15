# V86 — Ảnh đại biểu mặc định theo logo Đoàn / Hội

Khi đại biểu chưa được BTC hoặc chính đại biểu cấu hình ảnh chân dung (`delegates.photo_path` rỗng), website **không hiện biểu tượng người xám** nữa mà dùng hình mặc định theo **loại Đại hội đang xem**, lấy từ bộ logo chính thức đã có trong `public/branding/`.

- **Đại hội Đoàn** (`kind=doan`): `/branding/huy-hieu-doan.png`.
- **Đại hội Hội Sinh viên** (`kind=hoi_sinh_vien`): `/branding/huy-hieu-hoi-sinh-vien.png`.
- Chỉ hiện logo khi **chưa có ảnh** hoặc đường dẫn ảnh bị lỗi tải. Nếu ảnh đại biểu đã được tải lên hợp lệ, **ưu tiên ảnh thật**. Khi đại biểu tải ảnh mới, ảnh thật thay logo.
- Đây là **fallback hiển thị** trên trình duyệt, không tạo ảnh giả trong Supabase, không chiếm Storage, không làm nhầm logo thành ảnh chân dung được BTC cập nhật. Nút **Thêm ảnh** vẫn đúng khi chưa có ảnh.

## Các giao diện dùng chung

1. Thẻ đại biểu điện tử và bản in (dùng chung `DelegatePass`).
2. Danh sách đại biểu phía quản trị (bảng máy tính, thẻ điện thoại, xem mã QR/Barcode, biểu mẫu tạo mới).
3. Hồ sơ cá nhân phía đại biểu, kể cả trường hợp dùng cùng tài khoản tại nhiều Đại hội.
4. Điểm danh tự quét và phần chào mừng trên màn hình trình chiếu, hàng chờ vừa điểm danh.
5. Bảng đại biểu vừa điểm danh và lịch sử điểm danh gần nhất của bàn BTC.

Component `src/components/delegate-portrait.tsx` dùng chung `congressBranding[kind]` và thay logo tại sự kiện `onError`. Nguồn ảnh cá nhân vẫn chỉ qua API `/api/delegates/{id}/photo` có phân quyền. Không chỉnh dữ liệu và không cần migration Supabase.

## Kiểm tra

- Một đại biểu chưa có ảnh thuộc Đại hội Đoàn: thẻ và bảng quản lý hiện huy hiệu Đoàn.
- Cùng người (nếu tham dự Đại hội Hội Sinh viên): ở Đại hội Hội hiện huy hiệu Hội, không dùng logo Đoàn.
- Ảnh hợp lệ: hiển thị ảnh thật; đường dẫn lỗi: thay logo tương ứng.
- BTC thêm ảnh và tải lại trang: logo mặc định được thay bằng ảnh chân dung.
- Kiểm tra trên thẻ in, màn hình chào điểm danh và cổng đại biểu.
