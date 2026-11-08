# ĐẠI HỘI SỐ

Nền tảng điều hành **nhiều Đại hội Đoàn TNCS Hồ Chí Minh và Hội Sinh viên Việt Nam**.

## Trải nghiệm giao diện V3

- **Trang chủ mới:** http://localhost:3000/ — nhận diện midnight navy/gold, bố cục editorial và trình diễn sản phẩm.
- **Xem thử tương tác:** http://localhost:3000/preview — chuyển giữa bảng điều hành, sơ đồ ghế và điểm danh **không cần đăng nhập hoặc Supabase**; toàn bộ dữ liệu trên trang này là giả lập.
- Dashboard nội bộ, sidebar, đăng nhập và sơ đồ ghế đã được đồng bộ với hệ thiết kế mới.
- Xem chi tiết trong `docs/UI-V3-BRANDING.md`. Các trang dữ liệu thật vẫn yêu cầu kết nối Supabase.

## Trạng thái triển khai (MVP 01)

Đã viết mã và kiểm tra build cho các chức năng:
- Đăng nhập bằng Supabase Auth; kiểm soát quyền theo từng Đại hội.
- Super Admin tạo đơn vị và Đại hội; xem Dashboard đa Đại hội.
- BTC quản lý đại biểu, thêm thủ công, nhập Excel `.xlsx` / `.csv`.
- **QR cá nhân cố định (dh2)** 74 ký tự + **QR theo từng phiên (dh3)** 95 ký tự, ký HMAC và hỗ trợ đọc QR dh1 đã in. BTC cấu hình từng phiên nhận QR cố định, QR phiên hoặc cả hai.
- BTC tạo giờ **mở/đóng quét điểm danh** bằng giờ Việt Nam GMT+7, được kiểm tra tại API và database trigger, có thể đóng sớm.
- Mỗi đại biểu có **mã định danh** và **barcode Code 128** riêng; BTC dùng camera hoặc máy quét/nhập barcode để tìm hồ sơ khi QR lỗi, bắt buộc xác nhận danh tính và lý do trước khi điểm danh. Camera hỗ trợ quét QR liên tục.
- Điểm danh độc lập theo phiên; ràng buộc UNIQUE tại Postgres chống trùng khi nhiều máy gửi đồng thời.
- Nhật ký thời gian, người thực hiện và phương thức; thống kê theo phiên (client làm mới mỗi 12 giây, không dùng kết nối Realtime cho mọi đại biểu).
- **Trang Báo cáo theo phiên**: chính thức/dự khuyết/khách mời riêng, bảng theo đơn vị, lọc có/chưa check-in, xuất CSV, in báo cáo (trình duyệt có thể lưu PDF). Không tự xác nhận tư cách hoặc quyền biểu quyết.
- Tài liệu khảo sát nghiệp vụ và ưu tiên triển khai tại `docs/NGHIEP-VU-DAI-HOI.md`.
- Lưu và tải ảnh/tài liệu lên Google Drive qua OAuth của **một tài khoản quản lý** (chỉ hoạt động khi đã cấu hình OAuth).
- Các bảng dự phòng cho biểu quyết công khai, **chưa triển khai giao diện và nghiệp vụ biểu quyết**. Chưa hỗ trợ bầu cử bằng phiếu kín.

**Supabase:** CSDL 13 bảng cơ bản đã được tạo tại project `pnxdxdagpeyqarucdphk`, RLS bật 13/13 bảng. **Bản nâng cấp QR phiên/barcode chưa được áp dụng lên project trực tuyến** vì hồ sơ Chrome không thể xác minh và Supabase connector không có project này. SQL nâng cấp tại `supabase/upgrade-attendance-v2.sql`. `.env.local` vẫn cần **Publishable Key**, **SUPABASE_SECRET_KEY** (server-only) và tài khoản Super Admin. Chưa kiểm thử đăng nhập/RLS đa tài khoản thực, Google OAuth, deploy Vercel, tải 200 người hay camera/barcode trên điện thoại thật. Xem `docs/DIEM-DANH-QR-PHIEN-VA-BARCODE.md`.

## Module Sơ đồ chỗ ngồi (v4 — 06/11/2026)

