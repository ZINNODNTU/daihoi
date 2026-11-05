# NGHIÊN CỨU VÀ CHUẨN HÓA NGHIỆP VỤ ĐẠI HỘI SỐ

> Tổng hợp tham chiếu công khai ngày 05/11/2026. Đây là yêu cầu sản phẩm/kiến trúc tham khảo, **không thay thế điều lệ, hướng dẫn nghiệp vụ, thể lệ Đại hội cụ thể** do BTC có thẩm quyền xác nhận.

## 1. Nguồn tham chiếu thực tế

| Nguồn | Nội dung có thể kiểm chứng | Quyết định thiết kế |
|---|---|---|
| Ứng dụng Đại hội HSV của Trung ương Đoàn (App Store) | Dùng chung cấp trường, cấp tỉnh, ở nước ngoài; tài liệu, điểm danh, chỗ ngồi từng phiên, phân đoàn, hiệp thương và chia sẻ thông tin | Hệ thống đa Đại hội; chương trình, phiên, hồ sơ đại biểu và dữ liệu riêng từng Đại hội; phân quyền nghiêm ngặt |
| Ứng dụng Tuổi trẻ Thành phố Bác (VNPT) | Quét QR; phòng họp/chỗ ngồi; biểu quyết/thống kê; tài liệu; đăng ký phát biểu; báo cáo thẩm tra | Bổ sung tác nghiệp Ban Thư ký: báo cáo, chỗ ngồi, phát biểu và điều hành |
| Giải pháp Đại hội Đảng (VNPT) | Tạo Đại hội, phiên, QR, biểu quyết, báo cáo tư cách đại biểu | Tham khảo UX/báo cáo, **không sao chép thể lệ hay quy trình bầu cử của Đảng** |
| Đại hội HSV ĐH Thủy lợi năm 2023 | Mã QR trên thẻ đại biểu; 160 đại biểu chính thức; dùng QR để điểm danh và truy cập tài liệu | QR thẻ đại biểu cần in rõ; cổng tài liệu trên mobile; quy trình tiếp đón thân thiện |
| Hệ thống tài liệu hội nghị của Đoàn trường Dự bị Đại học Dân tộc TW | Giao diện đọc PDF mobile-first; một QR truy cập thư viện tài liệu | Cần tách **QR đại biểu để xác thực điểm danh** khỏi **QR tài liệu chia sẻ công khai/hạn chế** |
| Cổng thông tin số Hội Sinh viên Việt Nam (2026) | Hệ sinh thái SSO HSV-ID, hoạt động/đào tạo/hội nghị; điểm danh QR, tài liệu, góp ý, biểu quyết | Có thể tích hợp SSO trong tương lai, nhưng MVP hiện dùng Supabase Auth riêng; không tuyên bố đã kết nối HSV-ID |
| Đại hội Đoàn XIII 24–25/6/2026 | Thông qua Điều lệ Đoàn được sửa đổi bổ sung; giải pháp số hóa quy trình | Không hardcode nguyên tắc hoặc mẫu số biểu quyết từ tài liệu nhiệm kỳ cũ |
| Giới thiệu HSV và hướng dẫn Điều lệ tại ĐH Tôn Đức Thắng | Điều kiện, thành phần và công nhận tư cách đại biểu; nghiệp vụ hiệp thương | Chuẩn bị chính sách riêng loại Đại hội; không suy ra quyền biểu quyết từ check-in |

Nguồn:
- https://apps.apple.com/vn/app/%C4%91%E1%BA%A1i-h%E1%BB%99i-hsv/id6447390617
- https://play.google.com/store/apps/details?id=vn.vnpthcm.daihoidoan&hl=vi
- https://play.google.com/store/apps/details?id=vn.vnpthcm.daihoidang&hl=vi
- https://hoahoctro.tienphong.vn/dung-qr-code-de-check-in-dai-hoi-dai-bieu-hoi-sinh-vien-truong-dh-thuy-loi-post1543356.tpo
- https://hoinghi.dubiviettri.edu.vn/
- https://hoisinhvien.com.vn/
- https://doanthanhnien.vn/chi-tiet/trien-khai-ngay-nhung-noi-dung-a-uoc-ai-hoi-oan-toan-quoc-lan-thu-xiii-thong-qua-55625
- https://doanthanhnien.vn/danh-muc/gioi-thieu-hoi-sinh-vien-viet-nam
- https://student.tdtu.edu.vn/doan-hoi/huong-dan-thuc-hien-dieu-le-hoi-sinh-vien-viet-nam
- https://nhandan.vn/dai-hoi-doan-toan-quoc-thong-nhat-6-nhom-giai-phap-va-5-nhiem-vu-dot-pha-post971506.html

