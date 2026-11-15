# V85 — Chuẩn hóa tiêu đề Đại hội Đoàn/Hội trên biểu mẫu và thẻ đại biểu

## Quy ước

| Loại Đại hội | Tiêu đề cố định | Trường BTC nhập |
| --- | --- | --- |
| Đoàn TNCS Hồ Chí Minh | **Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh** | Ví dụ **Khoa Công nghệ thông tin**, **Chi đoàn 23DTH1** |
| Hội Sinh viên Việt Nam | **Đại hội Đại biểu Hội Sinh viên Việt Nam** | Ví dụ **Khoa Công nghệ thông tin** |

Trên **thẻ đại biểu điện tử và bản in**, hai dòng tách rời:

1. Dòng trên là **tiêu đề cố định**, tự động lấy theo loại Đại hội (không thay đổi theo nội dung người dùng nhập).
2. Dòng dưới là **tên riêng Đại hội** do BTC nhập; bên dưới vẫn có nhiệm kỳ như trước.

Ví dụ thẻ Đoàn:
- Dòng trên: *Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh*
- Dòng dưới: *Khoa Công nghệ thông tin*
- Tiếp theo: *Nhiệm kỳ 2026–2027*

## Thay đổi biểu mẫu và lưu trữ

- **Admin → Tạo Đại hội mới**: chọn loại Đại hội, xem trước tiêu đề cố định và nhập duy nhất phần tên Khoa/Chi đoàn/đơn vị. Không cần nhập lại cụm từ “Đại hội Đại biểu...”.
- **Quản lý Đại hội → Cấu hình Đại hội**: loại Đại hội không thay đổi; ô Tên Đại hội chỉ hiện phần riêng, không lặp tiêu đề.
- **CSDL `congresses.name` vẫn lưu tên đầy đủ** (tiêu đề cố định + tên riêng) để giữ tương thích với các trang quản lý, tài liệu, mã QR, phiên điểm danh, thống kê và màn hình đại biểu đang sử dụng `congress.name`. Không thay schema.
- Hàm `congressShortName` tách các tiêu đề đã có của Đại hội cũ, chẳng hạn “Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh khoa Công nghệ thông tin”, tránh hiển thị trùng. Không tự cập nhật hàng loạt bản ghi cũ.
- API tạo/sửa đều dùng `congressFullName` để không nhân đôi tiền tố dù trình duyệt cũ vẫn gửi tên đầy đủ.
- Ảnh, chức vụ, barcode, ghế, quyền truy cập, dữ liệu BCH và điểm danh không thay đổi.

## Kiểm tra

1. Tạo thử Đại hội Đoàn với `Khoa Công nghệ thông tin`, kiểm tra tên trong Dashboard và hai dòng trên thẻ điện tử.
2. Tạo thử Đại hội Hội Sinh viên với cùng tên, kiểm tra dòng tiêu đề Hội Sinh viên và logo Hội vẫn đúng.
3. Mở cấu hình một Đại hội cũ đã lưu cả tên dài, xem phần tên riêng và lưu; không được lặp tiền tố.
4. Kiểm tra `/print/delegate/[id]` giữ hai dòng như thẻ online.
5. Chạy `node --test tests/congress-formal-title-v85.test.mjs` và bộ test/build toàn dự án.

**Không cần migration Supabase** cho quy tắc tiêu đề.
