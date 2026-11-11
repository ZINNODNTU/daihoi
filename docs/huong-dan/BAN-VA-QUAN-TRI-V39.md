# Bản vá quản trị V39 — 11/11/2026

## Đã hoàn thành trên mã nguồn

- Danh sách đại biểu: quản trị Đại hội được sửa **đơn vị, chức vụ**, cùng giới tính/ngày sinh, cả máy tính và điện thoại. API PATCH chỉ nhận bốn trường đó và ràng buộc đúng congress ID, không sửa QR/ghế/ID đăng nhập.
- Danh sách tài khoản: Excel chỉ điền mật khẩu **vừa cấp hoặc vừa reset trong phiên**. Mật khẩu Auth trước đó là hash, không thể đọc lại. Quản trị chọn các tài khoản đã có, bấm **Reset & tải Excel** (tối đa 15/lần); thao tác bắt buộc xác nhận và reset từng tài khoản qua API đã được bảo vệ. Mật khẩu mặc định theo chính sách hiện hành; file kết quả chỉ bao gồm tài khoản reset thành công. Nếu trình duyệt tải file lỗi, sử dụng **Tải lại Excel lần này** trước khi rời trang. Không ghi mật khẩu vào log/DB.
- Trích ngang BCH: kéo thả hàng ở máy tính; nút Lên/Xuống trên điện thoại. Chỉ admin sửa; khóa sắp xếp khi đang lọc hoặc đang lưu. API kiểm tra toàn bộ ID, migration V39 áp dụng tất cả thay đổi **nguyên tử** qua SECURITY INVOKER, giới hạn đúng một Đại hội, không phá thứ tự khi API lỗi. Thứ tự tự động áp dụng cho xuất Excel và trang đại biểu.
- Log admin: các thao tác sửa hồ sơ đại biểu, cấp tài khoản, reset mật khẩu, thêm/sửa/xóa/sắp xếp BCH được ghi qua hệ thống `writeSystemLog` (không kèm thông tin bí mật). Giao diện Nhật ký hệ thống đã có sẵn ở `/dashboard/system-logs` và menu sidebar của admin theo tính năng V36–V38; cảnh báo sự cố hiển thị khi schema được cập nhật.

## Cấp mật khẩu mặc định từ khi tạo tài khoản (V40)

- Cấp tài khoản mới qua `/api/delegates/accounts`: Supabase Auth được tạo với mật khẩu khởi tạo **`Abc@123456`**, cùng chính sách với API reset, thay cho mật khẩu ngẫu nhiên trước đây.
- Mật khẩu dùng chung chỉ áp dụng **khi tạo mới hoặc khi admin xác nhận reset**, không có nghĩa mật khẩu người dùng mãi không đổi. Khi liên kết tài khoản đã có của một đại biểu thuộc Đại hội khác, giữ nguyên mật khẩu hiện tại.
- Sau cấp mới, màn hình quản lý tài khoản tải Excel chỉ chứa mật khẩu của các tài khoản vừa tạo thành công. Không lưu mật khẩu rõ trong bảng dữ liệu, cookie, bộ nhớ dài hạn hoặc log. Các tài khoản đã tạo trước V40 không tự thay mật khẩu; admin phải reset có xác nhận nếu cần cấp lại.
- Dùng chung một mật khẩu ban đầu là **rủi ro an ninh cao** (MSSV/email có thể dễ đoán). Người dùng phải đổi mật khẩu riêng tại mục **Tài khoản của tôi → Đổi mật khẩu** sau lần đăng nhập đầu tiên. Nên bổ sung chặn truy cập nghiệp vụ cho tới khi đổi mật khẩu và giới hạn đăng nhập sai trước khi triển khai cho đại biểu thật.
- Chỉ cần cập nhật bản deploy **mã nguồn**; riêng thay đổi này không yêu cầu migration SQL. Các migration V26/V36/V37/V39 của các chức năng trước vẫn phải hoàn tất độc lập.

## Trạng thái production: CHƯA SẴN SÀNG

Dự án dùng Supabase ref `pnxdxdagpeyqarucdphk`. Kiểm tra `npm run check:production-schema` ngày 11/11/2026: **14/18**, thiếu:
- `seating_templates` (migration V26)
- `system_logs` (V36), những nâng cấp V37 cho log
- `system_incidents` (V37)

Code V39 yêu cầu thêm `supabase/upgrade-bch-order-v39.sql` để tạo RPC `reorder_bch_candidates`, sau khi V8 BCH hiện có được cài. Khi chưa có V39, API sắp xếp trả lỗi 503 chứ không báo lưu thành công. Khi V36/V37 chưa cài, logger chỉ in structured log ra Vercel/server console (ghi DB best effort thất bại); trang log không tải được và sẽ báo thiếu migration.

### Điều kiện để triển khai production

1. Đảm bảo đã sao lưu **PostgreSQL thật** (backup/PITR phục hồi được), và xác minh project Supabase chính xác `pnxdxdagpeyqarucdphk`. Không chạy migration trên project khác.
2. Cài lần lượt V26 → V36 → V37 theo `docs/huong-dan/KICH-HOAT-SYSTEM-LOGS-V38.md`, **sau đó** `supabase/upgrade-bch-order-v39.sql` từ SQL Editor bằng tài khoản đủ quyền, khi migrations trước đó phù hợp.
3. Chạy `npm run check:production-schema`, yêu cầu **18/18**. Thử quyền quản trị và trường hợp delegate không có quyền xem logs/sửa BCH, xác nhận RPC V39 trong project đúng.
4. Deploy bản build được kiểm thử tới Vercel team `dntu` project `daihoi`; smoke-test trang `/dashboard/system-logs`, đổi đơn vị/chức vụ, reset tài khoản mẫu có đồng ý của chủ tài khoản và xuất Excel, đổi thứ tự BCH và refresh để xác nhận lưu.
5. Không coi việc commit/push Git hoặc build local là bằng chứng đã chạy migration và triển khai production.

## Kiểm tra kỹ thuật

- `node --test tests/*.test.mjs`
- `npm run lint`
- `npm run build`
- `npm run check:production-schema`
- `npm run test:db`

## Lưu ý bảo mật

Mật khẩu mặc định là mật khẩu tạm, yêu cầu đại biểu đổi ngay. Reset làm thay đổi tài khoản dùng chung giữa các kỳ Đại hội. Không gửi Excel mật khẩu qua nơi công khai; giới hạn người tải; hủy file sau khi cấp và không tải mật khẩu của tài khoản BTC/admin. Log có actorId và event nhưng không bao giờ chứa mật khẩu.
