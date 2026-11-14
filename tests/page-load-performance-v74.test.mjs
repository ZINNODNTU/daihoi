import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Guest document view defers BCH swipe library until selecting BCH tab",()=>{
 const src=read("src/components/guest-congress-reader.tsx");
 assert.match(src,/import dynamic from "next\/dynamic"/);
 assert.match(src,/dynamic\([\s\S]*import\("@\/components\/delegate-bch-carousel"\)/);
 assert.doesNotMatch(src,/^import \{DelegateBchCarousel\} from/m);
 assert.match(src,/const \[tab,setTab\]=useState<GuestTab>\("documents"\)/);
 assert.match(src,/activeDocuments\?[\s\S]*<DelegateDocumentsList/);
 assert.match(src,/candidates\.length\?<DelegateBchCarousel/);
 assert.match(read("src/components/delegate-bch-carousel.tsx"),
  /import \{SwipeableCards\} from "@daformat\/react-swipeable-cards"/);
});

test("Admin media library initially renders only 36 lazy-loaded images, without changing filtering",()=>{
 const src=read("src/components/media-library-client.tsx");
 assert.match(src,/useState\(36\)/);
 assert.match(src,/const visible=filtered\.slice\(0,visibleCount\)/);
 assert.match(src,/visible\.map\(item=>/);
 assert.doesNotMatch(src,/\{filtered\.map\(item=>/);
 assert.match(src,/loading="lazy" decoding="async"/);
 assert.match(src,/setVisibleCount\(n=>n\+36\)/);
 assert.match(src,/setFilter\(tab\.id\);setVisibleCount\(36\)/);
 assert.match(src,/setSearch\(e\.target\.value\);setVisibleCount\(36\)/);
});

test("Protected layouts share React-request cached Supabase auth and RBAC without persistent user caching",()=>{
 const auth=read("src/lib/auth.ts");
 const dashboard=read("src/app/dashboard/page.tsx");
 const congress=read("src/app/congresses/[id]/layout.tsx");
 assert.match(auth,/export const getAuth=cache\(async \(\)=>/);
 assert.match(auth,/export const getCongressRole=cache\(async/);
 assert.match(auth,/export const getCongressEffectiveAbilities=cache\(async/);
 assert.match(dashboard,/const \{supabase,user\}=await getAuth\(\)/);
 assert.match(congress,/const \{supabase,user\}=await getAuth\(\)/);
 assert.match(auth,/const role=await getCongressRole\(supabase,userId,congressId\)/);
 assert.doesNotMatch(auth,/unstable_cache|revalidate:\s*3600/);
 assert.match(congress,/effectiveAbilities\.includes\("workspace.view"\)/);
});

test("Loading UI does not reveal account details while auth or database is pending",()=>{
 for(const p of ["src/app/dashboard/loading.tsx","src/app/my-card/loading.tsx",
  "src/app/guest/[slug]/loading.tsx"]){
  assert.ok(existsSync(new URL("../"+p,import.meta.url)),p);
 }
 const src=read("src/components/page-loading-skeleton.tsx");
 assert.match(src,/role="status"/);
 assert.match(src,/motion-safe:animate-pulse/);
 assert.doesNotMatch(src,/createAdminClient|\/api\/|supabase|privateKey/);
});

test("Security: no shared cross-account cache for private portrait and check-in APIs",()=>{
 for(const p of [
  "src/app/api/delegates/[id]/photo/route.ts",
  "src/app/api/bch-candidates/[id]/photo/route.ts",
  "src/app/api/attendance/live/route.ts"
 ]){
  const src=read(p);
  assert.match(src,/Cache-Control":"private, no-store"/);
  assert.doesNotMatch(src,/s-maxage|public, max-age/);
 }
});
