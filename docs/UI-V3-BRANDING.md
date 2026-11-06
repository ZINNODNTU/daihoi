# UI V3 — Đại hội số / Congress Workspace

## Hướng thiết kế
Phong cách institutional editorial: midnight navy, điểm nhấn vàng đồng, cobalt cho hành động chính và nền trung tính. Sử dụng khoảng trắng, typography có phân cấp, bề mặt gần phẳng và bố cục điều hành rõ ràng thay vì các gradient/glow chung chung.

## Các thành phần đã nâng cấp
- src/components/brand-mark.tsx: dấu hiệu nhận diện SVG dùng trên trang chủ, đăng nhập, sidebar và preview.
- src/app/icon.svg: favicon đồng bộ.
- src/app/page.tsx: hero midnight có lưới kiến trúc, giới thiệu sản phẩm trực quan và phân hệ chính.
- src/components/experience-preview.tsx: ba chế độ Tổng quan / Sơ đồ ghế / Điểm danh với dữ liệu mẫu; nhấn ghế, đổi chế độ, lọc lịch sử.
- src/app/preview/page.tsx: bản xem trước công khai tại /preview, không cần Supabase.
- src/app/login/page.tsx: đăng nhập hai vùng, biểu mẫu và phân cấp chữ.
- src/components/app-shell.tsx: sidebar midnight, topbar và bottom-nav dành cho thiết bị nhỏ.
- src/app/dashboard/page.tsx, src/app/congresses/[id]/page.tsx: command masthead, chỉ số từ dữ liệu thực (khi kết nối), điều hướng nghiệp vụ.
- src/components/seating-client.tsx: canvas sơ đồ ghế có lưới, sân khấu rõ ràng và ghế bo nhẹ.
- src/app/globals.css: hệ màu, lớp giao diện, biểu đồ và quy tắc responsive.

## Truy cập trên máy local
- http://localhost:3000/ — Trang chủ V3.
- http://localhost:3000/preview — Xem thử UI tương tác không yêu cầu tài khoản.
- http://localhost:3000/login — Giao diện đăng nhập.
- http://localhost:3000/dashboard — Quản trị thật, yêu cầu cấu hình Supabase.

## Phân biệt dữ liệu
Bản xem trước hiển thị dữ liệu giả lập (200 đại biểu, 184 có mặt, 92%) có nhãn minh họa. KHÔNG sử dụng số liệu này trong các API hay báo cáo vận hành.

## Kiểm thử và giới hạn
- Chạy lint, production build, test tự động và HTTP smoke.
- Chưa thể kiểm thử ảnh chụp Chrome ở các breakpoint do phiên trình duyệt kết nối không cho phép điều hướng nền.
- Bản cập nhật chỉ thay UI, không đổi Supabase API, auth và nghiệp vụ phân ghế.
- Nên kiểm thử trực tiếp trên điện thoại 390px và màn hình desktop 1440px trước phát hành chính thức.
