# Giao diện hiện hành — nhận diện và thiết kế đáp ứng

> **Tài liệu hiện hành (09/11/2026).** Định hướng tổng thể dựa trên mã nguồn giao diện, không thay thế kiểm thử trình duyệt và thiết bị thật. Bản thuyết minh UI V2/V3 ban đầu nằm trong [lịch sử thiết kế](../lich-su/README.md).

## Nguyên tắc nhận diện

- Hệ thống phục vụ **Đại hội Đoàn/Hội**; sử dụng huy hiệu Đoàn làm nhận diện ở trang chủ, đăng nhập, thẻ đại biểu và màn hình trình chiếu.
- Các phần giao diện quản trị dùng cấu trúc phân cấp rõ, khoảng trắng hợp lý, màu xanh navy/xanh thương hiệu kết hợp vàng nhấn. Không đặt quá nhiều chức năng và thông tin trên cùng một thẻ.
- Trang đại biểu hướng **mobile-first**, nhất quán màu và font với giao diện chính, nút có vùng chạm đủ rộng và không che nội dung bởi thanh điều hướng dưới.
- Thẻ đại biểu giống thẻ ID thật: chân dung 3:4, họ tên/đơn vị/vị trí phù hợp, barcode và trạng thái; chức năng điểm danh, chỗ ngồi, tài liệu nằm ở trang/tab riêng.

## Các giao diện trọng tâm

| Khu vực | Nguyên tắc |
| --- | --- |
| Trang chủ và đăng nhập | Nhận diện chính thống, giới thiệu ngắn, CTA rõ ràng |
| Dashboard/BTC | Tổng quan Đại hội, điều hướng nghiệp vụ, quản trị phân quyền |
| Thẻ đại biểu | Đọc được toàn bộ trên nhiều kích thước điện thoại, tối ưu độ tương phản và in thẻ |
| Điểm danh | Đại biểu dùng camera quét QR của phiên; BTC có phương án barcode/thủ công |
| Màn hình trình chiếu | Thẻ chào mừng đại biểu vừa đến nổi bật trên; QR phía dưới; sơ đồ ghế và KPI |
| Tài liệu | Icon + tên file; bấm mở Google Drive, không tải byte từ website |
| Nhân sự BCH | Card dọc, responsive, chuyển nhân sự trước/sau bằng điều khiển rõ ràng |

## Tổ chức trong mã nguồn

- `src/app/globals.css`: biến kiểu chữ/màu, responsive, hỗ trợ chuyển động giảm và in.
- `src/components/app-shell.tsx`: menu, topbar, điều hướng mobile.
- `src/components/brand-mark.tsx`: nhận diện.
- `src/components/session-qr-screen.tsx`, `src/components/attendance-projection.tsx`: màn hình chiếu điểm danh.
- `src/app/my-card/`: các trang cá nhân dành cho đại biểu.
- `src/components/documents-client.tsx`: tài liệu quản trị; `src/app/my-card/documents/page.tsx`: danh sách tài liệu đại biểu.

## Kiểm thử bắt buộc

- Màn hình desktop 1366×768 và 1920×1080, mobile ~360–430px, chế độ xoay ngang và zoom chữ.
- Màn hình điểm danh toàn màn hình, tương phản QR, phím Tab, focus-visible, reduced-motion.
- Với nội dung dài: họ tên tiếng Việt, đơn vị dài, danh sách tệp nhiều dòng, thẻ BCH.
- Đăng nhập, QR/camera, mở tab Google Drive và chuyển cảnh trang phải hoạt động trên thiết bị thật, không chỉ đạt kiểm thử cấu trúc mã nguồn.

Chi tiết: [Responsive UI](RESPONSIVE-UI.md), [Màn hình điểm danh V16](../tinh-nang/diem-danh/MAN-HINH-DIEM-DANH-V16.md), [Google Drive V18](../tinh-nang/tai-lieu/GOOGLE-DRIVE-LINKS-V18.md).

Mục lục: [docs/README.md](../README.md).
