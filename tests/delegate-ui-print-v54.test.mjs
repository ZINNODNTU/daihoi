import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("legacy editorial stylesheet cannot override selected-congress white surface",()=>{
 const css=read("src/app/editorial-v33.css");
 const start=css.indexOf(".delegate-portal .portal-congress-button{");
 const section=css.slice(start,css.indexOf(".delegate-portal>header .brand-symbol{",start));
 assert.match(section,/background:#ffffff/);
 assert.match(section,/border:1px solid #d2e1e8/);
 assert.doesNotMatch(section,/#0a334d|#0a4b6b|linear-gradient/);
 const picker=read("src/components/portal-congress-picker.tsx");
 assert.match(picker,/text-\[#25485f\] line-clamp-2/);
 assert.match(picker,/text-\[#416478\]/);
 assert.match(picker,/bg-\[#ecf5fa\].*text-\[#1c729b\]/);
});

test("QR check-in is restrained operational UI without fake scanning preview",()=>{
 const page=read("src/app/my-card/checkin/page.tsx");
 const scanner=read("src/components/delegate-checkin-scanner.tsx");
 assert.match(page,/lg:grid-cols-\[minmax\(0,1fr\)_270px\]/);
 assert.match(page,/getPortalCongressContext/);
 assert.match(page,/DelegateCheckinScanner kind=\{current\.kind\}/);
 assert.doesNotMatch(page,/theme\.header|theme\.panel|3 bước điểm danh/);
 assert.match(scanner,/Mở camera quét QR/);
 assert.doesNotMatch(scanner,/Sẵn sàng điểm danh|relative flex min-h-\[128px\]/);
 assert.match(scanner,/startTrackedScanner/);
 assert.match(scanner,/decodeFromImageUrl/);
});

test("print target requires authenticated owned delegate and is outside portal shell",()=>{
 const page=read("src/app/print/delegate/[id]/page.tsx");
 assert.match(page,/getPortalViewerAuth\(\)/);
 assert.match(page,/getMyDelegateData\(\)/);
 assert.match(page,/isUuid\(id\)/);
 assert.match(page,/items\.find\(delegate=>delegate\.id===id\)/);
 assert.match(page,/if\(!item\|\|!\(await hasPortalAbility\(user\.id,item\.congressId,"portal\.card"\)\)\)notFound\(\)/);
 assert.match(page,/PrintDelegatePass item=\{item\}/);
 assert.match(page,/@page \{ size: A4 portrait; margin: 10mm;/);
 assert.doesNotMatch(page,/createAdminClient|\.from\("delegates"\)/);
 const layout=read("src/app/my-card/layout.tsx");
 assert.match(layout,/DelegateShell/);
 assert.doesNotMatch(page,/DelegateShell/);
});

test("print UI contains exactly one delegate pass and suppresses toolbar",()=>{
 const ui=read("src/components/print-delegate-pass.tsx");
 const cards=read("src/components/my-delegate-cards.tsx");
 assert.match(ui,/id="print-delegate-card"/);
 assert.match(ui,/<DelegatePass item=\{item\} priority\/>/);
 assert.match(ui,/className="mb-6.*print:hidden/);
 assert.match(ui,/document\.fonts\.ready/);
 assert.match(ui,/querySelectorAll\("img"\)/);
 assert.match(ui,/window\.print\(\)/);
 assert.match(cards,/export function DelegatePass/);
 assert.match(cards,/href=\{"\/print\/delegate\/"\+item\.id\}/);
 assert.match(cards,/target="_blank" rel="noopener noreferrer"/);
 assert.doesNotMatch(cards,/onClick=\{\(\)=>window\.print\(\)\}/);
});

test("print rules are scoped to dedicated route and restore card header",()=>{
 const css=read("src/app/globals.css");
 const print=css.slice(css.indexOf("/* V54: Isolated delegate pass print route"),
  css.indexOf("/* Unified Đại hội số palette",css.indexOf("/* V54:")));
 assert.match(print,/body:has\(\.delegate-pass-print-page\)/);
 assert.match(print,/#print-delegate-card/);
 assert.match(print,/width:90mm!important/);
 assert.match(print,/\.delegate-pass header\{display:block!important;/);
 assert.match(print,/break-inside:avoid!important/);
 assert.match(print,/\.delegate-pass svg/);
 assert.doesNotMatch(print,/body:has\(\.delegate-pass\) /);
});
