# V46 — Đồng bộ sơ đồ theo phiên và quản lý vòng đời Đại hội

## Chẩn đoán dữ liệu sản xuất (11/11/2026)
Đại hội `79e7f633-e824-4a9d-ba25-d0fa59349a26` có 3 sơ đồ lưu riêng. Hai sơ đồ "Hội Trường G" có 144 ghế, sơ đồ "A" có 162 ghế. Phiên **Phiên thử** đang được gắn với sơ đồ **"A"**, còn màn hình quản trị trước V46 mặc định mở sơ đồ được sửa gần nhất là **"Hội Trường G"**. Vì vậy trang quản trị và cổng đại biểu không giống nhau; nguyên nhân là **khác ID sơ đồ**, không phải do lỗi vẽ lại hàng ghế. Số liệu được đọc từ Supabase, không sửa hay xóa bất kỳ dữ liệu nào khi chẩn đoán.

## Sửa đồng bộ
- `/api/seating` mặc định chọn sơ đồ `attendance_sessions.seating_layout_id` của phiên; đồng bộ với cổng đại biểu và màn hình trình chiếu.
- Trang quản trị hiển thị sơ đồ thực tế phiên đang sử dụng; nếu chủ động chọn một sơ đồ khác thì có cảnh báo rõ ràng và nút **Áp dụng sơ đồ đang xem cho phiên**. Không tự cập nhật phiên khi chỉ mở trang.
- Tại trang Sơ đồ ghế chọn phiên trong dropdown **Đối chiếu điểm danh phiên**, chọn sơ đồ "Hội Trường G" phù hợp, lưu bố trí nếu còn thay đổi, ấn **Áp dụng...**, xác nhận. Gắn sơ đồ không tự tạo phân ghế cho những đại biểu chưa được phân trong sơ đồ mới. Dữ liệu trên cổng đại biểu có TTL cache 10–15 giây.
- Khi đổi phiên, quản trị viên tải sơ đồ của chính phiên đó thay vì giữ sơ đồ đang sửa. API đối chiếu sơ đồ cũ nhằm giảm nguy cơ cập nhật đè từ hai máy.

## Reset / Xóa Đại hội — chỉ Super Admin
Trang `/congresses/<id>/settings` có vùng quản trị nguy hiểm, chỉ hiển thị nếu `profiles.platform_role='super_admin'`. Người dùng phải đánh dấu các phần cần reset, nhập **đúng tên Đại hội**, đánh dấu hiểu rủi ro và xác nhận lần cuối. API thực hiện lại xác thực máy chủ, kiểm tra quyền và mã Đại hội, xác nhận tên và gọi một RPC PostgreSQL giao dịch nguyên tử; không có quyền cho tài khoản BTC thông thường.

Các nhóm reset gồm:
- Đại biểu/khách mời: xóa hồ sơ, quan hệ tài khoản portal, phân ghế và lịch sử điểm danh phụ thuộc; Auth user chỉ xóa khi không còn ràng buộc ở Đại hội khác.
- BCH: xóa danh sách ứng cử viên trong Đại hội.
- Phiên: xóa phiên và lượt điểm danh liên quan.
- Tài liệu: xóa danh mục tệp trong Supabase, **không xóa file gốc trên Google Drive**.
- Sơ đồ: xóa bản đồ, ghế và phân ghế của Đại hội; các phiên giữ lại bị gỡ liên kết sơ đồ; thư viện mẫu tái sử dụng không bị xóa.
- Điểm danh: xóa toàn bộ checkins, giữ phiên và tài khoản.

Chế độ **Xóa cả Đại hội** xóa toàn bộ các nhóm dữ liệu của Đại hội cùng tài khoản BTC độc lập; bảo vệ Đại hội khác và thư viện mẫu chung. Nhật ký hệ thống ghi vết. Những tài khoản Auth độc lập có thể cần dọn sau trong hàng đợi `congress_identity_cleanup_queue` nếu Auth API bị lỗi. Nút xóa không xóa file ảnh/Google Drive gốc.

## Triển khai
1. **Sao lưu Supabase** và kiểm tra đúng project `pnxdxdagpeyqarucdphk`; kiểm tra backup hoàn tất trước khi bật xóa.
2. Kiểm tra V45 **`supabase/upgrade-btc-independent-accounts-v45.sql`**; kiểm tra thực tế ngày 11/11/2026 xác nhận production **chưa có `btc_accounts`** (19/20 kiểm tra schema đạt), nhưng bước tiền kiểm cho thấy 2 membership BTC hiện đều là Super Admin, không có legacy staff không phân loại. **Chạy V45 trước V46** sau khi sao lưu; không chạy V46 nếu V45 chưa thành công. Tiếp theo chạy migration **`supabase/upgrade-congress-lifecycle-v46.sql`** một lần trong Supabase SQL Editor của đúng project. Migration chỉ tạo RPC và bảng hàng đợi, không chạy reset.
3. Triển khai source cập nhật qua Vercel. Kiểm tra cổng Đại biểu và màn hình điểm danh cho đúng phiên, sau đó sử dụng vùng nguy hiểm tại Cấu hình Đại hội khi cần.
4. Chạy `npx tsc --noEmit`, `npx eslint ...`, `node --test tests/congress-lifecycle-v46.test.mjs` và bộ test dự án trước phát hành. Kiểm tra tài khoản Super Admin / BTC / đại biểu sau release.

## Lưu ý vận hành
- Không thực hiện xóa Đại hội trực tiếp trong SQL Editor khi đang chạy chương trình thực tế; tất cả thao tác vĩnh viễn phải qua UI có xác nhận.
- Khi reset **Đại biểu**, checkins buộc xóa theo để tránh khóa ngoại bị mồ côi. Khi xóa **Sơ đồ**, các phiên bị gỡ `seating_layout_id` dù không chọn xóa phiên.
- Không dùng mã khóa dịch vụ Supabase trong Client Component; service key chỉ dùng trong API máy chủ.
- Chạy migration V46 không đụng dữ liệu của Đại hội khác; các thao tác xóa của người dùng được giới hạn `congress_id` ở cả API và transaction.
