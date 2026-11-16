import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CONGRESS_FORMAL_HEADING,congressShortName,congressFullName} from "../src/lib/congress-title.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const doan=CONGRESS_FORMAL_HEADING.doan;
const hoi=CONGRESS_FORMAL_HEADING.hoi_sinh_vien;

test("the fixed formal headers match the selected congress type exactly",()=>{
 assert.equal(doan,"Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh");
 assert.equal(hoi,"Đại hội Đại biểu Hội Sinh viên Việt Nam");
 assert.equal(congressFullName("Khoa Công nghệ thông tin","doan"),
  "Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh Khoa Công nghệ thông tin");
 assert.equal(congressFullName("Chi đoàn 23DTH1","doan"),doan+" Chi đoàn 23DTH1");
 assert.equal(congressFullName("Khoa Công nghệ thông tin","hoi_sinh_vien"),
  hoi+" Khoa Công nghệ thông tin");
});

test("short name extracts the variable part for the congress pass and settings",()=>{
 assert.equal(congressShortName("Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh khoa Công nghệ thông tin","doan"),
  "Khoa Công nghệ thông tin");
 assert.equal(congressShortName("Đại hội Đại biểu Hội Sinh viên Việt Nam Khoa Công nghệ thông tin","hoi_sinh_vien"),
  "Khoa Công nghệ thông tin");
 assert.equal(congressShortName("Đại hội Đoàn Trường Đại học ABC lần thứ XII","doan"),
  "Trường Đại học ABC lần thứ XII");
 assert.equal(congressShortName("Đại hội Hội Sinh viên Việt Nam Khoa CNTT","hoi_sinh_vien"),
  "Khoa CNTT");
 assert.equal(congressShortName("  Chi   đoàn  23DTH1   ","doan"),"Chi đoàn 23DTH1");
});

test("legacy lowercase labels and accidentally repeated association prefixes render consistently",()=>{
 assert.equal(congressFullName("Đại hội đại biểu Hội sinh viên Việt Nam khoa Công nghệ thông tin","hoi_sinh_vien"),
  hoi+" Khoa Công nghệ thông tin");
 assert.equal(congressFullName("Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh khoa Công nghệ thông tin","doan"),
  doan+" Khoa Công nghệ thông tin");
 assert.equal(congressFullName("Hội Sinh viên Khoa Công nghệ thông tin","hoi_sinh_vien"),
  hoi+" Khoa Công nghệ thông tin");
 assert.equal(congressFullName("Đoàn TNCS Hồ Chí Minh Chi đoàn 23DTH1","doan"),
  doan+" Chi đoàn 23DTH1");
 assert.equal(congressFullName("hội sinh viên việt nam khoa Công nghệ thông tin","hoi_sinh_vien"),
  hoi+" Khoa Công nghệ thông tin");
});

test("creation and editing are idempotent and cannot double the fixed header",()=>{
 for(const kind of ["doan","hoi_sinh_vien"]){
  const header=CONGRESS_FORMAL_HEADING[kind];
  const full=header+" Khoa Công nghệ thông tin";
  assert.equal(congressFullName(full,kind),full);
  assert.equal(congressFullName(congressFullName(full,kind),kind),full);
  assert.equal(congressShortName(full,kind),"Khoa Công nghệ thông tin");
  assert.equal(congressShortName(header,kind),"");
 }
});

test("legacy DB titles are normalized on the congress directory and BCH screen",()=>{
 const directory=read("src/components/congress-directory.tsx");
 const candidates=read("src/app/congresses/[id]/bch-candidates/page.tsx");
 const layout=read("src/app/congresses/[id]/layout.tsx");
 assert.match(directory,/congressFullName\(item.name,item.kind\)/);
 assert.match(candidates,/congressFullName\(congress.data.name,/);
 assert.match(layout,/congressFullName\(congress.name,/);
});

test("create/edit forms take a specific name and preview fixed heading by type",()=>{
 const create=read("src/components/create-congress.tsx");
 const settings=read("src/components/congress-settings-client.tsx");
 const createApi=read("src/app/api/congresses/route.ts");
 const settingsApi=read("src/app/api/congress-settings/route.ts");
 assert.match(create,/CONGRESS_FORMAL_HEADING\[kind\]/);
 assert.match(create,/name="kind".*onChange/);
 assert.match(create,/name="name".*minLength=\{2\}/);
 assert.match(settings,/congressShortName\(initial.name,kind\)/);
 assert.match(settings,/CONGRESS_FORMAL_HEADING\[kind\]/);
 assert.match(settings,/value=\{value.name\}/);
 assert.match(createApi,/congressFullName\(specificName,kind\)/);
 assert.match(settingsApi,/select\("kind"\)/);
 assert.match(settingsApi,/congressFullName\(specificName,kind\)/);
 assert.match(createApi,/specificName.length<2/);
 assert.match(settingsApi,/specificName.length<2/);
});

test("delegate pass separates the fixed heading from the subordinate congress name",()=>{
 const pass=read("src/components/my-delegate-cards.tsx");
 const print=read("src/components/print-delegate-pass.tsx");
 assert.match(pass,/CONGRESS_FORMAL_HEADING\[item.kind\]/);
 assert.match(pass,/congressShortName\(item.congressName,item.kind\)/);
 assert.match(pass,/\{specificCongressName\|\|"Chưa cập nhật tên Đại hội"\}/);
 assert.match(print,/DelegatePass item=\{item\} priority/);
 assert.ok(pass.indexOf("CONGRESS_FORMAL_HEADING[item.kind]")<
  pass.indexOf('specificCongressName||"Chưa cập nhật tên Đại hội"'),
  "formal heading appears before the specific name on delegate passes");
});
