# V75 — Tải dữ liệu theo nhu cầu và đồng bộ điểm danh linh hoạt

## Mục tiêu và phạm vi

Giảm thời gian tải ban đầu, lượng dữ liệu gửi qua Next.js RSC, số bản ghi Supabase truyền xuống trang quản trị, và số lần lấy toàn bộ snapshot điểm danh. **Không thay đổi RLS, JWT, quyền của đại biểu, phép tính kiểm phiếu hay quy tắc điểm danh.** Thay đổi này không yêu cầu migration database.

## 1. Cổng khách — BCH tải đúng lúc

- `/guest/[slug]` chỉ query tài liệu đã công bố và `head:true,count:"exact"` cho BCH. Không chuyển 500 hồ sơ ứng viên vào props của trang mặc định.
- Khi mở tab **Nhân sự BCH**, client dùng `GET /api/guest/[slug]/bch` để lấy hồ sơ. API xác minh lại `congress.status=live` bằng truy vấn server riêng mỗi lần, chỉ trả các trường hồ sơ công khai, **không trả phiếu bầu**, không dùng cache chia sẻ.
- Có trạng thái đang tải, thông báo lỗi, nút thử lại; request bị huỷ khi rời tab. Thư viện swipe chỉ được tải qua `next/dynamic` khi cần.
- Chỉ có thể xem danh sách đã tải trong phiên của trang; một Đại hội vừa đóng sẽ trả 404 cho request mới. Reload trang sẽ áp dụng trạng thái mới.

## 2. Thư viện ảnh — phân trang thực trên Supabase

- Trước V75, trang Admin lấy tối đa 1000 đại biểu và 1000 ứng viên rồi cắt 36 ảnh trong trình duyệt.
- Trang V75 dùng truy vấn `HEAD` để đếm hồ sơ và `range(from,to)` để lấy tối đa 36 hồ sơ đang xem; bộ lọc và tìm kiếm chạy tại Supabase.
- Hai danh mục có nguồn khác nhau, nên chế độ **Tất cả** và **Chưa có ảnh** chia thành tối đa 18 đại biểu + 18 BCH/trang. Số trang dựa trên danh mục dài nhất, bảo đảm không bỏ sót hồ sơ. Khi chọn riêng Đại biểu/BCH, 36 hồ sơ/trang.
- Tìm theo họ tên/đơn vị hoặc chức vụ, chuẩn hóa giới hạn 64 ký tự, chỉ cho phép chữ/số/dấu cách/gạch nối trong bộ lọc để ngăn chèn cú pháp PostgREST. URL chỉ chứa bộ lọc/chỉ số trang, không chứa thông tin tài khoản.
- Nút trước/sau dùng điều hướng server, không dựng hàng nghìn DOM nodes, đồng thời tắt tự prefetch hàng loạt các liên kết chọn Đại hội.
- Chỉ Super Admin truy cập được trang, ảnh vẫn đi qua API kiểm tra quyền riêng tư.

## 3. Màn hình điểm danh — giảm snapshot, giữ đối soát

- Mặc định tải snapshot đầy đủ một lần, nhận các lượt điểm danh mới qua Supabase Realtime INSERT khi có cấu hình. Luồng `mode=updates` vẫn bù sự kiện bị mất.
- Khi kết nối Realtime ổn định, đối soát snapshot **30 giây**/lần, thay vì 10 giây. Khi Realtime lỗi hoặc không bật, duy trì snapshot **10 giây**/lần để ưu tiên độ chính xác.
- Đăng ký thêm thông báo thay đổi ghế, phân công ghế, sơ đồ và phiên làm việc **trên cùng channel**, nếu các bảng được bật publication. Gộp (debounce) các thay đổi liên tiếp trong 700ms rồi tải lại snapshot.
- Không cho nhiều snapshot chạy đồng thời, tránh ghi đè dữ liệu vừa đến. Khi màn hình bị ẩn, không gọi định kỳ; khi trở lại, tải lại ngay để đồng bộ.
- Có nhịp thử lại khi lần tải đầu thất bại, tối thiểu 10 giây giữa những lần thử để không gây bão request khi Supabase gặp sự cố.
- **Giới hạn cần biết:** Nếu bảng sơ đồ ghế chưa được phát sự kiện Realtime, cập nhật ghế có thể trễ tới 30 giây khi kênh điểm danh vẫn khỏe. Chu kỳ snapshot dự phòng bảo đảm cuối cùng sẽ hội tụ, nhưng không thể tuyên bố ghế được cập nhật tức thì khi chưa xác nhận publication.

## 4. Kiểm thử và đo thực tế

- Chạy `npm run build`, `npm run lint`, `node --test tests/*.test.mjs`, `npm run check:production-schema`.
- Kiểm tra GET của endpoint BCH với Đại hội `live` và một slug không hợp lệ; xác nhận không có `votes_received` / `total_ballots` trong phản hồi.
- Admin mở `/dashboard/media` và tìm kiếm tên theo dấu tiếng Việt, chuyển tab, xem trang 2; kiểm tra mỗi truy vấn SELECT trả không quá 36 rows.
- Trong một phiên điểm danh kiểm thử, cập nhật ghế từ BTC và kiểm tra màn chiếu đổi vị trí; rút kết nối Realtime rồi kiểm tra đồng bộ dự phòng và không mất lượt điểm danh.
- Đo Chrome DevTools Network/Performance, Next.js/Vercel traces, Lighthouse **trước–sau trên cùng thiết bị và mạng**; không công bố phần trăm tăng tốc nếu chưa có đo production.

