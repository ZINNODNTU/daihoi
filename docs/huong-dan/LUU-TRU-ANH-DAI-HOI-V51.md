# Chuẩn hóa lưu trữ ảnh đại biểu và BCH — V51

## Kiến trúc đang sử dụng

- **Kho lưu trữ:** bucket Supabase Storage `delegate-photos`, **private**, chỉ cho phép `image/jpeg`, tối đa 2 MiB mỗi ảnh. Không phát URL Storage trực tiếp cho trình duyệt.
- **Nguồn dữ liệu:** PostgreSQL trong Supabase, `delegates.photo_path` và `bch_candidates.photo_path`. Hệ thống không lưu ảnh nhị phân trong Postgres.
- **Định danh đường dẫn cố định (không trùng tên):**
  - Ảnh một đại biểu: `<congress-uuid>/<delegate-uuid>.jpg`.
  - Ảnh tài khoản liên thông nhiều Đại hội: `people/<auth-user-uuid>.jpg`.
  - Ảnh ứng viên BCH: `<congress-uuid>/bch/<candidate-uuid>.jpg`.
- **Tương thích:** giữ nguyên định dạng khóa đang tồn tại, đặc biệt constraint `bch_candidates_photo_path_expected_check`; **không cần migration SQL**.
- **Chỉnh ảnh:** browser crop 600 × 800, có thể tách nền bằng MediaPipe trên thiết bị; API kiểm tra MIME, kích thước và tái mã hóa JPEG `sharp` quality 78, loại EXIF, không lưu ảnh tải lên gốc.
- **Chống trùng:** server so sánh byte JPEG chuẩn hóa với ảnh đã có trước khi ghi. Upload cùng ảnh không thay đổi tệp; mỗi hồ sơ dùng một khóa duy nhất. Ghế, phiên và QR không chịu ảnh hưởng.
- **Ảnh thu nhỏ:** kích thước 96 và 160 px được sinh khi đọc, **không tạo thêm tệp trên Supabase**. Trình duyệt nhận ảnh qua API riêng có xác thực.
- **Cache:** `private, no-store` ở HTTP; `cacheControl: 0` cho khóa Storage có thể bị ghi đè để giảm nguy cơ ảnh cũ trên CDN; cache RAM tối đa 16 MiB/160 entry, hết hạn sau 10 giây; có single-flight và invalidation chống cache cũ khi cùng máy chủ thay ảnh.
- **Phân quyền:** GET/PUT kiểm tra Auth và vai trò theo Đại hội; đại biểu chỉ sửa ảnh của chính mình; BTC quản lý BCH theo quyền `admin`; thư ký cần tài khoản BTC hợp lệ. Không tin khóa ảnh do client nhập.

## Vòng đời thay ảnh

1. Kiểm tra cookie, Origin, quyền tài khoản và kích thước multipart.
2. Validate JPEG rồi mã hóa lại bằng Sharp, tính SHA-256 để phục vụ đối chiếu và chẩn đoán.
3. Dùng khóa ảnh do máy chủ suy ra từ UUID, **không chấp nhận tên file tùy ý**.
4. Nếu byte trùng ảnh đã có, không tải lên lại. Nếu khác, ghi đè đúng khóa hiện tại (không nhân bản).
5. Chỉ liên kết `photo_path` sau khi Storage lưu thành công. Nếu DB liên kết thất bại ở lần tạo mới, kiểm tra tham chiếu và dọn tệp chưa sử dụng. Với ảnh chính đã tồn tại, không tự xóa ảnh cũ khi có lỗi DB.
6. Hủy cache ảnh thuộc process hiện tại, dọn các `-96/-160.jpg` từ phiên bản cũ nếu còn, không xóa bản gốc đang được dùng.

**Giới hạn cần biết:** Vì khóa file được giữ cố định để tương thích schema, các upload đồng thời từ **hai Vercel instances** vẫn có cơ chế last-write-wins. Khóa theo path ở server bảo vệ thao tác đồng thời **trong cùng một instance**. Muốn snapshot/rollback đa phiên bản chính thức cần thiết kế mới với object bất biến và migration mở rộng ràng buộc DB.

## Kiểm tra vận hành Production

Chạy trên máy được cấp `SUPABASE_SECRET_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY` dành riêng server:

```bash
npm run audit:photos
```

Lệnh chỉ đọc danh sách object và đối chiếu **hai bảng** `delegates` / `bch_candidates`; không tải nội dung ảnh, không in tên/UUID cá nhân.

Các chỉ số quan trọng:

- `primaryPhotos`, `generatedThumbnails`, `megabytes`: tổng dung lượng và số lượng.
- `referencedPhotoPaths`, `referencedButMissingPrimary`: liên kết hợp lệ và lỗi mất ảnh phải xử lý.
- `unreferencedPrimaryCandidates`, `oldUnreferencedPrimaryCandidates`: ảnh chính không còn tham chiếu, trong đó bản cũ hơn 30 ngày.
- `unexpectedStorageKeys`: file không đúng quy ước, cần kiểm tra thủ công.
- `safeRedundantThumbnails`: ảnh nhỏ có thể tạo lại, an toàn để xóa.

Chỉ khi xác minh bản API không còn sử dụng các tệp thu nhỏ có thể chạy:

```bash
node scripts/audit-photo-storage.mjs --remove-derived
```

**Không tự động xóa ảnh chính chưa có tham chiếu.** Cần sao lưu, kiểm tra tuổi file và mục đích sử dụng trước khi dọn thủ công. Không dùng SQL `DELETE FROM storage.objects` để xóa bytes; phải qua Storage API.

## Kiểm thử

```bash
node --test tests/portrait-media-v51.test.mjs tests/portrait-storage-v50.test.mjs
node --test tests/*.test.mjs
npm run lint
npm run build
```

## Nguồn chính thức

- Supabase Storage Standard Uploads: https://supabase.com/docs/guides/storage/uploads/standard-uploads
- Supabase Storage security: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Image Transformations: https://supabase.com/docs/guides/storage/serving/image-transformations — resizing của Supabase yêu cầu gói Pro, vì vậy V51 xử lý bằng Sharp trên Next.js.
- Supabase Storage quota/size: https://supabase.com/docs/guides/platform/manage-your-usage/storage-size
