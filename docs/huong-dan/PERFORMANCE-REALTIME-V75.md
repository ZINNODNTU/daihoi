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
