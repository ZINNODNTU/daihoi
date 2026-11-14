# V74 – Tối ưu tốc độ tải trang không đánh đổi RBAC và điểm danh

## Những điểm nghẽn xác định trong mã nguồn

1. **Guest /guest/[slug]:** trước V74 `GuestCongressReader` import tĩnh `DelegateBchCarousel`, kéo theo thư viện `@daformat/react-swipeable-cards` vào JavaScript ban đầu, ngay cả khi tab Tài liệu (mặc định) đang mở.
2. **Congress/Dashboard:** page tự tạo Supabase SSR client và gọi `auth.getUser()`. Các trang con lại sử dụng `getAuth()` có React cache; vì instance khác nhau nên có khả năng xác minh JWT / gọi Auth lặp. `getCongressRole()` còn bị gọi đồng thời trực tiếp từ layout và bên trong `getCongressEffectiveAbilities()`.
3. **Thư viện ảnh Admin:** render toàn bộ tối đa 2000 thẻ cùng lúc. Trình duyệt phải dựng DOM, bố cục và kiểm soát nhiều hình ngay khi mở trang.
4. **Guest/ Dashboard loading:** chưa có fallback cấp route khi truy vấn server chậm; tạo cảm giác bấm không phản hồi.
5. **Kiểm thử:** có 80 file test nhưng chưa có số đo thực nghiệm p75/p95 LCP, INP, TTFB qua mạng người dùng, cũng chưa có ngân sách tải JavaScript theo route.

## Thay đổi V74 đã thực hiện

- **Chia chunk trang Guest:** `next/dynamic` nạp carousel BCH khi chuyển sang tab BCH. Tab Tài liệu giữ nguyên HTML, bộ lọc và nội dung công khai. **Không cache nội dung nhân sự công khai** vượt thời gian đóng Đại hội.
- **Giảm Auth trùng trong một server render:** Dashboard và CongressLayout cùng dùng `getAuth()` (`React.cache`). `getCongressRole` và `getCongressEffectiveAbilities` dùng `cache()` của React với khóa đủ Supabase client + userId + congressId để dedupe trong render. Cache React chỉ sống trong từng request, không giữ quyền sau khi thu hồi sang request khác.
- **Giới hạn gallery ban đầu:** hiển thị 36 ảnh, tải thêm 36 ảnh mỗi lần; dùng `loading="lazy"`/`decoding="async"`, duy trì bộ lọc và danh sách đầy đủ.
- **Loading route:** thêm fallback skeleton không chứa thông tin cá nhân cho Dashboard và trang chi tiết Guest. Cổng đại biểu đã có skeleton riêng, giữ nguyên.
- **Không đụng vào:** cookie Auth, RLS, thời gian hiệu lực của phiên đóng vai, cơ chế check-in, bất kỳ chính sách bucket hoặc quyền tải tài liệu. API ảnh riêng tư và Realtime vẫn `private, no-store`.

## Cách đánh giá trên production sau deploy

So sánh trên cùng thiết bị, mạng, tài khoản và trình duyệt (cold load + warm load):

| Màn hình | Chỉ tiêu | Phương án đo |
|---|---|---|
| `/login` | TTFB, LCP, JS transferred | Lighthouse mobile hoặc Chrome DevTools throttling |
| `/guest/[slug]` tab Tài liệu | JS transferred, số chunk ban đầu, LCP | Chrome Network: không nạp chunk swipe-cards tới khi chọn BCH |
| `/guest/[slug]` tab BCH | latency tới lúc thẻ hiển thị | Performance / Network: tải chunk BCH khi thực sự mở |
| `/dashboard`, `/congresses/[id]` | TTFB, số request Supabase, server duration | Vercel runtime logs/traces, định danh request |
| `/dashboard/media` | DOM nodes, yêu cầu ảnh và INP | Performance: 36 ảnh ban đầu, tải thêm khi người dùng yêu cầu |
| Điểm danh trên 200 người | p95 API, 409 duplicates, lỗi 5xx, Realtime lag | k6/Artillery trên staging / với dữ liệu thử nghiệm |

Các mục tiêu có thể đặt ban đầu: p75 LCP mobile <2,5 giây, INP <200ms, CLS <0,1; TTFB và tốc độ API cần đo baseline, không tuyên bố số phần trăm cải thiện trước khi có số liệu. Đây là **mục tiêu**, không phải kết quả đã đo.

## Điểm cần nghiên cứu ở đợt tiếp theo

- **Guest data:** Dù đã lazy-load JS BCH, payload nhân sự BCH vẫn do Server Component truy xuất và gửi tới client khi trang bắt đầu. Có thể tách metadata thống kê với danh sách BCH, rồi tải danh sách khi chuyển tab bằng endpoint chỉ đọc bắt buộc xác minh `congress.status = live`. Cần tránh tiết lộ dữ liệu của Đại hội đã đóng và tránh watermark stale.
- **Ảnh:** ảnh riêng tư hiện cần Auth và `no-store` mỗi lần tải. Chỉ cân nhắc cache theo phiên hoặc URL có phiên bản + kiểm tra quyền lại khi thiết kế được cơ chế thu hồi tức thì; không đặt `s-maxage` công khai trên ảnh đại biểu.
- **DB/RLS:** dùng Supabase Query Performance / Advisors để xem index `congress_id`, `user_id`, `session_id`, RLS per-row, truy vấn đắt. Không thêm index tùy tiện nếu chưa đo kế hoạch EXPLAIN.
- **JS ngoài màn hình:** dùng bundle analyzer hoặc Chrome Coverage để xem module nặng chỉ nên tải theo tương tác; đặc biệt QR camera, import Excel và swipe cards.
- **Quan sát:** bổ sung đo Web Vitals trên staging/production và cảnh báo hồi quy; duy trì kiểm thử theo thiết bị Android phổ thông + mạng yếu.
- **Realtime:** `useAttendanceLive` đang làm snapshot toàn phần mỗi 10 giây, đồng thời dùng incremental updates. Nếu đo thấy quá tải, cân nhắc endpoint chỉ trả revision sơ đồ/ghế và giảm snapshot định kỳ; không giảm tần suất khi chưa chứng minh ghế vẫn cập nhật chính xác.

## Tài liệu kỹ thuật đối chiếu

- Next.js: https://nextjs.org/docs/app/guides/lazy-loading
- Next.js: https://nextjs.org/docs/app/guides/package-bundling
- Next.js: https://nextjs.org/docs/app/guides/production-checklist
- Supabase: https://supabase.com/docs/guides/auth/server-side/creating-a-client

Không nên đánh giá build chỉ bằng `First Load JS` của Next 16: Next.js đã bỏ số này vì không phản ánh đúng RSC. Dùng Lighthouse / Analytics và số request thực thay thế.
