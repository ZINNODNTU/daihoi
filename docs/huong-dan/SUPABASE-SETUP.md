# Checklist Supabase — thiết lập và nâng cấp

> **Hướng dẫn hiện hành (09/11/2026).** Đây là checklist cho dự án Đại hội số, **không phải xác nhận migrations đã chạy trên production**. Nhật ký xác nhận trạng thái ngày 05/11/2026 được lưu tại [kho lịch sử](../lich-su/SUPABASE-SETUP-2026-11-05.md).

## 1. Chọn đúng dự án

- Supabase Project ref: `pnxdxdagpeyqarucdphk`.
- Project URL: `https://pnxdxdagpeyqarucdphk.supabase.co`.
- Dashboard: https://supabase.com/dashboard/project/pnxdxdagpeyqarucdphk
- **Không chạy lệnh ghi dữ liệu trên một project khác.** Sao lưu trước, xác nhận tên database, quyền SQL và trạng thái migrations trước khi thao tác.

## 2. Cấu hình môi trường

Tạo `.env.local` (Git ignore) bằng `.env.example`, sau đó điền:

| Biến | Vai trò | Công khai? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase | Có |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Key trình duyệt | Có |
| `SUPABASE_SECRET_KEY` | Key server, ghi có kiểm soát | **Không** |
| `QR_HMAC_SECRET` | Ký QR theo phiên, tối thiểu 32 ký tự | **Không** |

Không commit `.env.local` hoặc secret. Chạy `npm run check:supabase` để kiểm tra kết nối thực tế và `npm run readiness` để kiểm tra biến môi trường (readiness **không xác nhận RLS**).

## 3. Danh sách migration có trong repository

Các file tồn tại trong `supabase/`. **Đọc và đối chiếu schema thật trước khi chạy**, nhất là những file phụ thuộc bản cũ.

| Thứ tự | File | Chức năng |
| --- | --- | --- |
| 0 | `supabase/schema.sql` | Tạo schema gốc trên **database mới** (không chạy lại tùy tiện trên hệ thống đã có dữ liệu) |
| 1 | `supabase/upgrade-attendance-v2.sql` | QR phiên, barcode, thời gian điểm danh |
| 2 | `supabase/upgrade-management-v3.sql` | Quyền quản trị và kiểm soát ghi dữ liệu |
| 3 | `supabase/upgrade-seating-v4.sql` | Mô hình sơ đồ ghế ban đầu |
| 4 | `supabase/upgrade-delegate-accounts-v5.sql` | Tài khoản đại biểu |
| 5 | `supabase/upgrade-seating-v6.sql` | Canvas ghế và nhập Excel |
| 6 | `supabase/upgrade-delegate-photos-v7.sql` | Ảnh đại biểu |
| 7 | `supabase/upgrade-bch-candidates-v8.sql` | Hồ sơ nhân sự giới thiệu BCH |
| 8 | `supabase/upgrade-bch-photos-v9.sql` | Ảnh nhân sự BCH |
| 9 | `supabase/upgrade-attendance-session-seating-v10.sql` | Sơ đồ ghế theo phiên |
| 10 | `supabase/upgrade-delegate-portal-v11.sql` | Giới hạn quyền cho delegate/guest |
| 11 | `supabase/upgrade-delegate-resources-v14.sql` | Quyền công bố tài liệu `delegate_visible` |
| 12 | `supabase/upgrade-delegate-demographics-v15.sql` | Giới tính và ngày sinh đại biểu |

Không có SQL riêng cho từng phiên bản giao diện V12, V13, V16, V17, V18. Thứ tự trên dùng để định hướng **kiểm tra phụ thuộc**, không phải cam kết chạy tuần tự không cần xem xét trên mọi database.

## 4. Kiểm tra RLS và nghiệp vụ

1. Kiểm tra bảng, cột và policies của migrations cần thiết đã có thật bằng Supabase SQL Editor.
2. Xác minh `profiles` và `congress_members` phân quyền đúng; chỉ cấp `super_admin` bằng quy trình được kiểm soát.
3. Kiểm thử với **hai Đại hội tách biệt** và vai trò Admin, BTC, thư ký, đại biểu, khách mời.
4. Đại biểu **không được truy cập** API/quản trị nghiệp vụ; chỉ xem đúng thông tin cá nhân, lịch sử, tài liệu đã công bố.
5. Tạo hai lượt điểm danh đồng thời một người trong cùng phiên, chỉ được lưu **một** lượt; kiểm tra giờ mở/đóng và QR.
6. Với tài liệu, kiểm tra `documents.delegate_visible` và chỉ công bố tệp **sau khi** Google Drive cấp quyền chia sẻ.
7. Đối chiếu dữ liệu phân tích V15 chỉ tính người đã điểm danh, không tính các bản ghi chưa tới.

## 5. Nghiệm thu

- CSDL production đã được xác minh **độc lập** với kết quả build/lint.
- Đăng nhập từ ít nhất hai thiết bị; xem dữ liệu đúng vai trò.
- Thử nhập Excel, ảnh, QR, chỗ ngồi, điểm danh và tài liệu Drive thật.
- Sao lưu trước và sau migrations; lưu log ngày chạy, người thực hiện và kết quả ở hệ thống quản lý triển khai nội bộ (**không lưu khóa bí mật trong Git**).

Quy trình đầy đủ: [Triển khai hệ thống](QUY-TRINH-TRIEN-KHAI.md). Mục lục: [Tài liệu dự án](../README.md).
