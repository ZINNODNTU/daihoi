import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calculateDelegatePassScale} from "../src/lib/delegate-pass-layout.ts";
const source=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Badge is fitted inside small and landscape mobile visual viewports",()=>{
 const scenarios=[
  [280,365,386,680], // narrow phone with browser chrome
  [320,480,386,680],
  [345,610,386,710], // Samsung with bottom navigation
  [375,660,386,750], // long delegate name
  [430,730,386,680],
  [600,290,386,750], // landscape phone
  [900,1000,386,680]
 ];
 for(const [availableWidth,availableHeight,cardWidth,cardHeight] of scenarios){
  const scale=calculateDelegatePassScale(availableWidth,availableHeight,cardWidth,cardHeight);
  assert.ok(scale>0&&scale<=1,JSON.stringify({availableWidth,availableHeight,scale}));
  assert.ok(cardWidth*scale<=availableWidth-12+0.001,
   "Badge should not exceed available width for "+availableWidth);
  assert.ok(cardHeight*scale<=availableHeight-12+0.001,
   "Badge should not exceed available height for "+availableHeight);
 }
 assert.equal(calculateDelegatePassScale(800,1000,386,680),1);
 assert.equal(calculateDelegatePassScale(0,1000,386,680),1);
});

test("Mobile viewer measures actual content and supports fit/read, orientation, close and safe area",()=>{
 const card=source("../src/components/my-delegate-cards.tsx");
 assert.match(card,/calculateDelegatePassScale/);
 assert.match(card,/new ResizeObserver\(recalculate\)/);
 assert.match(card,/observer\.observe\(stage\)/);
 assert.match(card,/observer\.observe\(card\)/);
 assert.match(card,/w-\[386px\] max-w-none/);
 assert.match(card,/h-dvh/);
 assert.match(card,/safe-area-inset-bottom/);
 assert.match(card,/Vừa màn hình/);
 assert.match(card,/Xem rõ/);
 assert.match(card,/Xem toàn bộ thẻ vừa màn hình/);
 assert.match(card,/onClose/);
 assert.match(card,/Escape/);
 assert.match(card,/overflow-y-auto overscroll-contain/);
 assert.match(card,/className="delegate-pass premium-delegate-id/);
 assert.match(card,/min-w-0 max-w-\[386px\]/);
 assert.match(card,/DelegateBarcode/);
});
