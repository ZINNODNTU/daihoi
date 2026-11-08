import {test} from "node:test";
import assert from "node:assert/strict";
import {
 getWindowStatus,getWindowLabel,isQrAllowed,validateWindow,validateWindowDetailed,vietnamTimeToUtc,utcToVietnamInput
} from "../src/lib/attendance-window.ts";
const session={
 status:"open",qr_policy:"both",
 starts_at:"2026-11-05T08:00:00Z",ends_at:"2026-11-05T10:00:00Z"
};
test("Giờ mở/đóng theo máy chủ, đóng ở biên cuối",()=>{
 assert.equal(getWindowStatus(session,new Date("2026-11-05T07:59:59.999Z")),"upcoming");
 assert.equal(getWindowStatus(session,new Date("2026-11-05T08:00:00Z")),"open");
 assert.equal(getWindowStatus(session,new Date("2026-11-05T09:59:59.999Z")),"open");
 assert.equal(getWindowStatus(session,new Date("2026-11-05T10:00:00Z")),"expired");
 assert.match(getWindowLabel("expired"),/hết giờ/);
});
test("BTC có thể đóng sớm hoặc yêu cầu cấu hình giờ",()=>{
 assert.equal(getWindowStatus({...session,status:"closed"},new Date("2026-11-05T08:30:00Z")),"closed");
 assert.equal(getWindowStatus({...session,starts_at:null},new Date("2026-11-05T08:30:00Z")),"not-configured");
});
test("QR được chấp nhận theo từng chính sách",()=>{
 assert.equal(isQrAllowed("fixed","fixed"),true);
 assert.equal(isQrAllowed("fixed","session"),false);
 assert.equal(isQrAllowed("session","fixed"),false);
 assert.equal(isQrAllowed("session","session"),true);
 assert.equal(isQrAllowed("both","fixed"),true);
 assert.equal(isQrAllowed("both","session"),true);
});
test("Giờ Việt Nam GMT+7 độc lập múi giờ thiết bị",()=>{
 assert.equal(vietnamTimeToUtc("2026-11-05T08:00"),"2026-11-05T01:00:00.000Z");
 assert.equal(utcToVietnamInput("2026-11-05T01:00:00.000Z"),"2026-11-05T08:00");
 assert.equal(vietnamTimeToUtc("2026-02-31T12:00"),null);
});
test("Không chấp nhận ngày sai hoặc giờ đóng trước giờ mở",()=>{
 assert.equal(validateWindow("2026-11-05T11:00:00Z","2026-11-05T10:00:00Z"),null);
 assert.equal(validateWindow("invalid","2026-11-05T11:00:00Z"),null);
 assert.equal(validateWindow("2026-11-05T08:00:00Z","2026-11-15T08:00:00Z"),null);
 assert.deepEqual(validateWindow("2026-11-05T08:00:00Z","2026-11-05T10:00:00Z"),{
  starts_at:"2026-11-05T08:00:00.000Z",ends_at:"2026-11-05T10:00:00.000Z"
 });
});


test("Hồi quy: giờ chọn trong form được máy chủ chấp nhận (ISO có .000Z)",()=>{
 const startsAt=vietnamTimeToUtc("2026-11-08T08:00");
 const endsAt=vietnamTimeToUtc("2026-11-08T12:00");
 assert.equal(startsAt,"2026-11-08T01:00:00.000Z");
 assert.equal(endsAt,"2026-11-08T05:00:00.000Z");
 assert.deepEqual(validateWindow(startsAt,endsAt),{
  starts_at:startsAt,ends_at:endsAt
 });
 assert.deepEqual(validateWindowDetailed(startsAt,endsAt),{
  window:{starts_at:startsAt,ends_at:endsAt},error:null
 });
});
test("Múi giờ ISO hợp lệ, mili giây và ký tự thời gian chính xác",()=>{
 assert.deepEqual(validateWindow("2026-11-08T08:30:00.000+07:00","2026-11-08T11:30:00.123+07:00"),{
  starts_at:"2026-11-08T01:30:00.000Z",
  ends_at:"2026-11-08T04:30:00.123Z"
 });
 assert.equal(validateWindow("2026-11-08T12:00:00.000Z","2026-11-08T12:00:00.000Z"),null);
 assert.equal(validateWindow("2026-02-31T09:00:00.000Z","2026-03-01T09:00:00.000Z"),null);
 assert.equal(validateWindow("2026-11-08T08:00:00.000000Z","2026-11-08T10:00:00.000Z"),null);
});
test("Thông báo lỗi chính xác khi ngày giờ sai hoặc khoảng mở quá dài",()=>{
 assert.match(validateWindowDetailed("","2026-11-08T12:00:00.000Z").error,/nhập đầy đủ/);
 assert.match(validateWindowDetailed("2026-11-08T13:00:00.000Z","2026-11-08T12:00:00.000Z").error,/phải sau/);
 assert.match(validateWindowDetailed("2026-11-08T12:00:00.000Z","2026-11-17T12:00:00.000Z").error,/tối đa 7 ngày/);
 assert.match(validateWindowDetailed("not-a-date","2026-11-08T12:00:00.000Z").error,/đúng định dạng/);
});
test("API và form cùng sử dụng kiểm tra giờ chi tiết",async()=>{
 const {readFileSync}=await import("node:fs");
 const api=readFileSync(new URL("../src/app/api/attendance-sessions/route.ts",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../src/components/attendance-client.tsx",import.meta.url),"utf8");
 assert.match(api,/validateWindowDetailed\(body.startsAt,body.endsAt\)/);
 assert.match(api,/error:checked.error/);
 assert.match(ui,/validateWindowDetailed\(startsAt,endsAt\)/);
 assert.match(ui,/sessionError&&<p role="alert"/);
});