- Truy cập `/congresses/[id]/seating`: tự tạo khu vực, hàng ghế và lối đi, kéo-thả/tinh chỉnh vị trí; lưu nhiều sơ đồ riêng theo Đại hội.
- Nhấp ghế để phân công, chuyển hoặc bỏ gán đại biểu; đối chiếu trạng thái điểm danh theo phiên đã chọn.
- Tải mẫu Excel `.xlsx` có mã ghế, mã đại biểu và phiên bản; nhập để gộp hoặc thay thế phân công sau khi kiểm tra lỗi.
- Cơ sở dữ liệu mới `supabase/upgrade-seating-v4.sql`: `seating_layouts`, `seats`, `seat_assignments`, RLS, API server-only và RPC giao dịch có kiểm tra phiên bản chống ghi đè đồng thời.
- **Chưa áp dụng migration v4 lên Supabase thực tế**, vì tài khoản kết nối hiện không được cấp quyền dự án `pnxdxdagpeyqarucdphk`; xem `docs/SO-DO-CHO-NGOI.md` trước khi đưa vào vận hành.

## Yêu cầu

- Node.js >= 20 (đã xây dựng bằng Node 24)
- Supabase project, Auth email/password
- Google Cloud Project bật Google Drive API, OAuth client và refresh token
- Vercel nếu muốn triển khai internet

## Cài đặt chạy máy

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Trên Windows: `Copy-Item .env.example .env.local`.

1. Điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, và khóa **`SUPABASE_SECRET_KEY`** chỉ ở server từ trang Project Settings → API Keys. Tuyệt đối không gắn tiền tố `NEXT_PUBLIC_` cho Secret Key hoặc đẩy lên git. Không gửi các khóa vào chat.
2. Tạo `QR_HMAC_SECRET` với tối thiểu 32 ký tự ngẫu nhiên (giữ bí mật trên Vercel). Đổi secret sẽ khiến QR cũ không hợp lệ.
3. Nếu tạo **project mới**, chạy `supabase/schema.sql`. Nếu dùng **project pnxdxdagpeyqarucdphk đã có**, sao lưu trước và chạy `supabase/upgrade-attendance-v2.sql` trong SQL Editor, KHÔNG chạy lại file schema.sql trên project đang có. Kiểm thử RLS và ngăn INSERT trực tiếp vào checkins trước khi vận hành.
4. Tạo tài khoản quản trị trong Authentication → Users. Nếu đã tạo tài khoản **trước khi chạy SQL**, backfill profile:
   ```sql
   insert into public.profiles (id,full_name)
   select id,coalesce(raw_user_meta_data->>'full_name','')
   from auth.users on conflict (id) do nothing;
   ```
5. Tự cấp vai trò quản trị tổng **bằng SQL Editor (không qua client)**:
   ```sql
   update public.profiles
   set platform_role='super_admin'
   where id='<USER_UUID>';
   ```
6. Đăng nhập `/login` → `/dashboard` → tạo Đại hội → thêm đại biểu → tạo phiên → quét hoặc điểm danh thủ công.

Không mở đăng ký công khai. Khi tạo nhân sự BTC thứ hai, tạo user qua Supabase Auth và gắn vào đại hội:
```sql
insert into public.congress_members(congress_id,user_id,role)
values ('<CONGRESS_UUID>','<USER_UUID>','checkin');
```
Vai trò: `admin` (quản trị Đại hội), `checkin` (QR/thủ công), `secretary` (xem, chưa điều hành).

## Google Drive: thiết lập

Phiên bản đầu sử dụng **một Drive chung** do Ban Quản trị sở hữu; mỗi đại hội có thư mục con riêng.
- Bật Google Drive API; cấu hình OAuth consent, ứng dụng và OAuth client phù hợp. Dùng OAuth 2.0 **offline** để cấp refresh token cho tài khoản quản lý. Tài khoản phải có quyền ghi thư mục Drive gốc.
- Điền `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_ROOT_FOLDER_ID` trong biến môi trường server; tuyệt đối không sử dụng `NEXT_PUBLIC_` cho các khóa này.
- Thư mục gốc cần được cấp quyền ghi cho tài khoản OAuth. Khi tải tệp đầu tiên, backend tạo thư mục `DAI_HOI_<id>`, tải tệp lên và lưu `drive_file_id` ở Supabase.
- Ảnh và tài liệu được đọc qua API đã kiểm tra quyền (không công khai link Drive). Không xem Drive như CDN; nếu cần hình ảnh công khai lưu lượng lớn, bổ sung CDN/bộ nhớ đệm phù hợp.\n- Giới hạn upload **4 MB/tệp** để không vượt giới hạn 4.5 MB request/response của Vercel Functions. Tệp lớn hơn cần quy trình upload trực tiếp/chia khối qua API chuyên dụng, chưa hỗ trợ.

