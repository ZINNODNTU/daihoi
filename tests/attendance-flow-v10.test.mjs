import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 createSessionEntryQr,verifySessionEntryQr
} from "../src/lib/session-entry-qr.ts";
import {classifySeat,computeLiveSummary} from "../src/lib/attendance-live.ts";
import {isQrAllowed,getWindowStatus} from "../src/lib/attendance-window.ts";

const congress="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const session="912e6058-12ef-40fb-8d04-2ce269e07575";
const other="36b7bda3-8fba-4f68-9559-ce8bd1940029";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const original=process.env.QR_HMAC_SECRET;
process.env.QR_HMAC_SECRET="attendance-entry-unit-test-secret-"+("x".repeat(48));
test.after(()=>{if(original===undefined)delete process.env.QR_HMAC_SECRET;
 else process.env.QR_HMAC_SECRET=original;});

test("QR màn hình xác thực, ràng buộc với Đại hội & phiên và không chứa mã đại biểu",()=>{
 const now=Date.parse("2026-11-08T12:40:00Z");
 const issued=createSessionEntryQr(congress,session,now);
 assert.match(issued.token,/^se2\.[\w-]{22}$/);
 assert.ok(!issued.token.includes(congress));
 assert.ok(!issued.token.includes(session));
 assert.equal(verifySessionEntryQr(issued.token,congress,session,now),true);
 assert.equal(verifySessionEntryQr(issued.token,other,session,now),false);
 assert.equal(verifySessionEntryQr(issued.token,congress,other,now),false);
 assert.equal(verifySessionEntryQr(issued.token.slice(0,-1)+"_",congress,session,now),false);
});
test("QR cố định cho cùng phiên, không phụ thuộc thời gian; khóa sai không xác thực",()=>{
 const now=Date.parse("2026-11-08T12:40:00Z");
 const issued=createSessionEntryQr(congress,session);
 assert.equal(createSessionEntryQr(congress,session).token,issued.token);
 assert.equal(verifySessionEntryQr(issued.token,congress,session,now),true);
 assert.equal(verifySessionEntryQr(issued.token,congress,session,now+31*86400000),true);
 assert.equal(verifySessionEntryQr(issued.token,congress,other,now),false);
 assert.equal(verifySessionEntryQr("se2.bad",congress,session,now),false);
});
test("Chính sách QR vẫn tuân thủ cửa sổ mở/đóng",()=>{
 const start="2026-11-08T12:00:00.000Z",end="2026-11-08T14:00:00.000Z";
 assert.equal(getWindowStatus({starts_at:start,ends_at:end,status:"open"},
  new Date("2026-11-08T12:45:00Z")),"open");
 assert.equal(getWindowStatus({starts_at:start,ends_at:end,status:"closed"},
  new Date("2026-11-08T12:45:00Z")),"closed");
 assert.equal(isQrAllowed("both","session"),true);
 assert.equal(isQrAllowed("session","session"),true);
 assert.equal(isQrAllowed("fixed","session"),false);
});
test("Bảng điểm danh chỉ tính đại biểu đang hoạt động và trạng thái từng ghế",()=>{
 const mock={
  delegates:[
   {id:"A",code:"DB-000001",full_name:"Nguyễn A",unit:"Khoa",delegate_type:"official",is_active:true,photo_path:null},
   {id:"B",code:"DB-000002",full_name:"Nguyễn B",unit:"Khoa",delegate_type:"official",is_active:true,photo_path:null},
   {id:"C",code:"DB-000003",full_name:"Khách mời C",unit:"Đơn vị",delegate_type:"guest",is_active:true,photo_path:null},
   {id:"D",code:"DB-000004",full_name:"Không hoạt động",unit:"Khoa",delegate_type:"official",is_active:false,photo_path:null}
  ],
  checkins:[
   {id:"Z",delegate_id:"A",method:"qr",qr_scope:"session",checked_in_at:"2026-11-08T12:00:00Z"},
   {id:"Y",delegate_id:"C",method:"manual",qr_scope:null,checked_in_at:"2026-11-08T12:05:00Z"},
   {id:"W",delegate_id:"D",method:"qr",qr_scope:"fixed",checked_in_at:"2026-11-08T12:10:00Z"}
  ],
  assignments:[{seat_id:"S1",delegate_id:"A"},{seat_id:"S2",delegate_id:"B"},{seat_id:"S3",delegate_id:"C"}],
  seats:[
   {id:"S1",blocked:false,seat_type:"delegate"},
   {id:"S2",blocked:false,seat_type:"delegate"},
   {id:"S3",blocked:false,seat_type:"guest"},
   {id:"S4",blocked:false,seat_type:"delegate"},
   {id:"S5",blocked:true,seat_type:"guest"}
  ]
 };
 const summary=computeLiveSummary(mock);
 assert.equal(summary.total,3);
 assert.equal(summary.present,2);
 assert.equal(summary.absent,1);
 assert.equal(summary.percentage,67);
 assert.equal(summary.qr,1);
 assert.equal(summary.manual,1);
 assert.deepEqual(summary.seats,{present:2,absent:1,unassigned:1,blocked:1});
 assert.equal(classifySeat(mock.seats[3],undefined,new Set(["A"])),"unassigned");
 assert.equal(classifySeat(mock.seats[4],"A",new Set(["A"])),"blocked");
});
test("Quy trình tự quét yêu cầu tài khoản gắn đúng đại biểu, không nhận delegateId giả",()=>{
 const api=file("../src/app/api/attendance/self-checkin/route.ts");
 assert.match(api,/getAuth\(\)/);
 assert.match(api,/verifySessionEntryQr/);
 assert.match(api,/\.eq\("auth_user_id",user\.id\)/);
 assert.match(api,/getWindowStatus\(session\)/);
 assert.match(api,/\.eq\("is_active",true\)/);
 assert.match(api,/23505/);
 assert.match(api,/method:"qr",qr_scope:"session"/);
 assert.doesNotMatch(api,/body\.delegateId/);
 const issuer=file("../src/app/api/attendance/session-qr/route.ts");
 assert.match(issuer,/hasRole\(supabase,user\.id,congressId,"checkin"\)/);
 assert.match(issuer,/isQrAllowed\(session\.qr_policy,"session"\)/);
 assert.doesNotMatch(issuer,/if\(getWindowStatus\(session\)/);
});
test("Bảng trực tiếp chỉ cho BTC xem dữ liệu và không dùng URL công khai",()=>{
 const live=file("../src/app/api/attendance/live/route.ts");
 assert.match(live,/hasRole\(supabase,user\.id,congressId,"checkin"\)/);
 assert.match(live,/createAdminClient\(\)/);
 assert.match(live,/Cache-Control":"private, no-store"/);
 assert.match(live,/\.eq\("congress_id",congressId\)/);
 assert.match(live,/\.eq\("session_id",sessionId\)/);
 const ui=file("../src/components/attendance-live-board.tsx");
 assert.match(ui,/Bảng điều hành điểm danh/);
 assert.match(ui,/Canvas sơ đồ ghế/);
 assert.match(ui,/classifySeat\(/);
 assert.match(ui,/getWindowStatus\(/);
 assert.match(ui,/3000/);
});
test("Điểm danh chia ba luồng, mã QR hiển thị thật, và login trở lại trang đã quét",()=>{
 const sessions=file("../src/components/attendance-sessions-client.tsx");
 const screen=file("../src/components/session-qr-screen.tsx");
 const login=file("../src/app/login/page.tsx");
 const self=file("../src/components/self-checkin-client.tsx");
 assert.match(sessions,/Trung tâm điểm danh/);
 assert.match(sessions,/Điều khiển điểm danh/);
 assert.match(sessions,/Màn hình điểm danh/);
 assert.match(sessions,/Quét tại bàn BTC/);
 assert.match(screen,/QRCodeSVG ref=\{qrSvg\} value=\{ticket.url\}/);
 assert.match(screen,/Chiếu toàn màn hình/);
 assert.match(screen,/requestFullscreen/);
  assert.match(screen,/downloadQr/);
  assert.match(screen,/ProjectionSeatingMap/);
  assert.doesNotMatch(screen,/setInterval\(\(\)=>void loadTicket/);
 assert.match(login,/safeNext=next/);
 assert.match(login,/safeNext\?next:/);
 assert.match(self,/\/api\/attendance\/self-checkin/);
});