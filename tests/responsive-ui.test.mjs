import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

function source(path){return readFileSync(new URL("../"+path,import.meta.url),"utf8");}

test("Điều hướng điện thoại có menu có thể đóng, thanh nhanh và vùng safe-area",()=>{
  const shell=source("src/components/app-shell.tsx");
  const css=source("src/app/globals.css");
  assert.match(shell,/aria-expanded=\{mobile\}/);
  assert.match(shell,/mobile-bottom-nav/);
  assert.match(shell,/Escape/);
  assert.match(css,/safe-area-inset-bottom/);
});

test("Các trang dữ liệu có bố cục danh sách đáp ứng màn hình nhỏ",()=>{
  const delegates=source("src/components/delegates-client.tsx");
  const documents=source("src/components/documents-client.tsx");
  const attendance=source("src/components/attendance-client.tsx");
  const reports=source("src/components/attendance-report-client.tsx");
  for(const page of [delegates,documents,attendance])assert.match(page,/mobile-cards/);
  assert.match(reports,/mobile-list-table/);
  assert.match(attendance,/aspect-\[4\/3\]/);
});

test("Trải nghiệm bàn phím và giảm chuyển động được hỗ trợ",()=>{
  const css=source("src/app/globals.css");
  const login=source("src/app/login/page.tsx");
  const delegates=source("src/components/delegates-client.tsx");
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(login,/aria-label=\{showPassword/);
  assert.match(delegates,/aria-modal="true"/);
});

test("Chế độ in tài liệu/thẻ đại biểu không bị ảnh hưởng bởi thanh điều hướng",()=>{
  const css=source("src/app/globals.css");
  assert.match(css,/@media print/);
  assert.match(css,/\.delegate-card-print/);
  assert.match(css,/\.mobile-bottom-nav\{display:none!important\}/);
});
