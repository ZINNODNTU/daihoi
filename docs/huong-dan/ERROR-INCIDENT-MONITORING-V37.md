# Error & Incident Monitoring V37 — nghiên cứu repo và tích hợp

Cập nhật: 11/11/2026. Dự án: D:\daihoi, Next.js 16, Vercel và Supabase.
Mục tiêu: xử lý lỗi theo nhóm thay vì đọc từng bản ghi, không cần ClickHouse/Kafka/Redis hay máy chủ riêng.

## Repository và ý tưởng tham khảo

| Repository | Ý tưởng | Tích hợp V37 |
|---|---|---|
| [Sentry JavaScript](https://github.com/getsentry/sentry-javascript) | Exception tracking, issue grouping | Fingerprint, first/last seen, mở lại lỗi đã sửa |
| [Pino](https://github.com/pinojs/pino) | JSON logger, redaction | Giữ logger JSON server, request ID, release, environment |
| [LogTape](https://github.com/dahlia/logtape) | Category, sinks, redaction | Phân loại auth/attendance/documents/seating, allowlist ngữ cảnh |
| [HyperDX](https://github.com/hyperdxio/hyperdx) | Log search, spike detection | Gom lỗi, đếm số lượt trong cửa sổ 5 phút, gợi ý ưu tiên |
| [Highlight](https://github.com/highlight/highlight) | Lịch sử hành vi liên quan lỗi | Truy vấn lịch sử log theo fingerprint, KHÔNG bật session replay có thể chứa PII |
| [Next.js instrumentation](https://nextjs.org/docs/app/guides/instrumentation) | onRequestError | Tự bắt lỗi render và Route Handler ngoài các API catch |
| [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime) | Truy vết invocation, request/deploy | JSON log và Request ID để đối chiếu log nền tảng |

Không copy source của repository ngoài. Giữ giải pháp tối giản trên Supabase/PostgreSQL hiện có, không thêm dependency vào package.json.

## Tính năng đã lập trình

- Migration: supabase/upgrade-system-incidents-v37.sql; yêu cầu V36 đã chạy trước.
- Bảng system_logs thêm fingerprint, release, environment; bảng system_incidents lưu số lần, lỗi đầu/cuối, tần suất cửa sổ 5 phút, người xử lý, số lần tái phát.
- PostgreSQL BEFORE INSERT tạo fingerprint từ (congress_id, source, event, endpoint, dbCode, errorName, status_code). Không đưa user ID, email, exception message hoặc request body vào fingerprint. MD5 chỉ định danh nhóm, không dùng bảo mật.
- PostgreSQL AFTER INSERT cập nhật incident bằng ON CONFLICT DO UPDATE nguyên tử; an toàn hơn đếm/tăng trên frontend khi nhiều lỗi đến đồng thời.
- Nếu nhóm đã được đánh dấu resolved mà xuất hiện Error/Critical tương ứng, nhóm tự chuyển về open và tăng reopened_count.
- Next.js src/instrumentation.ts sử dụng onRequestError; chỉ gửi route pattern, error class, method cho logger. Không gửi headers, URL có query, stack hay error.message.
- React error boundaries trong dashboard và congress admin để tránh màn hình trắng và báo cáo lỗi không lộ dữ liệu người dùng.
- API /api/system-incidents: phân trang nhóm lỗi, lọc theo thời gian/quyền Đại hội, KPI chưa xử lý và lỗi lặp; lấy 15 sự kiện gần nhất; cập nhật trạng thái.
- Trang /dashboard/system-logs đặt bảng nhóm sự cố phía trên dòng sự kiện V36. Có số lượt, phát hành đầu/cuối, trạng thái tái phát, điều tra theo Request ID. Menu đếm nhóm sự cố chưa xử lý trong 24h.
- Không tự động gửi email/Telegram/Webhook khi không mở trang: cần tích hợp provider hoặc cron riêng và cấu hình secret.

## Triển khai production bắt buộc

1. Xác minh Supabase project pnxdxdagpeyqarucdphk và backup PostgreSQL. Không sử dụng project Supabase khác.
2. Chạy supabase/upgrade-system-observability-v36.sql rồi supabase/upgrade-system-incidents-v37.sql trong SQL Editor của **đúng** project.
3. Kiểm tra RLS bật; anon/authenticated không được quyền trên system_incidents; service_role có quyền; hai trigger tồn tại.
4. Chạy npm run check:production-schema. Cần cả V36/V37 OK; migration seating_templates V26 đang thiếu cần xử lý độc lập.
5. Preview deploy Vercel; kiểm thử với super_admin, congress admin, checkin/secretary và delegate. Tạo sự cố giả trên staging để xác nhận grouping, tăng đếm, giải quyết và tự mở lại, đồng thời cross-congress isolation.
6. Chỉ phát hành production khi đã xác minh schema, rollback/backup, smoke test trên môi trường preview.

## Vận hành & giới hạn

- Sự kiện V36 cũ chưa được backfill vào nhóm V37; incident hình thành từ lượt mới sau khi migration hoàn thành.
- onRequestError không tự định danh quyền user/congress đáng tin cậy, vì vậy log tự bắt của Next.js có congress_id=null và chỉ super_admin được xem.
- Log này không thay thế audit_logs của nghiệp vụ; không xóa audit_logs theo retention.
- Cửa sổ đếm 5 phút là cửa sổ được neo từ lần đầu trong khoảng, không phải rolling histogram tuyệt đối. Badge lỗi lặp chỉ là tín hiệu cần điều tra, không tự xác định nguyên nhân.
- Cấu hình retention raw khoảng 30 ngày và incident đã giải quyết 90 ngày chỉ sau khi phê duyệt chính sách, không tự xóa dữ liệu production.
- Không ghi log cho page view, check-in thành công hay thao tác bình thường, để giảm chi phí cho 200 người truy cập.
- QA: node --test tests/system-incidents-v37.test.mjs; node --test tests/*.test.mjs; npm run lint; npm run build; npm run check:production-schema.
