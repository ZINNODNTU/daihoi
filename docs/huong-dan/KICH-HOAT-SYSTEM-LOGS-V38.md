# Kích hoạt System Logs trên production — V38 (11/11/2026)

## Đã kiểm tra

- App `D:\daihoi` build Next.js 16.4.5 và chạy production local `http://127.0.0.1:3000`.
- `229/229` automated tests đạt; ESLint, TypeScript và build production đạt.
- PGlite đã thực thi V26 → V36 → V37, chạy lại migration, grouping, reopen, RLS và privileges: đạt.
- `check:supabase`, `check:drive`, `check:quality`, `check:documents` đạt.
- Backup dữ liệu ứng dụng đã tạo tại `%LOCALAPPDATA%\DAIHOI\database-backups`, ngoài Git. Không thay thế backup PostgreSQL/PITR đầy đủ.

## Những điều kiện còn thiếu trên production

- Database bắt buộc: project Supabase `pnxdxdagpeyqarucdphk`; trước SQL, `check:production-schema` đạt 14/18 nhóm. Còn thiếu `seating_templates` (V26), `system_logs` (V36) và các thành phần V37.
- GitHub deployment status cho thấy Vercel thuộc team `dntu`, project `daihoi`. Connector Vercel chưa có quyền team `dntu`. Không cấu hình nhầm team `mkheng28`.
- Chưa có bằng chứng đã áp dụng SQL production, Vercel READY và smoke test được xác thực. Không khẳng định website đã triển khai V38.

## Thực hiện sau khi xác minh backup PostgreSQL

1. Xác nhận đang quản trị đúng Supabase project `pnxdxdagpeyqarucdphk` và backup/PITR có thể phục hồi.
2. Trên máy tính của dự án, chạy `npm run prepare:production-logs`. Công cụ chỉ tạo SQL, không ghi database.
3. Mở file trong `%LOCALAPPDATA%\DAIHOI\production-migrations`; nội dung gồm V26 → V36 → V37 theo đúng thứ tự.
4. Chạy toàn bộ file trong SQL Editor của `https://supabase.com/dashboard/project/pnxdxdagpeyqarucdphk/sql/new`.
5. Chạy `npm run check:production-schema`: yêu cầu 18/18. Kiểm tra RLS, GRANT, trigger và thời điểm tạo bảng.
6. Chọn Vercel workspace `dntu`, deploy preview từ repo, thử login admin và trang `/dashboard/system-logs`, thử ghi log và xử lý incident.
7. Xác minh đại biểu không được xem log, admin Đại hội chỉ xem lỗi đúng Đại hội; không được bỏ qua trường hợp QR lỗi hoặc lỗi Drive.
8. Chỉ triển khai production khi SQL, preview và smoke test đều đạt.

## Lệnh kiểm thử

```bash
npm ci
npm run test:db
node --test tests/*.test.mjs
npm run lint
npm run build
npm run check:production-schema
npm run readiness
```

## Ghi chú bảo mật

Không dùng `SUPABASE_SECRET_KEY` để cố chạy SQL DDL qua Data API. Tạo bảng và trigger chỉ qua SQL Editor/CLI/MCP với quyền hợp lệ. Không đưa access token hoặc khóa dịch vụ lên frontend, Git hoặc file gửi cho người khác. Nên kiểm tra backup ở mức database trước migration.
