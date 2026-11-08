import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Giao diện Đoàn - Hội dùng navy, xanh thanh niên, vàng và token thống nhất",()=>{
 const css=source("src/app/globals.css");
 assert.match(css,/--navy:#141f33/);
 assert.match(css,/--brand:#0084bd/);
 assert.match(css,/--gold:#ffcd48/);
 assert.match(css,/\.premium-hero\{/);
 assert.match(css,/\.command-hero\{/);
 assert.match(css,/\.app-sidebar\{background:#053f62/);
 assert.match(css,/\.field:focus/);
 assert.match(css,/prefers-reduced-motion/);
});
test("Trang chủ tối giản, rõ hành động và đánh dấu giao diện minh họa",()=>{
 const home=source("src/app/page.tsx");
 assert.match(home,/landing-hero/);
 assert.match(home,/landing-heading/);
 assert.match(home,/landing-preview/);
 assert.match(home,/BrandMark/);
 assert.match(home,/href="\/preview"/);
 assert.match(home,/Giao diện minh họa/);
 assert.doesNotMatch(home,/Sparkles|blur-\[|bg-gradient-to/);
});
test("Trang demo hoạt động độc lập không yêu cầu dữ liệu thật",()=>{
 const previewPage=source("src/app/preview/page.tsx");
 const demo=source("src/components/experience-preview.tsx");
 assert.match(previewPage,/ExperiencePreview/);
 assert.match(previewPage,/Dữ liệu minh họa, không kết nối Supabase/);
 for(const part of ['id:"overview"','id:"seating"','id:"attendance"']){
   assert.ok(demo.includes(part),part);
 }
 assert.match(demo,/aria-pressed/);
 assert.match(demo,/setSelectedSeat/);
 assert.match(demo,/DỮ LIỆU MẪU/);
});
test("Dashboard và Đại hội dùng command center, metrics thực tế và tránh glow",()=>{
 for(const path of ["src/app/dashboard/page.tsx","src/app/congresses/[id]/page.tsx"]){
   const s=source(path);
   assert.match(s,/command-hero/);
   assert.match(s,/metric-card/);
   assert.doesNotMatch(s,/blur-\[|bg-gradient-to|rounded-\[24px\]/);
 }
 const congress=source("src/app/congresses/[id]/page.tsx");
 assert.match(congress,/congress\.name/);
 assert.match(congress,/arrived/);
 assert.match(congress,/percent/);
});
test("Sidebar, mobile và đăng nhập vẫn giữ nghiệp vụ, keyboard navigation và mật khẩu an toàn",()=>{
 const shell=source("src/components/app-shell.tsx");
 const login=source("src/app/login/page.tsx");
 const brand=source("src/components/brand-mark.tsx");
 for(const route of ["/delegates","/seating","/attendance","/reports","/documents"]){
   assert.ok(shell.includes(route),route);
 }
 assert.match(shell,/aria-expanded=\{mobile\}/);
 assert.match(shell,/mobile-bottom-nav/);
 assert.match(shell,/Escape/);
 assert.match(login,/\/api\/auth\/login/);
 assert.match(source("src/app/api/auth/login/route.ts"),/signInWithPassword/);
 assert.match(login,/aria-label=\{showPassword/);
 assert.match(brand,/\/branding\/huy-hieu-doan.png/);
});
