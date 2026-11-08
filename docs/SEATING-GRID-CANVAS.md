# Canvas sơ đồ hội trường linh hoạt – Ghế đại biểu và khách mời

## Tổng quan

Mỗi Đại hội có thể có nhiều sơ đồ riêng cho các hội trường khác nhau.
Trong **Sơ đồ ghế → Tạo sơ đồ → Thiết kế → Canvas linh hoạt**, quản trị viên
nhập **số hàng** và **số cột trên hàng** để tạo đúng số ô vuông của hội trường.
Ví dụ 12 hàng × 15 cột = 180 vị trí; 20 × 25 = 500 vị trí. Mặc định là 10 × 20.
Giới hạn: tối đa 25 hàng, 30 cột, 500 ô cho mỗi canvas.

Một ô không đồng nghĩa một ghế: bật ô để đặt ghế, bỏ ô để làm lối đi,
khoảng trống hoặc hành lang. Mỗi sơ đồ lưu kích thước độc lập trong Supabase.

## Cách thiết kế

1. Đặt tên hội trường, chọn Thiết kế → Canvas linh hoạt.
2. Nhập số hàng/số cột và bấm **Tạo / đổi kích thước canvas**.
3. Chọn **Loại ghế mới**: **Ghế đại biểu** hoặc **Ghế khách mời**.
4. Dùng **Chọn / bỏ ghế**, **Tô ghế**, **Tạo lối đi** hoặc **Chọn người ngồi**.
   Trên máy tính có thể giữ và kéo chuột; điện thoại chạm từng ô và cuộn ngang.
5. Mẫu nhanh: lấp đầy canvas, chừa lối đi giữa, xóa ghế trên lưới.
6. Nhấn **Lưu sơ đồ** trước khi phân công người ngồi. Ghế có mã tự sinh như
   G-A-01, G-B-07; khi cần có thể chỉnh mã ở bảng Thông tin ghế.
7. Bấm ghế muốn phân công để xem bảng **Chọn đại biểu / khách mời ngồi tại ghế**.
   Tìm theo tên/mã/đơn vị và chọn người tương ứng. Có thể dùng Excel để nhập hàng loạt.
8. Dùng **Sao chép sơ đồ** rồi đổi tên để tạo sơ đồ cho hội trường khác.

### Quy tắc phân công

- Ghế đại biểu: chỉ gán hồ sơ **chính thức** hoặc **dự khuyết**.
- Ghế khách mời: chỉ gán hồ sơ có vai trò **khách mời**.
- Ghế đã phân công không thể bị xóa/khóa/đổi loại trước khi bỏ phân công.
- Mỗi người chỉ có một ghế trong một sơ đồ. Gán ghế khác sẽ chuyển vị trí cũ.
- Hệ thống kiểm tra cả ở client, khi nhập Excel và trong database RPC;
  không thể vượt qua chỉ bằng cách gửi yêu cầu HTTP trực tiếp.
- Đổi kích thước nhỏ hơn không xóa ghế cũ nằm ngoài lưới;
  ghế này vẫn truy cập qua **Canvas tự do**.
- Sơ đồ độc lập theo Đại hội, yêu cầu tài khoản BTC có quyền quản trị để sửa.

## Dữ liệu và triển khai

Cấu trúc lưu bằng các bảng Supabase hiện có, được mở rộng ở
supabase/upgrade-seating-v6.sql (đã áp dụng vào project pnxdxdagpeyqarucdphk).
Các trường mới: seating_layouts.grid_rows, seating_layouts.grid_columns,
seats.seat_type. RPC mới seating_save_layout_v6 và cơ chế phân công nâng cấp
seating_apply_assignments bảo vệ đúng loại ghế.

Dự án vẫn giữ chế độ Canvas tự do, gán trực tiếp từng ghế, xuất/nhập Excel.
Sao lưu trước khi chạy migration trên môi trường khác.

## Kiểm thử

Chạy: node --test tests/seating-grid.test.mjs tests/seating-flexible.test.mjs
và npm run check:supabase, npm run build.

Nên kiểm thử thao tác đăng nhập thật: tạo sơ đồ 12×15, chọn ghế khách mời,
lưu/tải lại, tạo khách mời trong danh sách đại biểu, phân ghế và kiểm tra
khách mời không xuất hiện khi chọn ghế đại biểu.
