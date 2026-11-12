# V58 — Sổ kiểm phiếu BCH độc lập & phân quyền tài khoản BTC

Ngày cập nhật: 12/11/2026. Dự án `ZINNODNTU/daihoi`. Supabase production: `pnxdxdagpeyqarucdphk`.

## Nguyên nhân lỗi “Không lưu được tổng số phiếu chung”

V57 dùng hàm `set_bch_shared_ballot_total` với `SECURITY INVOKER` gọi từ tài khoản `authenticated`; nhưng migration bảo mật V3 đã thu hồi quyền `UPDATE public.congresses` của `authenticated`. Truy vấn thực tế tại SQL Editor xác nhận `congress_update=false`, dù `rpc_execute=true`. Vì thế nhập 75 phiếu trong giao diện cũ trả lỗi, không ghi lên database.

**Khắc phục V58:** Chỉ API Next.js sau `getAuth()` và `hasCongressAbility(...,"ballots.write")` mới được gọi `set_bch_shared_ballot_total` qua server-only `createAdminClient()`. Quyền EXECUTE hàm được thu hồi từ `authenticated` và chỉ cấp cho `service_role`. **Không mở lại quyền UPDATE bảng `congresses` cho trình duyệt.** Chạy migration `supabase/upgrade-ballot-room-btc-permissions-v58.sql` sau V57. Migration đã được áp dụng và đã xác nhận RPC service-key thành công với trường hợp không thay đổi dữ liệu trên chính Supabase production; số phiếu ứng viên và tổng phiếu chưa bị tự điền.

## Phân hệ Kiểm phiếu BCH độc lập

- Địa chỉ: `/congresses/<id>/ballots`, menu **Kiểm phiếu BCH**. Chỉ Đại hội có `kind='doan'` được dùng. Trang **Nhân sự BCH** chỉ nhập hồ sơ và ảnh nhân sự; không hiển thị kết quả phiếu hoặc biểu mẫu kiểm phiếu.
- Header xác định Đại hội, trạng thái quyền, nút làm mới, xuất Excel. Thẻ chỉ số hiển thị tổng phiếu, số ứng viên, đã nhập, chưa nhập. Có tìm tên/lọc tình trạng nhập phiếu.
- **Một tổng phiếu chung của Đại hội** (`congresses.bch_total_ballots`) nhập/lưu riêng; phiếu đạt cho từng ứng viên nhập/lưu riêng, tỷ lệ `phiếu đạt / tổng phiếu chung × 100` tính tự động. Không lấy tổng này từ điểm danh QR.
- `GET /api/bch-candidates/ballots` yêu cầu `ballots.read` và chỉ trả trường kiểm phiếu tối thiểu; `PATCH` và API `/total` yêu cầu `ballots.write`. Sửa phiếu dùng RPC `set_bch_candidate_votes_v58` khóa đại hội và kiểm tra mốc `updated_at` chống ghi đè. Sửa tổng phiếu khóa và cập nhật đồng bộ các số đã lưu.
- API thông tin nhân sự chỉ xuất `PUBLIC_BCH_FIELDS`, không trả phiếu. POST/PATCH nhân sự ép `bchWriteData(...,false)` nên không thể điền phiếu nhờ giả mạo `ballotEnabled`. Trigger V58 còn từ chối thay đổi vote fields bằng tài khoản `authenticated` trực tiếp. Đại biểu xem hồ sơ BCH không nhìn thấy số phiếu nội bộ.
- Quyền chỉ xem cho phép xuất Excel, không sửa số phiếu. API trả lỗi riêng khi phát hiện kết quả đã thay đổi hoặc số phiếu vượt tổng. **Không thay thế biên bản kiểm phiếu hợp lệ.** Nếu cần nhiều vòng bầu cử riêng, phải tạo mô hình phiên kiểm phiếu cho từng vòng.

## Phân quyền chuẩn theo tài khoản

- Địa chỉ: `/congresses/<id>/permissions`; chỉ BTC `team.manage` hoặc Super Admin được vào. Chọn tài khoản BTC đang hoạt động; tìm kiếm, xem vai trò, ma trận chức năng theo nhóm.
- **Quyền xem sổ phiếu (`ballots.read`)** và **nhập kết quả (`ballots.write`)** tách biệt với quyền **xem/sửa nhân sự BCH (`bch.read`, `bch.write`)**. Có thể cấp riêng cho nhân sự BTC tổ thư ký/điểm danh kể cả khi không cho sửa nhân sự. Để nhập, phải có quyền xem.
- Các quyền thường chỉ được **thu hồi** so với vai trò nền (`admin`, `checkin`, `secretary`). Chỉ hai quyền kiểm phiếu độc lập được phép **cấp bổ sung** ngoài vai trò nền. Không cho phép tài khoản tự cấp quyền của mình, không quyền `team.manage`/`settings.manage`/`system.logs` qua checkbox, không cấp quyền BTC cho đại biểu.
- Giao diện chỉnh quyền theo bản nháp, hiển thị số quyền chưa lưu, **Lưu thay đổi** theo lô, Hoàn tác, nhóm nghiệp vụ, badge nguồn quyền, xác nhận thu hồi quyền truy cập. Hiển thị nhật ký cấp/thu hồi quyền theo người/Đại hội.
- API `PUT /api/congress-members/permissions` nhận mảng tối đa 16 thay đổi khác nhau, kiểm tra actor/tenant/btc/role và quan hệ read/write, gọi `set_btc_account_permissions_v58` bằng service role. RPC cập nhật tất cả quyền và chèn một log `audit_logs` **trong một transaction**. `GET` lịch sử lọc theo `congress_id,target_id`, chỉ trả lịch sử quyền/đổi vai trò.
- Server layout và API áp dụng `getCongressEffectiveAbilities` từ vai trò + bản ghi `btc_account_capability_restrictions` (tối ưu quyền hiệu lực, từ chối truy cập khi không đọc được quyền). Menu ẩn các chức năng không được cấp; API vẫn là nơi xác minh quyền quyết định.

## Kiểm thử & vận hành

- SQL/Postgres regression `tests/ballot-room-permissions-v58.test.mjs`: quyền RPC service-only, ghi số phiếu hợp lệ, từ chối số phiếu sai/stale, cấp quyền tổ thư ký và rollback, audit SQL, chặn leo thang.
- API tests `tests/bch-ballot-route-functional-v56.test.mjs`, `tests/account-permission-functional-v57.test.mjs`: kiểm tra đăng nhập, tenant, Origin, read/write tách biệt, sửa theo phiên bản và ghi nhật ký.
- Trước phát hành: `npm run lint`, `npx tsc --noEmit`, `node --test tests/*.test.mjs`, `npm run docs:check`, `npm run build`.
- Smoke test với **2 tài khoản BTC** trên production: tài khoản được cấp `ballots.read` nhưng không `ballots.write` chỉ xem và tải Excel; tài khoản có cả hai có thể nhập 75 tổng phiếu và phiếu đạt theo biên bản thật; tài khoản khác không thể nhập hay truy cập API nhập. Không dùng số phiếu mẫu để ghi vào production.