**Lưu ý về service account:** Google Drive service account không sở hữu dung lượng lưu trữ cá nhân, do đó cần Shared Drive hoặc OAuth của người dùng nếu sử dụng My Drive. Ở đây sử dụng OAuth người dùng. Mở rộng **mỗi đơn vị kết nối Drive riêng** cần thêm bảng kết nối OAuth và mã hóa refresh token; chưa triển khai.

## Triển khai Vercel

1. Đẩy Git repository lên GitHub (không commit `.env.local`).
2. Tạo dự án Vercel từ repository, framework Next.js. Thiết lập các biến môi trường bên trên (không public hóa secret).
3. Kiểm tra callback/URL cho Supabase Auth trong Auth → URL Configuration theo domain Vercel.
4. Mở HTTPS, cấp quyền camera, kiểm tra QR trên iPhone Safari và Android Chrome.
5. Trước Đại hội thật, kiểm thử 200 yêu cầu đồng thời; kiểm tra RLS, mạng yếu, nhập Excel, xử lý gửi phiếu trùng và lỗi Google Drive.

Lưu ý: camera chạy trên thiết bị; backend chỉ nhận **mã QR**. `getUserMedia` cần HTTPS hoặc localhost và quyền camera.

## Cấu trúc

- `src/app/`: trang và HTTP API Next.js
- `src/components/`: giao diện Dashboard, danh sách đại biểu, QR, check-in và Drive
- `src/lib/qr.ts`: ký / xác thực QR bằng HMAC
- `src/lib/auth.ts`: xác minh quyền trên server
- `supabase/schema.sql`: schema, constraint và chính sách RLS
- `tests/qr.test.mjs`: kiểm thử QR thu hồi, sửa mã, sai secret

## Độ tin cậy và các bước hoàn thiện

1. Đối chiếu số lượng có mặt và số đại biểu **có quyền biểu quyết**; không dùng check-in đơn thuần làm căn cứ phiếu bầu.
2. Chạy RLS integration tests với ít nhất hai Đại hội độc lập, role admin/checkin/secretary.
3. Kiểm thử concurrency thực: quét QR và điểm danh thủ công cùng một đại biểu ở 2–3 máy phải chỉ tạo **1** record.
4. Thêm rate limiting theo IP/user cho endpoint QR, đợi mạng/ retry an toàn, theo dõi lỗi Vercel/Supabase.
5. Bổ sung phê duyệt/hủy điểm danh có lý do và lịch sử thao tác bất biến, kết xuất Excel/PDF.
6. Biểu quyết công khai cần cơ chế quyền biểu quyết, khóa phiên, snapshot mẫu số và bất biến phiếu. **Bầu cử kín** là bài toán bảo mật và nghiệp vụ riêng.
7. Các báo cáo và công cụ phục hồi cần kiểm thử trước khi sử dụng trong đại hội thực tế.

## Nguồn tham khảo kỹ thuật

- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth SSR Next.js: https://supabase.com/docs/guides/auth/server-side
- Supabase Realtime limits: https://supabase.com/docs/guides/realtime/limits
- Google Drive uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Google Drive service accounts: https://developers.google.com/workspace/drive/api/guides/handle-errors
- Browser camera API: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- Vercel function scaling: https://vercel.com/docs/functions/concurrency-scaling

## Bổ sung vận hành BTC (05/11/2026)

