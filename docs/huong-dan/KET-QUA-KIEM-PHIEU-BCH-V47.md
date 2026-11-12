# V47 — Nhập kết quả kiểm phiếu BCH Đại hội Đoàn

Phạm vi: Trang **Đại hội → Nhân sự Ban Chấp hành**, chỉ hiển thị nhập kết quả kiểm phiếu khi `congresses.kind = 'doan'`.

## Quy tắc

- Ban Tổ chức nhập **Số phiếu đạt** và **Tổng số phiếu làm căn cứ tính tỷ lệ** cho từng nhân sự theo biên bản kiểm phiếu. Có thể để trống cả hai trường nếu chưa có kết quả.
- Tỷ lệ tính trực tiếp: `số_phiếu_đạt / tổng_phiếu × 100`, hiển thị 2 chữ số thập phân (ví dụ 175/190 = 92,11%). Không lưu số phần trăm làm tròn trong cơ sở dữ liệu.
- Cho phép 0 phiếu; từ chối tổng bằng 0, số âm, số thập phân, dữ liệu vô hạn hoặc số phiếu đạt lớn hơn tổng.
- Các cột kết quả chỉ phục vụ giao diện BTC; cổng đại biểu tiếp tục dùng danh sách giới thiệu không có kết quả. Không tự xác nhận ứng viên trúng cử, không phải hệ thống bỏ phiếu điện tử.
- Nếu chưa có migration, trang vẫn hiển thị và cho phép sửa hồ sơ nhân sự cũ; ô nhập phiếu tạm ẩn kèm thông báo cập nhật CSDL.

## Kích hoạt trên Supabase

1. Sao lưu và kiểm tra đúng project `pnxdxdagpeyqarucdphk` trước khi chạy SQL.
2. Bảo đảm migration `supabase/upgrade-bch-candidates-v8.sql` đã được chạy.
3. Áp dụng `supabase/upgrade-bch-ballot-results-v47.sql` vào đúng project. Migration chỉ thêm hai cột nullable và ràng buộc hợp lệ, không ghi đè kết quả hiện có.
4. Kiểm tra hai cột `public.bch_candidates.votes_received`, `total_ballots`, thử nhập một kết quả thông qua tài khoản BTC của Đại hội Đoàn rồi đối chiếu phần trăm và file Excel.

**Trạng thái triển khai khi viết tài liệu:** Mã nguồn đã được kiểm thử và build. Chưa có xác nhận migration V47 đã chạy trên Supabase production; không được nhận định kết quả trên live đã khả dụng nếu chưa kiểm tra cơ sở dữ liệu.
