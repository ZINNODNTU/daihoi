import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync,statSync} from "node:fs";

const text=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("Mã đại biểu được tạo tại database, bất kể dữ liệu client gửi",()=>{
 const migration=text("../supabase/upgrade-delegate-photos-v7.sql");
 assert.match(migration,/private\.delegate_code_counters/);
 assert.match(migration,/ON CONFLICT \(congress_id\) DO UPDATE/);
 assert.match(migration,/NEW\.code := 'DB-' \|\| lpad/);
 assert.match(migration,/BEFORE INSERT ON public\.delegates/);
 assert.match(migration,/REVOKE ALL ON TABLE private\.delegate_code_counters/);
});
test("API bỏ qua mã tự khai báo và trả ID/mã phát sinh để tải ảnh",()=>{
 const api=text("../src/app/api/delegates/route.ts");
 assert.doesNotMatch(api,/item\.code/);
 assert.doesNotMatch(api,/randomUUID/);
 assert.match(api,/\.insert\(rows\)\.select\("id,code,full_name"\)/);
 assert.match(api,/created:data\?\?\[\]/);
});
test("Form không có ô nhập mã và Excel mẫu hiển thị Đơn vị",()=>{
 const ui=text("../src/components/delegates-client.tsx");
 assert.doesNotMatch(ui,/name="code"/);
 assert.doesNotMatch(ui,/Mã đại biểu \(tùy chọn\)/);
 assert.match(ui,/\["MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò"\]/);
 assert.match(ui,/Mã đại biểu được hệ thống tự cấp/);
 assert.match(ui,/DelegatePhotoEditor/);
});
test("API ảnh bắt buộc quyền và JPEG 600x800, kho riêng tư",()=>{
 const route=text("../src/app/api/delegates/[id]/photo/route.ts");
 assert.match(route,/authorize\(id,"viewer"\)/);
 assert.match(route,/authorize\(id,"admin"\)/);
 assert.match(route,/createAdminClient\(\)/);
 assert.match(route,/meta\.width!==600\|\|meta\.height!==800/);
 assert.match(route,/Cache-Control":"private, no-store/);
 assert.match(route,/delegate-photos/);
});
test("Tách nền AI chạy trên trình duyệt và ảnh đầu ra nền trắng",()=>{
 const editor=text("../src/components/delegate-photo-editor.tsx");
 assert.match(editor,/ImageSegmenter\.createFromOptions/);
 assert.match(editor,/outputConfidenceMasks:true/);
 assert.match(editor,/destination-in/);
 assert.match(editor,/destination-over/);
 assert.match(editor,/fillStyle="#ffffff"/);
 assert.match(editor,/OUTPUT_WIDTH=600/);
 assert.match(editor,/OUTPUT_HEIGHT=800/);
 assert.ok(statSync(new URL("../public/models/selfie_segmenter.tflite",import.meta.url)).size>100000);
});
