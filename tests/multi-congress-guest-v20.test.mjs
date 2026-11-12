import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Một tài khoản liên kết nhiều hồ sơ theo congress_id, không cấp lại mật khẩu",()=>{
 const sql=read("../supabase/upgrade-delegate-accounts-v5.sql");
 const provision=read("../src/app/api/delegates/accounts/route.ts");
 assert.match(sql,/delegates_congress_student_unique/);
 assert.match(sql,/ON public\.delegates\(congress_id, lower\(student_id\)\)/);
 assert.match(provision,/findExisting\(authEmail\)/);
 assert.match(provision,/linkedExisting\+\+/);
 assert.match(provision,/if\(existing\)/);
 assert.match(provision,/auth_user_id:targetId/);
});

test("Đại biểu chỉ tự cập nhật thông tin hồ sơ sở hữu, giữ định danh điểm danh",()=>{
 const api=read("../src/app/api/my-card/profile/route.ts");
 assert.match(api,/export async function PATCH/);
 assert.match(api,/getAuth\(\)/);
 assert.match(api,/\.eq\("auth_user_id",user\.id\)/);
 assert.match(api,/\.eq\("is_active",true\)/);
 assert.match(api,/\.eq\("auth_user_id",user\.id\)\.eq\("is_active",true\)/);
 assert.match(api,/\.update\(changes\)/);
 assert.match(api,/origin/);
 assert.doesNotMatch(api,/\.update\(\{[^}]*barcode_code|\.update\(\{[^}]*student_id/);
 const editor=read("../src/components/delegate-profile-editor.tsx");
 assert.match(editor,/DelegatePhotoEditor/);
 assert.match(editor,/HỒ SƠ CÁ NHÂN DÙNG CHUNG/);
 assert.match(editor,/\/api\/my-card\/profile/);
 assert.match(editor,/\/photo/);
});

test("Đại biểu được đổi ảnh của chính mình nhưng ảnh người khác vẫn bị chặn",()=>{
 const photo=read("../src/app/api/delegates/[id]/photo/route.ts");
 assert.match(photo,/delegate\.auth_user_id===user\.id/);
 assert.match(photo,/hasCongressAbility\(supabase,user\.id,delegate\.congress_id,/);
 assert.match(photo,/const shared=delegate\.auth_user_id===checked\.user\.id&&delegate\.is_active/);
 assert.match(photo,/sharedPortraitKey\(delegate\.auth_user_id!\)/);
 assert.match(photo,/sharedPortraitKey/);
 assert.match(read("../src/lib/portrait-upload.ts"),/\.metadata\(\)/);
 assert.match(read("../src/lib/portrait-upload.ts"),/metadata\.width!==600\|\|metadata\.height!==800/);
});

test("Khách mời chỉ thấy tài liệu công bố và BCH thuộc Đại hội được cấp quyền",()=>{
 const access=read("../src/lib/portal-congress-access.ts");
 assert.match(access,/\.eq\("auth_user_id",userId\)/);
 assert.match(access,/\.eq\("role","guest"\)/);
 assert.match(access,/\.eq\("user_id",userId\)/);
 const docs=read("../src/app/my-card/documents/page.tsx");
 assert.match(docs,/getPortalCongressContext/);
 assert.match(docs,/\.eq\("delegate_visible",true\)/);
 const redirect=read("../src/app/api/documents/[id]/route.ts");
 assert.match(redirect,/if\(!doc\.delegate_visible\)/);
 assert.match(redirect,/\.eq\("role","guest"\)/);
 const bch=read("../src/app/my-card/bch/page.tsx");
 assert.match(bch,/getPortalCongressContext/);
 assert.match(bch,/\.eq\("congress_id",congressId\)/);
 const candidatePhoto=read("../src/app/api/bch-candidates/[id]/photo/route.ts");
 assert.match(candidatePhoto,/\["delegate","guest"\]/);
 assert.match(candidatePhoto,/if\(write&&!admin\)/);
 const shell=read("../src/components/delegate-shell.tsx");
 assert.match(shell,/guestOnly/);
 assert.match(shell,/\/my-card\/documents/);
 assert.match(shell,/\/my-card\/bch/);
});