**Lưu ý thời điểm:** một số bài hướng dẫn tìm thấy thuộc nhiệm kỳ 2022–2027 hoặc 2023–2025. Đại hội XIII tháng 6/2026 đã thông qua Điều lệ Đoàn sửa đổi. Cần BTC đối chiếu **văn bản đang áp dụng** trước khi xác nhận ngưỡng đủ điều kiện, cách tính tỷ lệ/biểu quyết, ứng cử/đề cử và danh sách được triệu tập.

## 2. Mô hình nghiệp vụ đích

### 2.1. Phân vùng

- Platform Super Admin: quản lý đơn vị, tạo Đại hội, cấu hình kỹ thuật và phân vai.
- BTC/Quản trị Đại hội: chương trình, danh sách đại biểu, nhập Excel, check-in, tài liệu.
- Nhân sự tiếp đón: chỉ check-in QR và thủ công, theo dõi phiên đang mở.
- Ban Thư ký: giám sát danh sách, đối chiếu, kết xuất thống kê; hạn chế quyền sửa.
- Đoàn Chủ tịch: báo cáo điều hành, đề xuất phát biểu, biểu quyết khi được BTC xác nhận.
- Đại biểu: thẻ cá nhân, thông tin chỗ ngồi/phiên, tài liệu và quyền thao tác riêng.
- Khách mời: chỉ quyền được mời và tài liệu được phép xem; **không gộp với đại biểu chính thức**.

### 2.2. Chu trình Đại hội

1. **Chuẩn bị:** tạo Đại hội, xác định loại Đoàn/HSV, đơn vị triệu tập, danh sách, phân vai, tài liệu và kế hoạch từng phiên.
2. **Thẩm định danh sách:** BTC đối chiếu đại biểu chính thức, dự khuyết, khách mời; người có thẩm quyền xác nhận tư cách theo thể lệ. Không dùng `is_active` như kết luận tư cách.
3. **Đón tiếp:** phát QR cá nhân và thẻ giấy, BTC quét QR liên tục hoặc điểm danh thủ công có lý do; dữ liệu phân tách theo từng phiên.
4. **Điều hành:** Ban Thư ký theo dõi số người check-in, phân loại, vắng mặt, cập nhật theo phiên; ghi nhận phát biểu; tài liệu theo quyền.
5. **Biểu quyết công khai:** *chỉ khi có đề án và thể lệ đã được duyệt*: chốt cử tri, ngưỡng, phiếu, thời gian mở/đóng, phát biểu kết quả có người xác nhận.
6. **Tổng kết:** xuất báo cáo, danh sách vắng mặt, các đợt điểm danh, log, kết quả biểu quyết/biên bản đã duyệt, lưu trữ hồ sơ.
7. **Lưu trữ:** đóng Đại hội, chỉ xem dữ liệu đã khóa; sao lưu và chính sách lưu giữ/thu hồi theo quy định đơn vị.

### 2.3. Quy tắc điểm danh

- Mỗi đại biểu một QR trên toàn Đại hội, có phiên bản cho phép thu hồi.
- Một QR áp dụng cho nhiều phiên; UNIQUE(session_id,delegate_id) đảm bảo không trùng.
- QR có HMAC chống sửa, không chứa tên hay số điện thoại.
- Quét QR: BTC nên nhìn ảnh/thẻ danh tính thực tế; **QR một mình không chứng minh người xuất trình là đúng người**.
- Điểm danh thủ công: chỉ người được phân vai; ghi người thực hiện, lý do và thời gian.
- Có thể điểm danh nhiều cổng đồng thời. Cần thử mất mạng, trùng thao tác, giới hạn lưu lượng, thời gian chờ.
- **Check-in ≠ đang còn tại hội trường ≠ được công nhận tư cách ≠ đủ quyền biểu quyết.**
- Thống kê tối thiểu: tổng hồ sơ hoạt động, chính thức/dự khuyết/khách mời riêng, có/chưa check-in từng phiên, thống kê theo đơn vị, QR/thủ công, người xử lý.

### 2.4. Quy tắc biểu quyết / hiệp thương

- Tách **biểu quyết công khai** và **bầu cử nhân sự phiếu kín** thành hai nghiệp vụ kỹ thuật và phê duyệt khác nhau.
- Mẫu số tỷ lệ có thể khác nhau theo loại Đại hội/nội dung/quy chế; không hardcode mẫu số = số check-in.
- Trước mỗi phiên phải có **danh sách đủ quyền đã chốt**, thời điểm hiệu lực, người phê duyệt, trạng thái phiên và nhật ký.
- Chỉ người được gán quyền mới bỏ phiếu; dùng unique key và database transaction; không nhận hai phiếu.
- Khi cần phiếu kín, phải bảo đảm **không gắn lựa chọn với danh tính**, nhưng vẫn bảo đảm mỗi người chỉ bỏ một phiếu hợp lệ. Cần đánh giá bảo mật, thể lệ và quyết định của BTC; bản MVP **chưa hỗ trợ**.

## 3. Đối chiếu với mã nguồn hiện tại

