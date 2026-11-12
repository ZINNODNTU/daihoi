# V62 — Phiếu thuận / phiếu ngược và ra mắt BCH khóa mới

Ngày cập nhật: 12/11/2026

## Phạm vi
Phân hệ **Đại hội Đoàn → Kiểm phiếu BCH**, chỉ hiển thị với tài khoản có quyền `ballots.read`. Quyền `ballots.write` mới cho phép ghi/sửa kết quả. Giao diện nhân sự đại biểu và BCH công khai không được tự động cập nhật danh sách trúng cử.

## Nhập và quy đổi phiếu
- Tổng số phiếu chung được nhập và lưu một lần cho Đại hội. Mỗi ứng viên chọn **Phiếu thuận** hoặc **Phiếu ngược** tại ô nhập phiếu.
- Phiếu thuận: **phiếu đạt = số phiếu nhập**.
- Phiếu ngược: **phiếu đạt = tổng số phiếu chung − số phiếu ngược nhập**.
- Ví dụ: tổng 10 phiếu, nhập 4 phiếu ngược → phiếu đạt 6 → tỷ lệ **60,00%**.
- Giá trị nhập phải là số nguyên từ 0 tới tổng. Để trống và lưu sẽ xóa số phiếu của ứng viên sau khi xác nhận.
- API kiểm tra quyền, nguồn gửi, giới hạn dữ liệu và mốc `updated_at`. Sau khi xác thực, server **tự quy đổi** và gọi RPC `set_bch_candidate_votes_v58` nhằm lưu phiếu đạt một cách nguyên tử, chống ghi đè từ nhiều thiết bị.
- Dữ liệu hiện có (`votes_received`) luôn biểu thị **phiếu đạt cuối cùng**. Chế độ thuận/ngược là **phương thức nhập liệu**, không phải dữ liệu tồn tại riêng trong CSDL. Khi tải lại, hệ thống hiển thị mặc định theo phiếu thuận nhưng giữ nguyên phiếu đạt đã lưu. Việc thay đổi tổng phiếu chung sau khi đã nhập phiếu ngược không tự tái tính từ số phiếu ngược ban đầu; BTC phải đối chiếu và nhập lại nếu cần.

## Xếp hạng và ra mắt BCH khóa mới
- Bảng kiểm phiếu mặc định sắp theo **tỷ lệ phiếu từ cao xuống thấp**; có thể chuyển về thứ tự danh sách ban đầu.
- Nhập **N ủy viên** tại phần *Ra mắt Ban Chấp hành khóa mới*. Chỉ khi tất cả ứng viên đã có kết quả và tổng phiếu hợp lệ, hệ thống mới lấy đúng **N** ứng viên xếp hạng cao nhất.
- Khi bằng phiếu, thứ tự hiển thị phụ dựa trên `display_order`, họ tên tiếng Việt và ID để bảo đảm ổn định. Nếu số phiếu bằng nhau ngay **ranh giới N**, giao diện cảnh báo và yêu cầu BTC xác nhận đã đối chiếu biên bản. Không tự chọn thêm người ngoài N.
- Màn hình trình chiếu hiển thị tên, phiếu đạt, tỷ lệ và ảnh nhân sự (nếu tài khoản được cấp quyền `bch.read`), tối đa 8 nhân sự/trang; chuyển trang bằng nút hoặc phím mũi tên và nhấn Escape để thoát.
- **Đây là danh sách ra mắt dựa theo thứ hạng phiếu**, không tự tạo quyết định công nhận trúng cử. BTC vẫn phải kiểm tra điều kiện trúng cử, đồng phiếu, cơ cấu, biên bản và nghị quyết của Đại hội trước khi công bố chính thức.

## Triển khai
- V62 không tạo bảng mới, không yêu cầu migration mới. Phụ thuộc vào schema và RPC kiểm phiếu V57/V58 hiện hành.
- Kiểm tra: `node --test tests/bch-vote-modes-new-committee-v62.test.mjs tests/bch-ballot-route-functional-v56.test.mjs`, `npm run lint`, `npm run build`.
- Kiểm thử thực tế: nhập tổng 10; chọn phiếu ngược 4 ở một ứng viên; xác minh có 6 phiếu đạt và 60,00% sau khi tải lại; chọn N nhỏ hơn số ứng viên; đối chiếu thứ hạng, đồng phiếu và hình ảnh; kiểm tra tài khoản chỉ có quyền xem không thể lưu phiếu.
