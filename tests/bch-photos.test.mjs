import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const file=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("BCH portrait migration adds private image metadata with tenant-specific path constraint",()=>{
 const sql=file("../supabase/upgrade-bch-photos-v9.sql");
 assert.match(sql,/ALTER TABLE public\.bch_candidates/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS photo_path text/);
 assert.match(sql,/bch_candidates_photo_path_expected_check/);
 assert.match(sql,/congress_id::text \|\| '\/bch\/' \|\| id::text \|\| '\.jpg'/);
 assert.doesNotMatch(sql,/GRANT .*storage\.objects/i);
});
test("BCH private photo endpoint permits administrators to upload but only admins and secretaries to view",()=>{
 const api=file("../src/app/api/bch-candidates/[id]/photo/route.ts");
 assert.match(api,/export async function GET/);
 assert.match(api,/export async function PUT/);
 assert.match(api,/hasRole\(supabase,user\.id,candidate\.congress_id,"admin"\)/);
 assert.match(api,/member\.data\?\.role!=="secretary"/);
  assert.match(api,/\.eq\("auth_user_id",user\.id\)/);
 assert.match(api,/db\.from\("bch_candidates"\)/);
 assert.match(api,/candidate\.photo_path!==expected/);
 assert.match(api,/private, no-store/);
 assert.match(api,/storage\.from\(BUCKET\)\.download\(expected\)/);
 assert.match(api,/expectedPath\(auth\.candidate\.congress_id,id\)/);
});
test("BCH photo upload validates JPEG dimensions and uses safe server re-encoding",()=>{
 const api=file("../src/app/api/bch-candidates/[id]/photo/route.ts");
 assert.match(api,/file\.type!=="image\/jpeg"/);
 assert.match(api,/file\.size>2\*1024\*1024/);
 assert.match(api,/metadata\.width!==600\|\|metadata\.height!==800/);
 assert.match(api,/sharp\(raw,\{limitInputPixels:5_000_000\}\)/);
 assert.match(api,/flatten\(\{background:"#ffffff"\}\)/);
 assert.match(api,/upsert:true/);
 assert.match(api,/\.eq\("id",id\)\.eq\("congress_id",auth\.candidate\.congress_id\)/);
});
test("BCH photo is present in response models and private storage cleaned on delete",()=>{
 const bch=file("../src/app/api/bch-candidates/route.ts");
 const page=file("../src/app/congresses/[id]/bch-candidates/page.tsx");
 const types=file("../src/lib/bch-candidates.ts");
 assert.match(bch,/current_position,photo_path,display_order/);
 assert.match(page,/current_position,photo_path,display_order/);
 assert.match(types,/photo_path:string\|null/);
 assert.match(bch,/\.from\("delegate-photos"\)\.remove\(\[expected\]\)/);
 assert.match(bch,/if\(data\.photo_path===expected\)/);
});
test("BCH form reuses delegate portrait editor with white background and 3:4 crop",()=>{
 const ui=file("../src/components/bch-candidates-client.tsx");
 const editor=file("../src/components/delegate-photo-editor.tsx");
 assert.match(ui,/DelegatePhotoEditor/);
 assert.match(ui,/title="Ảnh nhân sự giới thiệu BCH"/);
 assert.match(ui,/copyDelegatePhoto/);
 assert.match(ui,/Lấy ảnh từ đại biểu/);
 assert.match(ui,/currentFormPhoto/);
 assert.match(ui,/BchPortrait candidate=\{item\}/);
 assert.match(ui,/BchPortrait candidate=\{item\} large/);
 assert.match(ui,/setEditing\(item\.id\); \/\/ Saving again will retry/);
 assert.match(editor,/ImageSegmenter\.createFromOptions/);
 assert.match(editor,/OUTPUT_WIDTH=600/);
 assert.match(editor,/OUTPUT_HEIGHT=800/);
 assert.match(editor,/fillStyle="#ffffff"/);
});
