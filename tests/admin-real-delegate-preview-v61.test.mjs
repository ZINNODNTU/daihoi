import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const preview=read("src/app/dashboard/access/preview/[userId]/page.tsx");
const context=read("src/lib/portal-preview-context.ts");
const auth=read("src/lib/auth.ts");
const nav=read("src/components/delegate-shell.tsx");
const guard=read("src/components/portal-preview-navigation.tsx");
const checkin=read("src/app/my-card/checkin/page.tsx");
const cards=read("src/components/my-delegate-cards.tsx");
const picker=read("src/components/portal-congress-picker.tsx");

test("admin portal preview reuses all six actual delegate pages",()=>{
 for(const page of ["MyCardPage","DelegateCheckinPage","DelegateSeatsPage",
   "DelegateDocumentsPage","DelegateBchPage","DelegateHistoryPage"]){
  assert.ok(preview.includes("<"+page),"Missing actual page "+page);
 }
 assert.ok(preview.includes("<DelegateShell "));
 assert.ok(preview.includes("<PortalPreviewNavigation "));
 assert.ok(preview.includes("setVerifiedPortalPreview(userId,congressId)"));
});

test("request-local preview requires verified admin and active target membership",()=>{
 assert.ok(context.includes('import "server-only"'));
 assert.ok(context.includes("cache("));
 assert.ok(preview.includes('actor?.platform_role!=="super_admin"'));
 assert.ok(preview.includes("authResult.error"));
 assert.ok(preview.includes('rawRole==="delegate"&&!delegateResult.data?.length'));
 assert.ok(preview.includes('portalRights.includes("portal.access")'));
 assert.ok(auth.includes("const preview=currentPortalPreview()"));
 assert.ok(auth.includes("supabase.auth.getUser()"));
 assert.ok(!preview.includes("signInWithPassword"));
 assert.ok(!preview.includes("setSession("));
});

test("preview keeps navigation but disables QR capture, printing and logout",()=>{
 assert.ok(nav.includes("previewBasePath"));
 assert.ok(nav.includes("!previewBasePath&&<button"));
 assert.ok(picker.includes("if(previewBasePath)"));
 assert.ok(guard.includes("onClickCapture={navigate}"));
 assert.ok(guard.includes("onSubmitCapture={blockForm}"));
 assert.ok(checkin.includes("currentPortalPreview()?"));
 assert.ok(cards.includes('readOnly=false'));
 assert.ok(cards.includes('{!readOnly&&<Link href={"/print/delegate/"+item.id}'));
});
