import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import sharp from "sharp";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const bytes=path=>readFileSync(new URL(path,import.meta.url));

test("Xác thực và hồ sơ chỉ khử trùng lặp trong cùng request, không cache xuyên người dùng",()=>{
 const auth=read("../src/lib/auth.ts");
 const access=read("../src/lib/portal-congress-access.ts");
 const page=read("../src/lib/delegate-page.ts");
 assert.match(auth,/getAuth=cache\(async/);
 assert.match(auth,/auth\.getUser\(\)/);
 assert.match(access,/getPortalCongressAccess=cache\(async \(userId:string\)/);
 assert.match(access,/\.eq\("auth_user_id",userId\)/);
 assert.match(page,/getMyDelegateData=cache\(async/);
});

test("Trang đại biểu chỉ dùng JWT đã xác minh, API ghi điểm danh vẫn dùng Auth user mới nhất",()=>{
 const auth=read("../src/lib/auth.ts");
 assert.match(auth,/getPortalViewerAuth=cache\(async/);
 assert.match(auth,/supabase\.auth\.getClaims\(\)/);
 assert.match(auth,/auth\.getUser\(\)/);
 for(const path of [
  "../src/app/my-card/layout.tsx","../src/app/my-card/page.tsx",
  "../src/app/my-card/seats/page.tsx","../src/app/my-card/history/page.tsx",
  "../src/app/my-card/documents/page.tsx","../src/app/my-card/bch/page.tsx",
  "../src/lib/delegate-page.ts"
 ]){
  assert.match(read(path),/getPortalViewerAuth\(\)/,path);
 }
 assert.match(read("../src/app/api/attendance/self-checkin/route.ts"),/await getAuth\(\)/);
 assert.match(read("../src/app/api/auth/login/route.ts"),/signInWithPassword/);
});

test("Cache dùng chung chỉ lưu thông tin Đại hội và phiên, không lưu thông tin đại biểu",()=>{
 const shared=read("../src/lib/portal-shared-reads.ts");
 const portal=read("../src/lib/delegate-portal.ts");
 const choice=read("../src/lib/active-congress.ts");
 assert.match(shared,/unstable_cache/);
 assert.match(shared,/revalidate:15/);
 assert.match(shared,/revalidate:10/);
 assert.doesNotMatch(shared,/\.from\("(delegates|checkins|seat_assignments|profiles)"\)/);
 assert.match(portal,/\.eq\("auth_user_id",authenticatedUserId\)/);
 assert.match(portal,/loadSharedCongressInfo\(sharedIds\)/);
 assert.match(portal,/loadSharedSessionInfo\(sharedIds\)/);
 assert.match(portal,/\.in\("delegate_id",delegateIds\)/);
 assert.ok(choice.indexOf("getPortalCongressAccess(userId)")<choice.indexOf("loadSharedCongressInfo("));
});

test("Cache sơ đồ hội trường chỉ chứa tọa độ ghế, gán ghế vẫn theo hồ sơ đã xác minh",()=>{
 const source=read("../src/lib/delegate-seat-map.ts");
 assert.match(source,/loadSharedHallGeometry=unstable_cache/);
 assert.match(source,/revalidate:15/);
 assert.match(source,/\.eq\("congress_id",congressId\)/);
 assert.match(source,/\.eq\("layout_id",layoutId\)/);
 assert.match(source,/items\.flatMap\(item=>item\.sessions/);
 assert.match(source,/ownSeatId:session\.seat\?\.id\|\|null/);
 assert.doesNotMatch(source,/\.from\("checkins"\)/);
});

test("Giao diện ưu tiên tải đúng trang người dùng thay vì tự prefetch hàng loạt",()=>{
 const shell=read("../src/components/delegate-shell.tsx");
 const links=read("../src/components/my-delegate-cards.tsx");
 const fallback=read("../src/app/my-card/loading.tsx");
 assert.match(shell,/prefetch=\{false\}/);
 assert.match(links,/prefetch=\{false\}/);
 assert.match(fallback,/role="status" aria-live="polite"/);
 assert.match(fallback,/motion-safe:animate-pulse/);
 const proxy=read("../src/proxy.ts");
 assert.match(proxy,/path==="\/login"/);
 assert.match(proxy,/auth\.getClaims\(\)/);
 const login=read("../src/app/api/auth/login/route.ts");
 assert.match(login,/Retry-After/);
 assert.match(login,/status===429/);
});

test("Website favicon và biểu tượng iPhone thực sự là hình huy hiệu Đoàn",async()=>{
 const source=bytes("../public/branding/huy-hieu-doan.png");
 const icon=bytes("../src/app/icon.png");
 const apple=bytes("../src/app/apple-icon.png");
 const ico=bytes("../src/app/favicon.ico");
 const expected=await sharp(source).resize(192,192,{fit:"contain",background:"#ffffff00"})
  .ensureAlpha().raw().toBuffer();
 const actual=await sharp(icon).ensureAlpha().raw().toBuffer();
 assert.deepEqual(actual,expected,"Website icon must derive from the verified existing Đoàn badge");
 const appleMeta=await sharp(apple).metadata();
 assert.equal(appleMeta.width,180);
 assert.equal(appleMeta.height,180);
 assert.equal(ico.readUInt16LE(2),1);
 assert.equal(ico.readUInt16LE(4),3);
 for(let i=0;i<3;i++){
  const row=6+i*16;
  const len=ico.readUInt32LE(row+8),offset=ico.readUInt32LE(row+12);
  assert.ok(len>100);
  assert.deepEqual(ico.subarray(offset,offset+8),
   Buffer.from([137,80,78,71,13,10,26,10]));
 }
});
