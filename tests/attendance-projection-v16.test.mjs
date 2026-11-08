import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const text=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Màn hình trình chiếu ưu tiên đại biểu vừa điểm danh ở trên, QR và sơ đồ ở hàng dưới",()=>{
 const source=text("../src/components/session-qr-screen.tsx");
 const hero=source.indexOf('data-projection-section="latest-delegate"');
 const bottom=source.indexOf('data-projection-section="attendance-operations"');
 const qr=source.indexOf('data-projection-section="session-qr"');
 const seat=source.indexOf('data-projection-section="seat-map"');
 assert.ok(hero>0 && bottom>hero && qr>bottom && seat>qr,
  "Cấu trúc phải theo thứ tự: welcome -> QR dưới -> ghế bên cạnh");
 assert.equal((source.match(/<ProjectionWelcome /g)||[]).length,1,
  "Không trùng flashcard đại biểu trên màn hình");
 assert.match(source,/lg:grid-cols-\[minmax\(310px,0\.78fr\)_minmax\(0,1\.22fr\)\]/);
 assert.match(source,/fullscreen:h-dvh/);
 assert.match(source,/BrandMark/);
});
test("Không làm mất cơ chế QR cố định, xuất PNG/SVG, chuyển phiên, cập nhật trực tiếp",()=>{
 const source=text("../src/components/session-qr-screen.tsx");
 assert.match(source,/QRCodeSVG ref=\{qrSvg\} value=\{ticket\.url\}/);
 assert.match(source,/downloadQr\("png"\)/);
 assert.match(source,/downloadQr\("svg"\)/);
 assert.match(source,/setInterval\(\(\)=>void syncLive\(\),3000\)/);
 assert.match(source,/selectedRef\.current=e\.target\.value/);
 assert.match(source,/setLiveData\(null\)/);
 assert.match(source,/requestFullscreen\(\)/);
 assert.match(source,/getWindowStatus\(session,new Date\(clock\)\)/);
 assert.match(source,/role="progressbar"/);
});
test("Flashcard có ảnh, tên, đơn vị, vị trí ghế và thời gian; cập nhật theo lượt mới",()=>{
 const source=text("../src/components/attendance-projection.tsx");
 assert.match(source,/projection-arrival/);
 assert.match(source,/key=\{latest\.id\}/);
 assert.match(source,/person\.photo_path/);
 assert.match(source,/person\.full_name/);
 assert.match(source,/person\.unit/);
 assert.match(source,/seat\?seat\.code/);
 assert.match(source,/latest\.checked_in_at/);
 assert.match(source,/latestSeatId===seat\.id/);
 assert.match(source,/ring-\[2px\] ring-\[#d39c37\]/);
 const css=text("../src/app/globals.css");
 assert.match(css,/@keyframes projection-arrival-enter/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.projection-arrival\{animation:none!important\}/);
});
