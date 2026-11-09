# Đại hội số v12 — Thẻ đại biểu tối giản và đăng nhập qua LAN

> **Tài liệu lịch sử** — Ghi lại một phiên bản/thời điểm cũ; thông tin cấu hình, giao diện và trạng thái triển khai có thể đã thay đổi. Ưu tiên [mục lục hiện hành](../../README.md).

## Trải nghiệm dành cho đại biểu
- **Thẻ đại biểu**: `/my-card` — chỉ còn tên Đại hội, nhiệm kỳ, loại đại biểu, ảnh, tên, chức vụ, đơn vị, mã ghế phiên phù hợp và barcode CODE128. Không có QR đại biểu; đã bỏ nhãn "Thẻ đại biểu số 01". Ba nút chức năng nằm bên ngoài thẻ.
- **Điểm danh**: `/my-card/checkin` — giao diện camera QR riêng, có phương án chụp ảnh QR và dán liên kết trên trình duyệt thiếu HTTPS.
- **Chỗ ngồi**: `/my-card/seats` — thông tin ghế theo từng phiên, mỗi phiên có thể dùng sơ đồ khác.
- **Lịch sử**: `/my-card/history` — danh sách phiên đã ghi nhận, thời gian, hình thức quét, nút làm mới.
- **Tài khoản**: `/account` — giao diện riêng.
- Menu mobile 5 chức năng, nút lớn, vùng an toàn (safe-area) và breakpoint từ 320 px. Nút in thẻ riêng, menu/nhóm hành động không in.

## Sửa lỗi đăng nhập bằng thiết bị khác
Trước v12, trình duyệt thực hiện `supabase.auth.signInWithPassword` trực tiếp tới Supabase, rồi chuyển trang bằng client router. Trên thiết bị LAN có thể bị hạn chế kết nối đến Supabase, đồng bộ cookie chưa kịp, hoặc đi sai origin/redirect.

V12 sử dụng `POST /api/auth/login` qua **cùng origin** trang web. Next.js thực hiện Supabase Auth trên server rồi trả về **host-only cookie** phù hợp HTTP LAN hoặc HTTPS production. Client điều hướng toàn trang để SSR đọc cookie. Đăng xuất dùng `POST /api/auth/logout` cùng origin.

**Đã tìm ra thêm nguyên nhân gốc khi thử trên IP LAN**: trang `/login` trả HTTP 200 nhưng các tệp JS/CSS `/_next/static/*` trả HTTP **403** do Next.js 16 chặn origin không thuộc danh sách dev; do đó biểu mẫu không thể chạy từ điện thoại. Đã bổ sung `allowedDevOrigins` tự lấy địa chỉ IPv4 private trên máy chủ vào `next.config.ts` (chỉ development). Kiểm tra lại trên `192.168.1.72:3000`: CSS và JS đều **HTTP 200**. API login trước khi sửa cũng trả 403 do so sánh Origin với `request.nextUrl.host` thay vì `Host` thực tế; đã sửa, kiểm tra tài khoản giả qua IP LAN trả **401** đúng nghĩa. Cả hai vấn đề đều đã được khắc phục trên mã nguồn local.

Lưu ý: kiểm tra từ chính máy chủ thông qua địa chỉ LAN xác nhận GET `/login` HTTP 200; JS/CSS tải được HTTP 200; các trang `/my-card*` trả HTTP 307 về `/login` khi chưa đăng nhập. Thử POST bằng tài khoản giả trả HTTP **401** (sai thông tin xác thực), còn origin lạ trả 403. Điều này xác thực đường truyền và luồng báo lỗi, **chưa kiểm tra đăng nhập thành công với tài khoản thực từ điện thoại khác**.

## Mở kết nối từ máy khác cùng Wi-Fi
1. Chạy Next.js `npm run dev` trên máy Windows, bind `0.0.0.0:3000`.
2. Đảm bảo mạng Wi-Fi đáng tin cậy đang ở dạng **Private** (kiểm tra trong Windows Network Settings). Trên máy điện thoại khác cùng Wi-Fi, mở `http://192.168.1.72:3000/login` (IP có thể thay đổi khi khởi động router).
3. Windows Defender Firewall cần inbound TCP 3000 trên Private cho LocalSubnet. Máy dev đang chạy không có quyền Administrator nên **chưa thể thêm rule này tự động**. Để thiết lập, mở PowerShell **Run as administrator** và chạy từ thư mục `D:\daihoi`:
   `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/allow-lan-3000.ps1`
4. Nếu điện thoại dùng Wi-Fi khách / bật client isolation, phải tắt chế độ cô lập hoặc dùng cùng mạng LAN chuẩn; không mở cổng 3000 trên Internet.
5. Giữ HTTP LAN chỉ để thử nghiệm. Để camera browser `getUserMedia` hoạt động trên điện thoại, cần HTTPS đáng tin cậy (Vercel hoặc proxy/tunnel HTTPS). Chụp/chọn ảnh QR có thể hoạt động qua HTTP LAN tùy thiết bị.
6. Nếu mở được trang đăng nhập nhưng không vào được tài khoản, kiểm tra username/password và phiên làm việc; app hiện lỗi trực tiếp từ `/api/auth/login` với 401, 429 hoặc 503 tương ứng. Không chia sẻ mật khẩu / JWT để gỡ lỗi.

## Kiểm thử
- Chạy `npm run lint`, `npm run build`, `node --test tests/*.test.mjs`.
- Kiểm tra đăng nhập thành công trên **2 điện thoại độc lập** và máy tính, mỗi máy có cookie phiên của riêng mình, thử đăng xuất, quay lại các trang nghiệp vụ và tự điểm danh đúng phiên.
- Kiểm tra project Supabase `pnxdxdagpeyqarucdphk` đã áp dụng các nâng cấp RLS trước khi vận hành chính thức, đặc biệt `supabase/upgrade-delegate-portal-v11.sql` từ đợt trước.
