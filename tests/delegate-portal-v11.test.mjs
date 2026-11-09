import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseSessionCheckinCode} from "../src/lib/delegate-session-scanner.ts";

const id="912e6058-12ef-40fb-8d04-2ce269e07575";
const token="se2."+"a".repeat(22);
const link="https://daihoi.example/checkin/s/"+id+"?t="+token;
const content=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Máy quét chỉ nhận QR phiên hợp lệ, không dùng barcode hoặc QR đại biểu",()=>{
 assert.deepEqual(parseSessionCheckinCode(link),{sessionId:id,token});
 assert.deepEqual(parseSessionCheckinCode("http://192.168.1.72:3000/checkin/s/"+id+"?t="+token),{sessionId:id,token});
 assert.equal(parseSessionCheckinCode("DB"+"A".repeat(20)),null);
 assert.equal(parseSessionCheckinCode("javascript:alert(1)"),null);
 assert.equal(parseSessionCheckinCode("https://evil.example/attendance/live?t="+token),null);
 assert.equal(parseSessionCheckinCode("https://evil.example/checkin/s/"+id+"?t=se2.invalid"),null);
});

test("Quyền nghiệp vụ không cấp cho delegate/guest dù tự nhập URL",()=>{
 const auth=content("../src/lib/auth.ts");
 assert.match(auth,/return role==="admin"\|\|role==="checkin"\|\|role==="secretary";/);
 assert.doesNotMatch(auth,/Boolean\(role\)/);
 const layout=content("../src/app/congresses/[id]/layout.tsx");
 assert.match(layout,/if\(!canView\)redirect\("\/my-card"\)/);
 const dashboard=content("../src/app/dashboard/page.tsx");
 assert.match(dashboard,/isStaffUser\(supabase,user\.id\)/);
 const migration=content("../supabase/upgrade-delegate-portal-v11.sql");
 assert.match(migration,/p_required='viewer' AND cm\.role IN \('admin','checkin','secretary'\)/);
 assert.match(migration,/CREATE POLICY delegates_self_read/);
 assert.match(migration,/CREATE POLICY checkins_self_read/);
});

test("Thẻ chuyên nghiệp tối giản chỉ có barcode, ảnh, thông tin định danh và ghế",()=>{
 const card=content("../src/components/my-delegate-cards.tsx");
 assert.match(card,/<DelegateBarcode value=\{item\.barcodeCode\}/);
 assert.match(card,/seat\?\.code/);
 assert.match(card,/congressBranding\[item\.kind\]\.src/);
 assert.match(readFileSync(new URL("../src/components/brand-mark.tsx",import.meta.url),"utf8"),/huy-hieu-hoi-sinh-vien\.png/);
 assert.doesNotMatch(card,/QRCodeSVG|my-qr-|Tải mã QR/);
 assert.doesNotMatch(card,/Thẻ đại biểu số/);
 assert.doesNotMatch(card,/DelegateCheckinScanner|const allHistory/);
 assert.match(card,/\/my-card\/checkin/);
 assert.match(card,/\/my-card\/seats/);
 assert.match(card,/\/my-card\/history/);
 const portal=content("../src/lib/delegate-portal.ts");
 assert.match(portal,/\.eq\("auth_user_id",authenticatedUserId\)/);
 assert.match(portal,/\.in\("delegate_id",delegateIds\)/);
 assert.match(portal,/seating_layout_id/);
});

