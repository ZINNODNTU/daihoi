# Chế độ khách và đại biểu khách mời (V66 — đã thay thế)

> **LỊCH SỬ:** Hướng dẫn mã khách V66 đã được thay bằng [Chế độ khách công khai V67](CHE-DO-KHACH-CONG-KHAI-V67.md). Hiện không còn nhập hoặc cấp mã truy cập khách. Nội dung bên dưới chỉ dùng để tra cứu cơ chế cũ.

## Hai hình thức truy cập tách biệt

| Quyền | Khách xem bằng mã đường dẫn | Đại biểu khách mời có tài khoản |
| --- | --- | --- |
| Đăng nhập | Không cần tài khoản; mã khách do BTC cấp | Đăng nhập tại `/login` bằng tài khoản được cấp |
| Chọn Đại hội | Danh sách Đại hội BTC đã bật chế độ khách | Chỉ các Đại hội có hồ sơ khách mời hoạt động |
| Tài liệu | Chỉ những file có `delegate_visible=true` | Theo nhóm quyền `portal.documents` |
| Ứng viên BCH | Xem hồ sơ, ảnh, không xem phiếu bầu | Theo nhóm quyền `portal.bch` |
| Thẻ đại biểu | Không | Có; khi liên kết hồ sơ `delegate_type=guest` |
| Sơ đồ ghế | Không | Có; `portal.seating`, theo phiên và ghế được phân |
| Tự điểm danh QR | Không | Có; `portal.checkin`, bắt buộc đúng phiên, QR, thời gian, hồ sơ hoạt động |
| Lịch sử điểm danh | Không | Có; `portal.history`, theo các Đại hội sở hữu |
| Quản trị, kiểm phiếu, chất lượng đại biểu | Không | Không; khách mời không tham gia thống kê chất lượng |

## Quy trình sử dụng

1. BTC có quyền `team.manage` vào **Tài khoản Ban Tổ chức** của một Đại hội, ở mục **Chế độ khách xem Đại hội** tạo mã truy cập. Mỗi Đại hội có một mã ngẫu nhiên 192-bit, chỉ hiển thị một lần.
2. BTC gửi link `https://<site>/guest/<slug>#access=gv_...` (đoạn `#access=` không được gửi trong HTTP request tải trang) hoặc gửi riêng mã và đường dẫn. Chỉ các Đại hội có bật quyền mới xuất hiện trong bộ chọn.
3. Khách vào `/guest`, chọn Đại hội và nhập mã; hoặc mở link và trang tự đổi mã lấy phiên cookie HttpOnly thời hạn 12 giờ. Mọi lần đọc đều xác thực lại hash SHA-256, theo đúng `congress_id`. Đổi mã hoặc tắt chế độ khách sẽ vô hiệu hóa phiên khách cũ.
4. Trong trang khách có hai mục **Tài liệu Đại hội** và **Nhân sự giới thiệu BCH**. API kiểm quyền lại khi mở PDF trên Drive hoặc ảnh nhân sự. Không cấp `auth.users` hay `congress_members` cho khách xem qua mã.
5. Đại biểu khách mời có hồ sơ `delegates.delegate_type='guest'` và tài khoản liên kết đăng nhập bình thường. Chỉ khi có hồ sơ `is_active=true` mới nhận quyền `portal.seating`, `portal.checkin`, `portal.history`; các nhóm RBAC giới hạn vẫn có thể chặn.
6. Nếu BTC chưa phân ghế hoặc chưa mở phiên, khách mời vẫn có thể xem sơ đồ/trạng thái nhưng không tự tạo ghế hoặc vượt giờ điểm danh.

## Cấu hình cơ sở dữ liệu

Yêu cầu đã có V60, V64, V65 theo quy trình release. Sao lưu rồi chạy nguyên tệp **`supabase/upgrade-guest-portal-v66.sql`** tại Supabase project **`pnxdxdagpeyqarucdphk`**. Migration tạo bảng `public.congress_guest_links` được bảo vệ bằng RLS, hoàn toàn thu hồi truy cập `anon` và `authenticated`, chỉ server service-role truy vấn. Nó mở rộng đúng nhóm khách mời mặc định có đầy đủ bốn quyền V64; nhóm khách mời tự tùy chỉnh/giới hạn vẫn giữ nguyên.

Mã khách chỉ được lưu dạng **hash SHA-256** tại Supabase. Trình duyệt lưu mã dưới HttpOnly, Secure (HTTPS), SameSite=Lax cookie có giới hạn thời hạn. Không chấp nhận mã ngắn do người dùng tùy ý chọn để tránh brute force; mã ngẫu nhiên dài do hệ thống phát sinh. Mã được xóa khỏi hash URL của trình duyệt ngay khi tiếp nhận.

### Kiểm thử

`node --test tests/guest-portal-v66.test.mjs` kiểm tra token, thu hồi, phân quyền chéo Đại hội, migration và tách quyền khách xem/khách mời. `npm run build` và `npm run lint` kiểm tra ứng dụng.

**Lưu ý:** Mã nguồn và migration được chuẩn bị trong workspace local; không coi là đã phát hành đến production trước khi chạy SQL V66, xác minh các tài khoản và deploy bản mới. Dự án Supabase production chưa hiện trong các tài khoản Supabase kết nối với ChatGPT; không chạy migration nhầm vào project khác.
