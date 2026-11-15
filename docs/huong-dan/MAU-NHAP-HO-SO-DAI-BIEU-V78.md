# Mẫu Excel nhập hồ sơ đại biểu – 7 cột (V80)

Mẫu tải từ **Quản lý Đại hội → Danh sách đại biểu → Tải Excel mẫu** gồm đúng 7 cột; không có các trường trích ngang không sử dụng.

| Cột | Tiêu đề | Nội dung |
| --- | --- | --- |
| A | STT | Thứ tự tham khảo, không quyết định mã đại biểu. |
| B | HỌ VÀ TÊN | Họ tên đại biểu, bắt buộc. |
| C | MSSV | Mã số sinh viên, bắt buộc với đại biểu thông thường. |
| D | NGÀY THÁNG NĂM SINH – NAM | Chỉ nhập ngày sinh ở đây nếu là nam. |
| E | NGÀY THÁNG NĂM SINH – NỮ | Chỉ nhập ngày sinh ở đây nếu là nữ. |
| F | CHỨC VỤ | Chức vụ đại biểu (ví dụ Bí thư Chi đoàn). |
| G | ĐƠN VỊ | Khoa, Chi đoàn, Lớp hoặc cơ quan. |

File có 2 hàng tiêu đề: **D1:E1 gộp ô**, D2 = NAM, E2 = NỮ; dữ liệu bắt đầu ở dòng 3. Nhập ngày sinh vào đúng một trong hai cột để tự nhận diện giới tính. Nếu cả hai cột đều có ngày sinh, hệ thống báo lỗi và không nhập. Ngày có thể là kiểu Date, số Excel hoặc chuỗi dd/mm/yyyy.

**Đã bỏ hoàn toàn khỏi mẫu:** Quê quán, Tôn giáo, Dân tộc, Ngày vào Đoàn, Số điện thoại, Lớp và Ghi chú (Đảng viên). Chức vụ và Đơn vị là **hai cột độc lập** và được lưu đúng vào các trường hiện có của hệ thống.

Trang quản lý đại biểu, form thêm/sửa và cổng đại biểu không thêm trường mới; vẫn hiển thị ảnh, mã đại biểu, họ tên, MSSV/Email, đơn vị/chức vụ, vai trò, giới tính/ngày sinh, tài khoản, QR/Barcode.

Trình nhập vẫn hỗ trợ **mẫu 13 cột cũ** (bỏ qua các cột mở rộng, dùng Lớp làm Đơn vị khi không có cột Đơn vị) và mẫu 7 cột một hàng tiêu đề dùng chuyển Đại hội. Tối đa 250 hồ sơ và 2 MB mỗi tệp; xem trước danh sách và bỏ qua MSSV đã tồn tại trong Đại hội. Không yêu cầu migration cơ sở dữ liệu mới cho thay đổi file mẫu.
