# Tài liệu dự án Đại hội số

> **Mục lục chính thức — cập nhật 09/11/2026.** Bắt đầu từ trang này khi phát triển, cấu hình hoặc vận hành hệ thống. Những tài liệu trong `lich-su/` là bản ghi phiên bản cũ, không phải hướng dẫn triển khai hiện hành.

Đại hội số là nền tảng điều hành nhiều Đại hội Đoàn/Hội với **Next.js, Supabase, Google Drive** và Vercel (khi triển khai). Phần tài liệu được tổ chức theo **mục đích sử dụng**, không chỉ theo mốc phiên bản.

## Đọc theo nhu cầu

| Bạn cần làm gì? | Tài liệu chính |
| --- | --- |
| Cài đặt/chạy hệ thống và triển khai | [Quy trình triển khai](huong-dan/QUY-TRINH-TRIEN-KHAI.md) |
| Chuẩn bị cơ sở dữ liệu, phân quyền | [Checklist Supabase và các migration](huong-dan/SUPABASE-SETUP.md) |
| Hiểu nghiệp vụ Đại hội và giới hạn sản phẩm | [Nghiệp vụ Đại hội số](nghiep-vu/NGHIEP-VU-DAI-HOI.md) |
| **Lưu file trên Google Drive, đại biểu chỉ xem tên/link** | [Google Drive V18 — hướng dẫn hiện hành](tinh-nang/tai-lieu/GOOGLE-DRIVE-LINKS-V18.md) |
| Điều hành điểm danh và mã QR | [QR theo phiên và barcode](tinh-nang/diem-danh/DIEM-DANH-QR-PHIEN-VA-BARCODE.md) |
| Trình chiếu đại biểu vừa đến và sơ đồ ghế | [Màn hình điểm danh V16](tinh-nang/diem-danh/MAN-HINH-DIEM-DANH-V16.md) |
| Xây dựng sơ đồ ghế và nhập Excel | [Seating Grid Canvas](tinh-nang/cho-ngoi/SEATING-GRID-CANVAS.md) |
| Quản lý thông tin, ảnh đại biểu | [Ảnh đại biểu](tinh-nang/dai-bieu/DAI-BIEU-ANH.md) |
| Thống kê giới tính, ngày sinh của người điểm danh | [Phân tích chất lượng đại biểu V15](tinh-nang/dai-bieu/PHAN-TICH-CHAT-LUONG-DAI-BIEU-V15.md) |
| Nhân sự BCH và ảnh hồ sơ | [Danh sách trích ngang BCH](tinh-nang/nhan-su/NHAN-SU-BCH.md) |
| Thiết kế trên điện thoại và máy tính | [Responsive UI](giao-dien/RESPONSIVE-UI.md) |
| Nhận diện thương hiệu | [Giao diện hiện hành](giao-dien/GIAO-DIEN-HIEN-HANH.md) |
| Tra cứu thiết kế/giải pháp của các bản cũ | [Lịch sử phiên bản](lich-su/README.md) và [bản lưu README gốc](lich-su/README-GOC-2026-11-09.md) |

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
| Google Drive | **V18** | **Đã triển khai và thử kết nối + upload/chia sẻ/thu hồi/xóa qua Apps Script trên local (09/11/2026)**. Chưa kiểm chứng trang BTC/cổng đại biểu với dữ liệu thật và **chưa cấu hình Vercel Production**. Xem hướng dẫn V18. |
| Màn hình điểm danh | **V16** | Chào mừng đại biểu ở trên; QR và sơ đồ ghế bên dưới. |
| Thống kê đại biểu | **V15** | Chỉ phân tích người đã điểm danh; cần migration V15 trên Supabase. |
| Cổng đại biểu | V14 cùng V15 | Đọc thêm trong `lich-su/dai-bieu/` để hiểu các quyết định lịch sử, không lấy đó làm trạng thái production. |
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
