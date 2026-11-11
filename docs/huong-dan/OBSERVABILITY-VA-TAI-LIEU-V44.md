# Observability V44 và thư viện tài liệu V43 — 11/11/2026

## Mục đích
Trang quản trị tại `/dashboard/system-logs` sử dụng Supabase cho log kỹ thuật và incident, không thêm dịch vụ trả phí hoặc sao chép dữ liệu đại biểu ra bên ngoài. Quản trị Đại hội có thao tác **Gỡ tài liệu**, **kéo thả thứ tự** (desktop), **Lên/Xuống** (mobile) trong `/congresses/{id}/documents`. Tệp PDF gốc trên Google Drive không bị xóa khi gỡ khỏi thư viện.

## Nguồn tham khảo mã nguồn mở và lựa chọn kiến trúc
- [OpenObserve](https://github.com/openobserve/openobserve): histogram log theo thời gian, phân tích nguồn sự kiện, truy xuất sự kiện chi tiết, tìm kiếm và xuất kết quả. Thực hiện bản thu gọn dựa trên dữ liệu trong Supabase, không triển khai thêm hạ tầng.
- [Grafana Explore](https://github.com/grafana/grafana): lọc nguồn, mở chi tiết từng log, hiển thị metadata và liên kết điều tra theo Request ID. Thực hiện nút **Truy vết** từ từng sự kiện; giới hạn phạm vi đã phân quyền.
- [Grafana Loki](https://github.com/grafana/loki): phân loại nguồn/level, giữ metadata có cardinality cao (Request ID, fingerprint) dưới dạng trường cấu trúc, không lập chỉ mục nhãn vô hạn.
- [HyperDX](https://github.com/hyperdxio/hyperdx) và [Sentry](https://github.com/getsentry/sentry): nhóm sự cố theo fingerprint, theo dõi tái phát, trạng thái điều tra đã có trong V37. Không sử dụng SDK SaaS hay phát tán lỗi người dùng sang bên thứ ba.

## Giao diện log mới
- Biểu đồ lưu lượng nhóm level Critical / Error / Warning / Info, chia khoảng 5 phút / giờ / ngày tùy bộ lọc thời gian (1 giờ, 24 giờ, 7 ngày, 30 ngày).
- Các chỉ số xu hướng, tỷ lệ lỗi, top nguồn phát sinh; click nguồn để lọc danh sách sự kiện.
- Truy vết các dòng log có cùng Request ID từ bảng chi tiết, tự cập nhật và phân quyền theo Đại hội.
- Xuất CSV có **giới hạn 2.000 dòng/lần** theo bộ lọc; file có BOM UTF-8 cho tiếng Việt, lọc ký tự công thức CSV để tránh thực thi khi mở bằng Excel. Có header `X-Export-Truncated` nếu vượt ngưỡng.
- Endpoint biểu đồ `/api/system-logs/analytics` lấy tối đa 3.000 bản ghi mới nhất trong khoảng thời gian đã chọn; nếu lớn hơn, đánh dấu rõ số liệu tỷ lệ và histogram lấy từ mẫu. Không hiển thị giá trị xấp xỉ như kết quả đầy đủ.
- Các API dùng `getSystemLogAccess` để xác thực role server-side, `createAdminClient` chỉ chạy server, không lộ secret key. Các bản ghi được `writeSystemLog` ẩn dữ liệu nhạy cảm ngay khi ghi.

## Quản lý tài liệu V43
- Migration `supabase/upgrade-document-management-v43.sql`: thêm `display_order`, backfill từ mới đến cũ để giữ cách hiển thị quen thuộc, index và RPC `reorder_congress_documents`.
- RPC chạy **SECURITY INVOKER**, chỉ cấp EXECUTE cho `service_role`; API `/api/documents/reorder` kiểm tra admin đúng Đại hội, bộ UUID đầy đủ không trùng, và RPC xác nhận tập tài liệu không thay đổi trước khi cập nhật nguyên tử.
- API `DELETE /api/documents/{id}` yêu cầu đăng nhập, admin, `congressId` và chống thao tác chéo Đại hội; chỉ xóa bản ghi metadata sau khi xác minh, không gọi Google Drive Delete.
- Danh sách trên cổng đại biểu chỉ hiện file đã công bố và được sắp xếp đúng `display_order`. Hai danh mục Đại hội có thứ tự riêng.
- Xóa tài liệu khỏi thư viện đồng nghĩa không thể mở qua website nữa; file gốc Drive vẫn giữ. Tải lại hoặc thêm mới nếu muốn công bố lại.

## Nâng cấp production và nghiệm thu
1. Kiểm tra chính xác project `pnxdxdagpeyqarucdphk`, backup PostgreSQL có thể phục hồi, và snapshot dữ liệu ứng dụng ngoài Git. **Không dùng key publishable hoặc secret thông qua API Data để chạy DDL**.
2. Chạy `supabase/upgrade-document-management-v43.sql` trong Supabase SQL Editor đúng project (các V26/V36/V37/V39 đã áp dụng). SQL idempotent.
3. Chạy `npm run check:production-schema` — yêu cầu **19/19**; kiểm tra thêm RPC, GRANT, RLS, index trong SQL Editor.
4. Chạy `npm run build`, `npm run lint`, `node --test tests/*.test.mjs`, `npm run test:db`.
5. Deploy `main` lên Vercel; truy cập tài khoản quản trị, kiểm tra biểu đồ, lọc nguồn, CSV, Request ID; thử dịch chuyển 2 tài liệu và đưa về thứ tự cũ. Không xóa tài liệu thật chỉ để smoke test.
6. Trên tài khoản đại biểu, xác nhận chỉ file đã công bố và theo thứ tự BTC; thử mở PDF qua Google Drive.

Không có migration bổ sung cho biểu đồ và xuất log. Bảng `system_logs` giữ RLS và chỉ server-side service_role truy cập. **Tỷ lệ lỗi là tỷ lệ sự kiện trong mẫu, không phải số lượng người gặp lỗi hoặc uptime của Vercel**.
