# Tài liệu dự án Đại hội số

> **Mục lục chính thức — cập nhật 11/11/2026.** Bắt đầu từ trang này khi phát triển, cấu hình hoặc vận hành hệ thống. Những tài liệu trong `lich-su/` là bản ghi phiên bản cũ, không phải hướng dẫn triển khai hiện hành.

Đại hội số là nền tảng điều hành nhiều Đại hội Đoàn/Hội với **Next.js, Supabase, Google Drive** và Vercel (khi triển khai). Phần tài liệu được tổ chức theo **mục đích sử dụng**, không chỉ theo mốc phiên bản.

## Đọc theo nhu cầu

| Bạn cần làm gì? | Tài liệu chính |
| --- | --- |
| Cài đặt/chạy hệ thống và triển khai | [Quy trình triển khai](huong-dan/QUY-TRINH-TRIEN-KHAI.md) |
| **Checklist phát hành Vercel + Supabase, trạng thái migration live (10/11/2026)** | [Chuẩn bị production V31](huong-dan/CHUAN-BI-PRODUCTION-VERCEL-SUPABASE-V31.md) |
| **Tối ưu 200 đại biểu đồng thời, cache an toàn, giới hạn Auth và favicon Đoàn** | [Vận hành tải đồng thời V32](huong-dan/TOI-UU-200-DAI-BIEU-V32.md) |
| Chuẩn bị cơ sở dữ liệu, phân quyền | [Checklist Supabase và các migration](huong-dan/SUPABASE-SETUP.md) |
| Hiểu nghiệp vụ Đại hội và giới hạn sản phẩm | [Nghiệp vụ Đại hội số](nghiep-vu/NGHIEP-VU-DAI-HOI.md) |
| **Công bố tài liệu lên cổng đại biểu, quyền Google Drive và trạng thái nội bộ (V35)** | [Đồng bộ tài liệu V35](huong-dan/DONG-BO-TAI-LIEU-DAI-BIEU-V35.md) |
| **Nhật ký lỗi kỹ thuật cho quản trị viên, cảnh báo và phân quyền (V36)** | [System Logs V36](huong-dan/NHAT-KY-HE-THONG-V36.md) — cần migration V36 |
| **Gom nhóm lỗi, theo dõi tái phát và bắt exception tự động (V37)** | [Error & Incident Monitoring V37](huong-dan/ERROR-INCIDENT-MONITORING-V37.md) — cần migration V36 trước V37 |
| **Đưa System Logs vào production (V38)** | [Checklist kích hoạt V38](huong-dan/KICH-HOAT-SYSTEM-LOGS-V38.md) — backup, SQL, Vercel và smoke test |
| **Sửa hồ sơ đại biểu, xuất mật khẩu sau reset, kéo thả BCH và log thao tác admin (V39)** | [Bản vá quản trị V39](huong-dan/BAN-VA-QUAN-TRI-V39.md) — cần migration V39 và các migration log V36/V37 |
| **Biểu đồ log, lọc theo Request ID, xuất CSV và quản lý/xóa/sắp xếp tài liệu V43–V44** | [Observability & Document Management V44](huong-dan/OBSERVABILITY-VA-TAI-LIEU-V44.md) — cần migration V43 cho tài liệu |
| **Đồng bộ sơ đồ theo phiên, reset chọn phần dữ liệu và xóa cả Đại hội (V46)** | [Hướng dẫn V46](huong-dan/DONG-BO-SO-DO-RESET-DAI-HOI-V46.md) — cần migration V45 rồi V46; chỉ Super Admin |
| **Nhập kết quả kiểm phiếu BCH Đại hội Đoàn (V47)** | [Kết quả kiểm phiếu BCH V47](huong-dan/KET-QUA-KIEM-PHIEU-BCH-V47.md) — cần migration V47 trước khi nhập số phiếu |
| **Tài khoản BTC riêng biệt theo Đại hội, không trộn đại biểu hoặc trùng BTC (V45)** | [Tài khoản BTC riêng V45](huong-dan/TAI-KHOAN-BTC-RIENG-V45.md) — cần migration V45 |\n| Điều hành điểm danh và mã QR | [QR theo phiên và barcode](tinh-nang/diem-danh/DIEM-DANH-QR-PHIEN-VA-BARCODE.md) |
| Trình chiếu realtime, hàng chờ, tối ưu ảnh và dữ liệu đại biểu | [Tối ưu realtime và hiệu năng V19](huong-dan/TOI-UU-HIEU-NANG-REALTIME-V19.md) |
| **Một tài khoản nhiều Đại hội, tự đổi ảnh/hồ sơ và khách mời** | [Hướng dẫn tài khoản và khách mời V20](huong-dan/TAI-KHOAN-DA-DAI-HOI-KHACH-MOI-V20.md) |
| **Trải nghiệm điện thoại cổng đại biểu và khách mời** | [Mobile UX V22](huong-dan/TOI-UU-MOBILE-CONG-DAI-BIEU-V22.md) |
| **Sửa lỗi lưu thông tin hồ sơ đại biểu trên điện thoại** | [Khắc phục API hồ sơ V24](huong-dan/SUA-LOI-CAP-NHAT-HO-SO-V24.md) |
| **Chọn Đại hội trước, hồ sơ cá nhân chung, lịch sử điểm danh toàn bộ** | [Hướng dẫn V25](huong-dan/MOT-NGUOI-NHIEU-DAI-HOI-V25.md) |
| Thiết kế màn hình điểm danh V16 (bố cục gốc) | [Màn hình điểm danh V16](tinh-nang/diem-danh/MAN-HINH-DIEM-DANH-V16.md) |
| Xây dựng sơ đồ ghế và nhập Excel | [Seating Grid Canvas](tinh-nang/cho-ngoi/SEATING-GRID-CANVAS.md) |
| **Tạo sơ đồ ghế một lần, dùng lại ở nhiều Đại hội** | [Sao chép liên Đại hội và thư viện mẫu V26](huong-dan/TAI-SU-DUNG-SO-DO-GHE-V26.md) |
| **Quản lý/xóa sơ đồ, Excel tài khoản, reset mặc định, chọn Đại hội mobile** | [Chuẩn hóa admin và mobile V27](huong-dan/CHUAN-HOA-ADMIN-DAI-BIEU-MOBILE-V27.md) |
| **Đánh số ghế theo hàng, bỏ qua lối đi/ô trống** | [Hướng dẫn V28](huong-dan/DANH-SO-GHE-THEO-HANG-V28.md) |
| **Đồng bộ sơ đồ điểm danh, bỏ mã ghế nổi và chọn logo Hội/Đoàn theo Đại hội** | [Hướng dẫn V29](huong-dan/SO-DO-DIEM-DANH-LOGO-V29.md) |
| Quản lý thông tin, ảnh đại biểu | [Ảnh đại biểu](tinh-nang/dai-bieu/DAI-BIEU-ANH.md) |
| Thống kê giới tính, ngày sinh của người điểm danh | [Phân tích chất lượng đại biểu V15](tinh-nang/dai-bieu/PHAN-TICH-CHAT-LUONG-DAI-BIEU-V15.md) |
| Nhân sự BCH và ảnh hồ sơ | [Danh sách trích ngang BCH](tinh-nang/nhan-su/NHAN-SU-BCH.md) |
| **Đồng bộ sơ đồ ghế V34 — sửa hàng F, lối đi và số ghế đại biểu** | [Đồng bộ sơ đồ V34](huong-dan/DONG-BO-SO-DO-GHE-V34.md) |
| **Giao diện Editorial V33 — nghiên cứu repo UI, trang chủ và dashboard** | [Hướng dẫn thiết kế V33](huong-dan/GIAO-DIEN-EDITORIAL-V33.md) |
| Thiết kế trên điện thoại và máy tính | [Responsive UI](giao-dien/RESPONSIVE-UI.md) |
| Nhận diện thương hiệu | [Giao diện hiện hành](giao-dien/GIAO-DIEN-HIEN-HANH.md) |
| Tra cứu thiết kế/giải pháp của các bản cũ | [Lịch sử phiên bản](lich-su/README.md) và [bản lưu README gốc](lich-su/README-GOC-2026-11-09.md) |

