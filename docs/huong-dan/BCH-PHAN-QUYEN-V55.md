# V55 — Phân quyền BTC và chẩn đoán kiểm phiếu BCH

Ngày kiểm tra: 12/11/2026. Đây là ghi nhận chẩn đoán V55: tại thời điểm phát hành V55 migration V47 còn thiếu. Cũng trong ngày 12/11, migration V47 đã được chạy thành công qua Computer Use trên project chính xác; bản V56 bổ sung khu nhập phiếu trực tiếp.

## Đã xác minh trên Supabase website đang dùng

Read-only query từ biến `.env.local`, API URL project: `pnxdxdagpeyqarucdphk`, không in khóa bí mật hay dữ liệu người dùng:

- `bch_candidates.select('votes_received,total_ballots')`: mã lỗi PostgreSQL `42703` — thiếu cột.
- `btc_accounts.select('user_id')`: thành công, V45 đã có.

Tại thời điểm kiểm tra V55, việc nhập phiếu chưa thể hoạt động do thiếu cột. Sau đó đã áp dụng V47 vào đúng project và xác minh lại hai cột bằng PostgREST. Đây là lịch sử sự cố, không phải trạng thái hiện tại.

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
4. Tải lại trang **Nhân sự BCH**, dùng khu **Kết quả kiểm phiếu BCH** độc lập (từ V56), xác nhận phần trăm từ `số phiếu đạt / tổng số phiếu`. Không dùng tổng đại biểu điểm danh làm mẫu số phiếu.

## Chức năng phân quyền BTC

- Đường dẫn: `/congresses/[id]/permissions`; menu sidebar **Quản trị → Phân quyền** và từ **Tài khoản BTC → Bảng phân quyền**. Nút phân quyền đã được bỏ khỏi trang Nhân sự BCH từ V56.
- Chỉ `super_admin` nền tảng hoặc admin BTC đang hoạt động tại chính Đại hội đó (đã kiểm tra cả `btc_accounts`, `congress_members`) được vào. Đại biểu, thư ký, nhân viên quét QR không được cấp.
- Bảng ma trận dựa trực tiếp vào `src/lib/congress-permissions.ts`; vai trò được cấp theo nhóm cố định `admin`, `checkin`, `secretary`. Không có công tắc quyền tự do giả tạo vì backend hiện không lưu per-user overrides.
- Cho phép đổi vai trò tài khoản BTC đang hoạt động, với hộp thoại xác nhận. Việc lưu quyền gọi lại API hiện có `PATCH /api/congress-members`, xác minh actor + congress, chặn tự đổi quyền, cập nhật `congress_members` và ghi nhật ký. Không gộp hoặc cấp tài khoản đại biểu.
- Bảo mật BCH: server dùng `getCongressRole()` (kiểm tra BTC đã kích hoạt), `canCongress(bch.read/bch.write)`. Tài khoản thư ký không nhận trường phiếu nội bộ; fallback BCH chỉ chạy khi PostgreSQL trả `42703`, không giấu lỗi kết nối hoặc RLS.

## Kiểm thử

`node --test tests/bch-permissions-diagnostics-v55.test.mjs` cùng toàn bộ regression, ESLint, TypeScript, build Next.js và docs:check. Kiểm tra thao tác thực trên admin/BTC sau triển khai. Migration V47 đã được cập nhật bằng Computer Use trên đúng project vào 12/11/2026; deploy Vercel không tự thay đổi schema database.

