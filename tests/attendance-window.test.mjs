import {test} from "node:test";
import assert from "node:assert/strict";
import {
 getWindowStatus,getWindowLabel,isQrAllowed,validateWindow,vietnamTimeToUtc,utcToVietnamInput
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