| Chức năng | Trạng thái 05/11/2026 | Ưu tiên |
|---|---|---|
| Dashboard đa Đại hội, dữ liệu phân cách bằng congress_id | Có mã nguồn, DB 13 bảng được tạo | P0 |
| Quản lý đại biểu, import Excel và QR cá nhân | Có | P0 |
| BTC quét QR / điểm danh thủ công có lý do | Có | P0 |
| Quét QR liên tục, ưu tiên camera sau | **Đã cải tiến** | P0 |
| Báo cáo điểm danh phân loại, theo đơn vị, xuất CSV, in PDF từ trình duyệt | **Đã bổ sung** | P0 |
| Tối ưu QR v2 độ dài 74 ký tự, đọc ngược v1 | **Đã bổ sung** | P0 |
| Phân quyền qua RLS | Có schema, nhưng phải test tích hợp nhiều tài khoản | P0 |
| Cấp/thu hồi QR lại trong GUI | Chưa hoàn thiện | P0 |
| Điều chỉnh điểm danh sai có phê duyệt, audit và khóa báo cáo | Chưa hoàn thiện | P0 |
| Tạo lịch trình chi tiết + chương trình / nhiệm vụ từng phiên | Chưa làm | P1 |
| Sơ đồ chỗ ngồi và phân đoàn | Chưa làm | P1 |
| Đăng ký/phê duyệt phát biểu | Chưa làm | P1 |
| Tài liệu phân loại quyền truy cập | Bản cơ bản dùng Google Drive OAuth chung | P1 |
| QR truy cập thư viện tài liệu riêng | Chưa làm | P1 |
| Cổng đại biểu tự xem thẻ, tài liệu, lịch trình | Chưa làm | P1 |
| Biểu quyết công khai có duyệt thể lệ | Bảng dự phòng, **chưa có nghiệp vụ** | P1 |
| Bầu cử nhân sự phiếu kín | Không triển khai khi chưa có phê duyệt nghiệp vụ/bảo mật | P2 |
| Load test đồng thời 200 thiết bị, kiểm tra camera iOS/Android | Chưa chạy | P0 trước vận hành |

## 4. Thiết kế màn hình ưu tiên

- Dashboard Đại hội: trạng thái phiên đang mở, báo cáo điều hành, danh sách công việc chuẩn bị, quyền truy cập rõ ràng.
- Điểm danh: quét camera liên tục + tab thủ công + tab lịch sử + thống kê (đã có).
- Báo cáo: phiên, 4 thẻ thống kê, đại biểu theo 3 loại, bảng đơn vị, danh sách đối chiếu, tìm kiếm/lọc, xuất CSV, in PDF từ trình duyệt (đã có).
- Quản trị tài liệu: truy cập PDF trên điện thoại, nhóm văn kiện/báo cáo/tham luận, duyệt trước khi công khai.
- Ban Thư ký/Đoàn Chủ tịch: trình chiếu tóm tắt; không hiển thị thông tin nhạy cảm của từng đại biểu trên màn hình hội trường.

## 5. Bảo mật và vận hành thực tế

- Một Super Admin có thể truy cập nhiều Đại hội; BTC chỉ xem và ghi dữ liệu của Đại hội được cấp quyền.
- Mọi thay đổi người tham dự, tư cách, phiên, phiếu cần audit log.
- Không cấp quyền truy cập service_role/secret key ở client, không nhập khóa bí mật vào JS public.
- QR hiện tại có chữ ký HMAC; để **bảo đảm không giả mạo phương thức quét** qua API/REST trực tiếp khi vận hành chính thức, cần bổ sung server-only service credential hoặc RPC an toàn và thu hồi INSERT trực tiếp với staff trên `checkins`. Hiện chưa áp dụng thay đổi này vào database. Không tuyên bố hệ thống đã kiểm thử chống thao tác ác ý.
- Google Drive không phải CDN; tài liệu tải qua API phân quyền, hạn chế request tải hình trên dashboard. Tệp lớn cần upload qua cơ chế riêng (Vercel Functions giới hạn 4.5 MB).
- Trình duyệt cần HTTPS và được cho phép camera; có kịch bản hỗ trợ đại biểu mất điện thoại và Wi-Fi hội trường gián đoạn.
- Thử tải có 200 đại biểu cùng đăng nhập, vài thiết bị check-in đồng thời, 200 requests biểu quyết trong vài giây (sau khi triển khai biểu quyết), có phương án giấy dự phòng.
- Sử dụng timezone **Asia/Ho_Chi_Minh** cho giờ ghi trên báo cáo.

## 6. Điều kiện được phép vận hành chính thức

**Chưa đạt:** Supabase Publishable Key tại máy cần hoàn tất, cần BTC user đăng nhập, tests tích hợp RLS, Google Drive OAuth, deployment Vercel, backup/load test, xác nhận điều lệ/thể lệ và duyệt quy trình điều chỉnh dữ liệu.

Những mục trên cần hoàn thành trước khi dùng để công bố kết quả hoặc ra quyết định chính thức.
