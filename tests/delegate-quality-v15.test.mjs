import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 normalizeGender,normalizeBirthDate,calculateAge,calculateDelegateQuality
} from "../src/lib/delegate-demographics.ts";
const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const today="2026-11-08";

test("Ngày sinh Việt Nam: ISO, dd/mm/yyyy, Excel, năm nhuận và tương lai",()=>{
 assert.equal(normalizeBirthDate("2004-03-17"),"2004-03-17");
 assert.equal(normalizeBirthDate("17/03/2004"),"2004-03-17");
 assert.equal(normalizeBirthDate("17.03.2004"),"2004-03-17");
 assert.equal(normalizeBirthDate("29/02/2004"),"2004-02-29");
 assert.equal(normalizeBirthDate(""),null);
 assert.throws(()=>normalizeBirthDate("29/02/2003"),/Ngày sinh/);
 assert.throws(()=>normalizeBirthDate("2004-13-01"),/Ngày sinh/);
 assert.throws(()=>normalizeBirthDate("2027-01-01"),/Ngày sinh/);
 assert.throws(()=>normalizeBirthDate("1890-10-10"),/Ngày sinh/);
 assert.equal(normalizeBirthDate(38000),new Date(Date.UTC(1899,11,30)+38000*86400000).toISOString().slice(0,10));
});
test("Giới tính không suy đoán: nam, nữ, khác và chưa cung cấp",()=>{
 assert.equal(normalizeGender("NAM"),"male");
 assert.equal(normalizeGender("Nữ"),"female");
 assert.equal(normalizeGender("nu"),"female");
 assert.equal(normalizeGender("khác"),"other");
 assert.equal(normalizeGender(""),null);
 assert.throws(()=>normalizeGender("xyz"),/Giới tính/);
});
test("Tuổi hoàn thành được tính đúng theo ngày sinh và ngày xét",()=>{
 assert.equal(calculateAge("2000-11-08",today),26);
 assert.equal(calculateAge("2000-11-09",today),25);
 assert.equal(calculateAge("2000-02-29","2026-02-28"),25);
 assert.equal(calculateAge("2000-02-29","2026-03-01"),26);
 assert.equal(calculateAge("2030-01-01",today),null);
});
test("Chỉ phân tích người đã điểm danh; nhiều phiên cùng người chỉ tính một lần",()=>{
 const delegates=[
  {id:"a",full_name:"Nam đã đến",unit:"Khoa A",gender:"male",birth_date:"1975-01-02",delegate_type:"official"},
  {id:"b",full_name:"Nữ đã đến",unit:"Khoa B",gender:"female",birth_date:"2005-05-05",delegate_type:"alternate"},
  {id:"c",full_name:"Nữ chưa đến",unit:"Khoa C",gender:"female",birth_date:"1960-04-03",delegate_type:"official"},
  {id:"d",full_name:"Thiếu dữ liệu",unit:"Khoa D",gender:null,birth_date:null,delegate_type:"guest"},
  {id:"e",full_name:"Nữ cùng ngày sinh",unit:"Khoa E",gender:"female",birth_date:"2005-05-05",delegate_type:"official"}
 ];
 const checkins=[
  {delegate_id:"a",session_id:"session1",checked_in_at:"2026-11-08T07:00:00"},
  {delegate_id:"a",session_id:"session2",checked_in_at:"2026-11-08T10:00:00"},
  {delegate_id:"b",session_id:"session1",checked_in_at:"2026-11-08T07:20:00"},
  {delegate_id:"d",session_id:"session2",checked_in_at:"2026-11-08T10:20:00"},
  {delegate_id:"e",session_id:"session1",checked_in_at:"2026-11-08T07:40:00"}
 ];
 const report=calculateDelegateQuality(delegates,checkins,today);
 assert.equal(report.total,4);
 assert.equal(report.men,1);
 assert.equal(report.women,2);
 assert.equal(report.other,0);
 assert.equal(report.missingGender,1);
 assert.equal(report.missingBirthDate,1);
 assert.equal(report.ageKnown,3);
 assert.equal(report.maxAge,51);
 assert.equal(report.minAge,21);
 assert.deepEqual(report.oldest.map(x=>x.id),["a"]);
 assert.deepEqual(report.youngest.map(x=>x.id),["b","e"]);
 assert.equal(report.ageGroups.reduce((n,g)=>n+g.count,0),3);
 const first=calculateDelegateQuality(delegates,checkins.filter(c=>c.session_id==="session1"),today);
 assert.equal(first.total,3);
 assert.equal(first.missingBirthDate,0);
 assert.ok(!first.people.some(x=>x.id==="c"));
});
test("Phân tích chỉ mở cho BTC, kết hợp quyền với đúng phạm vi Đại hội",()=>{
 const page=read("../src/app/congresses/[id]/quality/page.tsx");
 assert.match(page,/hasRole\(supabase,user\.id,id,"viewer"\)/);
 assert.match(page,/\.eq\("congress_id",id\)/);
 assert.match(page,/loadQualitySource\(db,id,selectedSessionId\)/);
 assert.match(page,/calculateDelegateQuality/);
 assert.match(page,/mỗi người điểm danh tính một lần/);
 const tabs=read("../src/components/delegate-admin-tabs.tsx");
 assert.doesNotMatch(tabs,/Phân tích chất lượng đại biểu/);
 assert.doesNotMatch(tabs,/delegates\/quality/);
});
test("Hồ sơ và Excel lưu giới tính, ngày sinh; chỉnh sửa do admin thực hiện",()=>{
 const ui=read("../src/components/delegates-client.tsx");
 assert.match(ui,/name="birth_date"/);
 assert.match(ui,/name="gender"/);
 assert.match(ui,/Giới tính","Ngày sinh/);
 assert.match(ui,/Sửa giới tính \/ ngày sinh/);
 assert.match(ui,/method:"PATCH"/);
 const api=read("../src/app/api/delegates/route.ts");
 assert.match(api,/gender:normalizeGender\(item\.gender\)/);
 assert.match(api,/birth_date:normalizeBirthDate\(item\.birth_date\)/);
 assert.match(api,/hasRole\(supabase,user\.id,congressId,"admin"\)/);
 assert.match(api,/\.eq\("congress_id",congressId\)/);
 const migration=read("../supabase/upgrade-delegate-demographics-v15.sql");
 assert.match(migration,/ADD COLUMN IF NOT EXISTS gender text/);
 assert.match(migration,/ADD COLUMN IF NOT EXISTS birth_date date/);
 assert.match(migration,/gender IN \('male','female','other'\)/);
});
test("Phân tích là phân hệ độc lập; dữ liệu được phân trang, có lỗi rõ ràng",()=>{
 const page=read("../src/app/congresses/[id]/quality/page.tsx");
 const source=read("../src/lib/delegate-quality-source.ts");
 const shell=read("../src/components/app-shell.tsx");
 const home=read("../src/app/congresses/[id]/page.tsx");
 const old=read("../src/app/congresses/[id]/delegates/quality/page.tsx");
 assert.match(shell,/name:"Phân tích chất lượng",href:"\/congresses\/"\+congressId\+"\/quality"/);
 assert.match(home,/href:"quality",icon:ChartColumnIncreasing/);
 assert.match(old,/redirect\("\/congresses\/"\+id\+"\/quality"\+query\)/);
 assert.match(page,/loadQualitySource\(db,id,selectedSessionId\)/);
 assert.doesNotMatch(page,/DelegateAdminTabs/);
 assert.match(source,/\.range\(offset,offset\+PAGE_SIZE-1\)/);
 assert.match(source,/PAGE_SIZE=500/);
 assert.match(source,/MAX_DELEGATES=1200/);
 assert.match(source,/MAX_CHECKINS=10000/);
 assert.match(source,/\.eq\("session_id",sessionId\)/);
 assert.match(page,/issue==="migration_missing"/);
 assert.match(page,/issue==="data_limit"/);
});
