# Đại hội số

Nền tảng quản lý và điều hành **nhiều Đại hội Đoàn TNCS Hồ Chí Minh và Hội Sinh viên Việt Nam**, xây dựng bằng **Next.js, Supabase** và **Google Drive**. Hỗ trợ Ban Tổ chức (BTC), quản trị hệ thống và cổng riêng cho đại biểu.

> **Bắt đầu từ [mục lục tài liệu chính thức](docs/README.md)**. Đây là nguồn tham chiếu hiện hành cho cài đặt, nghiệp vụ, phân quyền và quy trình triển khai. Ghi chép triển khai cũ được lưu tại [lịch sử](docs/lich-su/README.md).

## Chức năng chính

| Phân hệ | Nội dung |
| --- | --- |
| Đại hội và phân quyền | Quản lý nhiều Đại hội; tài khoản quản trị, BTC và đại biểu có phạm vi truy cập riêng |
| Đại biểu | Hồ sơ, ảnh chân dung, barcode, tài khoản, nhập Excel và thẻ đại biểu tối ưu điện thoại |
| Điểm danh | Phiên và QR riêng, camera quét, điểm danh thủ công, màn hình chào mừng và theo dõi ghế |
| Sơ đồ ghế | Thiết kế theo từng phiên/hội trường, phân ghế, nhập/xuất Excel |
| Phân tích | Báo cáo hiện diện; thống kê giới tính và tuổi **chỉ trên đại biểu đã điểm danh** |
| Tài liệu | BTC upload lên Google Drive; đại biểu xem **icon + tên file**, nhấn để mở Drive |
| Nhân sự BCH | Hồ sơ trích ngang, ảnh và giao diện flashcard để xem nhân sự |
| Nhật ký hệ thống | System Logs, nhóm sự cố lặp lại, theo dõi lỗi tái phát, tự bắt exception, Request ID và trạng thái khắc phục (cần migration V36 + V37) |

Các khả năng trong bảng phản ánh **mã nguồn hiện có**, không xác nhận rằng database production, Google Drive hay Vercel đã cấu hình hoặc nghiệm thu hoàn chỉnh.

## Khởi chạy trên máy phát triển

Yêu cầu **Node.js 20+** và quyền truy cập một dự án Supabase hợp lệ.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Trên Windows, thay `cp` bằng `Copy-Item .env.example .env.local`. Cấu hình biến môi trường bằng giá trị thật **trên máy chạy website**, không đưa khóa bí mật vào Git. Truy cập `http://localhost:3000`.

Để kiểm tra trước khi triển khai:

```bash
npm run docs:check
npm run lint
npm run build
node --test tests/*.test.mjs
npm run readiness
```

`readiness` và các kiểm thử mã nguồn **không thay thế** kiểm chứng migration, phân quyền RLS, quyền Google Drive, Vercel và thiết bị thực.

## Tài liệu cần đọc

- **Cài đặt / triển khai:** [Quy trình triển khai](docs/huong-dan/QUY-TRINH-TRIEN-KHAI.md).
- **Database:** [Checklist Supabase và migration](docs/huong-dan/SUPABASE-SETUP.md).
- **Tệp Google Drive:** [Tài liệu V18 — upload và mở link](docs/tinh-nang/tai-lieu/GOOGLE-DRIVE-LINKS-V18.md).
- **Điểm danh:** [QR phiên và barcode](docs/tinh-nang/diem-danh/DIEM-DANH-QR-PHIEN-VA-BARCODE.md), [màn hình trực tiếp V16](docs/tinh-nang/diem-danh/MAN-HINH-DIEM-DANH-V16.md).
- **Đại biểu:** [Phân tích chất lượng V15](docs/tinh-nang/dai-bieu/PHAN-TICH-CHAT-LUONG-DAI-BIEU-V15.md), [sơ đồ ghế](docs/tinh-nang/cho-ngoi/SEATING-GRID-CANVAS.md).
- **Nghiệp vụ:** [Quy trình Đại hội](docs/nghiep-vu/NGHIEP-VU-DAI-HOI.md).
- **Giao diện:** [Responsive UI](docs/giao-dien/RESPONSIVE-UI.md).
- **Quy ước đóng góp:** [Chuẩn tài liệu](docs/QUY-UOC.md).
- **Giám sát lỗi hệ thống:** [System Logs V36](docs/huong-dan/NHAT-KY-HE-THONG-V36.md), [Error & Incident Monitoring V37](docs/huong-dan/ERROR-INCIDENT-MONITORING-V37.md).

**Mục lục đầy đủ:** [docs/README.md](docs/README.md). **Lịch sử README cũ:** [snapshot 09/11/2026](docs/lich-su/README-GOC-2026-11-09.md).

## Cấu trúc mã nguồn

```text
src/app/            Trang web, giao diện đại biểu và API Next.js
src/components/     Thành phần giao diện và nghiệp vụ
src/lib/            Xác thực, QR, Google Drive, Supabase và tiện ích
supabase/           Schema, migration và RLS
scripts/            Công cụ vận hành, readiness và Apps Script bridge
tests/              Kiểm thử tự động
docs/               Tài liệu hiện hành và kho lưu trữ phiên bản cũ
```

**Lưu ý triển khai:** Không mở tài liệu nhạy cảm dưới chế độ “Anyone with the link” của Google Drive. Mỗi Đại hội phải kiểm tra phân quyền và thử điểm danh thực tế trước khi sử dụng chính thức.
