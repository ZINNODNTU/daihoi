import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Trang chủ V33 có bố cục editorial, khu vực điều hành mẫu và CTA hoạt động",()=>{
 const home=read("src/app/page.tsx");
 const css=read("src/app/editorial-v33.css");
 for(const part of ["landing-hero","landing-heading","landing-preview-window","landing-preview-stats",
  "landing-preview-board","landing-capability-grid","landing-process-list","landing-final-panel"]){
  assert.match(home,new RegExp(part),part);
  assert.match(css,new RegExp("\\."+part),part);
 }
 assert.match(home,/Giao diện minh họa — không phải dữ liệu thật/);
 assert.match(home,/href="\/login"/);
 assert.match(home,/href="\/preview"/);
 assert.match(home,/href="#chuc-nang"/);
 assert.match(home,/href="#quy-trinh"/);
 assert.doesNotMatch(home,/bg-gradient-to|blur-\[/);
});

test("Dashboard hiển thị số liệu thực và giữ các thao tác quyền BTC",()=>{
 const dashboard=read("src/app/dashboard/page.tsx");
 const css=read("src/app/editorial-v33.css");
 assert.match(dashboard,/isStaffUser/);
 assert.match(dashboard,/canCreate&&/);
 assert.match(dashboard,/const live=items\.filter/);
 assert.match(dashboard,/const preparing=items\.filter/);
 assert.match(dashboard,/const completed=items\.filter/);
 assert.match(dashboard,/dashboard-ops-panel/);
 assert.match(dashboard,/items\.length\?live\/items\.length/);
 assert.match(dashboard,/Congr/);
 assert.match(css,/\.dashboard-ops-panel/);
 assert.match(css,/\.app-sidebar/);
 assert.match(css,/\.app-layout \.metric-card/);
});

test("Huy hiệu Đoàn/Hội trong danh sách Đại hội và bộ chọn đại biểu theo dữ liệu thật",()=>{
 const directory=read("src/components/congress-directory.tsx");
 const selector=read("src/components/portal-congress-picker.tsx");
 const portal=read("src/components/delegate-shell.tsx");
 const css=read("src/app/editorial-v33.css");
 assert.match(directory,/BrandMark kind=\{item\.kind\}/);
 assert.match(directory,/filter===item\.value/);
 assert.match(directory,/aria-pressed/);
 assert.match(selector,/portal-congress-button/);
 assert.match(selector,/await fetch\("\/api\/my-card\/congress"/);
 assert.match(portal,/BrandMark kind=\{congresses\.find\(item=>item\.id===activeCongressId\)\?\.kind\|\|"doan"\}/);
 assert.match(portal,/delegate-tabbar/);
 assert.match(css,/\.delegate-portal \.portal-congress-button/);
 assert.match(css,/\.delegate-portal \.delegate-tabbar/);
});

test("Không dùng runtime animation nặng; có tôn trọng reduced motion và cỡ điện thoại nhỏ",()=>{
 const css=read("src/app/editorial-v33.css");
 const layout=read("src/app/layout.tsx");
 assert.match(layout,/import "\.\/editorial-v33\.css"/);
 assert.match(css,/@media\(max-width:639px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css,/\.landing-preview\{display:block/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(read("src/app/page.tsx"),/motion\/|framer-motion|gsap|setInterval/);
});
