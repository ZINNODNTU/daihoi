import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Hệ thống giao diện dùng màu trung tính và hành động chính đồng nhất",()=>{
 const css=source("src/app/globals.css");
 assert.match(css,/--paper:#f7f8fa/);
 assert.match(css,/--brand:#2456c9/);
 assert.match(css,/\.btn-primary\{background:#2456c9/);
 assert.match(css,/\.card\{background:#fff;border:1px solid var\(--line\);border-radius:12px/);
 assert.doesNotMatch(css,/\.app-sidebar\{[^}]*linear-gradient/);
 assert.match(css,/prefers-reduced-motion/);
});
test("Trang chủ và đăng nhập không dùng hiệu ứng glow hoặc icon Sparkles",()=>{
 for(const path of ["src/app/page.tsx","src/app/login/page.tsx"]){
   const s=source(path);
   assert.doesNotMatch(s,/Sparkles|blur-\[|bg-gradient-to/);
 }
});
test("Dashboard và Đại hội sử dụng bố cục nghiệp vụ thay vì hero card gradient",()=>{
 for(const path of ["src/app/dashboard/page.tsx","src/app/congresses/[id]/page.tsx"]){
   const s=source(path);
   assert.match(s,/page-heading/);
   assert.match(s,/metric-card/);
   assert.doesNotMatch(s,/bg-gradient|blur-\[|rounded-\[24px\]/);
 }
 const directory=source("src/components/congress-directory.tsx");
 assert.match(directory,/workspace-panel/);
 assert.match(directory,/aria-pressed/);
});
test("Sidebar và thanh mobile vẫn giữ các lối điều hướng nghiệp vụ",()=>{
 const shell=source("src/components/app-shell.tsx");
 for(const route of ["/delegates","/seating","/attendance","/reports","/documents"]){
   assert.ok(shell.includes(route),route);
 }
 assert.match(shell,/aria-expanded=\{mobile\}/);
 assert.match(shell,/mobile-bottom-nav/);
 assert.match(shell,/Escape/);
});
