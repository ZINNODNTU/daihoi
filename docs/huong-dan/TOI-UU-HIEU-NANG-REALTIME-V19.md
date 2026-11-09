# Hiệu năng V19: realtime và hàng chờ chào đại biểu

## Màn hình điểm danh
- Lần đầu chỉ tải một snapshot (đại biểu, phiên, sơ đồ, phân ghế, lượt điểm danh).
- Supabase Realtime nhận sự kiện INSERT vào checkins theo session_id; lượt mới hiển thị ngay, hàng chờ FIFO có ảnh, tên, đơn vị, vai trò, ghế và thời gian. Mỗi lượt được chào tối thiểu 6,2 giây. Cùng lúc nhiều lượt thì không ghi đè flashcard của nhau.
- Khi Realtime mất kết nối, API cập nhật tăng dần chỉ trả các check-in mới (3 giây/lần). Khi Realtime hoạt động, đối chiếu mỗi khoảng 15 giây để tránh rơi sự kiện. Làm mới snapshot định kỳ 120 giây giúp cập nhật sơ đồ sau chỉnh sửa.
- Để kích hoạt sự kiện tức thì: sau khi sao lưu và xác minh chính sách RLS trên project Supabase mục tiêu pnxdxdagpeyqarucdphk, áp dụng migration tại supabase/upgrade-attendance-realtime-v19.sql. Sau khi kiểm tra Realtime hoạt động với tài khoản BTC, đặt NEXT_PUBLIC_ATTENDANCE_REALTIME_ENABLED=true trên Vercel và build lại. Nếu chưa xác nhận migration, giữ cờ false: màn hình vẫn có đồng bộ dự phòng 3 giây.
- Event Realtime có thể đến trùng hoặc mất thứ tự trong sự cố mạng: client chống trùng theo id và đối chiếu dữ liệu nguồn.

## Tối ưu phía đại biểu
- Trang tài liệu chỉ lấy Đại hội gắn với tài khoản và metadata tài liệu. Không tải lịch sử, ghế hay ảnh vào bộ dữ liệu tài liệu. Nhấn vào icon/tên mới chuyển qua API xác minh quyền rồi sang Google Drive; không truyền byte file qua Vercel.
- BTC upload ảnh 600x800; ảnh 96/160 pixel được tạo sẵn trong private storage, GET trả đúng kích thước. Ảnh cũ vẫn có fallback Sharp. Mỗi yêu cầu vẫn kiểm tra quyền và không bật CDN công khai.
- Ảnh nhân sự BCH trong cổng đại biểu dùng sẵn thumbnail 160 px; ở danh sách quản trị dùng bản 96 px. Khi xóa hồ sơ, xóa cả ảnh gốc và thumbnail riêng tư.
- ZXing chỉ tải khi mở camera/giải mã ảnh QR; giảm JS ban đầu ở trang đại biểu và bàn BTC.
- Dashboard tổng số đại biểu dùng count/head thay vì tải từng id.

## Cần kiểm thử
- Chạy npm run lint, npm run build, node --test tests/*.test.mjs.
- Dùng hai hoặc nhiều tài khoản điểm danh gần đồng thời: kiểm tra FIFO, ảnh, đơn vị, vị trí ghế, giờ check-in, trạng thái trên sơ đồ.
- Mô phỏng Realtime mất kết nối, kiểm tra có đồng bộ dự phòng và không mất check-in; thử đóng/mở phiên.
- Kiểm tra ảnh mới/cũ, tài liệu Drive với tài khoản đại biểu/BTC và người không có quyền.
- Load test 20/50/100/200 phiên đăng nhập và điểm danh; đo p95, TTFB, LCP, độ trễ realtime và tỷ lệ lỗi. Chưa được coi là đạt 200 concurrent nếu chưa test thực tế.
