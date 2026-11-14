# V73 — Thư viện ảnh tập trung và thanh bên Admin thống nhất

## Phạm vi thực tế

Trước V73, bucket private `delegate-photos` lưu ảnh dạng `<congress-id>/<delegate-id>.jpg`, `<congress-id>/bch/<candidate-id>.jpg` và `people/<auth-user-id>.jpg`. Các tên UUID khiến cây Storage khó quan sát, nhưng đó là các **khóa logic đã lưu trong database** và BCH có ràng buộc CHECK SQL nên không được đổi `photo_path` trực tiếp.

V73 giữ nguyên **một bucket private**, không tạo nhiều bucket, không tạo ảnh thumbnail 96/160 trùng, giữ ảnh gốc JPEG 600×800. Chỉ thay đổi **đường dẫn vật lý trong Storage** thành:

```text
delegate-photos/
  media/
    congresses/
      <congress-id>/
        delegates/
          <delegate-id>.jpg
        bch/
          <candidate-id>.jpg
    people/
      <auth-user-id>.jpg
```

Database `photo_path` **vẫn giữ dạng cũ**. Server `portraitStoragePath(logicalPath)` chuyển sang đường dẫn Storage vật lý; khi tải ảnh, server thử đường dẫn mới trước, rồi fallback sang đường dẫn cũ. Không có việc sửa/check constraint, không làm mất ảnh đã liên kết qua nhiều Đại hội.

## Di chuyển an toàn

Mã dùng `Supabase Storage API`, không sửa/xóa `storage.objects` bằng SQL. Với mỗi ảnh được tham chiếu bởi `delegates.photo_path` hoặc `bch_candidates.photo_path`, công cụ chỉ sao chép tới tên mới và **đọc lại xác minh SHA-256**. Không ghi đè nếu nội dung nguồn và đích xung đột. Các ảnh không còn hồ sơ tham chiếu **không tự ý xóa**.

Chạy trong đúng dự án `pnxdxdagpeyqarucdphk`, dùng service key server-only của dự án:

```powershell
node scripts/audit-photo-storage.mjs
node scripts/organize-photo-storage.mjs
node scripts/organize-photo-storage.mjs --apply
# Chỉ khi phiên bản code mới đã deploy và xác minh API ảnh đọc từ media:
node scripts/organize-photo-storage.mjs --apply --cleanup-legacy
node scripts/audit-photo-storage.mjs
# File không còn tham chiếu được lưu vào khu vực lưu trữ dự phòng, không xóa dữ liệu:
node scripts/archive-unreferenced-photos.mjs
node scripts/archive-unreferenced-photos.mjs --apply
```

`--apply` **chỉ sao chép và kiểm tra**; `--cleanup-legacy` chỉ xóa file cũ khi file mới có cùng SHA-256 và đã kiểm chứng, không xóa ảnh không có hồ sơ. Kiểm tra sau cập nhật bằng ảnh đại biểu và BCH, ảnh dùng chung giữa các Đại hội, cùng các chiều rộng 96/160/600. Nếu cần quay lại code cũ, **giữ bản cũ** cho đến khi triển khai thành công. Mục quản lý ảnh trên web không cho xóa trực tiếp dữ liệu Storage.

## Trang quản trị ảnh

Super Admin có mục **Thư viện ảnh Đại hội** tại `/dashboard/media`, trong cùng `AppShell` với Admin, RBAC, Nhật ký hệ thống và các phân hệ Đại hội. Có thể chọn Đại hội, tìm theo tên/đơn vị, lọc Đại biểu/BCH/chưa có ảnh, xem số liệu liên kết và thumbnail thông qua API có kiểm tra quyền. “Đã liên kết ảnh” dựa vào `photo_path` trong hồ sơ, không phải chứng nhận object đã tồn tại; kiểm tra đối chiếu thực tế bằng công cụ audit.

## Thanh bên Admin

- Trang Dashboard Admin, Nhật ký, RBAC và Thư viện đều có **cùng thanh bên điều hành**. Trang hệ thống vẫn mang Đại hội đang được chọn từ URL, hoặc tự gợi ý một Đại hội đang diễn ra (fallback Đại hội mới nhất).
- Không dùng thanh bên chỉ gồm Tổng quan/RBAC/Nhật ký riêng cho hệ thống khi đang có Đại hội. Các liên kết được tạo từ `AppShell`, không nhân đôi menu hoặc bỏ qua RBAC.
- Với BTC, danh sách Đại hội và danh mục tính theo quyền hiệu lực `effectiveAbilities` của tài khoản, không chỉ theo nhãn vai trò; không vô tình hiện menu không được cấp.
- Mục `Thư viện ảnh Đại hội` chỉ dành cho Super Admin, không cấp thêm Storage permissions cho trình duyệt.

## Xác minh V73

- TypeScript, ESLint, Next.js production build và kiểm thử tất cả; kiểm thử chống path traversal, giữ tương thích khóa cũ, đọc ảnh fallback, di chuyển copy-verify, menu Admin và bảo vệ Super Admin.
- Đã kiểm tra trạng thái trước migrate tại đúng project: 5 khóa ảnh đang được 7 liên kết hồ sơ tham chiếu; 1 object không có hồ sơ tham chiếu, giữ lại để kiểm tra. Không có thumbnail bản sao.
- Sau khi deploy nên mở RBAC và Nhật ký từ Admin, kiểm tra menu đầy đủ và chọn Đại hội; vào Thư viện ảnh để xem danh mục và ảnh; cuối cùng kiểm tra ảnh trên trang đại biểu.