test("Mỗi chức năng có một route riêng và thanh điều hướng điện thoại",()=>{
 const shell=content("../src/components/delegate-shell.tsx");
 for(const route of ["/my-card","/my-card/checkin","/my-card/seats","/my-card/history","/account"])
  assert.ok(shell.includes(route),route);
 assert.match(shell,/flex items-stretch/);
 assert.match(shell,/\/my-card\/documents/);
 assert.match(shell,/\/my-card\/bch/);
 const checkin=content("../src/app/my-card/checkin/page.tsx");
 assert.match(checkin,/DelegateCheckinScanner/);
 const seats=content("../src/app/my-card/seats/page.tsx");
 assert.match(seats,/DelegateSeatHall/);
 assert.match(content("../src/components/delegate-seat-hall.tsx"),/data-my-seat/);
 assert.match(content("../src/lib/delegate-seat-map.ts"),/\.eq\("layout_id",session\.layoutId\)/);
 assert.match(content("../src/lib/delegate-seat-map.ts"),/\.eq\("congress_id",item\.congressId\)/);
 assert.match(content("../src/lib/delegate-seat-map.ts"),/items\.flatMap\(item=>item\.sessions/);
 assert.doesNotMatch(content("../src/lib/delegate-seat-map.ts"),/seat_assignments|full_name|delegate_id/);
 assert.match(content("../src/components/delegate-seat-hall.tsx"),/seat\.x-bounds\.minX/);
 assert.match(content("../src/components/delegate-seat-hall.tsx"),/Tìm ghế/);
 const history=content("../src/app/my-card/history/page.tsx");
 assert.match(history,/Lịch sử điểm danh/);
 assert.match(content("../src/lib/delegate-history.ts"),/checkedInAt/);
 assert.match(history,/loadDelegateHistory/);
 const scanner=content("../src/components/delegate-checkin-scanner.tsx");
 assert.match(scanner,/BrowserQRCodeReader/);
 assert.match(scanner,/decodeFromVideoDevice/);
 assert.match(scanner,/listVideoInputDevices/);
 assert.match(scanner,/delegate-camera-select/);
 assert.match(scanner,/\/api\/attendance\/self-checkin/);
 assert.match(scanner,/window\.isSecureContext/);
 assert.match(scanner,/capture="environment"/);
 const btc=content("../src/components/attendance-client.tsx");
 assert.match(btc,/btc-camera-select/);
 assert.match(btc,/BrowserMultiFormatReader.listVideoInputDevices/);
 assert.match(btc,/decodeFromVideoDevice/);
});

test("Đăng nhập từ thiết bị khác dùng API cùng origin và cookie theo HTTP/HTTPS",()=>{
 const login=content("../src/app/login/page.tsx");
 const route=content("../src/app/api/auth/login/route.ts");
 const proxy=content("../src/proxy.ts");
 assert.match(login,/fetch\("\/api\/auth\/login"/);
 assert.match(login,/window\.location\.replace/);
 assert.match(login,/credentials:"same-origin"/);
 assert.doesNotMatch(login,/createBrowserClient|signInWithPassword/);
 assert.match(route,/createServerClient/);
 assert.match(route,/signInWithPassword/);
 assert.match(route,/sameSite:"lax",secure,httpOnly:false/);
 assert.match(route,/request\.nextUrl\.protocol==="https:"/);
 assert.match(route,/request\.headers\.get\("host"\)/);
 assert.match(content("../src/app/api/auth/logout/route.ts"),/request\.headers\.get\("host"\)/);
 assert.match(proxy,/responseHeaders/);
 assert.match(proxy,/httpOnly:false/);
 const config=content("../next.config.ts");
 assert.match(config,/allowedDevOrigins:lanDevHosts/);
 assert.match(config,/networkInterfaces/);
 assert.match(content("../src/app/api/auth/logout/route.ts"),/auth\.signOut/);
});

test("Tự điểm danh dùng phiên se2, danh tính Supabase Auth và giờ máy chủ",()=>{
 const login=content("../src/app/login/page.tsx");
 assert.match(login,/se2\\?\./);
 const checkin=content("../src/app/api/attendance/self-checkin/route.ts");
 assert.match(checkin,/verifySessionEntryQr/);
 assert.match(checkin,/getWindowStatus\(session\)/);
 assert.match(checkin,/\.eq\("auth_user_id",user\.id\)/);
 const photo=content("../src/app/api/delegates/[id]/photo/route.ts");
 assert.match(photo,/delegate\.auth_user_id===user\.id/);
});
