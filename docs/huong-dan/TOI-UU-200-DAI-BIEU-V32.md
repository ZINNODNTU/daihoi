# Tối ưu truy cập đồng thời 200 đại biểu (V32)

## Phạm vi triển khai

- Next.js trên Vercel chịu trách nhiệm tự mở rộng các request HTTP. Repo **không** tự quản lý số replica máy chủ hoặc tăng quota của Vercel/Supabase.
- `getPortalViewerAuth()` xác minh JWT bằng `getClaims()` cho các trang **chỉ đọc**. Kiểm tra JWKS trực tiếp trên dự án ngày 10/11/2026 xác nhận **1 khóa ES256**, vì vậy Supabase có thể xác minh cục bộ/JWKS thay vì gọi Auth `/user` trên mỗi trang (sau khi đã lấy JWKS). Khi đổi sang khóa đối xứng, Supabase phải liên hệ Auth.
- Các API có quyền ghi (đăng nhập, điểm danh, sửa hồ sơ/ghế, quản trị) **giữ `getAuth()` với `getUser()`** để kiểm tra dữ liệu người dùng mới nhất.
- `getAuth`, `getPortalCongressAccess`, `getMyDelegateData` được dedupe bằng `React.cache` **chỉ trong một request**, không cache xuyên người dùng.
- Dữ liệu Đại hội dùng chung: TTL 15 giây; phiên Đại hội: 10 giây; hình học ghế: 15 giây. Không cache chung lịch sử, quyền, mã QR, ảnh riêng tư hoặc ghế được gán cho từng đại biểu.
- Điều hướng `Link prefetch={false}` hạn chế tải trước các trang không được mở khi nhiều điện thoại vào cùng thời điểm. Có `/my-card/loading.tsx` để hiển thị skeleton trong lúc đang xác minh dữ liệu.
- Mặc định favicon/icon và biểu tượng iOS được xuất từ `public/branding/huy-hieu-doan.png`; logo từng Đại hội vẫn theo loại Đoàn/Hội.
- Login gửi `Retry-After: 15` khi Supabase trả 429; đây chỉ là gợi ý đợi để người dùng thao tác lại, **không tăng quota Auth**.

## Rủi ro cần xác minh trước ngày Đại hội

1. **Supabase Auth**: Kiểm tra loại JWT signing key và quota tại Supabase Dashboard > Authentication > Rate Limits. Với 200 lượt đăng nhập cùng lúc, quota `/auth/v1/token` của IP từ Vercel có thể là nút cổ chai. Quota mặc định hiện được công bố là 150 yêu cầu/5 phút theo IP, burst 30. Nếu dùng chuyển tiếp IP đến Auth, chỉ triển khai theo quy trình `Sb-Forwarded-For` với secret key ở **server**, khi đã bật trong Supabase; tuyệt đối không tin IP client tự gửi.
2. **Vercel**: Kiểm tra project, region gần Supabase, giới hạn concurrency/functions, quota và build production. Code được push không đồng nghĩa đã có deployment READY.
3. **DB**: Kiểm tra connection pool, CPU, các indexes `delegates_auth_user_active_idx`, `checkins_delegate_time_idx`, `checkins_session_time_realtime_idx`. Không tự áp migration/SQL vào production khi chưa backup.
4. **Màn chiếu**: Đo tốc độ load / cập nhật `/api/attendance/live` với 200 lượt check-in và 1–3 màn chiếu. Theo dõi 429, 5xx, p95 và đồng bộ ghế.
5. **Tính riêng tư**: Bảo đảm không dùng CDN/shared-cache cho HTML riêng tư, cookie, ảnh đại biểu và endpoint thông tin cá nhân.

## Kiểm thử đã thực hiện và giới hạn

`node scripts/load-test-local-200.mjs` chạy với **200 request ẩn danh**, không thực hiện 200 login hoặc check-in thật. Phải phân biệt kết quả HTTP benchmark với chứng nhận chịu tải production.

Trước sự kiện, thực hiện thêm **staging rehearsal 200 tài khoản duy nhất**: đăng nhập, mở thẻ, ảnh, sơ đồ, tài liệu, QR, ghi 200 check-in ở các tốc độ 30/60/120 giây; đo p50/p95/p99, HTTP 429/5xx, Supabase CPU/PgBouncer và realtime sync. Không tải thử/ghi check-in thử ồ ạt lên production khi Đại hội đang vận hành.

Mục tiêu nghiệm thu đề xuất: ≥99,5% request thành công (trừ lỗi truy cập cố ý), p95 xem thẻ <3 giây, p95 ghi điểm danh <5 giây, không mất lượt và không gán nhầm ghế. Đây là **mục tiêu kiểm thử**, không phải số liệu đã đo.
