import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../src/components/delegate-bch-carousel.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
const pkg=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));

test("BCH deck uses react-swipeable-cards and React 19-compatible version",()=>{
 assert.equal(pkg.dependencies["@daformat/react-swipeable-cards"],"^1.0.4");
 for(const part of ["SwipeableCards.Root","SwipeableCards.Cards","SwipeableCards.CardWrapper",
  "SwipeableCards.SwipeLeftButton","SwipeableCards.SwipeRightButton"]){
  assert.ok(source.includes(part),part);
 }
});

test("Swiping left goes forward, right goes backward; limits are enforced",()=>{
 assert.match(source,/direction==="left"\?1:-1/);
 assert.match(source,/swipeDirections=\{canPrevious&&canNext\?"horizontal":canNext\?"left":canPrevious\?"right":\[\]\}/);
 assert.match(source,/disabled=\{!canPrevious\}/);
 assert.match(source,/disabled=\{!canNext\}/);
 assert.match(source,/AdvanceWhenSwipeFinishes/);
 assert.match(source,/aria-live="polite"/);
});

test("Mobile touch scrolling is preserved and cards avoid loading every candidate image",()=>{
 assert.match(css,/\.bch-swipe-stack\{[\s\S]*touch-action:pan-y/);
 assert.match(css,/\.bch-swipe-card\{[\s\S]*touch-action:pan-y/);
 assert.match(source,/onPointerCancelCapture=\{cancel\}/);
 assert.match(source,/visibleStackLength=\{2\}/);
 assert.match(source,/foreground\?"eager":"lazy"/);
 assert.match(css,/@media \(max-width:639px\)/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test("The candidate swipe is for profile browsing, never a vote",()=>{
 assert.match(source,/không phải biểu quyết hay đánh giá ứng viên/);
 assert.match(source,/Nhân sự \{active\+1\} \/ \{items.length\}/);
});
