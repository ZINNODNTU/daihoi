# Giao diện Editorial V33 — thiết kế trải nghiệm Đại hội số

Ngày áp dụng: 10/11/2026. Không thay đổi schema Supabase, quyền truy cập hay logic điểm danh.

## Khảo sát nguồn mở

| Repo tham khảo | URL | Ý tưởng chọn lọc | Không mang sang |
| --- | --- | --- | --- |
| shadcn/ui (MIT) | https://github.com/shadcn-ui/ui | Cấu trúc điều hướng rõ, trạng thái focus, thành phần dữ liệu gọn | Không cài trọn registry/CLI khi đã có thành phần tương đương |
| Motion Primitives (MIT) | https://github.com/ibelick/motion-primitives | Animation ngắn, cảm giác phản hồi và respect reduced motion | Không tải motion runtime chỉ cho hiệu ứng trang trí |
| Magic UI (MIT) | https://github.com/magicuidesign/magicui | Nền phân lớp, điểm nhấn ánh sáng có kiểm soát | Không thêm WebGL, particle hoặc hiệu ứng liên tục lên màn chiếu |
| Tremor (Apache-2.0) | https://github.com/tremorlabs/tremor | Phân cấp KPI, bối cảnh con số và trạng thái | Không thay đổi thư viện thống kê hiện tại khi chưa cần thiết |

Đây là **nguồn tham khảo về nguyên tắc**, không sao chép trực tiếp source hay giao diện các repo.

## Ngôn ngữ thị giác

**Modern Civic Editorial**: xanh navy `#092f48` / `#0b2e45` cho khối điều hành, nền sáng ấm `#f5f5f0` cho không gian đọc, nhấn vàng `#c7954a` và xanh Đoàn `#006c97`. Logo Đoàn mặc định và Hội theo loại Đại hội được giữ nguyên. Font Be Vietnam Pro vẫn self-hosted.

- **Trang chủ**: typography lớn, hai CTA rõ, console mô phỏng có nhãn "Giao diện minh họa — không phải dữ liệu thật", 4 khả năng cốt lõi, 3 giai đoạn và CTA cuối.
- **Dashboard BTC**: hero có tỷ lệ và số lượng thực từ Supabase; status bar phân trạng thái; metric card có hệ thống màu nhất quán; danh sách có huy hiệu Đoàn/Hội.
- **Cổng đại biểu**: thẻ đổi Đại hội làm điểm tựa thị giác, thanh điều hướng điện thoại tinh gọn, giữ toàn bộ chức năng hiện tại.
- **Đăng nhập**: nâng màu và độ sâu khối xác thực; không đụng phần bảo mật hoặc nút hiển thị mật khẩu.
- **Hiệu năng**: chỉ dùng CSS và lucide đã có, không thêm package animation; `prefers-reduced-motion` tắt motion trang trí.

## Kiểm thử và vận hành

- `npm run build`, `npx tsc --noEmit`, `npx eslint ...`, `node --test tests/*.test.mjs`.
- Đã render Chrome ở desktop 1440 px; thử Chrome CDP Emulation ở width **320, 390, 768 px**, kiểm tra `document.documentElement.scrollWidth === window.innerWidth` trong cả 3 viewport.
- Dashboard BTC cần thêm kiểm thử visual khi đăng nhập bằng tài khoản staff staging; không dùng tài khoản production để chụp screenshot công khai.
- Đánh giá Lighthouse / Web Vitals sau khi deploy tại miền thật (không thể suy ra từ screenshot hoặc build local).

## Lưu ý

Không dùng số liệu minh họa như dữ liệu thật. Không gán ghế giả. Màn điều hành điểm danh production tiếp tục lấy dữ liệu từ Supabase. Mọi bước triển khai thực tế vẫn phụ thuộc Vercel deployment READY và kiểm thử tài khoản thật.
