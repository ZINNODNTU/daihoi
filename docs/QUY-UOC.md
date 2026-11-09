# Quy ước quản lý tài liệu

## 1. Mục đích các thư mục

- `docs/README.md`: điểm truy cập duy nhất cho tài liệu đang sử dụng.
- `docs/huong-dan/`: **cách làm** (setup, migrate, deploy, runbook).
- `docs/nghiep-vu/`: quy tắc nghiệp vụ và các quyết định cần BTC xác nhận.
- `docs/tinh-nang/<phan-he>/`: hướng dẫn sử dụng, phân quyền, API và trường dữ liệu theo chức năng.
- `docs/giao-dien/`: responsive, nhận diện và thiết kế.
- `docs/lich-su/`: các tài liệu của phiên bản cũ và những thông tin ghi lại tại một thời điểm; **không sử dụng thay thế hướng dẫn hiện hành**.

## 2. Nguyên tắc viết

1. **Một nguồn tham chiếu chính cho từng tính năng.** Không đặt hai hướng dẫn đều tự nhận là mới nhất, đặc biệt Google Drive và màn hình điểm danh.
2. Khi chuyển phiên bản: cập nhật tài liệu hiện hành, chuyển tài liệu cũ vào `lich-su/`, sửa mọi đường dẫn trong README và kiểm thử.
3. Tên file dùng **chữ in hoa không dấu**, phân tách bằng dấu gạch ngang; chỉ giữ `-Vxx` khi cần lưu bản đã phát hành. Tên thư mục dùng chữ thường không dấu, phân tách bằng dấu gạch ngang.
4. Tiêu đề `#` duy nhất; các mục theo cấp `##`, `###`. Trình bày quy trình bằng thứ tự thao tác, bảng cấu hình khi phù hợp. Ghi ngày và **trạng thái đã xác minh / chưa xác minh**.
5. Trong tài liệu nằm dưới `docs/`, sử dụng **Markdown link tương đối** như `[Hướng dẫn](huong-dan/QUY-TRINH-TRIEN-KHAI.md)`. Với đường dẫn lệnh thực thi từ root, dùng inline code `supabase/...sql`, `scripts/...mjs`.
6. Không lưu mật khẩu, mã truy cập, OAuth Refresh Token, file cấu hình thật, email đăng nhập cá nhân hoặc dữ liệu đại biểu thực trong `docs/`.
7. Không ghi “triển khai thành công” chỉ vì lint/build/test pass. Cần phân biệt **code**, **migrations**, **OAuth/Apps Script**, **Vercel** và **nghiệm thu thiết bị thật**.
8. Thay đổi đường dẫn tài liệu phải cập nhật root `README.md`, `docs/README.md`, tham chiếu trong tài liệu khác và kiểm thử đường dẫn.

## 3. Trạng thái tài liệu

- **Hiện hành:** nội dung phản ánh cách triển khai/khả năng trong mã nguồn mới nhất, không ngầm khẳng định production đã hoạt động.
- **Tham khảo:** nghiên cứu và yêu cầu cần kiểm chứng (ví dụ nghiệp vụ Đại hội).
- **Lịch sử:** mô tả một mốc Vxx/ngày; có thể chứa cấu hình và giao diện không còn sử dụng.

## 4. Kiểm thử trước commit

```bash
npm run lint
npm run build
node --test tests/*.test.mjs
git diff --check
```

Kiểm thử `tests/docs-structure.test.mjs` sẽ kiểm tra những đường dẫn nội bộ trong Markdown và bảo đảm các tài liệu hiện hành được lập chỉ mục. Nếu đổi đường dẫn cần cập nhật kiểm thử **đồng thời** với thao tác `git mv`.

Mục lục chính thức: [docs/README.md](README.md).
