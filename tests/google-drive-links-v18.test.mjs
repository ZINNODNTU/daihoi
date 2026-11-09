import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {googleDriveFileUrl} from "../src/lib/drive-links.ts";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Đường dẫn Google Drive chỉ sinh từ ID file hợp lệ, không cho redirect tùy ý",()=>{
 assert.equal(googleDriveFileUrl("1AbCdEfGh12345_-"),
  "https://drive.google.com/file/d/1AbCdEfGh12345_-/view");
 for(const id of ["https://evil.example","../../etc/passwd","id?evil=1","", "a".repeat(250)])
  assert.throws(()=>googleDriveFileUrl(id));
});

test("Đại biểu chỉ xem tên/icon/số file, nhấn sẽ chuyển sang Drive trong tab khác",()=>{
 const page=read("../src/app/my-card/documents/page.tsx");
 assert.match(page,/getMyDelegateData/);
 assert.match(page,/\.eq\("delegate_visible",true\)/);
 assert.match(page,/docs\.length\} tệp/);
 assert.match(page,/doc\.file_name/);
 assert.match(page,/icon=|fileIcon\(doc\.mime_type\)/);
 assert.match(page,/href=\{"\/api\/documents\/"\+doc\.id\}/);
 assert.match(page,/target="_blank"/);
 assert.doesNotMatch(page,/Download|Tải về|inline=1/);
 const redirect=read("../src/app/api/documents/[id]/route.ts");
 assert.match(redirect,/NextResponse\.redirect\(destination,302\)/);
 assert.match(redirect,/googleDriveFileUrl\(doc\.drive_file_id\)/);
 assert.match(redirect,/hasRole\(supabase,user\.id,doc\.congress_id,"viewer"\)/);
 assert.match(redirect,/if\(!doc\.delegate_visible\)/);
 assert.match(redirect,/\.eq\("auth_user_id",user\.id\)/);
 assert.doesNotMatch(redirect,/fetchDriveFile|file\.body|Content-Disposition/);
});

test("BTC upload rồi lưu metadata; cầu nối Script được ưu tiên, OAuth vẫn dự phòng",()=>{
 const api=read("../src/app/api/documents/route.ts");
 assert.match(api,/hasRole\(supabase,user\.id,congressId,"admin"\)/);
 assert.match(api,/validateDocumentBytes/);
 assert.match(api,/scriptStorageSelected\(\)/);
 assert.match(api,/uploadScriptDrive\(congressId,file\)/);
 assert.match(api,/uploadDriveFile\(token,folder,file\)/);
 assert.match(api,/drive_file_id:uploaded\.id/);
 assert.match(api,/deleteScriptDrive\(uploadCongressId,uploadedId\)/);
 assert.match(api,/deleteDriveFile\(token,uploadedId\)/);
 const ui=read("../src/components/documents-client.tsx");
 assert.match(ui,/documents\/status/);
 assert.match(ui,/multiple disabled/);
 assert.match(ui,/doc\.file_name/);
 assert.match(ui,/Công bố tài liệu cho đại biểu/);
 assert.match(ui,/target="_blank"/);
 assert.doesNotMatch(ui,/Tải về/);
});

test("Bật công bố đồng bộ quyền Drive rồi mới lưu Supabase; rollback nếu DB lỗi",()=>{
 const api=read("../src/app/api/documents/visibility/route.ts");
 assert.match(api,/hasRole\(supabase,user\.id,congressId,"admin"\)/);
 assert.match(api,/shareScriptDrive\(congressId,driveFileId,visible\)/);
 assert.match(api,/setDriveLinkSharing\(token,driveFileId,visible\)/);
 assert.ok(api.indexOf("await share(body.visible)")<api.indexOf('.update({delegate_visible:body.visible})'));
 assert.match(api,/await share\(previouslyVisible\)/);
 const drive=read("../src/lib/drive.ts");
 assert.match(drive,/export async function setDriveLinkSharing/);
 assert.match(drive,/type:"anyone",role:"reader",allowFileDiscovery:false/);
 assert.match(drive,/method:"DELETE"/);
});

test("Apps Script bridge ký HMAC, kiểm tra thời gian/nonce và giới hạn file trong Đại hội",()=>{
 const server=read("../src/lib/google-apps-script.ts");
 assert.match(server,/createHmac\("sha256",secret\)/);
 assert.match(server,/randomUUID\(\)/);
 assert.match(server,/script\.google\.com/);
 assert.match(server,/action:"upload"/);
 assert.match(server,/action:"sharing"/);
 assert.match(server,/action:"delete"/);
 assert.match(server,/scriptStorageSelected/);
 const script=read("../scripts/google-drive-bridge/Code.gs");
 assert.match(script,/function doPost\(e\)/);
 assert.match(script,/Utilities\.computeHmacSha256Signature/);
 assert.match(script,/CacheService\.getScriptCache\(\)/);
 assert.match(script,/LockService\.getScriptLock\(\)/);
 assert.match(script,/Math\.abs\(Date\.now\(\)-message\.time\)/);
 assert.match(script,/DAI_HOI_/);
 assert.match(script,/unauthorized_file/);
 assert.match(script,/DriveApp\.Access\.ANYONE_WITH_LINK/);
 assert.match(script,/DriveApp\.Permission\.VIEW/);
 assert.match(script,/4\*1024\*1024/);
 assert.doesNotMatch(script,/getScriptProperties\(\).*BRIDGE_SECRET.*console\.log/s);
});

test("Status phân biệt Apps Script / OAuth và file hướng dẫn không chứa khóa thật",()=>{
 const status=read("../src/app/api/documents/status/route.ts");
 assert.match(status,/scriptStorageSelected\(\)/);
 assert.match(status,/checkScriptDrive\(congressId\)/);
 assert.match(status,/checkDriveConnection\(\)/);
 const env=read("../.env.example");
 assert.match(env,/GOOGLE_APPS_SCRIPT_URL/);
 assert.match(env,/GOOGLE_APPS_SCRIPT_SECRET/);
 assert.match(env,/GOOGLE_REFRESH_TOKEN/);
 assert.match(read("../docs/tinh-nang/tai-lieu/GOOGLE-DRIVE-LINKS-V18.md"),/Không cần/);
});
