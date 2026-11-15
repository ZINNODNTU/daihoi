import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("official organizational logos exist locally and are the single fallback assets",()=>{
 const branding=read("src/components/brand-mark.tsx");
 for(const [kind,filename] of [
  ["doan","huy-hieu-doan.png"],["hoi_sinh_vien","huy-hieu-hoi-sinh-vien.png"]
 ]){
  assert.match(branding,new RegExp(kind+":\\{src:\"/branding/"+filename.replaceAll(".","\\.")+"\""));
  assert.ok(statSync(new URL("../public/branding/"+filename,import.meta.url)).size>1000);
 }
});

test("shared portrait loads uploaded image and falls back to correct congress logo on null or error",()=>{
 const portrait=read("src/components/delegate-portrait.tsx");
 assert.match(portrait,/const hasPhoto=Boolean\(photoPath&&failedUrl!==url\)/);
 assert.match(portrait,/const brand=congressBranding\[kind\]/);
 assert.match(portrait,/onError=\{\(\)=>setFailedUrl\(url\)\}/);
 assert.match(portrait,/src=\{brand.src\}/);
 assert.match(portrait,/object-contain p-\[11%\]/);
 assert.match(portrait,/alt=\{"Logo "\+brand.name/);
 assert.doesNotMatch(portrait,/\.upload\(|\.insert\(|\.upsert\(/);
});

test("delegate card and printable badge use the same organization-aware fallback",()=>{
 const pass=read("src/components/my-delegate-cards.tsx");
 const print=read("src/components/print-delegate-pass.tsx");
 assert.match(pass,/DelegatePortrait delegateId=\{item.id\} fullName=\{item.fullName\}/);
 assert.match(pass,/kind=\{item.kind\}/);
 assert.match(pass,/photoPath=\{item.photoPath\}/);
 assert.match(print,/DelegatePass item=\{item\} priority/);
});

test("admin roster, portrait preview, and QR modal use selected congress kind",()=>{
 const page=read("src/app/congresses/[id]/delegates/page.tsx");
 const list=read("src/components/delegates-client.tsx");
 assert.match(page,/\.select\("id,slug,kind"\)/);
 assert.match(page,/congressKind=\{congress.data\?\.kind==="hoi_sinh_vien"/);
 assert.match(list,/congressKind:CongressKind/);
 assert.match(list,/kind=\{congressKind\}/);
 assert.equal((list.match(/<DelegatePortrait/g)||[]).length,4);
 assert.match(list,/photoPath=\{d.photo_path\}/);
 assert.match(list,/photoPath=\{delegates.find\(d=>d.id===showCard.id\)\?\.photo_path\}/);
 assert.match(list,/\{d.photo_path\?"Sửa ảnh":"Thêm ảnh"\}/,
  "fallback logo should never be saved as a delegate photo");
});

test("self check-in and account editing show correct logo without preventing photo upload",()=>{
 const checkin=read("src/components/self-checkin-client.tsx");
 const account=read("src/app/account/page.tsx");
 const edit=read("src/components/delegate-profile-editor.tsx");
 assert.match(checkin,/DelegatePortrait delegateId=\{delegate.id\}/);
 assert.match(checkin,/photoPath=\{delegate.photo_path\} kind=\{kind\}/);
 assert.match(account,/kind:\(selected\?\.kind\?\?context\?\.options.find\(c=>c.id===first.congress_id\)/);
 assert.match(edit,/DelegatePortrait delegateId=\{selected.id\}/);
 assert.match(edit,/kind=\{selected.kind\|\|"doan"\}/);
 assert.match(edit,/setPhotoId\(selected.id\)/);
});

test("check-in projector and welcome queue receive and render the proper logo",()=>{
 const screen=read("src/components/session-qr-screen.tsx");
 const projection=read("src/components/attendance-projection.tsx");
 const deskPage=read("src/app/congresses/[id]/attendance/desk/page.tsx");
 const desk=read("src/components/attendance-client.tsx");
 const recent=read("src/components/recent-checkin-card.tsx");
 assert.match(screen,/ProjectionWelcome data=\{liveData\} congressName=\{congressName\} compact featured=\{featured\} congressKind=\{congressKind\}/);
 assert.match(screen,/ProjectionArrivalQueue data=\{liveData\} waiting=\{waiting\} congressKind=\{congressKind\}/);
 assert.match(projection,/photoPath=\{person.photo_path\} kind=\{congressKind\}/);
 assert.match(deskPage,/congressKind=\{congress.data\?\.kind==="hoi_sinh_vien"/);
 assert.match(desk,/congressKind=\{congressKind\}/);
 assert.match(recent,/DelegatePortrait delegateId=\{person.id\}/);
 assert.match(recent,/photoPath=\{person.photo_path\} kind=\{congressKind\}/);
});
