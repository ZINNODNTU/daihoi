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


## Ảnh chân dung nhân sự BCH (nâng cấp v9)

Mỗi hồ sơ nhân sự giới thiệu BCH có ảnh riêng (không bắt buộc), cả khi
người đó chưa có tài khoản hoặc hồ sơ đại biểu.

- Trong **Thêm nhân sự** hoặc **Sửa nhân sự**, chọn **Tải và chỉnh ảnh**.
  Công cụ dùng chung với danh sách Đại biểu: tải JPG/PNG/WebP,
  tự xóa nền qua MediaPipe trên thiết bị, thay bằng nền trắng,
  kéo ảnh và điều chỉnh crop tỷ lệ 3:4 chuẩn **600×800 px**.
- Nếu đã chọn một đại biểu có ảnh, bấm **Lấy ảnh từ đại biểu** để sao
  chép ảnh chuẩn vào bản nháp; ảnh BCH lưu độc lập, không thay đổi
  ảnh đại biểu gốc. Vẫn có thể chọn **Chỉnh / thay ảnh** để crop lại.
- Nút **Thêm ảnh / Sửa ảnh** tại mỗi dòng nhân sự cho phép thay ảnh
  trực tiếp mà không phải chỉnh sửa các thông tin khác.
- Ảnh xuất hiện tại danh sách trích ngang trên máy tính,
  thẻ nhân sự trên điện thoại và trong biểu mẫu thêm/sửa.
  Nếu chưa có ảnh, hiển thị hình người mặc định.

### Lưu trữ riêng tư và quyền xem ảnh

Migration: `supabase/upgrade-bch-photos-v9.sql`.
Bảng `bch_candidates` thêm `photo_path`. Ảnh JPEG được lưu trong
bucket **delegate-photos** hiện có (private), ở prefix riêng
`<congress_id>/bch/<candidate_id>.jpg`. Không tạo đường dẫn public.

API `GET /api/bch-candidates/[id]/photo` chỉ cho quản trị và thư ký
được phân quyền trong Đại hội; API PUT chỉ cho quản trị viên.
Định dạng bắt buộc là JPEG 600×800 tối đa 2 MB, server mã hóa lại
bằng sharp trước khi lưu. DB có CHECK bảo vệ đường dẫn ảnh theo
`congress_id` và `id`, tránh trỏ sang ảnh của đại hội khác.
Xóa nhân sự sẽ yêu cầu dọn ảnh đã lưu của nhân sự tương ứng.

Ảnh chỉ nằm trên website/Supabase Storage; **Excel hiện xuất 7 trường
trích ngang dạng văn bản, chưa nhúng ảnh vào từng ô**.
Đã triển khai migration v9 trên project pnxdxdagpeyqarucdphk.
