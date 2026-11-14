# RBAC đa Đại hội V60 – quản trị toàn bộ tài khoản

## Tổng quan

Truy cập **Admin → RBAC · Toàn bộ tài khoản** (`/dashboard/access`).
Super Admin xem danh bạ từ Supabase Auth, bao gồm **quản trị hệ thống, BTC, đại biểu, khách mời và tài khoản chưa tham gia Đại hội**. Đây là trang dành cho quản trị viên hệ thống; BTC thường vẫn được quản lý quyền nhân sự BTC trong từng Đại hội.

- Lọc, tìm tài khoản theo email/tên và chọn Đại hội để quản lý.
- Phân quyền theo **vai trò nền** và **nhóm tùy chỉnh theo Đại hội**. Nhóm chỉ được thu hẹp quyền của vai trò, không thể tự cấp thêm quyền quản trị hoặc chuyển vai trò.
- Gán/gỡ nhóm quyền của từng tài khoản; thiết lập quyền cá nhân theo API được xác thực. Với BTC, giữ cơ chế RPC V58 có nhật ký. Với đại biểu/khách mời, hỗ trợ các quyền cổng điện tử.
- **Đóng vai tài khoản (V72)**: Super Admin vào RBAC → chọn Đại hội → chọn tài khoản khác → **Đóng vai tài khoản** → xác nhận. Máy chủ xác minh Super Admin, tài khoản đích và phạm vi Đại hội, sau đó cấp phiên Supabase Auth thực của tài khoản đích (không dùng service-role JWT ở trình duyệt). Người đóng vai được thao tác đầy đủ trong giới hạn RBAC của tài khoản đích. Các thay đổi do tài khoản đích thực hiện, có nhật ký Super Admin khởi tạo; thanh vàng cố định cung cấp nút **Thoát đóng vai** để khôi phục phiên Admin gốc. Phiên đóng vai tối đa 30 phút; khóa cập nhật mật khẩu/tài khoản gốc; sau khi hết hạn toàn bộ API thao tác bị chặn và chuyển sang phục hồi. Không cần mật khẩu của tài khoản đích. Nếu không khôi phục được phiên Admin, đăng nhập lại bình thường. Chi tiết: [Hướng dẫn V72](DONG-VAI-TAI-KHOAN-V72.md).
- Áp dụng bảo vệ server-side cho nội dung thẻ, tài liệu, BCH, ghế, quét QR, lịch sử và cập nhật hồ sơ; bảo vệ ở PostgreSQL RLS với các truy vấn trực tiếp.
- Lịch sử thao tác quản lý nhóm, gán nhóm và giới hạn quyền cá nhân được ghi ở audit log và nhật ký hệ thống.

## Triển khai Supabase (bắt buộc)

Cần giữ đầy đủ migration V45, V57 và V58 trước khi nâng cấp. Trên **đúng dự án Supabase của Đại hội**:

1. Sao lưu dữ liệu của dự án bằng quy trình backup hiện hành.
2. Mở Supabase Dashboard → SQL Editor. Chạy nội dung file **`supabase/upgrade-global-rbac-groups-v60.sql`** một lần.
3. Kiểm tra các bảng `rbac_groups`, `rbac_account_assignments`, `rbac_portal_denials` có RLS.
4. Vào **Admin → RBAC · Toàn bộ tài khoản** để tạo nhóm và xác minh điều hướng dựa trên quyền.
5. Test 3 người dùng: BTC được cấp, đại biểu có quyền, đại biểu bị thu hồi `portal.access`. Đảm bảo gọi API trực tiếp không vượt quyền.

### Kiểm tra nhanh bằng SQL (chỉ đọc)

```sql
select c.relname,c.relrowsecurity
from pg_class c
where c.relnamespace='public'::regnamespace
  and c.relname in ('rbac_groups','rbac_account_assignments','rbac_portal_denials')
order by c.relname;
```

Cần có **3 bản ghi** với `relrowsecurity=true`.

Nếu migration **chưa triển khai**, phần quản lý nhóm sẽ báo rõ cần V60; các phân quyền cũ của tài khoản vẫn hoạt động theo vai trò nền (compatibility fallback chỉ cho lỗi **thiếu bảng PGRST205 / 42P01**), không mặc nhiên bỏ qua các lỗi truy vấn khác.

## Quy tắc an toàn

- Mọi API thay đổi RBAC kiểm tra Auth + `profiles.platform_role=super_admin`.
- Không thể tự sửa quyền của session đang đăng nhập, không chuyển vai trò hệ thống, không gán nhóm khác Đại hội/khác vai trò, không sửa Super Admin bằng nhóm.
- Không ghi mật khẩu, refresh token hay thông tin đăng nhập thay.
- Khi thu hồi `portal.access`, mọi quyền `portal.*` khác của Đại hội đó đều mất hiệu lực.
- Cần kiểm tra SQL migration trước khi phát hành: V60 có các chính sách RESTRICTIVE và trigger bảo vệ assignment ở database, không chỉ ẩn menu.
- Nếu chưa gắn Đại hội, tài khoản vẫn xuất hiện trong danh bạ nhưng chưa thể gán nhóm; phải cấp tư cách tham dự hợp lệ bằng quy trình tài khoản hiện có.

## Kiểm thử tự động

```shell
node --test tests/global-rbac-v60.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Kiểm thử V60 dùng PostgreSQL PGlite để chứng minh RLS, trigger chống gán chéo, khống chế quyền nhóm và giới hạn preview. Các kiểm thử hồi quy V47 và V24 được cập nhật đúng với quy tắc mới.

> **Giới hạn preview:** Đây là ảnh dựng UI từ dữ liệu/quyền thực tế để phục vụ kiểm tra, không phải session impersonation hoàn chỉnh. Các thao tác điểm danh, lưu biểu mẫu, upload và cập nhật được cố tình vô hiệu hóa.