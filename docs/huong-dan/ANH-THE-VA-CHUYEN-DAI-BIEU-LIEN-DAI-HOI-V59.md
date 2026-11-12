# V59 — Ảnh thẻ đại biểu liên Đại hội & xuất/nhập danh sách chọn lọc

Ngày: 12/11/2026. Repo: `ZINNODNTU/daihoi`.

## 1. Khắc phục ảnh không hiện trên thẻ Hội Sinh viên

**Nguyên nhân đã xác minh trực tiếp trên database production:** hồ sơ cùng người `Nguyễn Thành Nhân` có hai dòng delegate ở hai Đại hội (`doan` và `hoi_sinh_vien`), trùng `auth_user_id`. Cả hai dòng có cùng `photo_path` trỏ về file gốc theo định dạng `<doan-congress-id>/<delegate-doan-id>.jpg`. File thực tế **tồn tại** trong bucket `delegate-photos` (kiểm tra bằng service role, chỉ kiểm tra sự tồn tại). API GET cũ chỉ chấp nhận ảnh đúng đường dẫn của delegate hiện tại hoặc ảnh chung `people/<auth_user_id>.jpg`, nên phiên Hội Sinh viên trả HTTP 404 và thẻ rơi về avatar mặc định.

**Sửa V59:** GET `/api/delegates/:id/photo` trước hết vẫn xác thực JWT/session và kiểm tra chủ sở hữu `auth_user_id` hoặc `delegates.read` theo Đại hội. Nếu `photo_path` không khớp profile hiện tại, API chỉ chấp nhận ảnh local của một **hồ sơ nguồn còn hoạt động có đúng cùng Auth user ID** và đường dẫn nguồn có cấu trúc chuẩn. Không cấp quyền dựa vào họ tên, MSSV hay tên file; không mở public bucket. Đường dẫn `?w=160` vẫn được Sharp resize và phục vụ same-origin, `private, no-store`. Thẻ và trang in dùng cùng endpoint.

**Liên kết ảnh cho lần tải tiếp theo:** Khi **chính đại biểu tự cập nhật ảnh cá nhân** qua tài khoản của mình, API lưu master chung `people/<auth_user_id>.jpg` (một file) và đồng bộ `photo_path` ở mọi hồ sơ thuộc Auth user đó. Khi **BTC sửa ảnh**, quyền chỉ giới hạn ở hồ sơ thuộc Đại hội BTC quản lý; BTC không thể thay ảnh của Đại hội khác thông qua quyền một Đại hội. Ảnh nguồn được các hồ sơ liên kết hợp lệ tham chiếu vẫn hiển thị đúng. Chỉ dọn master cũ sau khi không còn delegate/BCH nào tham chiếu; không dọn ảnh cũ chỉ vì tải trang. Các hồ sơ legacy hiện hữu không bị sửa hàng loạt và vẫn được phục vụ bằng kiểm tra nguồn an toàn. Trang đại biểu thêm cache-busting URL từ `photoPath` để thay ảnh sau thay đổi liên kết.

## 2. Xuất tất cả hoặc những đại biểu đã chọn

**Đường dẫn:** Quản lý Đại hội → **Danh sách đại biểu** (`/congresses/<id>/delegates`), đối với BTC có `delegates.write`. Hộp **Xuất danh sách đại biểu** chứa nút `Xuất tất cả (N)`, `Xuất đã chọn (N)`, `Bỏ chọn`. Checkbox ở mỗi dòng bảng máy tính, thẻ mobile, nút chọn toàn bộ **đang hiển thị theo tìm kiếm**. Chọn một người không làm thay đổi dữ liệu nguồn; chỉ tải file.

Excel gồm **đúng 7 cột theo biểu mẫu nhập**: `MSSV`, `Họ tên`, `Đơn vị`, `Chức vụ`, `Vai trò`, `Giới tính`, `Ngày sinh`. Xuất họ tên Unicode, MSSV dạng chuỗi (không mất số 0 đầu), ngày `dd/mm/yyyy`; nhân sự `guest` không bắt buộc có MSSV. Chỉ xuất các trường cần thiết: **không đưa mật khẩu, auth UUID, QR/barcode, đường dẫn Storage, ghế hoặc dữ liệu phiên điểm danh vào tệp**. Mã đại biểu do Đại hội nhận tự cấp mới để tránh trùng mã.

Giới hạn nhập của API là **250 người/lần**: khi xuất >250 người, hệ thống tách thành các tệp Excel 250 người/tệp, đánh số `-001`, `-002`… cho mỗi tệp. Trình duyệt có thể cần bật cho phép tải nhiều tệp. Chức năng Nhập Excel/CSV nhận tệp theo cùng schema; xem trước số hồ sơ mới và bỏ qua MSSV đã tồn tại ở **Đại hội đang nhận**. Kiểm tra MSSV trùng trong tệp, không tự cập nhật người cũ; giảm rủi ro nhập trùng hoặc ghi đè.

**Vận hành chuyển giữa Đại hội:** xuất từ Đại hội A → chuyển sang Đại hội B → chọn **Nhập Excel/CSV** → kiểm tra các dòng mới → **Xác nhận nhập** → qua **Quản lý tài khoản đại biểu** tại B để cấp/liên kết tài khoản hiện hữu. Khi cùng người được liên kết Auth đúng danh tính, thẻ tại B hiển thị ảnh nguồn từ A, không cần tải lại. Ảnh và tài khoản không được đính kèm vào Excel nhằm tránh phát tán dữ liệu truy cập.

## 3. Kiểm thử

- `tests/delegate-photo-linked-v59.test.mjs`: xác minh link ảnh cross-congress cùng Auth (HTTP 200), từ chối owner không trùng/nguồn không hoạt động/đường dẫn giả/anonymous, và luồng upload master chung.
- `tests/delegate-transfer-v59.test.mjs`: đối chiếu cột template, dữ liệu MSSV có số 0, Unicode, ngày sinh, vai trò, selected IDs, tách nhóm 250 và UX nhập/xuất.
- Chạy `npm run lint`, `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run build`, `npm run docs:check` trước khi phát hành.
- Chỉ smoke test ảnh bằng tài khoản đại biểu thật (đã login) mới xác nhận được trình duyệt production và quyền thực tế; các test chức năng dùng mock authorization/storage.

**Không cần migration Supabase V59.** Không công khai Storage và không sao chép file ảnh sang mỗi Đại hội. 

