# Mobile UX V22 — Cổng đại biểu và khách mời

**Cập nhật:** 09/11/2026. **Phạm vi:** code local `D:\daihoi`, chưa đẩy GitHub/chưa triển khai Vercel.

## Mục tiêu
Tối ưu trải nghiệm trên màn hình 320–430px: tìm thao tác quan trọng không cần cuộn nhiều, vùng chạm dễ dùng, không lẫn nhiều Đại hội trên cùng tài khoản và giữ quyền truy cập theo `congress_id`.

## Các thay đổi
| Trang | Nội dung |
| --- | --- |
| `/my-card` | Bộ chọn Đại hội sẵn có; thêm cụm thao tác mobile ở đầu thẻ: Điểm danh, Ghế, Tài liệu, BCH, Lịch sử. Đường dẫn tài liệu/BCH/lịch sử kèm `congressId` đã chọn; ghế kèm `sessionId` của phiên trong hồ sơ đang chọn. Thông tin mã vạch/ghế vẫn theo đúng hồ sơ. |
| `/my-card/checkin` | Tùy chọn camera thu trong `<details>`; camera sau vẫn mặc định; khung xem camera giới hạn 48dvh trên mobile; hiển thị nút xem lịch sử sau xác nhận thành công. Vẫn có chụp ảnh QR và dán liên kết dự phòng. |
| `/my-card/seats` | Điều khiển zoom 44px; nút `Tìm ghế` hiện nhãn cả mobile; sơ đồ cuộn trong khung cao đến 55dvh. Tự cuộn đến ghế người đang đăng nhập. |
| `/my-card/documents` | Component `DelegateDocumentsList`: tìm không dấu theo tên file, lọc Đại hội, chỉ render 24 file mỗi đợt, nhấn mở Google Drive qua API xác thực hiện tại. |
| `/my-card/bch` | Lọc Đại hội/tên/chức vụ; carousel chỉ hiển thị nhân sự phù hợp. Bộ chấm trang giới hạn tối đa 8 mục và ẩn trên mobile; danh sách dài có `select` nhảy nhanh. |
| `/my-card/history` | Lọc theo Đại hội, phân trang hiển thị 20 lượt, giữ thời gian theo `Asia/Ho_Chi_Minh`. |
| `/account` | Ảnh hồ sơ mobile 108×144, đặt cạnh nút đổi ảnh; nút lưu đủ bề ngang; cập nhật chỉ hồ sơ đã chọn, không sửa ID/QR/barcode/ghế. |
| Shared UI | Heading tiếng Việt tăng line-height, giảm nén chữ; form field mobile 16px để tránh iOS tự phóng khi focus; thanh menu đáy đã được gọn còn 4 mục chính + `Thêm`. |

## Quy tắc bảo mật
- Danh sách Đại hội của đại biểu lấy từ các hồ sơ `auth_user_id` đang hoạt động; khách lấy từ `congress_members` vai trò guest.
- `?congressId=...` là tùy chọn hiển thị, **không phải cấp quyền**. Server xác thực nó có trong danh sách Đại hội được phép truy cập rồi mới dùng làm trạng thái lọc ban đầu.
- Tài liệu phải có `delegate_visible=true`, đường dẫn mở `/api/documents/[id]` luôn kiểm tra lại trước khi redirect Google Drive.
- Không thêm đường dẫn công khai, không thay đổi Supabase migration/ACL hoặc điểm danh QR.

## Kiểm tra
1. `npm run lint`.
2. `node --test tests/*.test.mjs` (bao gồm `tests/delegate-mobile-ux-v22.test.mjs`).
3. `npm run build`, `git diff --check`.
4. Kiểm tra thủ công trên thiết bị thật tại các cỡ 320/375/390/430px (Android/iOS) với tài khoản đại biểu tham gia 2 Đại hội và một tài khoản guest: mở thẻ, đổi Đại hội, quét QR qua HTTPS, sơ đồ ghế, tài liệu Drive, lọc BCH, lưu ảnh/tên và thử lỗi mạng.

**Giới hạn xác minh:** lint/kiểm thử tự động/build là kiểm tra kỹ thuật, không thay cho đo Core Web Vitals, ảnh chụp trình duyệt hoặc kiểm thử với tài khoản thật. Chỉ công bố đã kiểm tra thực tế sau khi đã thực hiện các bước cuối trên thiết bị.
