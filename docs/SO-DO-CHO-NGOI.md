# Sơ đồ chỗ ngồi — ĐẠI HỘI SỐ (v4)

## Trạng thái triển khai
- Đã thêm giao diện Next.js tại /congresses/[id]/seating và API /api/seating.
- Mã nguồn đã triển khai, nhưng vẫn phải thực thi migration SQL trên đúng Supabase project trước khi sử dụng.
- Project mục tiêu theo lịch sử dự án: pnxdxdagpeyqarucdphk. Không thực thi migration vào các project khác.
- Mã nguồn không chứa khóa Supabase, Google Drive hoặc Vercel.

## Trước khi sử dụng
1. Sao lưu dữ liệu Supabase ở project mục tiêu; xác minh đã có schema.sql và các migration v2/v3 theo tài liệu trước đó.
2. Chạy supabase/upgrade-seating-v4.sql trên Supabase SQL Editor của dự án này.
3. Đảm bảo máy chủ Next.js/Vercel có NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY và SUPABASE_SECRET_KEY qua Environment Variables (không đưa vào Git).
4. Đăng nhập với quyền admin hoặc super_admin để tạo và phân ghế. BTC khác có thể xem sơ đồ và dữ liệu điểm danh liên quan nếu được phân quyền truy cập Đại hội.
5. Kiểm thử gán ghế, import Excel và thay đổi đồng thời trên một Đại hội thử nghiệm trước khi sử dụng thật.

## Quy trình nghiệp vụ
1. Mở một Đại hội → Sơ đồ ghế → Tạo sơ đồ.
2. Chuyển sang Thiết kế; nhập mã khu (ví dụ A), hàng đầu (A), số hàng (8), ghế mỗi hàng (12), lối đi sau ghế 6, rồi Sinh hàng ghế.
3. Có thể thêm khu tiếp theo (B, VIP...), dùng chuột/touch kéo ghế hoặc nút tinh chỉnh. Mã ghế mặc định A-A-01, A-A-02... thể hiện Khu-Hàng-Số.
4. Nhấn Lưu sơ đồ. Mỗi lần lưu thành công tăng phiên bản để chống ghi đè từ thiết bị khác.
5. Chuyển sang Phân ghế: nhấp ghế, tìm đại biểu, nhấn gán. Có thể gán chuyển ghế khi đại biểu đã có vị trí.
6. Cách nhập nhanh: Tải Excel mẫu → mở sheet "Phan ghe" → điền cột "Mã đại biểu" → chọn file để nhập → đọc lỗi → chọn Gộp hoặc Thay thế toàn bộ → Xác nhận.
7. Có thể chọn phiên để xem trạng thái điểm danh theo ghế. Điểm danh chỉ là trạng thái tham dự, không xác nhận đại biểu đã ngồi đúng ghế.

## Excel
File có hai sheet:
- Phan ghe: Mã ghế, Khu vực, Hàng, Số ghế, Mã đại biểu, Họ tên tham khảo, Đơn vị tham khảo, ID sơ đồ, Phiên bản.
- Danh sach dai bieu: Mã đại biểu, Họ tên, Đơn vị, Trạng thái.

Chỉ xử lý .xlsx tối đa 2MB. Đọc bằng read-excel-file đã có trong dự án, tạo file qua write-excel-file. Mã đại biểu cần lưu dạng văn bản, đặc biệt mã có số 0 ở đầu. File chỉnh sửa phải thuộc đúng sơ đồ và đúng phiên bản. Không dùng họ tên để xác định đại biểu do có thể trùng tên.

"Nhập gộp" chỉ cập nhật các ghế có trong file; đại biểu đã ở ghế khác được chuyển sang ghế mới. "Thay thế toàn bộ" xóa tất cả phân công cũ của sơ đồ rồi áp dụng dữ liệu file sau khi người dùng xác nhận. Hàng có mã đại biểu trống dùng để bỏ phân công ghế.

## Mô hình & an toàn dữ liệu
- seating_layouts: tách biệt mỗi sơ đồ, gắn congress_id, có version để khóa lạc quan.
- seats: ID UUID ổn định qua các lần di chuyển/chỉnh sửa; mã và vị trí duy nhất trong mỗi sơ đồ.
- seat_assignments: một ghế một đại biểu; một đại biểu một ghế trong một sơ đồ.
- API xác thực Supabase Auth và phân quyền admin/viewer trước khi dùng server-side SUPABASE_SECRET_KEY.
- RLS được bật và quyền truy cập trực tiếp từ anon/authenticated bị thu hồi cho cả ba bảng.
- Hai hàm RPC seating_save_layout và seating_apply_assignments chỉ cấp EXECUTE cho service_role; mỗi thao tác ghi là một giao dịch PostgreSQL và tạo audit_logs.
- Không cho xóa/khóa ghế còn phân công. Nhập Excel được kiểm tra cả client lẫn database.
- Nếu hai BTC cùng sửa phiên bản, server trả 409 và yêu cầu tải lại thay vì ghi đè.

## Giới hạn v4
- Hiện hỗ trợ tối đa 500 ghế/sơ đồ, chưa có vẽ hình đa giác, chèn ảnh nền hoặc lối đi tự do.
- Có thể lưu nhiều sơ đồ cho một Đại hội; phân công riêng theo từng sơ đồ. Chưa gắn tự động một sơ đồ vào từng phiên.
- Hiện chỉ báo màu "đã điểm danh" theo phiên đã chọn; chưa có xác nhận đại biểu ngồi đúng ghế.
- Chưa có thử nghiệm end-to-end trên cơ sở dữ liệu thực tế, Chrome/Safari thiết bị thật, hoặc triển khai Vercel.
- Không hỗ trợ offline queue: mất mạng cần tải lại để tránh xung đột dữ liệu.
- Không sử dụng thư viện Konva trong phiên bản này: sơ đồ DOM với nút tương tác và tọa độ tuyệt đối cho phép tối đa 500 ghế, giảm dependency và vẫn hỗ trợ thao tác touch. Khi cần sơ đồ phức tạp, có thể thay renderer bằng Konva mà giữ nguyên backend/schema.

## Kiểm thử thủ công trước vận hành
1. Tạo 150 ghế, kiểm tra khu/hàng/lối đi và kéo ghế trên desktop, cảm ứng trên Android/iOS.
2. Gán một đại biểu, chuyển sang ghế khác, bỏ phân công; xác minh 1 đại biểu chỉ có 1 ghế trong mỗi sơ đồ.
3. Hai tài khoản admin cùng mở một sơ đồ, lưu ở máy A, thử lưu dữ liệu cũ ở máy B → phải nhận 409.
4. Xuất mẫu, nhập y nguyên, sửa tên tham khảo nhưng giữ mã → vẫn gán đúng; sửa ID sơ đồ hoặc phiên bản → từ chối.
5. Excel có mã đại biểu không có trong Đại hội, mã trùng, ghế khóa, người đã ngừng hoạt động → phải báo lỗi theo dòng và không ghi.
6. Thử nhập chế độ Gộp và Thay thế toàn bộ trên sơ đồ thử nghiệm.
7. Tài khoản không thuộc BTC không được đọc; checkin/secretary không được thay đổi phân công.
8. Sau khi điểm danh theo phiên, xác minh màu ghế đúng với trạng thái check-in.
