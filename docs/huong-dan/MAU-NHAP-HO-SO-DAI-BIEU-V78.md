# Mẫu Excel hồ sơ đại biểu – V78

## Cấu trúc
Nút **Tải Excel mẫu** tại **Đại hội → Danh sách đại biểu** tạo bảng 2 hàng tiêu đề, 13 cột theo bảng trích ngang BTC cung cấp.

| Cột | Nội dung | Cách dùng |
|---|---|---|
| A | STT | Tham khảo, hệ thống tự cấp mã đại biểu. |
| B | Họ và tên | Bắt buộc. |
| C | MSSV | Bắt buộc với đại biểu thông thường; hỗ trợ cả tiêu đề MSVV trong file gốc. |
| D | Ngày sinh – NAM | Chỉ điền ngày sinh nam. |
| E | Ngày sinh – NỮ | Chỉ điền ngày sinh nữ. |
| F | Quê quán | Tùy chọn. |
| G | Tôn giáo | Tùy chọn. |
| H | Dân tộc | Tùy chọn. |
| I | Ngày vào Đoàn | Tùy chọn. |
| J | Chức vụ – đơn vị công tác | Lưu vào chức vụ. |
| K | Số điện thoại | Lưu dạng văn bản để giữ số 0 đầu. |
| L | Lớp | Làm đơn vị mặc định khi không có cột Đơn vị riêng. |
| M | Ghi chú (Đảng viên) | Tùy chọn. |

Bắt đầu dữ liệu ở dòng 3. D1:E1 được gộp; D2 = NAM và E2 = NỮ. Chỉ được có ngày sinh ở một trong hai cột. Nếu cùng có ngày sinh cả hai, hệ thống báo số dòng và từ chối toàn bộ lô.

Trình nhập xử lý ngày Excel (Date), serial Excel và văn bản dd/mm/yyyy. Hỗ trợ tối đa 250 hồ sơ/2 MB mỗi lần, phát hiện MSSV trùng và cho xem trước. File chuyển Đại hội cũ (7 cột một hàng tiêu đề) tiếp tục nhập được, không ảnh hưởng quy trình cũ.

## Triển khai
Chạy lần lượt supabase/upgrade-delegate-demographics-v15.sql (nếu chưa có) và supabase/upgrade-delegate-roster-v78.sql trên đúng Supabase project của website. Migration chỉ bổ sung trường; không nới quyền RLS, không thay đổi tài khoản, ảnh, mã QR hoặc ghế.

Khi chưa có migration V78, trang đại biểu vẫn đọc schema cũ và có cảnh báo; các lô Excel chứa thông tin mở rộng chưa được nhập để tránh mất dữ liệu. Sau khi migration chạy, tải lại trang và kiểm tra thử một đại biểu nam, một đại biểu nữ.

## File nguồn
File trích ngang người dùng cung cấp có ba sheet; sheet đầu tiên chứa 2 dòng tiêu đề và dữ liệu. Hệ thống chỉ đọc sheet đầu có tiêu đề hợp lệ.
