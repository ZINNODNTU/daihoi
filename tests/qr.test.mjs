import {test} from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {issueQr,issueSessionQr,parseAndVerifyQr} from "../src/lib/qr.ts";
const key="my-long-hmac-test-secret-12345678901234567890";
process.env.QR_HMAC_SECRET=key;
const congress="123e4567-e89b-12d3-a456-426614174000";
const delegate="123e4567-e89b-12d3-a456-426614174001";
const session="123e4567-e89b-12d3-a456-426614174002";
test("QR cố định dh2 74 ký tự có chữ ký đúng",()=>{
 const token=issueQr(congress,delegate,1);
 assert.equal(token.length,74);
 assert.ok(token.startsWith("dh2."));
 assert.deepEqual(parseAndVerifyQr(token),{
  congressId:congress,delegateId:delegate,version:1,scope:"fixed"
 });
});
test("QR theo phiên dh3 có sessionId và chữ ký đúng",()=>{
 const token=issueSessionQr(congress,delegate,session,3);
 assert.equal(token.length,95);
 assert.ok(token.startsWith("dh3."));
 assert.deepEqual(parseAndVerifyQr(token),{
  congressId:congress,delegateId:delegate,sessionId:session,version:3,scope:"session"
 });
});
test("Thay một ký tự trong QR cố định và QR phiên bị từ chối",()=>{
 for(const token of [issueQr(congress,delegate,1),issueSessionQr(congress,delegate,session,1)]){
  const altered=token.slice(0,-3)+(token.at(-3)==="A"?"B":"A")+token.slice(-2);
  assert.equal(parseAndVerifyQr(altered),null);
 }
});
test("QR ký bằng khóa khác không hợp lệ",()=>{
 const tokens=[issueQr(congress,delegate,1),issueSessionQr(congress,delegate,session,1)];
 process.env.QR_HMAC_SECRET="another-secret-abcdefghijklmnopqrstuvwxyz12345";
 for(const token of tokens)assert.equal(parseAndVerifyQr(token),null);
 process.env.QR_HMAC_SECRET=key;
});
test("QR v1 cũ vẫn đọc được",()=>{
 const body="dh1."+congress+"."+delegate+".2";
 const sig=createHmac("sha256",key).update(body).digest("hex");
 assert.deepEqual(parseAndVerifyQr(body+"."+sig),{
  congressId:congress,delegateId:delegate,version:2,scope:"fixed"
 });
});
test("Dữ liệu QR sai định dạng hoặc khóa ngắn bị từ chối",()=>{
 assert.equal(parseAndVerifyQr("not-a-qr"),null);
 assert.throws(()=>issueQr(congress,delegate,0));
 assert.throws(()=>issueSessionQr(congress,delegate,"invalid",1));
 assert.throws(()=>issueSessionQr(congress,delegate,session,0x100000000));
 const token=issueQr(congress,delegate,1);
 process.env.QR_HMAC_SECRET="short";
 assert.throws(()=>parseAndVerifyQr(token));
 process.env.QR_HMAC_SECRET=key;
});
