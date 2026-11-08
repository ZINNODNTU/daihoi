# Canvas thiết kế hội trường — 200 ô ghế

Trang Sơ đồ ghế → Tạo sơ đồ → Thiết kế → Lưới 200 ô hiển thị mặt bằng 10 hàng × 20 cột.

### Sử dụng
- Mỗi ô vuông là một vị trí **có thể** đặt ghế. Ô chưa chọn là lối đi/khoảng trống, không tính vào tổng ghế.
- **Chọn / bỏ ghế**: bấm ô để thêm hoặc bỏ ghế. **Tô ghế**: bật ghế. **Tạo lối đi**: xóa ghế tại ô.
- Trên máy tính có thể giữ chuột và kéo qua các ô để tô/loại bỏ; trên điện thoại chạm từng ô và cuộn ngang.
- Mẫu nhanh: đủ 200 ghế; 180 ghế với lối đi đôi ở giữa; xóa các ghế trên lưới.
- Dùng **Chi tiết ghế** để chọn một ghế và chỉnh mã/khu vực/khóa ghế ở bảng bên cạnh.
- Lưu sơ đồ để tạo dữ liệu ở Supabase; sau đó có thể phân công đại biểu hoặc nhập/xuất Excel.
- Tạo sơ đồ mới, sao chép sơ đồ hiện có và đặt tên khác để thiết kế cho từng hội trường riêng biệt.
- **Canvas tự do** vẫn có sẵn để kéo ghế, thiết kế thêm khu vực và chỉnh tọa độ.

### Bảo vệ dữ liệu
- Ghế giữ nguyên ID khi tô lại lưới; phân công hiện có không bị mất.
- Từ chối toàn bộ thao tác hàng loạt nếu nó sẽ xóa ghế đã phân công cho đại biểu.
- Ghế tọa độ ngoài lưới không bị xóa bởi các mẫu nhanh; giao diện có cảnh báo riêng.
- Mã ghế tự động theo hàng và cột, ví dụ G-A-01 đến G-J-20; tránh trùng với mã có sẵn.
- Mỗi sơ đồ tối đa 500 ghế. Quyền lưu yêu cầu admin của Đại hội.
- Lưu qua API /api/seating và RPC của migration Supabase seating v4; **không cần migration mới**.

### Kiểm thử
Chạy: node --test tests/seating-grid.test.mjs
Kiểm tra thực tế: đăng nhập BTC → tạo Đại hội → tạo sơ đồ → tùy chỉnh lưới → lưu → tải lại → thử phân công và xuất Excel.
