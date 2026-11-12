# V63 — Chuẩn hóa thanh điều hướng quản trị Đại hội số

Ngày cập nhật: 12/11/2026.

## Mục tiêu
Tái cấu trúc sidebar thành **admin workspace** gọn, chuyên nghiệp, dễ nhận biết chức năng và an toàn với RBAC nhiều Đại hội. Không thay đổi nghiệp vụ, đường dẫn hoặc quyền dữ liệu của tài khoản.

## Tài liệu tham khảo
- shadcn/ui Sidebar: https://ui.shadcn.com/docs/components/base/sidebar
  - SidebarHeader / SidebarContent / SidebarFooter, responsive offcanvas, nhóm điều hướng, icon-collapse và trạng thái active.
- TailAdmin Next.js: https://github.com/TailAdmin/free-nextjs-admin-dashboard
  - Sidebar có cấu trúc hệ thống, nhóm chức năng và bố cục dashboard rõ ràng.
- Next Shadcn Dashboard Starter: https://github.com/Kiranism/next-shadcn-dashboard-starter
  - Admin navigation / workspace / dashboard composable trên Next.js.
- Shadcn UI Sidebar mẫu: https://github.com/salimi-my/shadcn-ui-sidebar
  - Thanh icon rail khi thu gọn và drawer trên điện thoại.

Các ý tưởng được **áp dụng vào chính AppShell của dự án**; không copy nguyên mẫu giao diện, không thêm UI framework hoặc runtime khác.

## Cấu trúc sidebar
1. **Không gian làm việc:** Tổng quan hệ thống / Tất cả Đại hội.
2. **Đại hội đang chọn:** tên Đại hội, huy hiệu Đoàn/Hội, nút chuyển Đại hội.
3. **Điều hành & điểm danh:** bảng điều hành, trung tâm điểm danh, màn hình điểm danh, bàn BTC và sơ đồ ghế (nếu được quyền).
4. **Đại biểu & nhân sự:** quản lý đại biểu, phân tích chất lượng, ứng viên BCH và kiểm phiếu BCH (Đại hội Đoàn và quyền phù hợp).
5. **Văn kiện & báo cáo:** tài liệu và báo cáo.
6. **Quản trị Đại hội:** tài khoản BTC, phân quyền Đại hội, cấu hình Đại hội.
7. **Quản trị hệ thống:** RBAC toàn bộ tài khoản và nhật ký lỗi; chỉ có với Super Admin.
8. **Footer tài khoản:** tài khoản & bảo mật, tên và vai trò, đăng xuất.

## Trải nghiệm
- Sidebar desktop rộng 280px, có thể thu gọn còn 76px chỉ hiển thị biểu tượng; vẫn có `title`/khả năng nhận diện từng mục.
- Nhóm có thể đóng/mở bằng nút với `aria-expanded` và vùng liên kết có `aria-label`.
- Ô tìm chức năng theo tên hoặc nhóm chỉ lọc trong **các mục đã được cấp quyền**.
- Nút đang chọn có màu, viền và dấu chỉ dẫn thống nhất. Trang con ưu tiên đường dẫn cụ thể nhất.
- Mobile dùng drawer có backdrop, phím Escape để đóng, vòng lặp Tab trong drawer, khóa cuộn nền và giữ điều hướng nhanh ở chân màn hình.
- Header cung cấp breadcrumb Hệ thống → tên Đại hội hiện tại → phân hệ; sidebar có vùng danh tính tài khoản cố định ở cuối.
- Khi chuyển trang, sidebar tự cuộn nội bộ đến mục đang chọn nếu cần, không kéo trang nội dung theo.
- Tuân thủ `prefers-reduced-motion`. Không phát sinh truy vấn mới đến Supabase chỉ để hiển thị menu.

## Bảo mật
- Danh sách chức năng được lọc bởi `effectiveAbilities` từ layout server, kế thừa phân quyền RBAC hiện hành.
- `ballots.read`, `team.manage`, `settings.manage` và `canViewSystemLogs` tiếp tục giới hạn các nhóm nhạy cảm.
- Sidebar **không được xem là cơ chế cấp quyền**: mọi page và API vẫn kiểm tra quyền riêng ở server.
- Phần "Thẻ đại biểu" không xuất hiện trong admin workspace, thuộc cổng đại biểu riêng.

## Kiểm tra
- `node --test tests/admin-sidebar-v63.test.mjs` kiểm tra ghép tuyến cụ thể nhất, tìm kiếm, nhãn nhóm, RBAC gating, mobile, thu gọn và footer.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, và toàn bộ bộ test.
- Manual smoke: đăng nhập Super Admin và BTC hạn chế quyền; kiểm tra các nhóm, menu thu gọn, tìm kiếm, chuyển Đại hội, nhật ký, sidebar trên mobile, nút đăng xuất và truy cập bằng bàn phím.
