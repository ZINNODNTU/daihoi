# Mẫu Excel nhập hồ sơ đại biểu – 8 cột (V81)

Mẫu tải từ **Quản lý Đại hội → Danh sách đại biểu → Tải Excel mẫu** gồm **8 cột**:

| Cột | Tiêu đề | Nội dung |
| --- | --- | --- |
| A | STT | Số thứ tự tham khảo; hệ thống tự cấp mã đại biểu. |
| B | HỌ VÀ TÊN | Họ tên đại biểu, bắt buộc. |
| C | MSSV | Mã số sinh viên; đại biểu Khách mời có thể để trống. |
| D | NGÀY THÁNG NĂM SINH – NAM | Chỉ nhập ngày sinh ở đây nếu là Nam. |
| E | NGÀY THÁNG NĂM SINH – NỮ | Chỉ nhập ngày sinh ở đây nếu là Nữ. |
| F | CHỨC VỤ | Ví dụ Bí thư Chi đoàn, Phó Bí thư. |
| G | ĐƠN VỊ | Khoa, Chi đoàn, lớp hoặc cơ quan. |
| H | LOẠI ĐẠI BIỂU | **Chính thức**, **Dự khuyết** hoặc **Khách mời**. |

**D1:E1 gộp ô**, D2 = NAM, E2 = NỮ; dữ liệu bắt đầu từ dòng 3. Chỉ điền một trong hai cột ngày sinh. Cột H có thể để trống: khi đó **mặc định Chính thức**; giá trị ngoài ba loại trên sẽ bị từ chối kèm số dòng. Khách mời không bắt buộc MSSV; các loại khác cần MSSV.

Excel cũ 7 cột (chưa có Loại đại biểu), Excel 13 cột trích ngang và Excel chuyển Đại hội một hàng tiêu đề vẫn được nhập; loại đại biểu của file cũ không có trường tương ứng mặc định Chính thức. Cột thông tin không dùng như Quê quán, Tôn giáo, Dân tộc, Ngày vào Đoàn, Số điện thoại, Lớp và Ghi chú **không xuất hiện trong mẫu tải về**.

Giao diện quản lý đại biểu giữ nguyên: Ảnh, Mã đại biểu, Họ tên, MSSV/Email, Đơn vị/Chức vụ, Vai trò, Giới tính/Ngày sinh, Tài khoản, QR/Barcode. Khi xem trước file nhập, có thêm cột Loại đại biểu để BTC xác nhận trước khi lưu.

Mỗi lượt nhập tối đa 250 đại biểu và 2 MB. Không yêu cầu migration Supabase mới.
