# Đại hội số v14 — thẻ ID, tài khoản, tài liệu và trích ngang BCH

## Nghiên cứu thiết kế thẻ ID
Tham khảo cấu trúc dữ liệu/ảnh/vị trí trong các repo và mẫu ID mở:
- https://github.com/ankitDeveloperx/IDCard-Generator — ID cá nhân, ảnh và các trường định danh.
- https://github.com/lesprgm/ID-Card-Generator — mẫu thẻ trước/sau và in ấn.
- https://movin.design/components/cards/id-badge/ — bố cục badge nhỏ gọn.

Không sao chép trực tiếp mã hoặc nhận diện của các repository. Triển khai thiết kế riêng `premium-delegate-id`: huy hiệu Đoàn, navy/xanh dương/vàng đồng bộ palette trang chủ, dải bảo mật, khe dây đeo, họa tiết watermark/hologram trang trí, ảnh 3:4, họ tên, đơn vị, mã ghế, **chỉ mã vạch CODE128**. Duy trì in thẻ và giảm chuyển động cho `prefers-reduced-motion`.

## Phân hệ admin/BTC
Vào `/congresses/[id]/delegates`, có 2 tab riêng:
- **Quản lý đại biểu**: hồ sơ, ảnh, nhập Excel/CSV, barcode.
- **Quản lý tài khoản đại biểu**: `/congresses/[id]/delegates/accounts`, chỉ dành cho quản trị Đại hội (`admin`/super_admin, không cho delegate, guest, checkin). Xem tài khoản đã cấp/chưa cấp, chọn tối đa 100 hồ sơ mỗi lần, cấp tài khoản, tải danh sách **Excel .xlsx**, đổi hoặc reset mật khẩu từng đại biểu.
- Mật khẩu hiện tại **không thể đọc lại từ Supabase Auth** và không nằm trong file xuất tổng. Chỉ các **mật khẩu mới tạo/reset** được trả một lần ngay sau thao tác và xuất vào file Excel riêng. Không ghi chúng vào DB/audit/log hoặc `localStorage`. BTC cần truyền bí mật riêng cho từng đại biểu và bảo vệ/hủy tệp sau khi cấp.
- Đổi/reset mật khẩu là hành động nhạy cảm: API kiểm tra `hasRole(admin)`, `congressId`, `delegateId`, tài khoản liên kết, từ chối reset tài khoản có quyền BTC/quản trị ở bất kỳ Đại hội, ghi audit không chứa password; mật khẩu tự sinh bằng CSPRNG `randomBytes`. Đại biểu tự đổi mật khẩu trong `/account` bằng mật khẩu hiện tại.
- API `POST /api/delegates/accounts/reset`, `POST /api/delegates/accounts` (có sẵn từ v11). Không có tính năng xem mật khẩu cũ.

## Cổng đại biểu — tài liệu Đại hội
`/my-card/documents` hiển thị danh sách PDF/hình ảnh/Word/Excel được BTC **công bố rõ ràng**. Đại biểu có thể xem PDF/ảnh ngay trong trình duyệt hoặc tải tệp. Tài liệu lưu trong Google Drive đã cấu hình, API tải tệp sử dụng `getDriveToken` trên server và kiểm tra user có thuộc Đại hội, chính sách `delegate_visible`.

**BẮT BUỘC chạy SQL migration `supabase/upgrade-delegate-resources-v14.sql`** trước khi sử dụng nút công bố tài liệu. Cột `documents.delegate_visible` mặc định **false** để bảo vệ tài liệu nội bộ. Admin vào `/congresses/[id]/documents`, bật công bố theo từng tài liệu. Trước khi chạy migration, chức năng công bố sẽ báo lỗi; tài liệu nội bộ của admin vẫn tải được.

## Cổng đại biểu — trích ngang nhân sự BCH
`/my-card/bch` là bộ thẻ **dọc** có ảnh nhân sự, họ tên, chức vụ, năm sinh, quê quán, dân tộc, trình độ, năm vào Đoàn, tên Đại hội. Vuốt ngang (native touch + scroll snap), bấm nút Trước/Sau, chấm điều hướng hoặc phím ←/→ để duyệt hồ sơ. Dữ liệu chỉ được phục vụ cho đại biểu có hồ sơ đang hoạt động trong Đại hội; API ảnh riêng tư kiểm tra quyền tương tự. **Hiện tại tất cả hồ sơ BCH được BTC tạo đều hiển thị cho đại biểu thuộc Đại hội**; không nhập danh sách chưa đủ điều kiện công bố nếu chưa muốn đại biểu xem.

## Thiết kế thống nhất
Cổng đại biểu, thẻ ID và trang điều hành cùng dùng navy `#17263f`, xanh `#007fae`, vàng nhấn `#dfb86b`, nền `#f4f7fb`. Điện thoại có 6 tab: Thẻ, Quét QR, Ghế, Tài liệu, BCH, Lịch sử; Tài khoản đặt ở header để không chật thanh dưới.

## Trạng thái
Đã chạy build TypeScript, lint, tests. Để đưa lên production, cần áp dụng migration v14 (và v11 nếu chưa áp dụng), xác nhận API kết nối đúng Supabase/Drive, kiểm tra quyền bằng tài khoản BTC và đại biểu trên điện thoại, đo hiệu suất ảnh và kiểm tra tệp Excel sau khi tải. Không đưa bản local chưa kiểm thử thực tế vào vận hành thật.
