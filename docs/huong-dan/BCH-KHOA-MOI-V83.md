# V83 — Công bố BCH khóa mới cho đại biểu và khách mời

## Phân biệt hai danh sách

- Nhân sự BCH: toàn bộ ứng viên được BTC giới thiệu, giữ giao diện flashcard.
- BCH khóa mới: chỉ đúng N ủy viên do BTC lựa chọn ở Kiểm phiếu BCH → Ra mắt Ban Chấp hành khóa mới; chỉ xem được sau khi BTC công bố.
- Phiếu bầu và tổng phiếu là dữ liệu nội bộ, không chuyển sang cổng đại biểu hoặc khách mời.

## Quy trình BTC

1. Tài khoản BTC phải có quyền ballots.write của đúng Đại hội Đoàn.
2. Nhập và kiểm tra tổng phiếu chung và kết quả của tất cả ứng viên.
3. Tại Ra mắt BCH khóa mới, nhập số lượng N; hệ thống chọn top N theo số phiếu đạt.
4. Nếu đồng phiếu tại ranh giới vị trí N, kiểm tra biên bản và đánh dấu xác nhận.
5. Nhấn Công bố BCH khóa mới hoặc Công bố & trình chiếu. Máy chủ kiểm phiếu và danh sách lại trước khi lưu.
6. Khi thay đổi phiếu hoặc N, cần công bố lại; dùng Thu hồi công bố để ẩn ngay nếu cần.

## Cổng xem

- Đại biểu chính thức, dự khuyết và khách mời có tài khoản: mục BCH khóa mới, đường dẫn /my-card/bch-new, dùng quyền portal.bch hiện tại.
- Khách xem công khai: tab BCH khóa mới ở /guest/[slug] khi Đại hội Đoàn ở trạng thái live. API /api/guest/[slug]/bch-new chỉ trả hồ sơ công khai đã chốt.
- Desktop hiển thị lưới flashcard đầy đủ; điện thoại vuốt ngang/Trước/Tiếp; ảnh qua API ảnh đã phân quyền.
- Chưa công bố thì hiển thị trạng thái chờ; sai số lượng hoặc thiếu hồ sơ thì báo lỗi, không hiện danh sách thiếu.

## Triển khai

Áp dụng file supabase/upgrade-bch-new-committee-v83.sql vào đúng project Supabase của ứng dụng sau khi cài migration kiểm phiếu V57/V58. Script chỉ thêm bảng publication, RLS và RPC atomic; chỉ service_role truy cập. Nếu migration chưa chạy, nút công bố bị khóa và có cảnh báo.

Kiểm thử sau khi phát hành: 5 ứng viên đủ phiếu, BTC công bố N=3, kiểm tra đúng 3 flashcard cho tài khoản đại biểu và khách mời, sau đó thu hồi và xác nhận danh sách không còn hiển thị. Build và tests chạy trước khi release.