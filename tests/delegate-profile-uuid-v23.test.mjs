import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const api=readFileSync(new URL("../src/app/api/my-card/profile/route.ts",import.meta.url),"utf8");
const match=api.match(/const uuid=\/(.+)\/i;/);
if(!match)throw new Error("Không tìm thấy biểu thức xác minh UUID của hồ sơ đại biểu");
const uuid=new RegExp(match[1],"i");

test("Cập nhật đại biểu chấp nhận đúng UUID 8-4-4-4-12 từ Supabase",()=>{
 assert.equal(uuid.test("a74c23d0-b7a1-4ee7-9bf4-2a0c924aff06"),true);
 assert.equal(uuid.test("00000000-0000-0000-0000-000000000000"),true);
 assert.equal(uuid.test("A74C23D0-B7A1-4EE7-9BF4-2A0C924AFF06"),true);
});
test("Cập nhật đại biểu từ chối mã không đúng UUID và đầu vào bất thường",()=>{
 for(const candidate of [
  "a74c23d0-b7a1-4ee7-2a0c924aff06", // old broken 8-4-4-12 pattern
  "a74c23d0-b7a1-4ee7-9bf4-2a0c924aff0",
  "a74c23d0-b7a1-4ee7-9bf4-2a0c924aff066",
  "abc", "", "../another-record",
  "a74c23d0-b7a1-4ee7-9bf4-2a0c924aff06;drop",
 ]) assert.equal(uuid.test(candidate),false,candidate);
});
test("Cập nhật hồ sơ vẫn xác minh đúng chủ sở hữu và Đại hội, không đổi mã QR / ghế",()=>{
 assert.match(api,/\.eq\("id",delegateId\)\.eq\("auth_user_id",user\.id\)/);
 assert.match(api,/\.eq\("is_active",true\)/);
 assert.match(api,/\.eq\("auth_user_id",user\.id\)\.eq\("is_active",true\)/);
 assert.match(api,/\.from\("profiles"\)\.upsert/);
 assert.match(api,/if\(!owned\)return fail\(.+,403,"not_owner"\)/);
 assert.match(api,/\.update\(changes\)/);
 assert.doesNotMatch(api,/changes\.(?:barcode_code|qr_code|congress_id|seat_id|auth_user_id|student_id)\s*=/);
});
