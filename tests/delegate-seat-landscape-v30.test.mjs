import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Đại biểu có nút xoay ngang toàn màn hình và thoát về sơ đồ thông thường",()=>{
 const ui=source("../src/components/delegate-seat-hall.tsx");
 assert.match(ui,/Xem ngang/);
 assert.match(ui,/onClick=\{openLandscape\}/);
 assert.match(ui,/onClick=\{closeLandscape\}/);
 assert.match(ui,/createPortal\(/);
 assert.match(ui,/role="dialog" aria-modal="true"/);
 assert.match(ui,/event\.key==="Escape"/);
 assert.match(ui,/document\.body\.style\.overflow="hidden"/);
 assert.match(ui,/document\.body\.style\.overflow=oldOverflow/);
 assert.match(ui,/data-my-seat/);
 assert.match(ui,/Tìm ghế/);
});

test("Xoay màn hình có fallback CSS cho Safari khi native screen.orientation.lock bị từ chối",()=>{
 const ui=source("../src/components/delegate-seat-hall.tsx");
 const css=source("../src/app/globals.css");
 assert.match(ui,/requestFullscreen\(\)/);
 assert.match(ui,/orientation\?\.lock\?\.\("landscape"\)/);
 assert.match(ui,/CSS fallback works/);
 assert.match(ui,/orientation\?\.unlock\?\.\(\)/);
 assert.match(ui,/document\.exitFullscreen\(\)/);
 assert.match(css,/\.delegate-seat-landscape\s*\{/);
 assert.match(css,/@media\s*\(orientation:portrait\)/);
 assert.match(css,/transform:rotate\(90deg\)/);
 assert.match(css,/width:100dvh;height:100dvw/);
 assert.match(css,/\.delegate-seat-landscape \.delegate-seat-scroller/);
});

test("Sơ đồ vẫn giữ cuộn hai chiều, zoom và tự tìm đúng ghế riêng tư",()=>{
 const ui=source("../src/components/delegate-seat-hall.tsx");
 assert.match(ui,/setZoom\(z=>boundedZoom\(z-0\.12\)\)/);
 assert.match(ui,/setZoom\(z=>boundedZoom\(z\+0\.12\)\)/);
 assert.match(ui,/fitLandscape\(\)/);
 assert.match(ui,/node=node\.offsetParent/);
 assert.match(ui,/area\.scrollTo/);
 assert.match(ui,/overflow-auto overscroll-contain/);
 assert.match(ui,/seat\.x-freeform\.minX/);
 assert.match(ui,/projectSeatGrid\(/);
 assert.match(ui,/data-physical-seat-grid/);
 assert.match(ui,/rowLabelAt\("A",r\)/);
 assert.match(ui,/seat\.id===map\.ownSeatId/);
 assert.match(ui,/seatNumbers\.get\(seat\.id\)/);
 const server=source("../src/lib/delegate-seat-map.ts");
 assert.doesNotMatch(server,/seat_assignments|full_name|delegate_id/);
});
