import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const text=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Desktop: flashcard và QR cùng cột trái, sơ đồ hội trường bên phải; mobile xếp dọc",()=>{
 const source=text("../src/components/session-qr-screen.tsx");
 const layout=source.indexOf('data-projection-layout="welcome-qr-left-seating-right"');
 const left=source.indexOf('data-projection-column="welcome-and-qr"');
 const hero=source.indexOf('data-projection-section="latest-delegate"');
 const qr=source.indexOf('data-projection-section="session-qr"');
 const seat=source.indexOf('data-projection-section="seat-map"');
 assert.ok(layout>0&&left>layout&&hero>left&&qr>hero&&seat>qr,
  "Chung grid: cột trái chứa flashcard rồi QR, cột phải chứa sơ đồ");
 assert.equal((source.match(/<ProjectionWelcome /g)||[]).length,1,
  "Không trùng flashcard khi điểm danh liên tiếp");
 assert.equal((source.match(/<ProjectionSeatingMap /g)||[]).length,1);
 assert.match(source,/ProjectionWelcome data=\{liveData\} congressName=\{congressName\} compact featured=\{featured\}/);
 assert.match(source,/ProjectionArrivalQueue data=\{liveData\} waiting=\{waiting\}/);
 assert.match(source,/projection-qr-clickable/);
 assert.match(source,/fullscreen:h-dvh/);
 assert.match(source,/BrandMark/);
 const css=text("../src/app/globals.css");
 assert.match(css,/\.projection-stage\{container-type:inline-size;/);
 assert.match(css,/\.projection-operations\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/@container \(min-width:900px\)/);
 assert.match(css,/grid-template-columns:minmax\(320px,\.72fr\) minmax\(0,1\.28fr\)/);
 assert.match(css,/\.projection-qr-clickable\{width:clamp\(190px,20\.8cqw,275px\)/);
});
test("Không làm mất QR cố định, PNG/SVG, chuyển phiên và cập nhật trực tiếp",()=>{
 const source=text("../src/components/session-qr-screen.tsx");
 assert.match(source,/QRCodeSVG ref=\{qrSvg\} value=\{ticket\.url\}/);
 assert.match(source,/downloadQr\("png"\)/);
 assert.match(source,/downloadQr\("svg"\)/);
 assert.match(source,/useAttendanceLive\(congressId,sessionId\)/);
 assert.match(source,/selectedRef\.current=e\.target\.value/);
 assert.match(source,/setSessionId\(e.target.value\)/);
 assert.match(source,/requestFullscreen\(\)/);
 assert.match(source,/getWindowStatus\(session,new Date\(clock\)\)/);
 assert.match(source,/role="progressbar"/);
});
test("Flashcard có ảnh, tên, đơn vị, ghế; sơ đồ tận dụng chiều rộng màn hình",()=>{
 const source=text("../src/components/attendance-projection.tsx");
 assert.match(source,/projection-arrival/);
 assert.match(source,/key=\{latest\.id\}/);
 assert.match(source,/person\.photo_path/);
 assert.match(source,/person\.full_name/);
 assert.match(source,/person\.unit/);
 assert.match(source,/projectedSeatCode\(seat,projectedNumbers\)/);
 assert.match(source,/latest\.checked_in_at/);
 assert.match(source,/latestSeatId===seat\.id/);
 assert.match(source,/ring-\[2px\] ring-\[#d39c37\]/);
 assert.match(source,/projection-welcome--compact/);
 assert.match(source,/projection-delegate-name/);
 assert.match(source,/projection-seating-map flex h-full/);
 assert.match(source,/minWidth:"100%"/);
 assert.match(source,/minmax\("\+\(compact\?"20px":"26px"\)\+", 1fr\)/);
 const css=text("../src/app/globals.css");
 assert.match(css,/@keyframes projection-arrival-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.projection-arrival\{animation:none!important\}/);
});