- Quản lý nhân sự BTC tại /congresses/[id]/team: mời tài khoản bằng email qua Supabase Auth, phân vai trò admin/checkin/secretary, điều chỉnh hoặc gỡ quyền. Mọi thao tác quản lý quyền ghi qua Next.js server dùng SUPABASE_SECRET_KEY, không cho ghi trực tiếp bằng client. Tương tự, cập nhật phiên điểm danh, thay đổi thông tin Đại hội và ghi metadata tài liệu đều được kiểm tra tại API server.
- Cấu hình Đại hội tại /congresses/[id]/settings: tên, nhiệm kỳ, địa điểm, trạng thái; chỉ Admin của Đại hội được chỉnh sửa.
- Bản SQL mới: **supabase/upgrade-management-v3.sql**, bắt buộc chạy **sau** upgrade-attendance-v2.sql và sao lưu đúng project. Cần triển khai API mới **trước khi chạy v3** để không gián đoạn việc gán thành viên BTC.
- Kiểm tra điều kiện chạy production bằng `npm run readiness`; hướng dẫn từng bước ở docs/QUY-TRINH-TRIEN-KHAI.md.
- Vào thời điểm cập nhật này, Supabase Publishable/Secret Keys, Google Drive OAuth và Vercel chưa được cấu hình hoàn chỉnh; không được tuyên bố đã triển khai hệ thống production.

## Nâng cấp giao diện Responsive (06/11/2026)

- Giao diện trang chủ, đăng nhập, dashboard, điều hành Đại hội, quản lý đại biểu, điểm danh, báo cáo, tài liệu, nhân sự và cấu hình đã được thiết kế lại theo cùng một hệ thẻ/nút/trạng thái.
- Máy tính: sidebar cố định, bảng chi tiết, bộ lọc và KPI nhiều cột. Điện thoại: menu trượt, thanh điều hướng 4 nghiệp vụ ở cuối màn hình, các danh sách dưới dạng thẻ, hộp thoại dạng bottom-sheet.
- Camera trên điện thoại dùng bố cục quét 4:3; màn hình điểm danh có nút lớn và luồng dự phòng rõ ràng, giữ nguyên xác thực API và thời gian quét ở máy chủ.
- Hỗ trợ nhập liệu chống zoom iOS, vùng safe-area, phím Escape, focus-visible, điều khiển bàn phím cơ bản và reduced-motion; cập nhật CSS in.
- Tài liệu kỹ thuật và quy trình kiểm tra giao diện: `docs/RESPONSIVE-UI.md`. Kiểm thử cấu trúc mới: `tests/responsive-ui.test.mjs` (không thay thế kiểm thử giao diện thực tế).

## Tài khoản đại biểu & nhận diện Đoàn (08/11/2026)