| **Chuẩn hóa vòng đời ảnh đại biểu/BCH V51 — chống trùng, nén, phân quyền, kiểm toán Storage** | [Hướng dẫn lưu ảnh V51](huong-dan/LUU-TRU-ANH-DAI-HOI-V51.md) — không cần migration, chỉ xóa thumbnail tái tạo được. |
| **Giao diện điểm danh đại biểu và thẻ sáng theo logo Đoàn/Hội V53** | [Hướng dẫn giao diện V53](huong-dan/GIAO-DIEN-DIEM-DANH-DAI-BIEU-V53.md) — tối ưu QR trên di động, nhận diện từng Đại hội và chế độ in thẻ. |
| **Bộ chọn Đại hội rõ chữ, điểm danh gọn và in đúng một thẻ V54** | [Hướng dẫn V54](huong-dan/DIEM-DANH-VA-IN-THE-DAI-BIEU-V54.md) — trang in A4 dọc riêng, không lẫn nội dung cổng đại biểu. |

| **Phân quyền BTC và chẩn đoán kết quả phiếu BCH V55** | [Hướng dẫn V55](huong-dan/BCH-PHAN-QUYEN-V55.md) — ma trận quyền theo vai trò; xác minh thiếu migration V47 trên Supabase của dự án. |

