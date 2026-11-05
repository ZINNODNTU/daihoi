# Trạng thái thiết lập Supabase — ĐẠI HỘI SỐ

Ngày kiểm tra: 05/11/2026 (giờ Việt Nam).

## Dự án được phép cấu hình

- Dashboard: https://supabase.com/dashboard/project/pnxdxdagpeyqarucdphk
- Project ref: `pnxdxdagpeyqarucdphk`
- Project URL: `https://pnxdxdagpeyqarucdphk.supabase.co`
- Tên hiện trên Supabase: `daihoi`
- Không tác động đến các project Supabase khác.

## Đã hoàn thành và xác thực trên dashboard

- Xác nhận trước khi tạo: public schema **0 bảng**, Auth **0 người dùng**.
- Chạy `supabase/schema.sql` qua SQL Editor, kết quả `Success. No rows returned`.
- Kiểm tra lại `pg_catalog.pg_tables`: **13 bảng trong public**, **13 bảng bật RLS**.
- Database có các bảng `profiles`, `organizations`, `congresses`, `congress_members`, `attendance_sessions`, `delegates`, `checkins`, `audit_logs`, `documents`, `voting_sessions`, `voting_options`, `voting_eligibilities`, `votes`.
- Tại `D:\daihoi\.env.local` đã điền `NEXT_PUBLIC_SUPABASE_URL`, tạo ngẫu nhiên `QR_HMAC_SECRET` (không in ra). File này nằm ngoài git nhờ `.gitignore`.

## Cần chủ dự án hoàn tất

1. Mở **Project Settings → API Keys**, sao chép **Publishable key** (bắt đầu `sb_publishable_`, không phải **Secret key**). Dán vào `D:\daihoi\.env.local` tại `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`. NEXORA Computer Use không được phép tự copy khóa trong dashboard nếu chưa có Desktop-approved confirmation; đã chủ động không vượt qua chặn an toàn.
2. Mở **Authentication → Users**, thêm tài khoản đăng nhập BTC theo email bạn muốn. Hiện chưa có tài khoản (0 users).
3. Sau khi tạo tài khoản, dùng SQL Editor (quyền chủ project) chạy, thay UUID tài khoản thực:
   ```sql
   update public.profiles set platform_role='super_admin' where id='<AUTH_USER_UUID>';
   ```
   Nếu user tạo trước khi trigger có hiệu lực: backfill profile theo README.md.
4. Xác thực đăng nhập `/login`, tạo Đại hội, thêm đại biểu, kiểm thử điểm danh QR / thủ công.
5. Khi Vercel có domain thực tế, cấu hình Supabase Auth URL Configuration (Site URL, Redirect URLs); sao chép 3 biến Supabase + QR secret từ .env.local sang Vercel, giữ bí mật QR secret.
6. Google Drive OAuth chưa cấu hình, nên tải tài liệu sẽ chưa hoạt động.
7. Chạy security advisors, kiểm thử RLS đa đại hội, kiểm thử tải 200 người trước Đại hội thật.

## Lưu ý bảo mật

- Không dùng service_role hoặc sb_secret trong NEXT_PUBLIC_ hoặc trình duyệt.
- Chỉ cấp super_admin bằng SQL Editor/luồng quản trị được kiểm soát.
- Các bảng biểu quyết hiện có **chưa có chức năng gửi phiếu**; không dùng cho bầu cử.
- SQL chứa `drop trigger if exists` để tạo trigger audit nhất quán, chạy lần đầu khi bảng trống; các lệnh đã thành công.
- Theo thiết kế app, người BTC quét QR và điểm danh thủ công đều ghi về `checkins`, ràng buộc unique theo phiên và đại biểu; log lưu `audit_logs` bằng database trigger.
