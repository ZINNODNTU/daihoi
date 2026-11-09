# V29 — Màn hình điểm danh: số ghế mới và logo theo loại Đại hội

**Cập nhật:** 09/11/2026. **Workspace:** `D:\daihoi`.

## Màn hình điểm danh

- Bỏ dải ô nhãn `G-F-02`, `G-F-03`... ở dưới bản đồ. Nguyên nhân là `seating_layouts.grid_rows` được lưu quá ngắn so với vị trí ghế thực tế: ví dụ có hàng F nhưng canvas chỉ khai báo 5 hàng.
- Trình chiếu tự xác định số hàng/cột thực tế từ tọa độ các ghế chuẩn lưới khu `G` và mở rộng bản đồ trong giới hạn tối đa 500 ô. Hàng F được trả về sơ đồ chính.
- Số **ghế đại biểu và khách mời** hiển thị tại màn hình điểm danh được tính lại từ trái sang phải trong **mỗi hàng ngang**: 01, 02, 03..., không tính lối đi và ô trống. Chuyển hàng thì trở về 01.
- Bỏ hàng số cột gây nhầm lẫn số ghế trên màn hình chiếu.
- Thẻ chào đón đại biểu và hàng chờ trên màn hình chiếu sử dụng mã ghế **hiển thị** theo số mới.
- Phiên giám sát phụ `AttendanceLiveBoard` dùng cùng bộ đếm.
- Dữ liệu trực tiếp được tải snapshot định kỳ 20 giây một lần (trước đây 120 giây). QR và check-in vẫn giữ nguyên.
- Ghế nằm ngoài lưới thực sự không bị xóa trong Supabase, chỉ không còn bị thể hiện thành những **chip mã rời** phía dưới bản đồ trình chiếu. Để thể hiện đầy đủ ghế tự do, cần bố trí chúng trong một bản đồ có thể hiện tọa độ tương ứng.

**Quan trọng:** Bộ đếm trên màn hình chiếu là read-only; không tự sửa `seats.code` hoặc `seats.seat_number` lưu trong Supabase, không tác động ghế/đại biểu đã phân công. Để **thẻ đại biểu, Excel phân ghế và màn hình điểm danh** thống nhất vĩnh viễn, BTC vào **Quản lý Đại hội → Sơ đồ hội trường → Mở sơ đồ cũ → Lưu sơ đồ**; nếu có ghế đã phân công đổi mã, hệ thống cảnh báo và cần xác nhận trước khi lưu. Nếu tọa độ ghế khác với số hàng/cột cũ, cần tăng kích thước sơ đồ phù hợp rồi lưu. API lưu V6 ghi nguyên tử theo version.

## Logo Hội/Đoàn

Logo được chọn theo `congresses.kind`, không suy đoán từ tên:
- `doan` → `/branding/huy-hieu-doan.png`
- `hoi_sinh_vien` → `/branding/huy-hieu-hoi-sinh-vien.png`

Áp dụng tại:
- Cổng quản trị khi mở trang của một Đại hội (sidebar và header có logo); trang dashboard/đăng nhập chung chưa chọn Đại hội vẫn giữ nhận diện mặc định.
- Màn hình điểm danh, trình chiếu fullscreen (phần đầu trang).
- Cổng đại biểu: header sau khi chọn Đại hội và ảnh logo trong thẻ đại biểu.
- Bộ chọn Đại hội hiển thị logo riêng cho mỗi Đại hội.

**Tệp nhận diện Hội Sinh viên:** ảnh PNG 1200×1200 của biểu trưng Hội (nền xanh cyan, ngọn lửa trắng, ngôi sao và tên Hội), lấy từ [thư viện vector Hải Triều](https://haitrieu.com/blogs/vector-logo-hoi-sinh-vien-viet-nam/). Khi BTC có file nhận diện do Trung ương Hội cấp trực tiếp, có thể thay tệp `public/branding/huy-hieu-hoi-sinh-vien.png` để bảo đảm trùng khớp ấn phẩm chính thức.

## Kiểm thử

- `tests/attendance-projection-brand-v29.test.mjs`: kiểm tra mở rộng hàng F, không có chip mã `G-F` rời, số ghế liên tục bỏ ô trống, avatar/card/admin/projection dùng logo theo `kind`, và snapshot refresh.
- Chạy `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`, `git diff --check`.
- Chưa chỉnh sửa dữ liệu đại biểu/ghế thật. Chưa push GitHub hoặc triển khai Vercel.
