# V56 — Nhập kết quả kiểm phiếu trực tiếp trên trang Nhân sự BCH

Cập nhật 12/11/2026. Không có database migration mới: Supabase V47 đã được chạy trên project `pnxdxdagpeyqarucdphk` và truy vấn xác nhận hai cột `votes_received`, `total_ballots` thành công.

## Lỗi giao diện và cách sửa

- Trước V56, trang Nhân sự BCH có nút **Phân quyền BTC** đặt cạnh các thao tác nhân sự, gây nhầm lẫn. Đã bỏ nút đó. Phân quyền chỉ nằm trong sidebar **Quản trị → Phân quyền** và trang **Tài khoản BTC**.
- Trước V56, nhập kiểm phiếu bị giấu bên trong biểu mẫu **Sửa nhân sự**, khiến người dùng không nhìn thấy chức năng sau khi migration V47 được thực thi.
- Từ V56, nút **Nhập kết quả kiểm phiếu** trên thanh thao tác dẫn tới khối riêng **Kết quả kiểm phiếu BCH** ngay trước bảng trích ngang. Khối này hiển thị toàn bộ nhân sự, số lượng hồ sơ đã ghi nhận, hai ô nhập và tỷ lệ (%) tự tính. Mỗi ứng viên có một nút **Lưu phiếu** riêng, trạng thái lỗi và thông báo sau khi lưu.
- Bộ lọc của bảng trích ngang không làm biến mất danh sách nhập kết quả; trên điện thoại các trường xếp dọc, trên desktop xếp ngang.
- Chỉ các BTC có quyền `bch.write` ở Đại hội **Đoàn** nhìn thấy khu nhập phiếu. Các quyền `bch.read` chỉ đọc được hồ sơ, không thấy cột kiểm phiếu nội bộ.

## Quy tắc nghiệp vụ

- Số phiếu đạt/tổng số phiếu thuộc biên bản kiểm phiếu **nhập tay**, không lấy từ QR điểm danh hay tổng số đại biểu và không tự xác định người trúng cử.
- Hai trường phải được nhập đồng thời, số nguyên không âm; tổng phiếu phải > 0 và không quá 1.000.000; phiếu đạt phải <= tổng phiếu. Hai trường trống nghĩa là chưa ghi nhận kết quả, không phải 0 phiếu.
- Kết quả hiển thị (ví dụ `175 / 190 = 92,11%`) được làm tròn **chỉ ở giao diện**. Dữ liệu nguyên gốc lưu dưới dạng INTEGER.
- Xóa kết quả đã lưu bằng cách xóa trống cả hai ô rồi nhấn Lưu phiếu; trình duyệt sẽ hiện hộp xác nhận trước khi xóa.
- Nút Lưu chỉ có thể bấm khi có thay đổi hợp lệ. Khi lưu bị lỗi phải giữ nguyên giá trị nhập để BTC sửa/thử lại.
- Đường dẫn `PATCH /api/bch-candidates/ballots` chỉ cập nhật `votes_received`, `total_ballots`, `updated_at` trên **một nhân sự đúng Đại hội**; có xác thực, kiểm tra CSRF Origin, vai trò BTC, loại Đại hội, UUID, cặp số phiếu và phiên bản hồ sơ `expectedUpdatedAt` để chặn ghi đè phiên cũ; ghi log sự kiện `bch.ballot_updated`.
- API sửa hồ sơ nhân sự dùng `ballotEnabled:false`; thay đổi ảnh, họ tên, chức vụ không ghi đè các cột kiểm phiếu. Không phát tán dữ liệu này ra cổng đại biểu.
- Excel từ màn hình trích ngang vẫn bao gồm số phiếu, tổng phiếu, % nếu người dùng có quyền và DB V47 hoạt động. Không thay đổi đường dẫn và số liệu gốc.

## Kiểm tra

- `node --test tests/bch-ballot-direct-entry-v56.test.mjs` kiểm tra validate, giới hạn quyền, bảng nhập phiếu, API riêng, bảo vệ xung đột, không đặt nút phân quyền tại nhân sự BCH.
- `node --test tests/*.test.mjs`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check`.
- Nghiệm thu trên tài khoản BTC thật: với 2 nhân sự có sẵn, nhập số phiếu hợp lệ từ **biên bản thật**, xác nhận phần trăm và dữ liệu sau tải lại. Không được dùng dữ liệu phiếu giả trên database production.
