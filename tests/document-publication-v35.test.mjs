import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Đại biểu chỉ thấy tài liệu của Đại hội đang chọn đã được BTC công bố",()=>{
 const page=file("../src/app/my-card/documents/page.tsx");
 const list=file("../src/components/delegate-documents-list.tsx");
 assert.match(page,/getPortalCongressContext\(user\.id\)/);
 assert.match(page,/\.eq\("congress_id",congressId\)\.eq\("delegate_visible",true\)/);
 assert.match(page,/export const dynamic="force-dynamic"/);
 assert.match(list,/docs\.length===0\?"Chưa có tài liệu được công bố"/);
 assert.match(list,/Ban Tổ chức chưa công bố tài liệu cho đại biểu tại Đại hội này/);
 assert.match(list,/docs\.length>0&&\(query\|\|congressId\)/);
});

test("Tải tài liệu có tùy chọn công bố rõ ràng, mặc định nội bộ để tránh rò rỉ",()=>{
 const ui=file("../src/components/documents-client.tsx");
 const api=file("../src/app/api/documents/route.ts");
 assert.match(ui,/useState\(false\)/);
 assert.match(ui,/Công bố ngay cho đại biểu sau khi tải lên/);
 assert.match(ui,/form\.append\("publish",publishOnUpload\?"true":"false"\)/);
 assert.match(ui,/Mặc định tài liệu là nội bộ/);
 assert.match(api,/const publishAfterUpload=form\.get\("publish"\)==="true"/);
 assert.match(api,/delegate_visible:false/);
 assert.match(api,/if\(publishAfterUpload\)/);
 assert.match(api,/shareScriptDrive\(congressId,uploaded\.id,true\)/);
 assert.match(api,/setDriveLinkSharing\(token,uploaded\.id,true\)/);
 assert.match(api,/\.update\(\{delegate_visible:true\}\)/);
 assert.ok(api.indexOf('shareScriptDrive(congressId,uploaded.id,true)') <
  api.indexOf('.update({delegate_visible:true})'));
 assert.match(api,/shareScriptDrive\(congressId,uploaded\.id,false\)/);
 assert.match(api,/setDriveLinkSharing\(token,uploaded\.id,false\)/);
 assert.match(api,/warning/);
 assert.match(api,/published/);
});

test("BTC có thể công bố lại tài liệu nội bộ, không vô tình công bố hàng loạt",()=>{
 const ui=file("../src/components/documents-client.tsx");
 const api=file("../src/app/api/documents/visibility/route.ts");
 assert.match(ui,/async function publishAll\(\)/);
 assert.match(ui,/window\.confirm\(/);
 assert.match(ui,/unpublished\.length/);
 assert.match(ui,/setVisibilityOverrides/);
 assert.match(ui,/body:JSON\.stringify\(\{congressId,documentId:doc\.id,visible:true\}\)/);
 assert.match(ui,/onChange=\{\(\)=>void toggleShare\(doc\)\}/);
 assert.match(api,/hasRole\(supabase,user\.id,congressId,"admin"\)/);
 assert.match(api,/\.eq\("congress_id",congressId\)/);
 assert.ok(api.indexOf("await share(body.visible)")<
  api.indexOf(".update({delegate_visible:body.visible})"));
});

test("Liên kết tài liệu không được chuyển cho tài khoản ngoài Đại hội",()=>{
 const api=file("../src/app/api/documents/[id]/route.ts");
 assert.match(api,/if\(!doc\.delegate_visible\)return fail\(403/);
 assert.match(api,/\.eq\("auth_user_id",user\.id\)/);
 assert.match(api,/\.eq\("congress_id",doc\.congress_id\)/);
 assert.match(api,/NextResponse\.redirect\(destination,302\)/);
});
