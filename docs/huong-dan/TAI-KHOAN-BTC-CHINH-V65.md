# Tài khoản quản trị chính BTC và cổng đăng nhập chung — V65

## Mô hình quyền

Mỗi Đại hội có **tối đa một tài khoản BTC quản trị chính** (và được cấp tài khoản khi tạo Đại hội mới). Tài khoản chính có `congress_members.role = 'admin'` và `btc_accounts.is_primary = true`; không phải tài khoản `super_admin` toàn nền tảng.

Nhân sự BTC bổ sung có **tài khoản đăng nhập riêng**, gắn với đúng một Đại hội và vai trò `checkin` hoặc `secretary`. Quyền chức năng cụ thể có thể hạn chế qua `btc_account_capability_restrictions` (V57/V58) và nhóm quyền `rbac_groups` (V60). Không được cấp vai trò admin thứ hai bằng form BTC, API hoặc thao tác SQL trực tiếp trên bảng membership.

Tất cả tài khoản **quản trị hệ thống, quản trị BTC, nhân sự BTC, đại biểu/khách mời** truy cập cùng cổng `/login`. Backend xác thực qua Supabase Auth và định tuyến theo tư cách thật sự, quyền hoạt động/Đại hội được kiểm tra ở server. Không chia sẻ mật khẩu chính cho nhân sự khác.

## Nâng cấp Supabase — thực hiện trước khi triển khai ứng dụng mới

Dự án đích: `pnxdxdagpeyqarucdphk`. **Không chạy trên project Supabase khác.** Sao lưu trước khi chạy và bảo đảm đã cập nhật migration V45/V57/V58/V60.

Kiểm tra danh sách admin BTC trước migration:

```sql
SELECT m.congress_id, count(*) AS admin_count,
       array_agg(m.user_id ORDER BY m.user_id) AS admin_user_ids
FROM public.congress_members m
WHERE m.role = 'admin'
GROUP BY m.congress_id
HAVING count(*) > 1;
```

Nếu có kết quả, đối soát từng tài khoản và quyết định tài khoản nào là quản trị chính; chuyển các tài khoản phụ sang `checkin`/`secretary` bằng quy trình có kiểm soát, **không xóa lịch sử hoặc Auth user**. Migration V65 chủ động **dừng toàn bộ giao dịch** khi một Đại hội có nhiều tài khoản admin hoặc admin không có BTC account hợp lệ; không âm thầm xử lý dữ liệu thực.

Sau khi sao lưu/đối soát, chạy nguyên tệp `supabase/upgrade-btc-primary-account-v65.sql` bằng SQL Editor của **đúng** dự án. V65 backfill tài khoản admin hiện có, tạo unique index và trigger bảo vệ tài khoản chính khỏi giáng quyền/khóa qua API. Bảng `btc_accounts` đã là bảng V45 có RLS, thao tác ghi chỉ server service-role.

Kiểm tra lại:

```sql
SELECT c.id, c.name,
       COUNT(b.user_id) FILTER (WHERE b.is_primary) AS primary_accounts
FROM public.congresses c
LEFT JOIN public.btc_accounts b ON b.congress_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

Kết quả mỗi Đại hội là `0` (Đại hội cũ chưa cấp tài khoản) hoặc `1`. Với trường hợp `0`, super_admin truy cập trang BTC của Đại hội đó để cấp **một tài khoản quản trị chính**. Với `1`, chỉ có thể cấp thêm nhân sự BTC. Kiểm tra `npm run check:production-schema`: cổng schema yêu cầu cột `is_primary`. Sau đó mới deploy ứng dụng Next.js mới trên Vercel.

## Vận hành và bảo mật

- Tạo Đại hội: quản trị hệ thống nhập tên người quản trị chính. Sau khi lưu, hệ thống tạo tài khoản Supabase Auth độc lập và trả về tên đăng nhập/mật khẩu mạnh **một lần**. Nếu cấp tài khoản lỗi, ứng dụng cố gắng rollback Đại hội mới, không chuyển trạng thái sang thành công.
- Quản trị nhân sự: tài khoản BTC chính vào `/congresses/[id]/team`, cấp tài khoản phụ thuộc chính Đại hội, chọn vai trò; tinh chỉnh quyền trong bảng phân quyền. Primary không được giáng quyền, thu hồi hoặc sửa quyền riêng thông qua BTC UI/API.
- Đăng nhập: tất cả vào `/login`, dùng định danh nội bộ/email được cấp và mật khẩu. Backend phân biệt nhóm người dùng qua membership đã xác thực, không qua email hay metadata tự khai.
- Thu hồi: chỉ tài khoản BTC phụ được thu hồi. Hệ thống xóa membership để quyền hoạt động ngừng ngay và cố gắng khóa Supabase Auth; vẫn giữ log lịch sử.
- Khôi phục quản trị chính: dùng cơ chế cấp lại mật khẩu có kiểm soát. Không tạo admin thứ hai để thay thế trong cùng Đại hội; chuyển giao chính thức sẽ cần quy trình chuyển quyền chuyên biệt có audit nếu phát sinh yêu cầu.

## Trạng thái triển khai

Đã kiểm tra migration trên PGlite và chạy build/test trong workspace Windows. SQL **chưa được chạy trên production** bởi tài khoản Supabase đang kết nối không chứa dự án đích, vì vậy không khẳng định chức năng đã hoạt động trên trang live.
