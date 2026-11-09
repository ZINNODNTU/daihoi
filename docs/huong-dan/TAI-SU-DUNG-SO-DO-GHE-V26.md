# V26 — Sơ đồ hội trường dùng lại cho nhiều Đại hội

Ngày cập nhật: 09/11/2026. Phạm vi: dự án local `D:\daihoi`.

## Đã có thể sử dụng trực tiếp, không cần migration

**Tái sử dụng từ một Đại hội khác** dùng cấu trúc sơ đồ ghế đã có:

1. Đăng nhập tài khoản **quản trị viên** ở cả Đại hội A và Đại hội B.
2. Tại Đại hội A → **Sơ đồ hội trường**, tạo/chỉnh một sơ đồ và nhấn **Lưu sơ đồ**.
3. Mở Đại hội B → **Sơ đồ hội trường** → mục **Sao chép từ Đại hội khác**.
4. Chọn sơ đồ đã lưu của Đại hội A; nhấn **Dùng sơ đồ này** và xác nhận.
5. Hệ thống tạo sơ đồ mới với cùng mã ghế hiển thị, tọa độ, sân khấu, hàng/lối đi, khóa ghế và loại ghế (đại biểu/khách mời). **ID sơ đồ, ID các ghế được tạo mới**, không sao chép đại biểu, phân công hoặc check-in.
6. Dùng phân ghế thủ công/Excel riêng tại Đại hội B. Có thể chỉnh sửa B mà không ảnh hưởng A.

Điều kiện bảo mật: API kiểm tra quyền **admin ở cả nguồn và đích**. Chỉ trả về danh sách nguồn mà tài khoản được phép quản trị. Tối đa 500 ghế/sơ đồ. Không có thao tác thay thế/xóa sơ đồ cũ.

## Thư viện mẫu dùng lâu dài (cần kích hoạt một lần)

Mục **Thư viện mẫu sơ đồ ghế** bên dưới cho phép lưu bản sao hình học không phụ thuộc vào nguồn, dùng ngay cả khi Đại hội nguồn không còn. Có hai phạm vi:

- **Cá nhân**: người tạo dùng lại tại mọi Đại hội mình là admin, kể cả khác đơn vị.
- **Theo đơn vị**: mọi admin của các Đại hội thuộc cùng `organization_id` được thấy và áp dụng.

**Kích hoạt trên Supabase**: mở SQL Editor của project `pnxdxdagpeyqarucdphk` và chạy toàn bộ nội dung file `supabase/upgrade-seating-reusable-templates-v26.sql` đúng một lần. Script chỉ tạo bảng `seating_templates`, index, RLS và phân quyền server; **không sửa các sơ đồ, ghế hoặc phân công hiện có**.

Sau khi chạy, xác nhận:

```powershell
node scripts/check-seating-templates-schema.mjs
```

Cần nhận được `seating_layouts: OK`, `seats: OK`, `seating_templates: OK`. Trước khi chạy migration, kiểm tra read-only hiện đang trả `seating_templates: MISSING/ERROR PGRST205`, nên chức năng lưu thư viện nâng cao chưa hoạt động; **sao chép trực tiếp từ Đại hội khác vẫn dùng được ngay**.

## Cơ chế nhất quán và dữ liệu tách biệt

- Mọi lần áp dụng đều đi qua RPC có sẵn `seating_save_layout_v6` với `p_expected_version=0`; Postgres tạo sơ đồ/ghế mới trong một transaction.
- Copy *mã ghế hiển thị* (ví dụ A-01) để giữ đúng bố cục, nhưng **không copy UUID ghế** hoặc bất cứ `seat_assignments`, `checkins`, ảnh hay dữ liệu riêng đại biểu nào.
- Việc sửa/xóa hoặc phân ghế ở Đại hội đích không sửa nguồn và không làm thay đổi các Đại hội đã áp dụng cùng mẫu.
- API xác thực quyền server trước khi gọi Service Role. Truy cập trực tiếp bảng mẫu từ trình duyệt bị chặn bằng RLS và REVOKE.
- Kiểm thử trên tài khoản BTC thật cần xác nhận chọn nguồn/đích và ghế khi vận hành; chưa tự ý thêm ghế hoặc sửa phân công trong dữ liệu production.

## Tệp liên quan

- `src/app/api/seating/reuse/route.ts`: duyệt/copy sơ đồ có sẵn liên Đại hội, không phụ thuộc migration.
- `src/app/api/seating/templates/route.ts`: lưu/lấy/áp dụng mẫu thư viện (cần migration V26).
- `src/lib/seating-templates.ts`: snapshot chỉ hình học, tái tạo UUID mới và kiểm tra ghế.
- `src/components/seating-client.tsx`: giao diện quản trị sơ đồ với hai luồng.
- `tests/seating-reusable-templates-v26.test.mjs`, `tests/seating-templates-api-v26.test.mjs`, `tests/seating-reuse-cross-congress-v26.test.mjs`: kiểm thử hồi quy.

**Trạng thái:** mã nguồn local. Chưa commit/push GitHub, chưa triển khai Vercel; migration thư viện chưa áp dụng vào Supabase thật.
