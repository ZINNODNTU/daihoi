import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 validateDocumentBytes,validateDocumentName,getDocumentMime,
 MAX_DOCUMENT_BYTES,DocumentValidationError
} from "../src/lib/document-validation.ts";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Định dạng tài liệu Đại hội gồm PDF, ảnh, Word, Excel, PowerPoint",()=>{
 for(const [name,mime] of [
  ["Tai lieu dai hoi.pdf","application/pdf"],
  ["Tai lieu.docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["Bieu quyet.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["Trinh chieu.pptx","application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["Van kien.doc","application/msword"],
  ["Du lieu.xls","application/vnd.ms-excel"],
  ["Slide.ppt","application/vnd.ms-powerpoint"],
  ["Anh doan.png","image/png"],
  ["Anh.jpg","image/jpeg"],
  ["Anh.webp","image/webp"]
 ]){
  assert.equal(getDocumentMime(name),mime);
 }
 assert.throws(()=>getDocumentMime("setup.exe"),DocumentValidationError);
 assert.throws(()=>getDocumentMime("tai-lieu.html"),DocumentValidationError);
 assert.throws(()=>getDocumentMime("file.svg"),DocumentValidationError);
 assert.equal(validateDocumentName("folder\\report.pdf"),"folder_report.pdf");
 assert.equal(validateDocumentName("a\n b.pdf"),"a_ b.pdf");
});

test("Kiểm tra chữ ký PDF, PNG, JPEG, WebP và Office thay vì tin MIME trình duyệt",()=>{
 const pdf=new Uint8Array(Buffer.from("%PDF-1.7\ntext"));
 const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1]);
 const jpeg=new Uint8Array([0xff,0xd8,0xff,0xdb,0]);
 const webp=new Uint8Array(Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 "));
 const zip=new Uint8Array([0x50,0x4b,0x03,0x04,1,2]);
 const ole=new Uint8Array([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1,1]);
 for(const [name,bytes] of [["data.pdf",pdf],["image.png",png],["image.jpg",jpeg],["image.webp",webp],
  ["data.xlsx",zip],["file.docx",zip],["slides.pptx",zip],["old.doc",ole],["old.xls",ole]]){
  assert.equal(typeof validateDocumentBytes(name,bytes),"string");
 }
 assert.throws(()=>validateDocumentBytes("pdf.pdf",zip),/khớp/);
 assert.throws(()=>validateDocumentBytes("word.docx",pdf),/khớp/);
 assert.throws(()=>validateDocumentBytes("picture.jpg",png),/khớp/);
 assert.throws(()=>validateDocumentBytes("empty.pdf",new Uint8Array(0)),/trống/);
 assert.throws(()=>validateDocumentBytes("big.pdf",new Uint8Array(MAX_DOCUMENT_BYTES+1)),/4 MB/);
});

test("Google Drive upload sử dụng OAuth server, riêng tư theo Đại hội và dọn file mồ côi",()=>{
 const storage=file("../src/lib/drive.ts");
 assert.match(storage,/import "server-only"/);
 assert.match(storage,/GOOGLE_CLIENT_ID/);
 assert.match(storage,/GOOGLE_REFRESH_TOKEN/);
 assert.match(storage,/cachedToken/);
 assert.match(storage,/refreshInFlight/);
 assert.match(storage,/supportsAllDrives=true/);
 assert.match(storage,/uploadType=multipart/);
 assert.match(storage,/DAI_HOI_/);
 assert.match(storage,/in parents/);
 assert.match(storage,/deleteDriveFile/);
 assert.match(storage,/oauth_expired/);
 assert.doesNotMatch(storage,/NEXT_PUBLIC_GOOGLE_/);
 const route=file("../src/app/api/documents/route.ts");
 assert.match(route,/hasCongressAbility\(supabase,user\.id,congressId,\"documents\.write\"\)/);
 assert.match(route,/validateDocumentBytes/);
 assert.match(route,/uploadDriveFile\(token,folder,file\)/);
 assert.match(route,/deleteDriveFile\(token,uploadedId\)/);
 assert.match(route,/\.eq\("id",congressId\)/);
 assert.match(route,/Cache-Control":"private, no-store"/);
 const status=file("../src/app/api/documents/status/route.ts");
 assert.match(status,/hasCongressAbility\(supabase,user\.id,congressId,\"documents\.write\"\)/);
 assert.match(status,/checkDriveConnection/);
 assert.doesNotMatch(status,/refresh_token:/);
});

test("Chỉ BTC được đăng tải và quản lý; đại biểu chỉ xem tài liệu đã công bố",()=>{
 const docs=file("../src/app/congresses/[id]/documents/page.tsx");
 assert.match(docs,/hasCongressAbility\(supabase,user\.id,id,\"documents\.read\"\)/);
 assert.match(docs,/hasCongressAbility\(supabase,user\.id,id,\"documents\.write\"\)/);
 const download=file("../src/app/api/documents/[id]/route.ts");
 assert.match(download,/getAuth\(\)/);
 assert.match(download,/if\(!doc\.delegate_visible\)/);
 assert.match(download,/\.eq\("auth_user_id",user\.id\)/);
 const ui=file("../src/components/documents-client.tsx");
 assert.match(ui,/multiple disabled/);
 assert.match(ui,/documents\/status/);
 assert.match(ui,/Kiểm tra lại/);
 assert.match(ui,/Công bố tài liệu cho đại biểu/);
assert.match(ui,/accept="\.pdf,application\/pdf"/);
});
