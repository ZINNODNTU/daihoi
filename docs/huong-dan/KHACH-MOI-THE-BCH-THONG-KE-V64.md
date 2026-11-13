# V64 — Thẻ khách mời, nhân sự BCH và phân tích chất lượng đại biểu

## Quy tắc nghiệp vụ

- Hồ sơ đại biểu có `delegate_type = 'guest'` được tạo/cấp tài khoản như hồ sơ đại biểu thông thường. Khi hồ sơ hoạt động đã liên kết `auth_user_id`, khách mời có thể xem **thẻ đại biểu điện tử**, ảnh, barcode, thông tin chỗ ngồi (nếu có) và **in thẻ**.
- Khách mời có quyền xem **nhân sự ứng viên BCH** và tài liệu đã công bố đúng Đại hội, trừ khi BTC chủ động thu hồi các quyền này bằng RBAC. Không tự cấp quyền quét QR, xem lịch sử hoặc sơ đồ ghế nếu không thuộc vai trò chính thức.
- Lượt điểm danh khách mời vẫn được ghi nhận vào **báo cáo điểm danh**. Tuy nhiên, **phân tích chất lượng đại biểu** chỉ tính đại biểu chính thức và dự khuyết **đã điểm danh**; không lấy khách mời làm mẫu trong số lượng, tỷ lệ giới tính, tuổi, tuổi lớn/nhỏ nhất hoặc danh sách đối chiếu.

## Nâng cấp Supabase

1. Bảo đảm `supabase/upgrade-global-rbac-groups-v60.sql` đã được áp dụng.
2. Chạy `supabase/upgrade-guest-portal-card-v64.sql` tại SQL Editor của **đúng Supabase project dùng cho Daihoi**. Script idempotent, chỉ thêm `portal.card` cho nhóm khách mời cũ có đủ bộ quyền mặc định; nhóm phân quyền tùy chỉnh bị hạn chế vẫn được giữ nguyên.
3. Trong quản trị Đại hội, tạo/import khách mời bằng **loại hồ sơ: Khách mời** và cấp tài khoản để liên kết `auth_user_id`. Chỉ cấp `congress_members` role guest mà không có hồ sơ đại biểu được liên kết thì không có ảnh/ID/barcode để tạo thẻ.
4. Kiểm thử 1 khách mời đã cấp thẻ, 1 khách mời được gỡ `portal.card` và 1 đại biểu chính thức; đối chiếu báo cáo điểm danh và phân tích chất lượng trong cùng phiên.

## Điểm kiểm soát

- Quyền xem thẻ và in thẻ kiểm tra `portal.card` + hồ sơ sở hữu.
- Quyền xem ứng viên BCH và ảnh ứng viên được kiểm tra theo `portal.bch`, kể cả ở API.
- Chế độ Admin xem hộ giữ nguyên phân quyền tài khoản đích và không đăng nhập thay.
- `calculateDelegateQuality` và truy vấn `loadQualitySource` đều loại `delegate_type='guest'`; lớp hiển thị không bao gồm mục đếm khách mời trong phân tích chất lượng.
