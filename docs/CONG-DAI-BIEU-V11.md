# Cổng Đại biểu v11 — phân quyền, barcode, camera và chỗ ngồi

## Giao diện
- `/my-card` là trang riêng cho đại biểu, có điều hướng đáy 4 tab tối ưu màn hình 320–430px: Thẻ, Điểm danh, Lịch sử, Tài khoản.
- Thẻ đại biểu có tên Đại hội, nhiệm kỳ, chân dung, họ tên, đơn vị, chức vụ, **vị trí ghế theo phiên đang chọn**, địa điểm và **barcode CODE128 duy nhất**; không còn QR đại biểu. Hỗ trợ in thẻ.
- Nút **Điểm danh ngay** trên thẻ mở vùng quét QR. Đại biểu dùng camera sau quét **QR cố định theo phiên đang chiếu tại hội trường**; việc điểm danh ghi trực tiếp qua `POST /api/attendance/self-checkin`, dùng danh tính Supabase Auth của đại biểu, không dựa vào ID tự nhập.
- Màn hình báo thành công/đã điểm danh; thẻ sẽ được cập nhật sau router.refresh, có lịch sử từng phiên (giờ, tên phiên). Không dùng mã vạch cá nhân để tự điểm danh; barcode dành cho BTC xác minh tại bàn.
- Nếu điện thoại dùng HTTP LAN thì trình duyệt thường từ chối camera (`getUserMedia`). Chạy trên HTTPS (Vercel hoặc reverse proxy/tunnel HTTPS đáng tin cậy) hoặc quét QR màn hình bằng ứng dụng Camera của điện thoại để mở đường dẫn. Giao diện cũng hỗ trợ dán liên kết QR phiên hoặc dùng Camera mặc định/chọn ảnh có mã QR để giải mã ngay trên thiết bị, không gửi ảnh lên server. Video không upload lên máy chủ.

## Hàng rào quyền
- `hasRole(...,"viewer")` chỉ cho admin/checkin/secretary và super_admin; **delegate/guest không truy cập được nghiệp vụ**, kể cả bằng cách nhập URL trực tiếp.
- `/dashboard` điều hướng người không có vai trò BTC về `/my-card`. Layout `/congresses/[id]` kiểm tra quyền trước khi tải dữ liệu và từ chối delegate/guest.
- API nghiệp vụ dùng `hasRole` vẫn kiểm tra trên server; `/api/attendance/self-checkin` tự đối chiếu `auth_user_id` và phiên, giờ mở/đóng, tính hợp lệ chữ ký QR, trùng lượt điểm danh. Ảnh chân dung được trả cho đúng chủ thẻ hoặc nhân sự BTC được cấp quyền.
- Dữ liệu cổng đại biểu lấy bằng server-only Supabase Admin **sau khi xác minh phiên đăng nhập**, và chỉ chọn hồ sơ `auth_user_id = user.id`, rồi lọc checkin, sơ đồ, vị trí bằng các ID hồ sơ thuộc chính tài khoản đó. Không gửi khóa secret xuống browser.

## BẮT BUỘC cập nhật Supabase RLS
**Chưa áp dụng SQL lên database thực tế.** Tệp `supabase/upgrade-delegate-portal-v11.sql` được tạo để áp dụng **sau** bản nâng cấp v5 và v10. SQL thu hẹp `private.has_congress_role(...,'viewer')` khỏi delegate/guest và thêm chính sách SELECT **chỉ bản ghi của chính người dùng** trên `delegates` / `checkins` — không cho đại biểu đọc danh sách đại biểu, báo cáo hoặc phiên nội bộ qua Supabase Data API.

Dự án Supabase được chọn trong cuộc hội thoại cũ: `pnxdxdagpeyqarucdphk`. Hai kết nối Supabase hiện tại không cung cấp dự án này nên **không ghi SQL sang database khác**. Cần liên kết đúng project vào Supabase plugin hoặc áp dụng script qua SQL Editor tài khoản dự án đúng, sau đó kiểm tra tài khoản đại biểu/btc trước khi đưa vào chạy chính thức.

## Kiểm thử cần thực hiện trên dữ liệu thực
1. Đăng nhập role `delegate`: chỉ thấy Thẻ, Điểm danh, Lịch sử, Tài khoản; truy cập thủ công `/dashboard`, `/congresses/<id>/attendance`, `/api/seating`, `/api/reports/attendance` phải bị chặn (redirect/403).
2. Đại biểu A không xem được ảnh và bản ghi đại biểu B. Query Supabase `delegates` và `checkins` từ public client chỉ trả dữ liệu của A.
3. Đại biểu A thấy ghế tương ứng phiên 1 và phiên 2 nếu có sơ đồ khác nhau; lịch sử tự phân loại theo phiên.
4. Quét QR `se2` qua HTTPS trên iOS Safari và Android Chrome trong giờ mở -> thành công. Quét lần hai -> đã điểm danh, không thêm bản ghi. Ngoài giờ hoặc phiên đóng -> từ chối.
5. Barcode CODE128 trên điện thoại quét được bằng công cụ BTC, nhưng **không phải mã tự điểm danh**. Chỉ BTC được xác nhận điểm danh dự phòng sau đối chiếu.
6. Kiểm tra in thẻ trên Chrome/Safari và viewport 320, 375, 390, 430, 768px, hỗ trợ thanh điều hướng đáy và vùng an toàn (safe-area).
