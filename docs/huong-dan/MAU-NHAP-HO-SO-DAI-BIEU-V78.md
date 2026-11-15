# Excel nhập đại biểu theo mẫu NAM/NỮ – V79 (giao diện tối giản)

Mẫu Excel có **2 hàng tiêu đề** và **13 cột** giống bảng trích ngang mà BTC cung cấp. Dòng 1 gộp tiêu đề D:E cho "Ngày tháng năm sinh"; dòng 2 gồm D2 = **NAM** và E2 = **NỮ**. Bắt đầu nhập hồ sơ ở dòng 3.

## Dữ liệu thực sự đưa vào website đại biểu

| Trường lưu vào hệ thống | Nguồn Excel |
| --- | --- |
| Họ tên | Cột B (HỌ VÀ TÊN) |
| MSSV | Cột C (MSSV, cũng hiểu tiêu đề MSVV) |
| Giới tính và ngày sinh | D (NAM) **hoặc** E (NỮ); không được điền cả hai |
| Chức vụ | Cột J (CHỨC VỤ – ĐƠN VỊ CÔNG TÁC) |
| Đơn vị | Cột L (LỚP); hoặc cột Đơn vị riêng nếu có |
| Loại đại biểu | Mặc định Chính thức; có thể đổi riêng trên website |

**Các cột F, G, H, I, K, M trong Excel chỉ là thông tin trích ngang nguồn:** Quê quán, Tôn giáo, Dân tộc, Ngày vào Đoàn, SĐT và Ghi chú. **Không nhập, không lưu, không hiển thị trong hồ sơ đại biểu trên website**. Cột L cũng không tạo trường Lớp riêng mà chỉ làm giá trị Đơn vị nếu có.

Giao diện quản lý giữ nguyên như trước: ảnh, mã đại biểu, họ tên, MSSV/email, đơn vị/chức vụ, vai trò, giới tính/ngày sinh, tài khoản, QR/Barcode. Hộp thêm/sửa đại biểu cũng chỉ có những trường cũ. Không yêu cầu chạy migration V78 và không can thiệp các bản ghi hiện có.

File Excel ngày tháng năm sinh có thể là Date, serial Excel, hoặc văn bản dd/mm/yyyy. Định dạng cũ 7 cột một hàng tiêu đề (chuyển Đại hội) vẫn được nhập. Tối đa 250 đại biểu và 2 MB/tệp; các MSSV đã tồn tại trong Đại hội sẽ được bỏ qua khi xem trước. Nếu cả NAM lẫn NỮ có giá trị trong một dòng, trình nhập báo lỗi và không lưu lô dữ liệu.

Lưu ý: Vẫn cần migration dữ liệu nhân khẩu học `supabase/upgrade-delegate-demographics-v15.sql` nếu cơ sở dữ liệu chưa có hai cột `gender` và `birth_date`. Không cần migration tạo các trường trích ngang.
