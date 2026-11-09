import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync,readdirSync} from "node:fs";
import {dirname,join,relative,resolve,basename,sep} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const docs=join(root,"docs");
const docIndex=readFileSync(join(docs,"README.md"),"utf8");
const historyIndex=readFileSync(join(docs,"lich-su","README.md"),"utf8");
const rootReadme=readFileSync(join(root,"README.md"),"utf8");

function findDocs(folder){
 return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>{
  const full=join(folder,entry.name);
  return entry.isDirectory()?findDocs(full):entry.name.endsWith(".md")?[full]:[];
 });
}

test("Docs được phân nhóm: không còn các file phiên bản cũ ở thư mục gốc",()=>{
 assert.deepEqual(readdirSync(docs,{withFileTypes:true}).filter(entry=>entry.isFile())
  .map(entry=>entry.name).sort(),["QUY-UOC.md","README.md"]);
 for(const section of ["huong-dan","nghiep-vu","tinh-nang","giao-dien","lich-su"])
  assert.ok(existsSync(join(docs,section)),`Thiếu docs/${section}`);
});

test("Không có Markdown link nội bộ hỏng sau khi di chuyển docs",()=>{
 const sources=[...findDocs(docs),join(root,"README.md")];
 let checked=0;
 for(const file of sources){
  const markdown=readFileSync(file,"utf8");
  for(const match of markdown.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/g)){
   const value=match[1].trim();
   if(/^(https?:|mailto:|#|data:)/i.test(value))continue;
   const href=decodeURIComponent(value.split("#")[0].split("?")[0]);
   if(!href)continue;
   const target=resolve(dirname(file),href);
   assert.ok(existsSync(target),`Liên kết hỏng trong ${relative(root,file)}: ${value}`);
   checked++;
  }
 }
 assert.ok(checked>=30,`Kiểm tra được quá ít liên kết nội bộ: ${checked}`);
});

test("Mỗi file tài liệu được liệt kê trong mục lục hiện hành hoặc lịch sử",()=>{
 const allDocs=findDocs(docs);
 for(const file of allDocs){
  const short=relative(docs,file).split(sep).join("/");
  if(["README.md","QUY-UOC.md","lich-su/README.md"].includes(short))continue;
  const archive=short.startsWith("lich-su/");
  const index=archive?historyIndex:docIndex;
  assert.ok(index.includes(basename(file)),`Thiếu mục lục cho ${short}`);
 }
 assert.match(docIndex,/tinh-nang\/tai-lieu\/GOOGLE-DRIVE-LINKS-V18\.md/);
 assert.match(docIndex,/huong-dan\/SUPABASE-SETUP\.md/);
 assert.match(historyIndex,/GOOGLE-DRIVE-V17\.md/);
 assert.match(rootReadme,/\[mục lục tài liệu chính thức\]\(docs\/README\.md\)/);
});

test("Root README và code-test không dùng path docs cũ",()=>{
 const old=["docs/GOOGLE-DRIVE-LINKS-V18.md",
  "docs/GOOGLE-DRIVE-V17.md","docs/QUY-TRINH-TRIEN-KHAI.md",
  "docs/SUPABASE-SETUP.md","docs/RESPONSIVE-UI.md",
  "docs/NGHIEP-VU-DAI-HOI.md","docs/SEATING-GRID-CANVAS.md"];
 for(const oldPath of old)assert.ok(!rootReadme.includes(oldPath),`README còn path cũ: ${oldPath}`);
 assert.match(readFileSync(join(root,"tests/google-drive-links-v18.test.mjs"),"utf8"),
  /docs\/tinh-nang\/tai-lieu\/GOOGLE-DRIVE-LINKS-V18\.md/);
});

test("Checklist Supabase chỉ tham chiếu SQL migration có thật",()=>{
 const checklist=readFileSync(join(docs,"huong-dan","SUPABASE-SETUP.md"),"utf8");
 const sql=[...new Set(checklist.match(/supabase\/[a-z0-9-]+\.sql/g)||[])];
 assert.ok(sql.length>=12);
 for(const entry of sql)assert.ok(existsSync(join(root,entry)),`Thiếu migration: ${entry}`);
 assert.match(checklist,/không phải xác nhận migrations đã chạy trên production/);
});

test("Readiness nhận cả Apps Script V18 và OAuth dự phòng, không in secret",()=>{
 const script=readFileSync(join(root,"scripts","readiness.mjs"),"utf8");
 assert.match(script,/GOOGLE_APPS_SCRIPT_URL/);
 assert.match(script,/GOOGLE_APPS_SCRIPT_SECRET/);
 assert.match(script,/GOOGLE_REFRESH_TOKEN/);
 assert.match(script,/const driveReady=scriptReady\|\|oauthReady/);
 assert.doesNotMatch(script,/console\.log\(env\.GOOGLE_APPS_SCRIPT_SECRET\)/);
});

test("README gốc là trang giới thiệu ngắn, chi tiết lịch sử được lưu riêng",()=>{
 const archive=join(docs,"lich-su","README-GOC-2026-11-09.md");
 assert.ok(existsSync(archive),"Chưa lưu bản README dài để tra cứu lịch sử");
 const original=readFileSync(archive,"utf8");
 assert.match(original,/LỊCH SỬ \/ KHÔNG PHẢI HƯỚNG DẪN HIỆN HÀNH/);
 assert.ok(original.split(/\r?\n/).length>200,"Bản lưu không có đủ thông tin lịch sử");
 assert.ok(rootReadme.split(/\r?\n/).length<=110,
  "README gốc nên là trang giới thiệu ngắn, thông tin quá chi tiết cần chuyển về docs/");
 assert.match(rootReadme,/docs\/lich-su\/README-GOC-2026-11-09\.md/);
 assert.match(historyIndex,/README-GOC-2026-11-09\.md/);
 const npm=JSON.parse(readFileSync(join(root,"package.json"),"utf8"));
 assert.equal(npm.scripts["docs:check"],"node --test tests/docs-structure.test.mjs");
});
test("Biến môi trường mẫu chỉ trỏ tới tài liệu Google Drive hiện hành hoặc lưu trữ",()=>{
 const env=readFileSync(join(root,".env.example"),"utf8");
 assert.match(env,/docs\/lich-su\/tai-lieu\/GOOGLE-DRIVE-V17\.md/);
 assert.ok(!env.includes("docs/GOOGLE-DRIVE-V17.md"));
 assert.match(env,/GOOGLE_APPS_SCRIPT_URL/);
 assert.match(env,/GOOGLE_APPS_SCRIPT_SECRET/);
});
