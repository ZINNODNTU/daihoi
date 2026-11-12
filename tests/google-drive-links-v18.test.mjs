import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {googleDriveFileUrl,googleDrivePreviewUrl} from "../src/lib/drive-links.ts";
import {serializeSignedPayload} from "../src/lib/drive-signature.ts";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Đường dẫn Google Drive chỉ sinh từ ID file hợp lệ, không cho redirect tùy ý",()=>{
 assert.equal(googleDriveFileUrl("1AbCdEfGh12345_-"),
  "https://drive.google.com/file/d/1AbCdEfGh12345_-/view");
 assert.equal(googleDrivePreviewUrl("1AbCdEfGh12345_-"),
  "https://drive.google.com/file/d/1AbCdEfGh12345_-/preview");
 for(const id of ["https://evil.example","../../etc/passwd","id?evil=1","", "a".repeat(250)]){
  assert.throws(()=>googleDriveFileUrl(id));
  assert.throws(()=>googleDrivePreviewUrl(id));
 }
});

test("Đại biểu đọc PDF qua Google Drive Preview trên web, file cũ mở Drive dự phòng",()=>{
 const page=read("../src/app/my-card/documents/page.tsx");
  const list=read("../src/components/delegate-documents-list.tsx");
 assert.match(page,/getPortalCongressContext/);
  assert.match(page,/\.eq\("congress_id",congressId\)/);
 assert.match(page,/\.eq\("delegate_visible",true\)/);
 assert.match(list,/docs\.length\} tệp/);
 assert.match(list,/doc\.file_name/);
 assert.match(list,/icon=|fileIcon\(doc\.mime_type\)/);
 assert.match(list,/href=\{"\/api\/documents\/"\+doc\.id\}/);
 assert.match(list,/target="_blank"/);
 assert.match(list,/GoogleDrivePdfViewer/);
 assert.match(list,/setSelected\(doc\)/);
 const viewer=read("../src/components/google-drive-pdf-viewer.tsx");
 assert.match(viewer,/\?preview=1/);
 assert.match(viewer,/<iframe/);
 assert.match(viewer,/Mở trên Google Drive/);
 assert.doesNotMatch(list,/Download|Tải về|inline=1/);
 const redirect=read("../src/app/api/documents/[id]/route.ts");
 assert.match(redirect,/NextResponse\.redirect\(destination,302\)/);
 assert.match(redirect,/googleDriveFileUrl\(doc\.drive_file_id\)/);
 assert.match(redirect,/googleDrivePreviewUrl\(doc\.drive_file_id\)/);
 assert.match(redirect,/searchParams\.get\("preview"\)/);
 assert.match(redirect,/mime_type!=="application\/pdf"/);
 assert.match(redirect,/hasCongressAbility\(supabase,user\.id,doc\.congress_id,"documents\.read"\)/);
 assert.match(redirect,/if\(!doc\.delegate_visible\)/);
 assert.match(redirect,/\.eq\("auth_user_id",user\.id\)/);
 assert.doesNotMatch(redirect,/fetchDriveFile|file\.body|Content-Disposition/);
});

test("BTC upload rồi lưu metadata; cầu nối Script được ưu tiên, OAuth vẫn dự phòng",()=>{
 const api=read("../src/app/api/documents/route.ts");
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,\"documents\.write\"\)/);
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
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,\"documents\.write\"\)/);
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
test("Có lệnh kiểm tra Drive live chỉ đọc, không ghi dữ liệu hoặc in khóa",()=>{
 const live=read("../scripts/check-drive.mjs");
 const pkg=JSON.parse(read("../package.json"));
 assert.equal(pkg.scripts["check:drive"],"node scripts/check-drive.mjs");
 assert.match(live,/createHmac\("sha256",secret\)/);
 assert.match(live,/action:"status"/);
 assert.match(live,/console\.log\("\[OK\] Apps Script Web App/);
 assert.doesNotMatch(live,/action:"upload"|action:"sharing"|action:"delete"/);
 assert.doesNotMatch(live,/console\.log\(.*secret|console\.log\(.*signature/);
});

test("HMAC Apps Script sử dụng JSON ASCII-only, giữ nguyên tên file Unicode",()=>{
 const original={
  action:"upload",
  congressId:"00000000-0000-4000-8000-000000000001",
  name:"Báo cáo Đại hội – Đoàn TNCS 🧑‍💼.pdf",
  mimeType:"application/pdf",
  base64:"JVBERi0xLjQK"
 };
 const payload=serializeSignedPayload(original);
 assert.match(payload,/\\u00e1/);
 assert.match(payload,/\\u0110/);
 assert.ok([...payload].every(char=>char.charCodeAt(0)<128),"Payload ký phải chỉ chứa ASCII");
 assert.deepEqual(JSON.parse(payload),original,"Filename Unicode phải giữ nguyên sau JSON.parse");
 const ascii={name:"BC_DKCNTT_T10_2026.pdf",mimeType:"application/pdf"};
 assert.equal(serializeSignedPayload(ascii),JSON.stringify(ascii),"Không thay đổi payload ASCII hiện có");
 const transport=JSON.stringify({payload,signature:"example"});
 assert.equal(JSON.parse(transport).payload,payload,"Payload gửi qua HTTP giữ nguyên từng byte ký");
});
test("Ứng dụng dùng hàm serializeSignedPayload khi tạo chữ ký HMAC",()=>{
 const server=read("../src/lib/google-apps-script.ts");
 assert.match(server,/import \{serializeSignedPayload\} from "@\/lib\/drive-signature"/);
 assert.match(server,/const payload=serializeSignedPayload\(request\)/);
 assert.match(server,/createHmac\("sha256",secret\)\.update\(time\+"\."\+nonce\+"\."\+payload,"utf8"\)/);
});

test("Migration V14 bổ sung cột công bố mặc định riêng tư, có kiểm tra schema",()=>{
 const sql=read("../supabase/upgrade-delegate-resources-v14.sql");
 assert.match(sql,/ALTER TABLE public\.documents/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS delegate_visible boolean NOT NULL DEFAULT false/);
 assert.match(sql,/CREATE INDEX IF NOT EXISTS documents_delegate_visible_idx/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM/i);
 const pkg=JSON.parse(read("../package.json"));
 assert.equal(pkg.scripts["check:documents"],"node scripts/check-documents-schema.mjs");
 const check=read("../scripts/check-documents-schema.mjs");
 assert.match(check,/\["id","delegate_visible","drive_file_id","congress_id"\]/);
 assert.match(check,/\.from\("documents"\)\.select\(column\)\.limit\(1\)/);
 const api=read("../src/app/api/documents/visibility/route.ts");
 assert.match(api,/lookupError\.code==="42703"/);
 assert.match(api,/error\?\.code==="42703"/);
 assert.match(api,/await share\(previouslyVisible\)/);
});
