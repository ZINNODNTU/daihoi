# Kết nối lưu trữ tài liệu Đại hội với Google Drive (V17)

> **Tài liệu lịch sử** — Ghi lại một phiên bản/thời điểm cũ; thông tin cấu hình, giao diện và trạng thái triển khai có thể đã thay đổi. Ưu tiên [mục lục hiện hành](../../README.md).

## 1. Mô hình lưu trữ

- **Tệp thật (PDF/Word/Excel/PowerPoint/ảnh)** được lưu trên Google Drive của tài khoản quản trị lưu trữ.
- **Supabase** chỉ lưu tên tệp, MIME, kích thước, mã Google Drive và quyền chia sẻ cho đại biểu.
- Mỗi Đại hội dùng một thư mục con `DAI_HOI_<congressId>` bên trong thư mục gốc. Server tạo thư mục tự động và ghi `congresses.drive_folder_id` để lần sau tái sử dụng.
- Upload và tải xuống đi qua Next.js API server, **không cấp quyền công khai Google Drive**, không đưa Refresh Token ra trình duyệt.
- Chỉ **admin Đại hội** được tải tệp/công bố; BTC có quyền xem được tải tài liệu, đại biểu chỉ được xem tài liệu đánh dấu `delegate_visible=true`.

## 2. Chuẩn bị tài khoản Google Drive

1. Dùng một tài khoản Google **dành riêng cho kho lưu trữ Đại hội**, hoặc tài khoản Google Workspace được tổ chức cấp quyền, tránh dùng tài khoản riêng của cá nhân để giảm rủi ro.
2. Vào [Google Cloud Console](https://console.cloud.google.com/), tạo hoặc chọn Google Cloud Project.
3. **APIs & Services → Library → Google Drive API → Enable**.
4. Cấu hình **Google Auth Platform / OAuth consent screen** (tên ứng dụng, đối tượng sử dụng, tài khoản kiểm thử nếu đang Testing).
5. Tạo **OAuth Client ID** phù hợp với luồng lấy Refresh Token. Có thể sử dụng OAuth Playground với tùy chọn **Use your own OAuth credentials**, và điền Client ID/Client Secret của chính project. Dùng quyền Drive cần thiết: `https://www.googleapis.com/auth/drive`. Đây là phạm vi nhạy cảm/rộng; nên dùng tài khoản Drive dành riêng và cân nhắc quy trình xác minh Google khi công bố ứng dụng.
6. Truy cập [Google OAuth Playground](https://developers.google.com/oauthplayground/): cấu hình OAuth Client của bạn → cấp quyền `https://www.googleapis.com/auth/drive` bằng đúng tài khoản Google lưu trữ → **Exchange authorization code for tokens** → lấy **Refresh Token**. Không dùng Refresh Token của ứng dụng OAuth client khác.
7. Trong Google Drive, tạo thư mục gốc riêng (ví dụ `DAI_HOI_SO`), sao chép **Folder ID** từ đường dẫn `https://drive.google.com/drive/folders/<ID>`. Đảm bảo tài khoản ở bước 6 có quyền tạo tệp/thư mục con trong đây.

**Lưu ý đặc biệt về thời hạn token:** Nếu Google OAuth consent screen thuộc nhóm *External* và có trạng thái **Testing**, refresh token có thể hết hạn sau **7 ngày**. Trước khi vận hành chính thức, cần chuyển tình trạng xuất bản phù hợp theo yêu cầu Google, hoặc dự kiến gia hạn quyền định kỳ. Nếu hệ thống báo `oauth_expired`/invalid_grant, cấp lại Refresh Token.

Tài liệu tham khảo Google: [Drive API upload](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [OAuth web server](https://developers.google.com/identity/protocols/oauth2/web-server).

## 3. Cấu hình môi trường — bắt buộc

Điền **trên máy chạy website** trong `.env.local` (không được commit) và trong **Vercel → Project → Settings → Environment Variables** (Production và Preview nếu cần):

```dotenv
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_DRIVE_ROOT_FOLDER_ID=your-drive-folder-id
```

**Không** thêm `NEXT_PUBLIC_` vào các biến trên; không đưa giá trị thật lên GitHub, ảnh chụp màn hình hoặc cuộc trò chuyện. Sau khi cập nhật Vercel env cần **Redeploy** để các phiên bản triển khai mới nhận biến. Trên local cần **khởi động lại Next.js dev server**.

## 4. Nghiệm thu qua giao diện admin

1. Đăng nhập bằng tài khoản **Admin của Đại hội**.
2. Mở `/congresses/<id>/documents`.
3. Kiểm tra thẻ **Kho lưu trữ Google Drive**:
   - **Sẵn sàng**: OAuth hoạt động, thư mục gốc truy cập được và tài khoản có quyền thêm tệp.
   - **Chưa kết nối**: xem cấu hình còn thiếu (chỉ Admin được thấy) hoặc thông báo về token/quyền.
   - Nhấn **Kiểm tra lại** sau khi đã cập nhật cấu hình.
4. Nhấn vùng tải tệp, chọn một hoặc nhiều tệp PDF/JPG/PNG/WebP/DOC/DOCX/XLS/XLSX/PPT/PPTX. Giới hạn **4 MiB/tệp** vì Vercel Function request payload và Google multipart. Tệp lớn hơn cần giải pháp resumable upload (chưa hỗ trợ).
5. Tải lại trang và xác nhận tài liệu xuất hiện trong **Thư viện tài liệu**. Bấm **Tải về** để đối chiếu nội dung gốc.
6. Đánh dấu **Công bố tài liệu cho đại biểu** cho tệp được phép công khai nội bộ, thử đăng nhập bằng tài khoản đại biểu xem ở `/my-card/documents`.

## 5. Chẩn đoán và bảo mật

| Biểu hiện | Giải pháp |
| --- | --- |
| Thiếu `GOOGLE_...` | Thêm đủ 4 biến trên server, restart/redeploy |
| `oauth_expired` hoặc `invalid_grant` | Làm lại OAuth cấp quyền bằng đúng tài khoản lưu trữ |
| `permission_denied` hoặc `folder_read_only` | Kiểm tra chủ sở hữu, quyền tạo thư mục, scope Drive |
| `not_found` | Kiểm tra Google Drive Folder ID, có bị chuyển/xóa không |
| `drive uploaded but database failed` | Chạy migrations cho bảng `documents`, kiểm tra Supabase. API tự cố gắng xóa tệp Google Drive để tránh tệp mồ côi |
| Không công bố được | Cần chạy `supabase/upgrade-delegate-resources-v14.sql` để thêm `delegate_visible` |
| File lớn hơn 4 MiB | Giảm dung lượng hoặc yêu cầu triển khai resumable upload riêng |

Cấu hình chỉ phía server, API xác thực quyền trước khi thao tác, không mở `Anyone with the link` trên Drive. Dữ liệu hiển thị đại biểu chỉ lấy qua API có quyền.

## 6. Trạng thái thực tế trong mã nguồn

Mã nguồn V17 đã có quản lý thư mục, upload multipart, đọc file từ Drive, kiểm tra file signature, xử lý lỗi OAuth, tình trạng kết nối, upload nhiều tệp và chống để lại tệp mồ côi khi Supabase lỗi.

**Máy local hiện vẫn thiếu bốn biến `GOOGLE_...`**, vì vậy chưa thể thử upload thật với Google Drive hoặc tuyên bố rằng Vercel đã kết nối. Đưa mã nguồn lên GitHub **không tự tạo** OAuth và không cấu hình Vercel.