| **Kiểm phiếu BCH V56 — nhập trực tiếp số phiếu và tỷ lệ, không lẫn phân quyền BTC** | [Hướng dẫn V56](huong-dan/CHUC-NANG-KIEM-PHIEU-BCH-V56.md) — mỗi ứng cử viên có nút lưu riêng, bảo vệ dữ liệu nhân sự và kết quả. |

## Cấu trúc thư mục

```text
docs/
├── README.md                   # Mục lục chính thức và trạng thái
├── QUY-UOC.md                 # Quy tắc quản lý tài liệu
├── huong-dan/                 # Setup, migration, deploy, vận hành
│   ├── QUY-TRINH-TRIEN-KHAI.md
│   └── SUPABASE-SETUP.md
├── nghiep-vu/                 # Quy tắc nghiệp vụ
├── tinh-nang/                 # Chức năng theo phân hệ
│   ├── dai-bieu/
│   ├── diem-danh/
│   ├── cho-ngoi/
│   ├── nhan-su/
│   └── tai-lieu/
├── giao-dien/                 # UI, nhận diện, responsive
└── lich-su/                   # Bản cũ: V2–V17, không dùng làm cấu hình chính
```

## Phiên bản và trạng thái

| Lĩnh vực | Tài liệu ưu tiên | Lưu ý |
| --- | --- | --- |
| Google Drive | **V35** | Đã xác minh dữ liệu thật: công bố một tài liệu thuộc Đại hội Hội Sinh viên bằng Google Apps Script và Supabase thành công (10/11/2026); Vercel production chưa được xác minh. Xem hướng dẫn V35 và [cấu hình nền V18](tinh-nang/tai-lieu/GOOGLE-DRIVE-LINKS-V18.md). |
| Màn hình điểm danh | **V19** | Realtime theo lượt với hàng chờ FIFO; migration V19 và cấu hình production cần kiểm chứng trên Supabase. |
| Thống kê đại biểu | **V15** | Chỉ phân tích người đã điểm danh; cần migration V15 trên Supabase. |
| Cổng đại biểu / Khách mời | **V22** | Bổ sung tối ưu điện thoại trên V20: thao tác nhanh, lọc tài liệu/BCH/lịch sử theo Đại hội, quét QR và sơ đồ ghế. Đã build local, chưa thử thực tế trên điện thoại bằng tài khoản thật. |
| Sơ đồ ghế | Canvas V6 + điểm danh V10 | Kiểm tra migration thực tế; sơ đồ v4 là tài liệu lịch sử. |

**Phân biệt bắt buộc:** “Đã có trong mã nguồn” khác với “đã áp dụng migration trên database”, “đã cấp quyền Google Drive” và “đã triển khai Vercel”. Khi không có kiểm thử xác nhận trực tiếp, ghi **chưa xác minh**, không suy đoán là đã sẵn sàng.

## Kiểm tra trước khi vận hành thật

1. Chạy `npm ci`, `npm run lint`, `npm run build`, `node --test tests/*.test.mjs`.
2. Chạy `npm run readiness` để kiểm tra một phần cấu hình (không xác nhận migration, quyền RLS thực tế hoặc Google Drive upload).
3. Theo [checklist Supabase](huong-dan/SUPABASE-SETUP.md), kiểm tra vai trò BTC/đại biểu bằng tài khoản thật.
4. Với tài liệu: upload một file từ website, **bật công bố**, đăng nhập đại biểu và mở link Google Drive; thử cả thu hồi quyền.
5. Thử trình chiếu, điểm danh QR và sơ đồ ghế bằng 2 thiết bị thật, đồng thời đánh giá Wi-Fi hội trường và quy trình dự phòng.

## Đóng góp và cập nhật

Xem [Quy ước tài liệu](QUY-UOC.md). Mỗi tính năng nên có **một hướng dẫn hiện hành rõ ràng**; phiên bản cũ đưa vào `lich-su/`, ghi rõ ràng về thay đổi schema, biến môi trường và giới hạn triển khai. Không đưa bất kỳ khóa bí mật, refresh token, tài khoản hoặc tệp `.env.local` nào vào Git.

- [README mã nguồn ở thư mục gốc](../README.md)
- [Mã Apps Script lưu tài liệu](../scripts/google-drive-bridge/Code.gs)
- [Migration Supabase](../supabase/schema.sql)