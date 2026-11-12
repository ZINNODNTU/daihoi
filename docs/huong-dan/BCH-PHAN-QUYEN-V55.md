# V55 — Phân quyền BTC và chẩn đoán kiểm phiếu BCH

Ngày kiểm tra: 12/11/2026. Thay đổi code không có DDL mới. Migration V47 được chuẩn bị sẵn nhưng chưa áp dụng trên dự án Supabase chính thức khi không có kết nối quản lý database được ủy quyền đúng project.

## Đã xác minh trên Supabase website đang dùng

Read-only query từ biến `.env.local`, API URL project: `pnxdxdagpeyqarucdphk`, không in khóa bí mật hay dữ liệu người dùng:

- `bch_candidates.select('votes_received,total_ballots')`: mã lỗi PostgreSQL `42703` — thiếu cột.
- `btc_accounts.select('user_id')`: thành công, V45 đã có.

Chính vì vậy màn hình Nhân sự BCH hiện đang thực sự chưa thể lưu phiếu, không phải lỗi màu/UI hay phân quyền. **Không được xóa cảnh báo và coi như đã sửa database**. Chỉ áp dụng V47 ở đúng project, sau khi sao lưu theo quy trình quản trị DB. Hệ thống tự kiểm tra cột ở lần tải trang sau.

Tại thời điểm xử lý, hai tài khoản Supabase được kết nối với công cụ quản trị chỉ trả về project khác (`kqlonwcsjrirgmeddoze`, `zsqeewnrycesouhunxxk`, `fwhqfdfzimnnapxffjfe`), không có quyền SQL tới `pnxdxdagpeyqarucdphk`. Công cụ trình duyệt bị chặn do chưa có phiên Chrome đã xác minh. Không áp dụng schema lên database không thuộc dự án.

## Chạy migration BCH V47

1. Mở Supabase Dashboard của đúng project `pnxdxdagpeyqarucdphk`, chọn **SQL Editor** bằng tài khoản có quyền sửa schema.
2. Sao chép nội dung đầy đủ của `supabase/upgrade-bch-ballot-results-v47.sql`, đọc lại rồi thực thi. Migration là `ALTER TABLE .. ADD COLUMN IF NOT EXISTS` và CHECK constraint, không xóa dữ liệu hiện có.
3. Trong SQL Editor chạy truy vấn chỉ đọc xác thực:
   ```sql
   select column_name, data_type from information_schema.columns
   where table_schema='public' and table_name='bch_candidates'
     and column_name in ('votes_received','total_ballots')
   order by column_name;
   ```
   Kết quả phải có hai hàng với `data_type = integer`.
4. Tải lại trang **Nhân sự BCH**, mở chỉnh sửa một ứng viên, kiểm tra `Kết quả kiểm phiếu (nhập tay)`; nhập thử giá trị hợp lệ và xác nhận phần trăm được tính từ `số phiếu đạt / tổng số phiếu`. Không dùng tổng đại biểu điểm danh làm mẫu số phiếu.

## Chức năng phân quyền BTC

- Đường dẫn: `/congresses/[id]/permissions`; menu sidebar **Quản trị → Phân quyền**, từ **Nhân sự BCH → Phân quyền BTC** và **Tài khoản BTC → Bảng phân quyền**.
- Chỉ `super_admin` nền tảng hoặc admin BTC đang hoạt động tại chính Đại hội đó (đã kiểm tra cả `btc_accounts`, `congress_members`) được vào. Đại biểu, thư ký, nhân viên quét QR không được cấp.
- Bảng ma trận dựa trực tiếp vào `src/lib/congress-permissions.ts`; vai trò được cấp theo nhóm cố định `admin`, `checkin`, `secretary`. Không có công tắc quyền tự do giả tạo vì backend hiện không lưu per-user overrides.
- Cho phép đổi vai trò tài khoản BTC đang hoạt động, với hộp thoại xác nhận. Việc lưu quyền gọi lại API hiện có `PATCH /api/congress-members`, xác minh actor + congress, chặn tự đổi quyền, cập nhật `congress_members` và ghi nhật ký. Không gộp hoặc cấp tài khoản đại biểu.
- Bảo mật BCH: server dùng `getCongressRole()` (kiểm tra BTC đã kích hoạt), `canCongress(bch.read/bch.write)`. Tài khoản thư ký không nhận trường phiếu nội bộ; fallback BCH chỉ chạy khi PostgreSQL trả `42703`, không giấu lỗi kết nối hoặc RLS.

## Kiểm thử

`node --test tests/bch-permissions-diagnostics-v55.test.mjs` cùng toàn bộ regression, ESLint, TypeScript, build Next.js và docs:check. Kiểm tra thao tác thực trên admin/BTC sau triển khai. Migration Supabase vẫn cần quyền SQL của đúng project; không thể được thay thế bằng Vercel deploy.

