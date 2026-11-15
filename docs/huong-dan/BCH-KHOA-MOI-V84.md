# BCH khóa mới V84 — lấy trực tiếp dữ liệu BTC, không tạo bảng nhân sự mới

## Cấu trúc lưu trữ

BCH khóa mới sử dụng chính thông tin đã nhập tại **BTC Đại hội → Nhân sự BCH / Kiểm phiếu BCH**:

- `bch_candidates`: thông tin hồ sơ, ảnh và kết quả kiểm phiếu của ứng viên, vẫn là nguồn dữ liệu gốc.
- `congresses.bch_total_ballots`: tổng phiếu chung hiện có.
- **Hai trường bổ sung ngay trên bản ghi `congresses` hiện có:** `bch_new_member_ids` (các ID ứng viên đã được BTC chốt theo thứ tự hiển thị) và `bch_new_published_at` (thời điểm công bố; NULL nếu chưa công bố).

**Không tạo bảng mới, không lưu trùng hồ sơ hoặc ảnh**, và không tạo tài khoản đại biểu mới. Số ủy viên **N được tính trực tiếp bằng số ID đã công bố**. Đây là cấu hình tối thiểu cần có để nhiều tài khoản nhìn thấy cùng một kết quả, kể cả sau khi BTC tải lại trang.

Cần lưu ID đã chốt chứ không chỉ N: nếu sau khi công bố BTC thay số phiếu, người xem vẫn nhìn thấy đúng danh sách đã xác nhận, không tự đổi thành người khác. BTC có thể công bố lại để cập nhật từ sổ phiếu mới.

## Quy trình công bố

1. BTC có quyền `ballots.write` vào **Kiểm phiếu BCH → Ra mắt Ban Chấp hành khóa mới** của Đại hội Đoàn.
2. Kiểm tra tổng phiếu chung, phiếu nhận được của tất cả ứng viên, rồi nhập số ủy viên BCH mới N.
3. Hệ thống xếp theo phiếu từ cao xuống thấp, lấy **đúng N người**; nếu đồng phiếu tại ranh giới N, BTC phải đối chiếu biên bản và xác nhận.
4. BTC nhấn **Công bố BCH khóa mới** hoặc **Công bố & trình chiếu**. Máy chủ kiểm lại dữ liệu dưới khóa đồng bộ với quy trình kiểm phiếu, sau đó ghi **hai trường trên `congresses`**.
5. Cổng đại biểu, khách mời đọc danh sách ID đã công bố, lấy flashcard từ `bch_candidates`, không nhận phiếu bầu hay các trường bí mật.
6. **Thu hồi công bố** đặt cả hai trường thành NULL, không sửa phiếu bầu, không xóa ứng viên. Nếu cần cập nhật BCH mới, BTC công bố lại đúng N sau khi rà soát biên bản.

## Giao diện

- Đại biểu và khách mời có tài khoản: **BCH khóa mới** trong menu `/my-card/bch-new`, tuân thủ quyền `portal.bch`.
- Khách không cần đăng nhập: tab **BCH khóa mới** trên trang `/guest/[slug]` của Đại hội Đoàn đang mở, từ API `/api/guest/[slug]/bch-new`.
- Màn hình lớn: toàn bộ flashcard; điện thoại: vuốt, Trước/Tiếp. Nếu chưa công bố sẽ hiện thông báo chờ. Nếu hồ sơ bị mất, không hiển thị danh sách thiếu người.

## Triển khai Supabase

**Chỉ chạy** `supabase/upgrade-bch-new-committee-v84.sql` trên **đúng Supabase project đang được website sử dụng**, sau các migration kiểm phiếu V57/V58. **Không chạy migration V83 cũ** vì phiên bản đó tạo bảng bổ sung đã được thay bằng kiến trúc mới.

V84 là bổ sung hai cột và RPC kiểm phiếu an toàn, không tạo bảng mới. Nếu trước đó đã có bảng công bố V83 và dữ liệu chốt, V84 sẽ chép *duy nhất lần đầu* ID/thời gian sang bản ghi Đại hội; bảng cũ không bị xóa làm mất lịch sử. Khi V84 được chạy lại sau khi BTC thu hồi công bố, danh sách cũ không được khôi phục.

Nếu migration V84 chưa triển khai, BTC vẫn xem và nhập kiểm phiếu như trước nhưng nút công bố có cảnh báo. Không chạy migration ở project Supabase khác và không khẳng định production đã hoạt động trước khi thử nghiệm thực tế.

## Kiểm thử

Chạy `npm exec -- tsc --noEmit`, `npm run lint -- --quiet`, `node --test tests/*.test.mjs`, `npm run build`. Dùng một Đại hội thử nghiệm, nhập 5 ứng viên, công bố N=3 và kiểm tra hai cổng đúng 3 người. Sau đó đổi phiếu của một ứng viên: kết quả đã công bố phải giữ ổn định đến khi công bố lại. Thu hồi và xác nhận hai cổng không còn hiển thị danh sách.
