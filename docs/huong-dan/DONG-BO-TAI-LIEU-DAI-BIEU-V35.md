# Đồng bộ tài liệu Google Drive ↔ cổng đại biểu (V35)

Ngày kiểm tra: 10/11/2026.

## Kết quả xác minh dữ liệu thực tế

- Tệp `CV_NGUYENTHANHNHAN.pdf` thuộc Đại hội Hội Sinh viên khoa Công nghệ thông tin đã có bản ghi Supabase và ID Google Drive hợp lệ.
- Trước sửa: trường `documents.delegate_visible = false`. Trang đại biểu dùng truy vấn đúng `congress_id` và `delegate_visible = true`, nên **không hiển thị tài liệu nội bộ** (đây không phải lỗi đồng bộ hay mất file).
- Đã **công bố riêng tệp này** theo yêu cầu: hệ thống ký yêu cầu HMAC qua Apps Script để cấp quyền Google Drive `ANYONE_WITH_LINK/VIEW`; chỉ sau khi nhận thành công mới cập nhật `delegate_visible=true` trong Supabase. Sau đó truy vấn xác minh cờ công bố.
- Tài liệu khác tại Đại hội Đoàn **không bị công bố tự động**. Không đổi quyền người dùng, không chép nội dung tệp vào database.

## Luồng tải lên mới

- Ban Tổ chức có tùy chọn **Công bố ngay cho đại biểu sau khi tải lên**, mặc định **không chọn** vì Google Drive cấp quyền "Người có liên kết được xem" và link có thể chuyển tiếp.
- Nếu bật công bố, API tải tệp lên Google Drive, ghi bản ghi nội bộ trong Supabase, cấp quyền Drive rồi mới đánh dấu `delegate_visible=true`. Nếu Drive từ chối, tệp vẫn lưu nội bộ và UI hiển thị thông báo lỗi công bố cùng hướng dẫn xử lý.
- Nếu cấp quyền Drive thành công nhưng cập nhật DB thất bại, hệ thống thử thu hồi quyền chia sẻ Drive, đồng thời **không** đánh dấu tài liệu đã công bố.
- BTC nhìn thấy thống kê `đã công bố / tổng`, có thể bật công bố từng tài liệu hoặc **công bố những tài liệu còn nội bộ** sau hộp thoại xác nhận rõ phạm vi chia sẻ. Mỗi cập nhật vẫn qua API kiểm tra quyền quản trị Đại hội.
- Cổng đại biểu chỉ liệt kê tài liệu đã công bố thuộc Đại hội đang chọn. Nếu chưa có tài liệu, hiển thị **Chưa có tài liệu được công bố** thay vì thông báo gây hiểu nhầm rằng đang có bộ lọc tìm kiếm.

## Lưu ý bảo mật

**Công bố tài liệu không chỉ cho tài khoản Đại hội:** quyền Google Drive `ANYONE_WITH_LINK/VIEW` cho phép bất kỳ người có đường dẫn mở tệp và chuyển tiếp link. Chỉ công bố tài liệu phù hợp (văn kiện, báo cáo, tài liệu Đại hội được duyệt). Tài liệu riêng tư không nên được công bố. Thu hồi bằng cách tắt công bố trong danh sách quản trị.

Tài liệu sau khi công bố xuất hiện trong cổng đại biểu ngay khi trang được tải lại (trang là `force-dynamic`). Vercel production cần deploy mã mới để thấy điều khiển công bố ngay khi upload và giao diện báo trạng thái nâng cấp.

## Kiểm thử

- `node --test tests/*.test.mjs`
- `npx tsc --noEmit`
- `npx eslint ...`
- `npm run build`
- Xác minh quyền công bố thực tế ở Supabase và Apps Script; không yêu cầu tài khoản đại biểu của người dùng để xem tệp.