- Giao diện trang chủ, trang đăng nhập và các trang điều hành sử dụng bảng màu xanh thanh niên, vàng và trắng; tiêu đề dùng phông sans có dấu tiếng Việt đầy đủ, loại bỏ chữ nghiêng Georgia gây tách dấu/trống chữ.
- `/congresses/[id]/delegates`: tạo đại biểu thủ công hoặc **Tải Excel mẫu → Nhập Excel/CSV → xem trước → Xác nhận nhập**. File cần các cột `MSSV`, `Họ tên`, `Chi đoàn`, `Chức vụ`, `Vai trò` (Chính thức/Dự khuyết/Khách mời), `Mã đại biểu` (tùy chọn). Tối đa **250 dòng/lần**, file tối đa **2 MB**, kiểm tra trùng MSSV và mã đại biểu. Hệ thống sinh login dạng `<MSSV>@dntu.edu.vn`; riêng khách mời có thể không có MSSV.
- Admin có nút **Cấp tài khoản** (100 người/lần). Tài khoản mới có mật khẩu ngẫu nhiên riêng, xuất CSV **một lần** (không lưu mật khẩu dạng rõ ở database hoặc log). Nếu MSSV đã có tài khoản từ Đại hội khác, hệ thống liên kết tài khoản hiện hữu, không đổi mật khẩu. Có role `guest` chỉ xem, không được tự quản trị hoặc điểm danh.
- `/my-card`: đại biểu đăng nhập xem mã QR định danh của chính mình, barcode dự phòng, tải QR, in thẻ và đổi mật khẩu.
- **Bắt buộc cập nhật Supabase trước khi nhập dữ liệu**: chạy `supabase/upgrade-delegate-accounts-v5.sql` trong SQL Editor của đúng project sau các nâng cấp trước đó. Cần cấp `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và `SUPABASE_SECRET_KEY` trong `.env.local`, và cũng cấu hình trên Vercel. Không đưa Secret Key vào trình duyệt và không commit `.env.local`.
- **Tạo quản trị viên một lần**: đặt biến môi trường `DAIHOI_BOOTSTRAP_PASSWORD` là mật khẩu ban đầu do BTC chọn (ít nhất 12 ký tự), sau đó chạy `npm run bootstrap:admin`. Lệnh tạo tên đăng nhập hiển thị `admin@dntu.edu.vn` (Auth dùng miền nội bộ `@accounts.daihoi.invalid`), cấp `profiles.platform_role='super_admin'`; nếu tài khoản đã tồn tại sẽ **dừng, không nâng quyền**. Phải dùng Supabase Secret Key phía server. Sau khi tạo thành công, xóa biến mật khẩu khỏi shell/CI. Đổi mật khẩu trước khi sử dụng thực tế.
- **Định danh không phụ thuộc hộp thư**: các địa chỉ `@dntu.edu.vn` trong danh sách được dùng làm **tên đăng nhập hiển thị**, không phải email đã được BTC xác minh. Các tài khoản cấp từ phần mềm thực sự đăng ký với Supabase Auth bằng miền dự trữ `@accounts.daihoi.invalid`, để chủ sở hữu hộp thư `@dntu.edu.vn` thật không thể đặt lại mật khẩu tài khoản nội bộ. Tài khoản cơ quan đã được mời từ trước vẫn có thể đăng nhập với email thật. Không gửi mật khẩu tới các email giả lập; nếu mất mật khẩu phải được BTC cấp lại qua kênh xác thực nội bộ.

Các yêu cầu triển khai cần được xác minh bằng kiểm tra đăng nhập, RLS của các vai trò admin/checkin/delegate/guest, và dữ liệu import thực tế. Khi chưa cấu hình Supabase Publishable/Secret Key, giao diện xem mẫu vẫn hoạt động nhưng **không thể đăng nhập, cấp tài khoản hay lưu đại biểu**.

## Khắc phục lỗi kết nối Supabase (08/11/2026)

Nếu trang đăng nhập báo **Chưa kết nối cơ sở dữ liệu**, hệ thống đã xác nhận dịch vụ Supabase tại `pnxdxdagpeyqarucdphk.supabase.co` có phản hồi từ mạng local, nhưng `.env.local` chưa có `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và `SUPABASE_SECRET_KEY`. Đây là lỗi **thiếu API key**, không phải lỗi giao diện hay lỗi mạng.

1. Mở Supabase Dashboard của **project pnxdxdagpeyqarucdphk** (Project Settings → API Keys).
2. Trên máy Windows, chạy `npm run setup:supabase`. Dán **Publishable Key** và **Secret Key** khi chương trình hỏi (Secret Key nhập ẩn). Script ghi vào `.env.local` đã được Git ignore; không in hoặc commit khóa.
3. Dừng tiến trình `npm run dev` cũ rồi chạy lại, vì Next.js chỉ nạp biến môi trường khi bắt đầu quá trình.
4. Chạy `npm run check:supabase`. Chương trình sẽ kiểm tra truy cập Auth, khóa public và quyền khóa server và xác nhận schema v5, không hiển thị giá trị khóa.
5. Nếu triển khai Vercel, cấu hình cùng các biến môi trường trong Project Settings → Environment Variables, sau đó redeploy. Không tạo/sử dụng Supabase project khác.

Tương thích: app chấp nhận `NEXT_PUBLIC_SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` (khóa legacy) khi chưa có khóa mới. Các khóa secret chỉ được dùng trong Node.js server/API; tuyệt đối không đặt tiền tố `NEXT_PUBLIC_` cho Secret Key.

**Nếu thiếu quyền xem API Keys**, cần đăng nhập đúng tài khoản có quyền với project đó hoặc cấp quyền qua Supabase; công cụ không được tự tạo khóa cho project không thuộc quyền truy cập. Tài khoản admin và migration v5 chưa được tạo/áp dụng chỉ nhờ sửa mã nguồn.