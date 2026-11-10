# Đồng bộ sơ đồ ghế giữa Ban Tổ chức và cổng đại biểu — V34

Ngày kiểm tra: 10/11/2026. Không đổi phân quyền, hồ sơ đại biểu hoặc lịch sử điểm danh.

## Nguyên nhân xác nhận trên Supabase

Sơ đồ **Hội Trường G** có **6 hàng × 28 ô vật lý**, chứa **144 ghế** (24 ghế/hàng); 4 ô trống/lối đi ở mỗi hàng. Có **3 bản sơ đồ** lưu siêu dữ liệu cũ `grid_rows=5` trong khi tọa độ thực tế lên đến hàng F. Cổng đại biểu trước đây dựng ghế theo min/max tọa độ có ghế nên các ô trống/lối đi bị mất; còn quản trị dựng theo lưới, dẫn đến lệch.

Đã cập nhật **chỉ** `grid_rows: 5 → 6` cho 3 bản Hội Trường G trên dự án Supabase `pnxdxdagpeyqarucdphk`. Trước khi cập nhật đã xác nhận 144 ghế/bản nằm chính xác trong lưới 6×28, không có ghế ngoài lưới; sau cập nhật đã xác minh cả 3 bản. Không cập nhật ID ghế, mã ghế, tọa độ, trạng thái, phân công hay điểm danh. Bản sao metadata trước sửa nằm ở thư mục làm việc nội bộ `.ai-bridge` (không commit).

## Sửa mã nguồn

- `projectSeatGrid` là phép chiếu vật lý thống nhất. Luôn giữ nguyên ô trống và lối đi khi hiển thị. Mã định danh ghế (UUID) không đổi.
- Điểm danh trên màn chiếu dùng cùng phép chiếu này; đánh số ghế thực trong từng hàng từ trái qua phải, gồm cả ghế đại biểu và khách mời.
- Trang quản trị tự suy ra kích thước thực nếu metadata của sơ đồ cũ chưa khớp. Số ghế hiển thị đúng cho cả quản trị viên và BTC chỉ đọc. Quản trị viên có thể **Lưu sơ đồ** để đồng bộ số/mã ghế đã chuẩn hóa vào dữ liệu gốc.
- Cổng đại biểu dùng đúng các hàng/cột ô trống, đánh số từ 1 đến 24, giữ sân khấu, viền ghế khách mời và tô vàng ghế của mình; vẫn hỗ trợ sơ đồ tự do, nút Tìm ghế, zoom, xoay ngang và cuộn 2 chiều.
- Trên màn hình rộng, hệ thống tính tỷ lệ vừa khung thay vì cắt mất các cột cuối; điện thoại giữ kích cỡ dễ đọc và hỗ trợ vuốt.

## Giới hạn được giữ an toàn

Dữ liệu production có **mã ghế lưu cũ** (ví dụ ghế thực đầu hàng được lưu `G-A-02`). Giao diện hiện chuẩn hóa **số ghế trình bày** mà không tự ý đổi mã nguồn dữ liệu hàng loạt. Nếu cần đồng bộ mã ghế trong file Excel, thẻ và các hệ thống khác, người có quyền quản lý cần mở **Sơ đồ ghế → Sửa → Lưu sơ đồ** sau khi kiểm tra danh sách phân công; việc lưu sử dụng luồng xử lý hiện tại của ứng dụng. Không sửa hàng loạt mã ghế qua script thiếu giao dịch.

Tình trạng **đã điểm danh nhưng chưa được phân ghế** không tự được giải quyết bằng thay đổi hiển thị; Ban Tổ chức cần phân đúng ghế cho đại biểu.

## Kiểm tra

Mô phỏng 6×28 với 144 ghế và 4 ô trống/hàng, bao gồm layout cũ 5×28 tự nhận diện hàng F. Kiểm tra ghế khách mời, ghế khóa và ghế tự do; kiểm tra không thay đổi UUID, quyền xem riêng tư và hành vi màn hình xoay ngang. Chạy thêm TypeScript, ESLint, toàn bộ test và production build.
