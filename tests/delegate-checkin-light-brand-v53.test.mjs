import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const themeSource=read("src/lib/delegate-brand-theme.ts");
const moduleBox={exports:{}};
const transpiled=ts.transpileModule(themeSource,{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
new Function("require","module","exports",transpiled)(()=>{throw Error("Import must be type-only");},moduleBox,moduleBox.exports);
const {delegateTheme}=moduleBox.exports;

test("Đoàn and Hội use two distinct readable light palettes with clear institutional accents",()=>{
 const doan=delegateTheme("doan"),hoi=delegateTheme("hoi_sinh_vien");
 assert.notEqual(doan.header,hoi.header);
 assert.notEqual(doan.cta,hoi.cta);
 assert.match(doan.header,/fffcf7|fff0ec/i);
 assert.match(doan.cta,/bb2939/i);
 assert.match(hoi.header,/e8f5ff/i);
 assert.match(hoi.cta,/1279ae/i);
 for(const theme of [doan,hoi]){
  assert.match(theme.cta,/text-white/);
  assert.match(theme.panel,/ffffff/);
  assert.match(theme.chip,/bg-white/);
  assert.match(theme.seat,/border-/);
 }
});

test("delegate checkin only displays the selected authorized congress and live session state",()=>{
 const page=read("src/app/my-card/checkin/page.tsx");
 assert.match(page,/getPortalViewerAuth\(\)/);
 assert.match(page,/getPortalCongressContext\(user\.id\)/);
 assert.match(page,/current=items\.find\(d=>d\.congressId===activeId\)/);
 assert.match(page,/current\.sessions/);
 assert.match(page,/getWindowStatus\(s\)==="open"&&isQrAllowed\(s\.qr_policy,"session"\)/);
 assert.match(page,/primary\?\.checkedInAt/);
 assert.match(page,/delegateTheme\(current\.kind\)/);
 assert.match(page,/<BrandMark kind=\{current\.kind\}/);
 assert.match(page,/<DelegateCheckinScanner kind=\{current\.kind\}/);
 assert.match(page,/grid-cols-\[minmax\(0,1fr\)_315px\]/);
});

test("scanner retains secure checkin, tracked camera and accessible fallback after UI redesign",()=>{
 const ui=read("src/components/delegate-checkin-scanner.tsx");
 assert.match(ui,/parseSessionCheckinCode\(value\)/);
 assert.match(ui,/startTrackedScanner\(/);
 assert.match(ui,/locked\.current=true/);
 assert.match(ui,/fetch\("\/api\/attendance\/self-checkin"/);
 assert.match(ui,/credentials:"same-origin"/);
 assert.match(ui,/!window\.isSecureContext/);
 assert.match(ui,/capture="environment"/);
 assert.match(ui,/decodeFromImageUrl\(photoUrl\)/);
 assert.match(ui,/URL\.revokeObjectURL\(photoUrl\)/);
 assert.match(ui,/role="status" aria-live="polite"/);
 assert.match(ui,/role="alert"/);
 assert.match(ui,/Mở camera quét QR/);
 assert.match(ui,/<details className="mb-4/);
});

test("delegate pass uses brand-specific pale header, keeps print, barcode and full-screen modes",()=>{
 const ui=read("src/components/my-delegate-cards.tsx");
 const card=ui.slice(ui.indexOf("function DelegatePass("),ui.indexOf("/**",ui.indexOf("function DelegatePass(")));
 assert.match(card,/delegateTheme\(item\.kind\)/);
 assert.match(card,/data-congress-kind=\{item\.kind\}/);
 assert.match(card,/theme\.header/);
 assert.match(card,/theme\.stripe/);
 assert.match(card,/congressBranding\[item\.kind\]/);
 assert.match(card,/premium-delegate-id/);
 assert.match(card,/premium-id-watermark/);
 assert.match(card,/premium-id-hologram/);
 assert.match(card,/DelegateBarcode/);
 assert.match(card,/photoPath&&failedSrc!==photoUrl/);
 assert.doesNotMatch(card,/bg-\[#17263f\]|bg-\[#0c405b\]/);
 assert.match(ui,/FullDelegatePassViewer/);
 assert.match(ui,/calculateDelegatePassScale/);
 assert.match(ui,/window\.print\(\)/);
 assert.match(ui,/selectedTheme\.cta/);
});

test("session QR landing displays the same brand without changing protected checkin API",()=>{
 const page=read("src/app/checkin/s/[sessionId]/page.tsx");
 const client=read("src/components/self-checkin-client.tsx");
 assert.match(page,/verifySessionEntryQr/);
 assert.match(page,/getWindowStatus\(session\)!=="open"/);
 assert.match(page,/select\("name,kind"\)/);
 assert.match(page,/kind=\{congress\?\.kind==="hoi_sinh_vien"/);
 assert.match(client,/delegateTheme\(kind\)/);
 assert.match(client,/<BrandMark kind=\{kind\}/);
 assert.match(client,/role="alert"/);
 assert.match(client,/aria-live="polite"/);
 assert.match(client,/onError=\{\(\)=>setPhotoFailed\(true\)\}/);
 assert.match(client,/credentials:"same-origin"/);
 assert.match(client,/queueMicrotask\(\(\)=>void submit\(\)\)/);
});

test("congress picker keeps its selected text readable on a white background",()=>{
 const picker=read("src/components/portal-congress-picker.tsx");
 assert.match(picker,/bg-white px-3\.5 py-3 text-left/);
 assert.match(picker,/text-\[#25485f\] line-clamp-2/);
 assert.doesNotMatch(picker,/text-white line-clamp-2/);
});
