import {createHmac,timingSafeEqual} from "node:crypto";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function secret(){
 const value=process.env.QR_HMAC_SECRET;
 if(!value||value.length<32)throw new Error("QR_HMAC_SECRET phải có tối thiểu 32 ký tự.");
 return value;
}
function signature(body:string){
 return createHmac("sha256",secret()).update(body).digest("hex");
}
function bytesOfUuid(uuid:string){
 return Buffer.from(uuid.replaceAll("-",""),"hex");
}
function uuidOfBytes(b:Buffer){
 const s=b.toString("hex");
 return s.slice(0,8)+"-"+s.slice(8,12)+"-"+s.slice(12,16)+"-"+s.slice(16,20)+"-"+s.slice(20,32);
}
/**
 * QR v2: payload 16-byte congress UUID + 16-byte delegate UUID + 4-byte QR version
 * + 16-byte HMAC-SHA256 tag. Tổng 74 ký tự (~1/2 độ dài QR v1).
 * Không chứa tên, chức vụ, email, SĐT. Tag 128-bit chống giả mạo.
 */
export function issueQr(congressId:string,delegateId:string,version:number){
 if(!UUID.test(congressId)||!UUID.test(delegateId)||
    !Number.isSafeInteger(version)||version<1||version>0xffffffff)
   throw new Error("Thông số QR không hợp lệ.");
 const payload=Buffer.alloc(36);
 bytesOfUuid(congressId).copy(payload,0);
 bytesOfUuid(delegateId).copy(payload,16);
 payload.writeUInt32BE(version,32);
 const tag=createHmac("sha256",secret()).update("dh2.").update(payload).digest().subarray(0,16);
 return "dh2."+Buffer.concat([payload,tag]).toString("base64url");
}
/**
 * QR cho riêng một phiên. Dùng lại qua các lần xem/thẻ của phiên đó,
 * nhưng chỉ hợp lệ với chính phiên này và trong khung giờ cho phép.
 */
export function issueSessionQr(congressId:string,delegateId:string,sessionId:string,version:number){
 if(!UUID.test(congressId)||!UUID.test(delegateId)||!UUID.test(sessionId)||
    !Number.isSafeInteger(version)||version<1||version>0xffffffff)
   throw new Error("Thông số QR phiên không hợp lệ.");
 const payload=Buffer.alloc(52);
 bytesOfUuid(congressId).copy(payload,0);
 bytesOfUuid(delegateId).copy(payload,16);
 bytesOfUuid(sessionId).copy(payload,32);
 payload.writeUInt32BE(version,48);
 const tag=createHmac("sha256",secret()).update("dh3.").update(payload).digest().subarray(0,16);
 return "dh3."+Buffer.concat([payload,tag]).toString("base64url");
}

export function parseAndVerifyQr(token:string){
 if(typeof token!=="string"||token.length>250)return null;
 const normalized=token.trim();
 if(/^dh3\.[a-zA-Z0-9_-]{91}$/.test(normalized)){
  const bytes=Buffer.from(normalized.slice(4),"base64url");
  if(bytes.length!==68||bytes.toString("base64url")!==normalized.slice(4))return null;
  const payload=bytes.subarray(0,52);
  const tag=createHmac("sha256",secret()).update("dh3.").update(payload).digest().subarray(0,16);
  if(!timingSafeEqual(tag,bytes.subarray(52)))return null;
  const version=payload.readUInt32BE(48);
  if(version<1)return null;
  return {
   congressId:uuidOfBytes(payload.subarray(0,16)),
   delegateId:uuidOfBytes(payload.subarray(16,32)),
   sessionId:uuidOfBytes(payload.subarray(32,48)),
   version,
   scope:"session" as const
  };
 }
 if(/^dh2\.[a-zA-Z0-9_-]{70}$/.test(normalized)){
  const bytes=Buffer.from(normalized.slice(4),"base64url");
  if(bytes.length!==52||bytes.toString("base64url")!==normalized.slice(4))return null;
  const payload=bytes.subarray(0,36);
  const providedTag=bytes.subarray(36);
  const tag=createHmac("sha256",secret()).update("dh2.").update(payload).digest().subarray(0,16);
  if(!timingSafeEqual(tag,providedTag))return null;
  const version=payload.readUInt32BE(32);
  if(version<1)return null;
  return {
   congressId:uuidOfBytes(payload.subarray(0,16)),
   delegateId:uuidOfBytes(payload.subarray(16,32)),
   version,
   scope:"fixed" as const
  };
 }
 // Khả năng đọc QR dh1 đã cấp trước nâng cấp (hex signature).
 const parts=normalized.split(".");
 if(parts.length!==5||parts[0]!=="dh1"||!UUID.test(parts[1])||
   !UUID.test(parts[2])||!/^[1-9][0-9]{0,8}$/.test(parts[3])||
   !/^[0-9a-f]{64}$/.test(parts[4]))return null;
 const body=parts.slice(0,4).join(".");
 const expected=Buffer.from(signature(body),"hex");
 const received=Buffer.from(parts[4],"hex");
 if(!timingSafeEqual(expected,received))return null;
 return {congressId:parts[1],delegateId:parts[2],version:Number(parts[3]),scope:"fixed" as const};
}
