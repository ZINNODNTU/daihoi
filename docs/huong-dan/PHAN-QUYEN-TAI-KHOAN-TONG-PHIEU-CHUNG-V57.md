# V57 — Phân quyền riêng từng tài khoản BTC và tổng phiếu BCH dùng chung

Cập nhật: 12/11/2026. Supabase project production `pnxdxdagpeyqarucdphk`. Migration: `supabase/upgrade-bch-shared-ballot-account-permissions-v57.sql`. Đã thi hành migration trong SQL Editor bằng Computer Use, chạy lại truy vấn API để xác minh bảng phân quyền và trường tổng phiếu chung. Không tự nhập phiếu giả cho bất kỳ ứng cử viên nào.

## 1. Phân quyền theo tài khoản (không chỉ ma trận vai trò)

- **Quản trị → Phân quyền** hiển thị danh sách tài khoản BTC đang hoạt động của đúng Đại hội. Click một tài khoản để xem và bật/tắt **từng chức năng nghiệp vụ** như quản lý đại biểu, chỉnh sơ đồ ghế, quét điểm danh, nhân sự BCH, tài liệu, báo cáo.
- Vai trò BTC (`admin`, `checkin`, `secretary`) là **giới hạn quyền tối đa**. Có thể thu hồi riêng một số chức năng của một người, nhưng **không cấp vượt vai trò**, không cấp quyền nâng cấp người khác thành quản trị hệ thống, không cấp quyền quản lý tài khoản hay cấu hình bằng checkbox. Muốn có quyền ngoài vai trò nền, quản trị viên cần đổi vai trò trước.
- Ví dụ: Hai tài khoản BTC có vai trò `admin` như nhau nhưng chỉ một tài khoản được phép nhập kết quả BCH; tài khoản kia bị tắt `bch.write` nhưng vẫn được xem `bch.read`.
- Quyền tùy chỉnh được lưu trong `public.btc_account_capability_restrictions`. Một record mang `allowed=false` có nghĩa là quyền thuộc vai trò đã **bị hạn chế**. Không có record là mặc định theo vai trò, không phải cấp phép bổ sung.
- Chỉ admin BTC có quyền `team.manage` hoặc super admin mới có thể chỉnh quyền người khác. Không cho tài khoản tự chỉnh quyền mình; không cấp quyền BTC cho đại biểu. API dùng service key **ở máy chủ** sau khi xác minh đúng Đại hội và vai trò BTC đang hoạt động.
- Menu workspace sử dụng `getCongressEffectiveAbilities`; API ghi dữ liệu và các trang nghiệp vụ cũng kiểm tra quyền hiệu lực tại máy chủ. Một số bảng dữ liệu gốc có thêm RLS `AS RESTRICTIVE` để ngăn ứng dụng khác bỏ qua hạn chế bằng truy cập PostgREST trực tiếp.
- Các thay đổi về quyền được ghi log `btc.account_permission_updated`; đổi vai trò nền tiếp tục ghi log hiện hành.

## 2. Một tổng phiếu chung trên toàn bộ danh sách BCH

- Đại hội **Đoàn** có **duy nhất một trường tổng phiếu**: `congresses.bch_total_ballots`. BTC nhập và **Lưu tổng phiếu** một lần ở đầu khu vực **Kết quả kiểm phiếu BCH**.
- Từng ứng viên có một ô **Số phiếu đạt** và `Lưu phiếu`, không yêu cầu nhập tổng phiếu lại. Tỷ lệ là `số phiếu đạt / tổng phiếu chung × 100`.
- Ví dụ: tổng phiếu `190`, nhân sự A đạt `175` → `92,11%`; nhân sự B đạt `168` → `88,42%`. Đây chỉ là minh họa giao diện, không phải dữ liệu phiếu production.
- Phiếu chung có phạm vi **từng Đại hội**, không được tự động suy từ số đại biểu điểm danh, số phiếu hợp lệ hoặc lượt check-in. Số liệu phải xuất phát từ biên bản kiểm phiếu.
- Migration V57 chỉ backfill trường tổng chung **nếu các tổng phiếu đã lưu trước đó hoàn toàn nhất quán**. Các bản ghi nhân sự có sẵn không bị xóa.
- RPC Postgres `set_bch_shared_ballot_total` áp dụng tổng phiếu chung cho toàn bộ kết quả đã lưu trong một giao dịch. Nếu tổng mới thấp hơn bất cứ phiếu đạt nào đã ghi nhận, hoặc cố xóa tổng khi đã có phiếu đạt, RPC trả lỗi và không thay đổi dữ liệu.
- API kiểm phiếu ứng viên vẫn dùng `expectedUpdatedAt` để chặn ghi đè từ tab cũ; hồ sơ và ảnh đại biểu không bị sửa. Excel xuất giữ cột tổng phiếu chung và tỷ lệ, dữ liệu nội bộ chỉ dành cho BTC có quyền.

## 3. Kiểm thử và triển khai

- Mẫu số chung và luồng tài khoản được kiểm thử bởi `tests/bch-ballot-direct-entry-v56.test.mjs`, `tests/bch-ballot-route-functional-v56.test.mjs`, `tests/bch-permissions-diagnostics-v55.test.mjs`, `tests/account-permission-functional-v57.test.mjs`.
- Migration chạy thật trên PostgreSQL thu nhỏ PGlite qua `tests/congress-account-ballots-sql-v57.test.mjs`, bao gồm giữ phiếu cũ, backfill hợp lệ, cập nhật đồng bộ, từ chối tổng không phù hợp, không được tự cấp quyền.
- Regression toàn dự án: `node --test tests/*.test.mjs`; kiểm tra `npm run lint`, `npx tsc --noEmit`, `npm run docs:check`, `npm run build`.
- Kiểm tra thực sau deploy bằng **hai tài khoản BTC có quyền khác nhau** trên một Đại hội; vào **Phân quyền**, tắt `bch.write` của một tài khoản; xác nhận menu/nút lưu và API không cho nhập phiếu, trong khi tài khoản BTC được cấp quyền vẫn nhập bình thường. Không nhập số liệu giả vào production.

## 4. Giới hạn vận hành cần hiểu rõ

Mỗi Đại hội có một tổng phiếu BCH dùng chung **theo yêu cầu nghiệp vụ hiện tại**. Nếu Đại hội tổ chức nhiều vòng bầu cử với tổng phiếu khác nhau, phải thiết kế riêng từng vòng/phiên kiểm phiếu trước khi nhập dữ liệu, không tái sử dụng số tổng phiếu chung này để ghi đè các vòng đã diễn ra.

