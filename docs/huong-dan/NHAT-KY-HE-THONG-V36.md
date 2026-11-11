# V36 — Nhật ký kỹ thuật (System Logs) cho trang quản trị

Cập nhật: 11/11/2026. Phạm vi: Next.js API Routes / giao diện quản trị / Supabase Postgres.
Đây là log **kỹ thuật**; không thay thế audit_logs của nghiệp vụ điểm danh, phân quyền hay thay đổi ghế.

## Kiến trúc

1. Các API đăng nhập, điểm danh, phiên, live board, Drive ghi event qua `writeSystemLog()`.
2. Next.js ghi một dòng JSON có `type=system_log` ra console/Vercel Runtime Logs; đồng thời best-effort INSERT vào `public.system_logs` trên Supabase.
3. Chỉ service-role/secret key của **server** có quyền với bảng; không GRANT cho anon/authenticated. Endpoint `/api/system-logs` xác thực người dùng bằng Supabase Auth và xác định phạm vi **super_admin** hoặc **admin của từng Đại hội** trước khi dùng server key.
4. Trình duyệt trong AppShell báo lỗi Javascript không được xử lý. Gửi **loại lỗi, file path không có query, dòng/cột**, KHÔNG gửi error.message/stack, dữ liệu form, URL đầy đủ, cookie, QR, email, tài liệu. Server giới hạn 5 báo cáo/phút/tài khoản, kiểm tra Origin và phạm vi.
5. Trang `/dashboard/system-logs` hiển thị số lỗi/cảnh báo/chưa xử lý 24 giờ, bộ lọc thời gian/mức độ/nguồn/Đại hội/mã sự kiện, mở context đã lọc, copy Request ID, cập nhật `open → investigating → resolved`, phân trang 30 sự kiện và tự cập nhật 15 giây khi tab hiển thị.
6. Sidebar có chỉ báo số lỗi Error/Critical chưa khắc phục trong 24 giờ, refresh mỗi phút; chỉ tài khoản admin được xem.

## Trạng thái production đã kiểm tra (11/11/2026)

Kiểm tra chỉ đọc bằng `node scripts/check-production-schema.mjs` trên đúng Supabase project `pnxdxdagpeyqarucdphk` trả về **14/16 nhóm schema đạt**. Hai bảng còn thiếu: `public.system_logs` (V36, cần triển khai lần đầu) và `public.seating_templates` (V26, vấn đề tồn đọng). Không áp migration lên project Supabase khác.

## Triển khai

**Chưa tự động sửa DB production khi chỉ chỉnh mã nguồn.** Trước tiên hãy xác nhận đúng project Supabase và tạo backup. Chạy toàn bộ nội dung:

`supabase/upgrade-system-observability-v36.sql`

bằng Supabase SQL Editor đúng project. Sau đó xác minh bảng `public.system_logs` tồn tại, RLS bật và role `anon` / `authenticated` không có GRANT INSERT/SELECT. Phát hành code lên Vercel sau khi database đã sẵn sàng.

Kiểm thử với tài khoản super_admin, admin theo Đại hội và tài khoản checkin/secretary/delegate:
- super_admin đọc được log toàn hệ thống;
- congress admin chỉ đọc và đánh dấu được log của Đại hội mình, không xem log hệ thống không có congress_id;
- staff không phải admin và đại biểu bị từ chối;
- gây lỗi thử nghiệm trên staging để xác nhận cả Vercel Runtime Logs và bảng system_logs xuất hiện dòng có request_id;
- xác minh lọc severity/source, paging, tình trạng giải quyết, thời gian Asia/Ho_Chi_Minh, mobile.

**Chế độ hỏng an toàn:** khi bảng chưa tồn tại hoặc DB mất kết nối, logger vẫn ghi log JSON ở Vercel và KHÔNG chặn xử lý lỗi gốc. Giao diện báo thiếu migration thay vì giả vờ không có lỗi. Không tạo event chứa dữ liệu bí mật.

## Kiểm tra & vận hành

- `node --test tests/system-logs-v36.test.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Log có 4 level: `critical`, `error`, `warning`, `info`. Event key ổn định (ví dụ `attendance.checkin_write_failed`), source, optional congress_id, request_id, status_code, context có allowlist. Không ghi stack traces thô; stack gốc có thể tra cứu riêng trong hệ thống observability chuyên dụng nếu cần và đã cấu hình bảo vệ phù hợp.

**Retention:** bảng không tự dọn dữ liệu. Khuyến nghị tạo Supabase Cron/pg_cron job sau khi được phê duyệt lưu trữ, ví dụ chạy theo lịch:

```sql
delete from public.system_logs where occurred_at < now() - interval '30 days';
```

Chạy câu lệnh dọn dữ liệu trên theo lịch bảo trì được phê duyệt, không tự chạy ngay trên production khi chưa có chính sách lưu trữ và backup. Không xóa audit_logs theo chính sách này.

**Giám sát ngoài phiên quản trị:** badge và bảng log không thể gửi cảnh báo khi không ai mở website. Muốn nhận lỗi ngay cả khi offline, tích hợp Sentry hoặc Vercel Log Drains + email/webhook riêng với quy tắc threshold/rate limiting; không để credential webhook trong client hoặc repository.

## Lưu ý hiệu năng

Không log thành công từng lần tải trang hoặc từng lần điểm danh để tránh làm chậm hệ thống 200 đại biểu. Chủ yếu log lỗi 5xx và giới hạn Auth 429; cảnh báo frontend 5 lần/phút/tài khoản. Trên production cần quan sát tỷ lệ lỗi, chi phí ghi log và chạy chiến lược retention.
