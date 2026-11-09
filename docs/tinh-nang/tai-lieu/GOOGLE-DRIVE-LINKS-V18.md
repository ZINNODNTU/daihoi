# Tài liệu Đại hội V18 — Google Drive chỉ lưu file và link

## Trải nghiệm đơn giản
- **BTC**: mở `/congresses/<id>/documents` → chọn nhiều file → website đưa lên Google Drive → Supabase lưu **tên, loại, ID file, thuộc Đại hội, trạng thái công bố**.
- **Đại biểu**: mở `/my-card/documents` → xem **số lượng, icon và tên file** → chạm tên file → Google Drive mở ở tab mới. **Không tải dữ liệu file qua API của website.**
- Không dùng Supabase Storage để chứa bản sao. Không đồng bộ toàn bộ file Google Drive vào website liên tục; chỉ file được BTC upload qua hệ thống mới xuất hiện.
- Người xem nhiều (200 đại biểu) chỉ tải danh sách nhỏ từ Supabase. Tệp thật được Google Drive phục vụ trực tiếp khi người dùng bấm link.

## Cách 1 — Google Apps Script (khuyến nghị, cấu hình một lần)

1. Đăng nhập **đúng tài khoản Google sở hữu hoặc có quyền chỉnh sửa thư mục Drive gốc**. Mở [Google Apps Script](https://script.google.com) và tạo dự án mới.
2. Sao chép toàn bộ `scripts/google-drive-bridge/Code.gs` vào tệp Code.gs của dự án. Lưu lại.
3. Mở **Project Settings → Script properties**, tạo:
   - `ROOT_FOLDER_ID`: ID thư mục Drive gốc, ví dụ thư mục `DAI_HOI_SO`.
   - `BRIDGE_SECRET`: khóa ngẫu nhiên tối thiểu 32 ký tự; tạo trên máy riêng, ví dụ `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
4. Chọn **Deploy → New deployment → Web app**, `Execute as: Me`. `Who has access: Anyone` nếu chính sách Google Workspace cho phép. Xác nhận cấp quyền Drive một lần. Sao chép URL `https://script.google.com/macros/s/.../exec`.
5. Trên máy chủ Next.js (Vercel Settings → Environment Variables hoặc `.env.local`) khai báo:
   ```dotenv
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   GOOGLE_APPS_SCRIPT_SECRET=THE_SAME_BRIDGE_SECRET_FROM_SCRIPT_PROPERTIES
   ```
6. Redeploy Vercel / khởi động lại máy local. Admin → **Tài liệu Đại hội → Kho lưu trữ Google Drive → Kiểm tra lại** phải báo **Sẵn sàng**. Thử upload PDF nhỏ, bật **Công bố tài liệu cho đại biểu**, đăng nhập đại biểu và bấm mở link.

Không cần `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` hoặc `GOOGLE_REFRESH_TOKEN` ở phương án này. Website **tự chọn Apps Script khi phát hiện cấu hình URL/SECRET**. Nếu không có, hệ thống vẫn hỗ trợ OAuth Drive API dự phòng (xem [hướng dẫn OAuth V17 — tài liệu lịch sử](../../lich-su/tai-lieu/GOOGLE-DRIVE-V17.md)).

**Bảo mật:** Web App có URL công khai nhưng mã nguồn Script xác minh **HMAC-SHA256** trên toàn bộ payload, timestamp 5 phút và nonce chống phát lại. Khóa chỉ nằm trong Script Properties và môi trường server, **không nằm trong browser, không commit lên GitHub**. Mọi API upload/chia sẻ ở website kiểm tra **quyền admin Đại hội** trước khi gọi Script. Script cũng giới hạn file theo đúng thư mục `DAI_HOI_<congressId>` thuộc thư mục gốc để không thao tác file Drive bên ngoài Đại hội.

## Quy tắc công bố tài liệu

Tệp mới upload ban đầu **không công bố**. Admin bật `Công bố tài liệu cho đại biểu` để:
1. Google Drive cấp quyền **Người có đường liên kết → Người xem** cho tệp.
2. Supabase ghi `delegate_visible=true`.
3. Đại biểu thấy icon + tên và link mở file ngay trên Google Drive.

Khi tắt công bố, hệ thống thu hồi quyền xem qua link trên Google Drive rồi ẩn tài liệu khỏi cổng đại biểu. Nếu đổi quyền Google Drive không thành công, website không đánh dấu tài liệu là đã công bố. Nếu cập nhật DB thất bại, API cố gắng hoàn tác quyền chia sẻ trên Drive.

**Lưu ý riêng tư quan trọng:** Quyền `Anyone with the link` nghĩa là **bất kỳ người nào có được liên kết** đều có thể xem (ngay cả người không đăng nhập Đại hội số). Vì vậy chỉ bật cho tài liệu được phép chia sẻ, không dùng cho dữ liệu cá nhân/mật. Các tổ chức Google Workspace có thể chặn chia sẻ công khai; khi đó upload vẫn được nhưng bật công bố sẽ báo lỗi. Cần cân nhắc dùng chia sẻ theo miền Google Workspace hoặc nhóm Google thay thế nếu tài liệu nhạy cảm.

## Tệp cũ và migration

- Bảng `documents` giữ nguyên schema, không phải tạo cột link. URL Google Drive được tạo từ `drive_file_id`: `https://drive.google.com/file/d/<id>/view`.
- Các bản ghi `delegate_visible` cần `supabase/upgrade-delegate-resources-v14.sql` nếu chưa chạy.
- Tệp cũ đã được đánh dấu `delegate_visible=true` nhưng chưa được cấp quyền Drive cần được BTC **tắt rồi bật công bố lại một lần** để đồng bộ quyền.
- App Script chỉ sửa được file trong thư mục `DAI_HOI_<congressId>` dưới root đã cấu hình. Tài liệu cũ lưu qua tài khoản Google khác hoặc nằm trong thư mục khác có thể cần chuyển thư mục/chuyển quyền trước khi thao tác.
- Vercel Functions vẫn giới hạn request của BTC khi **upload**: tối đa 4 MiB/tệp trong code hiện tại; không áp dụng khi đại biểu xem file trên Google Drive.

## Kiểm thử phân quyền

1. Tài khoản Admin tải file PDF qua website, xác nhận có file trong `DAI_HOI_<congressId>` của Drive.
2. Chưa bật công bố → cổng đại biểu không thấy file.
3. Bật công bố → cổng đại biểu hiện tên/icon; bấm link mở trang Drive trong tab mới và xem được **bằng trình duyệt ẩn danh** (xác minh chia sẻ link).
4. Tắt công bố → cổng đại biểu không hiện file; ẩn danh không thể truy cập lại file đã thu hồi.
5. Tài khoản đại biểu/khách mời không có quyền gọi API upload/công bố.
6. 200 người chỉ truy cập danh sách file sẽ không gây 200 request Google Drive; chỉ khi bấm mở file trình duyệt mới truy cập Google.

**Trạng thái triển khai:** Mã nguồn chuẩn bị cho cả Apps Script và OAuth đã sẵn. Cần Web App Apps Script được triển khai thành công, lưu URL + khóa trên server và kiểm tra upload thực tế trước khi tuyên bố kết nối đã hoạt động.
