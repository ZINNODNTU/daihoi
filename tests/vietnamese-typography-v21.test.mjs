import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Website dùng một bộ font tiếng Việt tự lưu, không phụ thuộc font máy người dùng",()=>{
 const layout=read("../src/app/layout.tsx");
 const css=read("../src/app/globals.css");
 const pkg=JSON.parse(read("../package.json"));
 assert.equal(pkg.dependencies["@fontsource/be-vietnam-pro"],"5.3.0");
 for(const weight of [400,500,600,700,800])
  assert.match(layout,new RegExp('@fontsource/be-vietnam-pro/'+weight+'\\.css'));
 assert.match(layout,/<html lang="vi">/);
 assert.match(css,/--font-sans:"Be Vietnam Pro"/);
 assert.match(css,/font-family:"Be Vietnam Pro"/);
 assert.doesNotMatch(css,/font-family:Inter,/);
 assert.doesNotMatch(css,/font-family:"Segoe UI","Noto Sans"/);
});

test("Tiêu đề tiếng Việt có khoảng dòng an toàn và không nén dấu",()=>{
 const css=read("../src/app/globals.css");
 assert.match(css,/\.page-title\{[^}]*line-height:1\.32/);
 assert.match(css,/\.premium-title\{[^}]*line-height:1\.22/);
 assert.match(css,/\.premium-title \.serif-accent\{[^}]*font-family:inherit/);
});

test("Menu điện thoại giữ tối đa bốn mục chính và nhóm thao tác khác vào Thêm",()=>{
 const shell=read("../src/components/delegate-shell.tsx");
 assert.match(shell,/const primaryLinks=/);
 assert.match(shell,/const moreLinks=/);
 assert.match(shell,/primaryLinks\.map/);
 assert.match(shell,/moreLinks\.map/);
 assert.match(shell,/aria-expanded=\{moreOpen\}/);
 assert.match(shell,/<span>Thêm<\/span>/);
 assert.match(shell,/if\(event\.key==="Escape"\)/);
});
