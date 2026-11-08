# Danh sách trích ngang nhân sự giới thiệu Ban Chấp hành

Trang trong menu Đại hội: **Trích ngang nhân sự BCH**.

## Các trường dữ liệu (bắt buộc)

Họ tên, Năm sinh, Quê quán, Dân tộc, Trình độ, Năm vào Đoàn,
Chức vụ hiện tại. Có trường Thứ tự trình bày để BTC sắp thứ tự
trong danh sách.

## Quy trình

1. Quản trị viên mở trang → Thêm nhân sự.
2. Có thể chọn từ danh sách đại biểu hiện có để điền nhanh Họ tên
   và Chức vụ, hoặc nhập một nhân sự độc lập không có tài khoản đại biểu.
3. Điền đủ bảy trường trích ngang; hệ thống kiểm tra giới hạn ký tự,
   năm sinh và năm vào Đoàn.
4. Bấm Thêm vào danh sách; có thể Sửa / Xóa khi cần.
5. Tìm nhanh theo họ tên, quê quán, dân tộc, trình độ, chức vụ.
6. Bấm Xuất Excel để tải bảng đầy đủ với tiêu đề cột
   STT – Họ tên – Năm sinh – Quê quán – Dân tộc – Trình độ –
   Năm vào Đoàn – Chức vụ hiện tại; xuất đủ danh sách kể cả
   khi đang bật bộ lọc tìm kiếm.
7. Nhiều Đại hội lưu danh sách hoàn toàn tách biệt. Danh sách
   mới tạo là **đề xuất giới thiệu**, không phải kết quả bầu BCH.

## Phân quyền và bảo vệ dữ liệu

Migration: supabase/upgrade-bch-candidates-v8.sql.
Bảng: public.bch_candidates. RLS và các GRANT được thiết lập trực tiếp,
không truy cập bằng Service Key trên API giao diện.

- Super Admin / quản trị Đại hội: xem, thêm, sửa, xóa và xuất Excel.
- Thư ký Đại hội: xem và xuất Excel.
- Tài khoản điểm danh, đại biểu, khách mời, ẩn danh: không được đọc.
- API xác thực phiên đăng nhập và congress_id cho từng yêu cầu;
  bản ghi không được sửa/xóa vượt phạm vi Đại hội.
- Hồ sơ nhân sự chứa dân tộc, quê quán và năm sinh: chỉ đưa vào
  danh sách người được BTC phê duyệt, không tự công khai trên trang khách.
- Không tự tạo hồ sơ đại biểu hoặc cấp tài khoản từ danh sách giới thiệu BCH.

Dữ liệu được bổ sung vào snapshot logic của npm run backup:supabase.
Đã áp dụng migration trên Supabase project pnxdxdagpeyqarucdphk.