**Cảnh báo tải:** Đây là tối ưu kiến trúc, **không thay thế** bài stress test 200–300 người đồng thời; không khởi chạy benchmark ghi điểm danh trên cơ sở dữ liệu production.

## 5. V76 — giảm độ trễ GET /api/guest/[slug]/bch (14/11/2026)

Sau khi k6 smoke test 5 VUs (23 requests) báo 1 timeout 12 giây, kiểm tra production cho thấy 3 lượt GET API BCH đều HTTP 200 với TTFB 1.918 / 1.697 / 1.737 giây, payload khoảng 1.267 byte. Không dùng số mẫu nhỏ này để suy ra sức tải tối đa.

Truy vấn cũ gọi `congresses` rồi `bch_candidates` tuần tự. Truy vấn mới dùng PostgREST embedded `congresses(id,name,bch_candidates(...))` trong **một request Supabase** và giữ nguyên các kiểm soát:

- Bắt buộc `slug` hợp lệ và `congresses.status=live` tại thời điểm đọc; không lưu cache chung.
- Chỉ lấy tối đa 500 ứng viên trong đúng Đại hội, giữ `display_order,created_at`, chỉ xuất trường công khai, không xuất phiếu bầu.
- Chờ tối đa 9 giây cho upstream; khi có lỗi trả HTTP 503 thay vì treo không giới hạn.
- Trả `Server-Timing: supabase;dur=...` để phân biệt độ trễ truy vấn Supabase với thời gian truyền mạng/function; truy vấn vượt 2.500 ms được ghi cảnh báo Vercel Logs.
- Không chỉnh RLS, quyền, bảng, phiếu bầu, dữ liệu điểm danh.

**Đo kiểm chứng truy vấn thật (mẫu đơn, không phải benchmark):** truy vấn `congresses` 1.196 ms; `bch_candidates` 454 ms; truy vấn gộp 234 ms. Cả hai phương án đều trả đúng 2 ứng viên có cùng ID/thứ tự. Số đo có thể bị ảnh hưởng bởi cold start, DNS và cache kết nối nên không dùng để cam kết phần trăm cải thiện.

**Kiểm chứng release:** build, lint, unit tests; trên production kiểm tra HTTP 200, `Server-Timing`, danh sách BCH đúng, Đại hội đóng 404 và không rò rỉ trường `votes_received`/`total_ballots`. Sau đó chạy lại k6 smoke ở 5 VUs rồi mới tăng theo 20 → 50 → 100 → 200 VUs có giám sát logs và ngưỡng dừng; không tải thử các API ghi production. Nếu p95 vẫn cao, đối chiếu vùng chạy Vercel Function và vùng Supabase trước khi đổi hạ tầng.

## 6. V77 — giảm tải render trang khách /guest/[slug] (14/11/2026)

K6 trên máy ADMIN ở giai đoạn nâng 20 VUs ghi 38 requests, 37 HTTP 200, 1 request timeout 12 giây tại `GET /guest/dhivcntt`. p95 của các request đo được là 2.265 ms; chỉ với 38 mẫu chưa kết luận nguyên nhân chính thức hoặc sức tải tối đa.

Bản V77 chuyển trang chi tiết Đại hội từ **ba truy vấn Supabase** (congress → documents + BCH count) thành **một truy vấn PostgREST embedded**:
- `congresses`: vẫn bắt buộc `slug` hợp lệ và `status=live` ở mỗi request, không cache chung.
- `documents`: vẫn chỉ các tài liệu `delegate_visible=true`, giữ thứ tự `display_order`, `created_at DESC` và giới hạn 500 mục.
- `bch_candidates(count)`: dùng phép đếm aggregate chính xác tại database, không truyền hồ sơ ứng viên, số phiếu hoặc dữ liệu riêng tư trong props ban đầu.
- Giới hạn thời gian chờ upstream 9 giây, cảnh báo `[guest-page]` khi truy vấn vượt 2,5 giây; lỗi Supabase không tiết lộ chi tiết kết nối cho khách.

Đã kiểm chứng truy vấn read-only với dữ liệu production: Đại hội trùng ID, tài liệu hiện công bố bằng nhau (0), số ứng viên BCH bằng nhau (2). Kiểm thử regression mock kiểm tra query chỉ một lần, điều kiện `live`, danh sách tài liệu, số lượng, trường bảo mật, slug không hợp lệ/Đại hội đóng và lỗi database. Không cần migration hay thay đổi RLS.

**Hậu kiểm:** đo latency qua nhiều lần tải, theo dõi Vercel runtime logs cùng khoảng thời gian với k6. Các trang RSC có thể trả HTML cảnh báo với HTTP 200 khi database thất bại, vì vậy test phải kiểm tra nội dung trang ngoài HTTP status. Chạy lại k6 20 VUs trước khi tăng 50–200; tách riêng request tới `/guest/[slug]` và `/api/guest/[slug]/bch`, đo HTTP p95, timeout, lỗi và ngưỡng dừng. Chưa kết luận hệ thống chịu 200 người đồng thời.
