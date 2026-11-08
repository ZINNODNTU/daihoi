# Phân tích chất lượng đại biểu — V15

## Thiết kế

Hồ sơ đại biểu có hai trường mới **Giới tính** (`male`, `female`, `other`, hoặc chưa cung cấp) và **Ngày tháng năm sinh** (`YYYY-MM-DD`, cho phép chưa điền). Dữ liệu cũ không bị xóa. Thông tin được dùng để đánh giá **đại biểu thực sự có mặt**, không phải tất cả hồ sơ đã đăng ký.

- Tại `/congresses/[id]/delegates`, BTC/quản trị xem giới tính/ngày sinh ở bảng hoặc thẻ điện thoại; tài khoản có quyền admin có thể chỉnh sửa từng đại biểu (nút **Chỉnh sửa** / **Sửa giới tính / ngày sinh**).
- Khi tạo đại biểu, nhập giới tính và ngày sinh ngay trong biểu mẫu. Tải **Excel mẫu** có thêm hai cột; đọc CSV/XLSX cũng hỗ trợ hai cột đó.
- Excel chấp nhận giới tính Nam/Nữ/Khác (cả cách viết không dấu), ngày `dd/mm/yyyy`, `yyyy-mm-dd` và số serial ngày Excel. File mẫu vẫn tương thích với tệp cũ không có hai cột.
- Ngày sinh không hợp lệ (29/02 năm không nhuận, ngày tương lai, trước 1900) bị từ chối; hồ sơ thiếu thông tin giữ trạng thái **Chưa cập nhật**.
- Cập nhật từ biểu mẫu gọi `PATCH /api/delegates`, chỉ nhận `congressId`, `delegateId`, `gender`, `birth_date`, xác minh vai trò admin của đúng Đại hội trước khi ghi.

## Trang riêng cho BTC: Phân tích chất lượng đại biểu

Truy cập `/congresses/[id]/delegates/quality` từ sidebar **Phân tích chất lượng** hoặc tab cùng tên ở **Quản lý đại biểu**.

- Chỉ staff `viewer` (admin, checkin, secretary; hoặc super_admin) được truy cập. Đại biểu/khách mời không được phép.
- **Mặc định** phân tích phiên điểm danh gần nhất; có thể chọn từng phiên hoặc **Toàn Đại hội**.
- Chỉ các ID `delegate_id` tồn tại trong bảng **checkins** thuộc phạm vi được chọn mới được tính. Chế độ **Toàn Đại hội** dùng tập ID duy nhất để **không đếm trùng** người điểm danh nhiều phiên.
- Báo cáo gồm: tổng người có mặt, nam, nữ, giới tính khác/chưa khai, cơ cấu tuổi (Dưới 18, 18–25, 26–30, 31–40, 41–50, Trên 50), tuổi trung bình; đại biểu **cao tuổi nhất** (ngày sinh sớm nhất) và **trẻ tuổi nhất** (ngày sinh muộn nhất), họ tên, đơn vị và ngày sinh. Hai hay nhiều đại biểu cùng ngày sinh cực trị sẽ được hiển thị đầy đủ.
- Tuổi là **số tuổi tròn theo ngày hiện tại của Việt Nam**, không phải `năm hiện tại - năm sinh`. Khi không có ngày sinh, đại biểu vẫn được tính trong số có mặt nhưng **không** tham gia tính tuổi trung bình, phân bố tuổi hoặc cực trị; số thiếu dữ liệu hiển thị riêng.
- Bảng chi tiết đại biểu đã điểm danh giúp đối chiếu số liệu. Dữ liệu truy vấn phía server **sau khi kiểm tra quyền theo Đại hội**. Không có truy cập công khai.

## Cấu hình Supabase cần triển khai

**Chưa áp dụng schema lên database production**. Chạy trong SQL Editor của đúng Supabase project:

`supabase/upgrade-delegate-demographics-v15.sql`

Chạy sau `supabase/schema.sql` + `supabase/upgrade-delegate-accounts-v5.sql`. Migration chỉ thêm cột nullable và ràng buộc kiểm tra, không làm mất hồ sơ cũ. Tiếp tục áp dụng v11 (RLS hạn chế delegate) và v14 nếu còn thiếu, trước khi đưa hệ thống vào vận hành thực tế. Nếu không áp dụng v15, trang phân tích sẽ hiển thị thông báo lỗi và chức năng ghi giới tính/ngày sinh sẽ không sử dụng được.

## Kiểm thử

- Thử nhập thủ công, Excel, chỉnh sửa hồ sơ đã có, ngày sinh 29/02 năm nhuận và giá trị không hợp lệ.
- Tạo 2 phiên: đại biểu A điểm danh ở cả hai, B chỉ phiên đầu, C chưa điểm danh. **Toàn Đại hội = 2 người**, phiên đầu = 2, phiên sau = 1.
- Một đại biểu thiếu giới tính và DOB: vẫn tính vào tổng có mặt, tăng chỉ số thiếu dữ liệu, không được suy đoán.
- Thử trang từ tài khoản đại biểu / tài khoản không thuộc Đại hội: không được phép.
- Kiểm tra trên điện thoại và trên Supabase production sau khi migration v15 được áp dụng.

Mã nguồn hiện là phiên bản local đang phát triển; cần kiểm tra bằng dữ liệu điểm danh thật trước khi sử dụng cho báo cáo Đại hội.
