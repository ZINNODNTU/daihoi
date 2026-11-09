# Ảnh đại biểu: xóa nền, crop chân dung và cấp mã tự động

## Thao tác người quản trị

1. Vào Đại hội → Danh sách đại biểu → Thêm đại biểu.
2. Nhập MSSV nếu có, Họ tên, Đơn vị, Chức vụ và Loại đại biểu.
3. Chọn ảnh JPG, PNG, WebP (tối đa 8 MB) trong mục Ảnh chân dung.
4. MediaPipe tự tách người khỏi nền và tô nền trắng ngay trên trình duyệt.
5. Kéo trực tiếp trên khung ảnh và dùng thanh điều chỉnh vị trí/phóng to để crop tỷ lệ 3:4 (600x800).
6. Lưu đại biểu: database tự cấp mã DB-000001, DB-000002... theo từng Đại hội.
7. Với hồ sơ có sẵn, dùng nút Thêm ảnh hoặc Sửa ảnh ngay trên từng dòng.
8. Ảnh xuất hiện trong danh sách, thẻ Barcode BTC và trang Thẻ đại biểu của tôi.

## Mã đại biểu và Excel

- Migration: supabase/upgrade-delegate-photos-v7.sql.
- Bảng private.delegate_code_counters và trigger cấp mã bằng UPSERT nguyên tử, tránh trùng khi có nhiều người nhập cùng lúc.
- Trigger luôn thay thế mã người dùng gửi trong INSERT; form và Excel không có trường nhập mã thủ công.
- Mã đại biểu cũ được giữ nguyên, mã mới được sinh nối tiếp trong Đại hội tương ứng.
- Excel dùng các cột MSSV, Họ tên, Đơn vị, Chức vụ, Vai trò.
- Excel cũ có cột Mã đại biểu hoặc Chi đoàn vẫn đọc được để tương thích, nhưng mã cũ bị bỏ qua.

## Lưu trữ và bảo vệ dữ liệu

- Sau migration v5/v6, chạy migration v7 và npm run setup:delegate-photos.
- Bucket Supabase Storage delegate-photos được đặt private, chỉ JPEG, tối đa 2 MB.
- GET ảnh cần quyền viewer theo Đại hội, PUT ảnh cần quyền admin; ảnh 600x800 được server kiểm tra và mã hóa lại bằng sharp.
- Đường dẫn: <congress_id>/<delegate_id>.jpg, không có URL công khai.
- Tách nền chạy trên thiết bị, ảnh gốc không tải lên bên cung cấp dịch vụ AI.
- Model MediaPipe SelfieSegmenter (Apache 2.0) được lưu ở public/models/selfie_segmenter.tflite; runtime WASM tải từ jsDelivr lần đầu.
- Nếu không thể tải WASM, công cụ thông báo lỗi và có lựa chọn sử dụng ảnh gốc (không xóa phông), không âm thầm coi ảnh gốc là đã tách nền.
- Hiện ảnh đại biểu lưu ở Supabase Storage riêng tư. Phần tài liệu hội nghị qua Google Drive là luồng riêng, ưu tiên Apps Script hoặc OAuth dự phòng; xem [Google Drive V18](../tai-lieu/GOOGLE-DRIVE-LINKS-V18.md).

## Kiểm tra

npm run check:supabase
node --test tests/delegate-photos.test.mjs
npm run lint
npm run build

Nên thử tải ảnh thực tế, xem lại ảnh, in thẻ, kiểm tra mã tự sinh và tình huống nhiều người nhập đồng thời.
