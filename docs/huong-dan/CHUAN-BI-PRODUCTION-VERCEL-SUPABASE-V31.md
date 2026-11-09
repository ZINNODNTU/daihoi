# ĐẠI HỘI SỐ — Kiểm tra phát hành V31 (10/11/2026)

## Phạm vi và trạng thái đã xác minh

- Repo: `ZINNODNTU/daihoi`, nhánh `main`; ứng dụng Next.js 16 / React 19.
- Supabase **duy nhất được phép**: `pnxdxdagpeyqarucdphk`. Khóa dịch vụ chỉ ở server. Không áp dụng migration lên các project của những kết nối Supabase khác.
- `npm run check:supabase`: Auth, Super Admin, schema nền v2–v9, bucket ảnh riêng tư và truy cập ẩn danh cơ bản **đạt**.
- `npm run check:documents`: `documents.delegate_visible` **đã có** (v14).
- `npm run check:quality`: `delegates.gender`, `delegates.birth_date` **đã có** (v15).
- `npm run check:drive`: Apps Script HMAC và thư mục Drive `DAI_HOI_SO` **đạt**.
- `npm run check:production-schema`: **14/15** nhóm schema đạt, còn thiếu `public.seating_templates` (PGRST205).
- Kiểm tra không đồng nghĩa RLS v11 đã được xác minh đầy đủ, publication Realtime v19 đã bật hoặc lưu lượng 200 thiết bị đã được đo.

## Sao lưu và kiểm tra trước migration

Đã chạy `npm run backup:supabase`, tạo snapshot **dữ liệu ứng dụng** dưới `%LOCALAPPDATA%/DAIHOI/database-backups`, ngoài Git. Bản snapshot này **không thay thế** bản backup PostgreSQL ở cấp cơ sở dữ liệu hoặc PITR; nó không bao gồm đầy đủ schema, roles, extensions, chính sách RLS và mọi bảng ghế.

Trước bất kỳ SQL production nào:

1. Trong dashboard chính xác `https://supabase.com/dashboard/project/pnxdxdagpeyqarucdphk`, xác thực ID project và tình trạng backup database/PITR.
2. Đối chiếu migration đang có, schema, bảng `organizations`, `congresses`, `seating_layouts`, `seats`, và trạng thái RLS.
3. Bảng `seating_templates` chưa tồn tại: chuẩn bị chạy **duy nhất** `supabase/upgrade-seating-reusable-templates-v26.sql` trên đúng project. SQL sử dụng `CREATE TABLE IF NOT EXISTS`, tạo index, bật RLS, chỉ cấp quyền server `service_role`, không sửa bảng ghế hiện hữu.
4. Chạy lại `npm run check:production-schema`, kết quả phải là **15/15**; kiểm tra tạo mẫu, tái sử dụng, phân quyền tổ chức riêng biệt bằng tài khoản thử.
5. Kiểm tra `supabase/upgrade-delegate-portal-v11.sql` thực sự đã được áp dụng bằng so sánh các RLS policy, không khẳng định chỉ dựa trên sự tồn tại cột.
6. V19 là tùy chọn. Chỉ bật `NEXT_PUBLIC_ATTENDANCE_REALTIME_ENABLED=true` sau khi xác nhận `public.checkins` ở publication `supabase_realtime` và kiểm tra RLS cho đúng nhân sự BTC.

## Checklist phát hành Vercel

1. Kiểm tra nhánh/commit, `npm ci`, `npm run lint`, `node --test tests/*.test.mjs`, `npm run build`.
2. Kết nối Vercel với repo `ZINNODNTU/daihoi`, root directory là root, framework `Next.js`; ưu tiên preview trước.
3. Cấu hình **Production**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `QR_HMAC_SECRET`, `GOOGLE_APPS_SCRIPT_URL`, `GOOGLE_APPS_SCRIPT_SECRET`. Đặt các secret chỉ ở môi trường server, không thêm `NEXT_PUBLIC_`. Không sao chép nội dung `.env.local` vào Git.
4. Đảm bảo `SESSION_QR_BASE_URL` (nếu khai báo) là hostname HTTPS thực tế, không phải địa chỉ LAN. Cập nhật Supabase Auth Site URL/redirect URLs sau khi xác định domain production.
5. Smoke test trang đăng nhập, điều hành BTC, QR phiên, điểm danh bằng thiết bị thật, sơ đồ ghế theo phiên, ảnh riêng tư, danh sách BCH và liên kết tài liệu Drive; đối chiếu log không chứa thông tin nhạy cảm.
6. Đo tải tối đa khoảng 200 người và thử mạng chậm/lỗi, đối chiếu số điểm danh, tình huống quét trùng, thử thao tác điểm danh thủ công.
7. Chỉ promote production sau khi có đủ 15/15 schema gate, DB backup, cấu hình env, kết quả smoke test và thông số tải.

## Lệnh đọc trạng thái (không ghi dữ liệu)

```bash
npm run check:supabase
npm run check:documents
npm run check:quality
npm run check:drive
npm run check:production-schema
npm run lint
node --test tests/*.test.mjs
npm run build
```

**Nguyên tắc:** Không tự chạy lại `supabase/schema.sql` trên database đang có dữ liệu. Không sử dụng Supabase project khác chỉ vì connector đang truy cập được. Không báo đã release production khi chưa có Vercel deployment URL ở trạng thái READY và smoke test đạt.
