import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Guest public screens use coherent branded editorial layout",()=>{
 const directory=source("src/components/guest-access-entry.tsx");
 const detail=source("src/components/guest-congress-reader.tsx");
 const header=source("src/components/guest-site-header.tsx");
 const css=source("src/app/guest/guest-experience.css");
 assert.match(directory,/GuestSiteHeader/);
 assert.match(detail,/GuestSiteHeader/);
 assert.match(header,/BrandMark/);
 assert.match(directory,/guest-congress-grid/);
 assert.match(directory,/guest-congress-card/);
 assert.match(detail,/guest-detail-hero/);
 assert.match(detail,/guest-detail-summary/);
 assert.match(detail,/role="tablist"/);
 assert.match(detail,/role="tabpanel"/);
 assert.match(detail,/onKeyDown/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(source("src/app/guest/layout.tsx"),/guest-experience.css/);
});

test("Remove verbose guest access disclaimer without changing access rights",()=>{
 const detail=source("src/components/guest-congress-reader.tsx");
 assert.doesNotMatch(detail,/Tất cả khách có thể xem tài liệu đã công bố và danh sách nhân sự BCH/);
 assert.doesNotMatch(detail,/Điểm danh và xem ghế cá nhân chỉ dành cho đại biểu/);
 assert.match(detail,/DelegateDocumentsList/);
 assert.match(detail,/DelegateBchCarousel/);
 assert.match(detail,/Ứng viên Ban Chấp hành/);
 assert.match(source("src/app/guest/[slug]/page.tsx"),/\.eq\("status","live"\)/);
 assert.match(source("src/app/guest/[slug]/page.tsx"),/\.eq\("delegate_visible",true\)/);
 assert.match(source("src/app/api/documents/[id]/route.ts"),/hasPublicCongressAccess/);
 assert.match(source("src/app/api/bch-candidates/[id]/photo/route.ts"),/hasPublicCongressAccess/);
});

test("Guest design uses local icons/CSS and does not require new migration or external images",()=>{
 assert.ok(existsSync(new URL("../src/app/guest/guest-experience.css",import.meta.url)));
 const directory=source("src/components/guest-access-entry.tsx");
 const detail=source("src/components/guest-congress-reader.tsx");
 assert.doesNotMatch(directory+detail,/https?:\/\/|iframe/);
 assert.match(directory,/href=\{"\/guest\/"/);
 assert.match(detail,/href="\/guest"/);
});
