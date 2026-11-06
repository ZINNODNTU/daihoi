# ĐẠI HỘI SỐ — Giao diện thích ứng máy tính và điện thoại

## Phạm vi cập nhật ngày 06/11/2026

Đã chuẩn hóa hệ thiết kế (màu xanh đậm, ngọc, nền sáng), trạng thái, biểu mẫu và các thành phần điều hướng.

- **Trang chủ / Đăng nhập:** bố cục 1 cột trên điện thoại, 2 cột trên máy tính; biểu mẫu lớn, có nút hiện/ẩn mật khẩu và thông báo lỗi.
- **Dashboard đa Đại hội:** hero thông tin, KPI, tìm kiếm, lọc trạng thái và thẻ Đại hội.
- **Trang điều hành Đại hội:** thông tin kỳ Đại hội, phím tắt nghiệp vụ, KPI, tiến độ và các phiên.
- **Sidebar:** cố định ở màn hình lớn, ngăn trượt trên điện thoại; có lớp phủ, nút đóng và phím Escape.
- **Thanh điều hướng nhanh trên điện thoại:** truy cập Tổng quan, Đại biểu, Điểm danh, Báo cáo; tính vùng safe-area cho điện thoại có thanh điều hướng cử chỉ.
- **Đại biểu:** danh sách dạng bảng ở máy tính và thẻ dễ đọc trên điện thoại; màn hình in QR/barcode dạng bottom-sheet, chống tràn.
- **Điểm danh:** ưu tiên camera khung 4:3 trên điện thoại; nút thao tác lớn; phương án dự phòng có danh sách thẻ, tìm nhanh; cửa sổ xác nhận dạng bottom-sheet.
- **Báo cáo:** lọc rõ ràng; bảng chuyển sang hàng có nhãn trên điện thoại, tránh phải cuộn ngang.
- **Tài liệu:** khu vực tải tệp dễ chạm, lọc tên, danh sách bảng/thẻ; giới hạn 4 MB không thay đổi.
- **Nhân sự BTC và Cấu hình:** biểu mẫu thích ứng 1–2 cột, nút chạm đủ lớn.
- **Tiếp cận:** semantic labels, aria-pressed cho tab, aria-modal cho hộp thoại, phím Escape, trạng thái focus-visible và giảm hiệu ứng khi người dùng chọn reduced motion.

## Breakpoint

| Màn hình | Bố cục |
|---|---|
| 320–639px | Một cột; thẻ dữ liệu; nút tối thiểu 44px; menu drawer, thanh điều hướng nhanh cuối màn hình |
| 640–1023px | KPI 2 cột; form 2 cột ở nơi đủ rộng; drawer điều hướng |
| 1024–1279px | Sidebar cố định, nội dung rộng linh hoạt, KPI 3–4 cột tùy màn hình |
| >=1280px | Bảng điều hành mở rộng, nhiều cột cho thẻ nghiệp vụ và danh sách |

## Kiểm thử

- Chạy `npm run lint`, `npm run build` và `node --test tests/*.test.mjs`.
- `tests/responsive-ui.test.mjs` là kiểm tra hồi quy **cấu trúc mã nguồn**, không thay thế kiểm thử render trình duyệt.
- **Chưa kiểm thử bằng ảnh chụp thực tế** vì tab Chrome được cấp cho workspace không cho phép chuyển sang trang phát triển tại localhost khi ở chế độ nền. Không tuyên bố đạt WCAG hoặc Lighthouse khi chưa đo.

### Bảng kiểm thao tác trực tiếp trước khi vận hành

1. Mở ở **320, 375, 390, 430, 768, 1024, 1366 và 1920 px**, đo `document.documentElement.scrollWidth <= window.innerWidth` và kiểm tra không tràn ngang không chủ ý.
2. Mở menu điện thoại, chạm điều hướng nhanh, dùng Escape, quay lại trình duyệt; kiểm tra thanh cuối màn hình không che nút gửi.
3. Trên Android Chrome và iPhone Safari: nhập biểu mẫu (không tự zoom iOS), mở camera HTTPS, quét QR, barcode, chuyển phiên; khi tắt camera phải giải phóng thiết bị.
4. Với 200 đại biểu: tìm, lọc, mở QR, xem danh sách điểm danh và báo cáo dài; kiểm tra cuộn, hiển thị và hiệu năng.
5. Kiểm tra bật zoom 200%, phông hệ thống lớn, chỉ bàn phím, reduced motion và màu tương phản thực tế.
6. In thẻ đại biểu, in báo cáo; đảm bảo thanh điều hướng không in.

**Lưu ý:** Hoàn thiện giao diện không đồng nghĩa với đã kết nối Supabase live, Google Drive OAuth hoặc deploy Vercel. Các điều kiện hạ tầng vẫn xem tại docs/QUY-TRINH-TRIEN-KHAI.md.
