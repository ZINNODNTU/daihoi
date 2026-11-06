# Đại hội số — UI v2 (Enterprise Editorial)

Ngày: 06/11/2026. Phạm vi: website công khai, đăng nhập, shell quản trị, dashboard tổng, trang chi tiết Đại hội, danh sách Đại hội và token/kiểu chữ của các trang nghiệp vụ.

## Hướng thiết kế
- Giao diện phần mềm quản trị thay cho landing-page template: nhiều khoảng trắng có chủ ý, border 1px, card bo nhẹ (8–12px), hạn chế shadow, không glow.
- Nền ứng dụng #f7f8fa; surface #ffffff; chữ chính #202a39; line #e5e8ee; accent cobalt #2456c9. Màu trạng thái success/warning/danger giữ riêng và không bị biến thành xanh thương hiệu.
- Kiểu chữ sans hệ thống, tiêu đề 700–760, nội dung 500–650; chỉ số dùng tabular nums.
- Navigation desktop sidebar 258px, nhóm theo hệ thống/Đại hội/quản trị. Header 77px; mobile drawer có Escape/overlay, dưới cùng 5 lối tắt. Không thêm animation không cần thiết.
- Bảng danh sách ưu tiên bố cục dạng hàng, trạng thái có nhãn chữ (không chỉ dựa màu), CTA chính một màu.
- Form focus có ring, bàn phím, min touch height khoảng 42–44px; mobile input font 16px tránh zoom Safari.

## Các tệp chính
- src/app/globals.css: token, card/field/button/badge/table, shell, metric, media queries và print.
- src/components/app-shell.tsx: điều hướng chung và phân cấp sidebar.
- src/app/page.tsx: trang giới thiệu gọn, dashboard minh họa có nhãn dữ liệu giả lập.
- src/app/login/page.tsx: trang đăng nhập tập trung biểu mẫu, phần giới thiệu tối giản.
- src/app/dashboard/page.tsx: chỉ số dạng metric, danh sách Đại hội.
- src/components/congress-directory.tsx: danh sách dạng hàng, search/filter.
- src/app/congresses/[id]/page.tsx: header, số liệu, lối tắt, phiên điểm danh.
- Các màn hình nghiệp vụ: đồng bộ sắc độ icon, góc bo và độ đậm chữ.

## Kiểm thử
- ESLint, 29 bài test tự động, production build Next.js.
- Kiểm tra HTTP / và /login trên local.
- Kiểm thử screenshot browser, đo contrast và kiểm thử thao tác cảm ứng trên thiết bị thật vẫn cần thực hiện trong trình duyệt người dùng được cấp phép; không coi kiểm tra mã nguồn là chứng nhận QA giao diện thực tế.
- Không thay đổi quy trình API/Supabase hay thêm thư viện UI nặng.

## Checklist hồi quy
- Desktop ≥ 1280px: sidebar, topbar, search, danh sách, form, số liệu, bảng.
- Tablet 768–1024px: menu drawer, overflow hàng bảng.
- Mobile 320–430px: 5 mục dưới, CTA, trường form, modal, an toàn vùng safe-area.
- Bàn phím: Tab/Shift+Tab/Enter/Escape và focus-visible; reduced-motion.
- Role admin/checkin/secretary hiển thị các mục phù hợp; các thay đổi style không thay quyền.
