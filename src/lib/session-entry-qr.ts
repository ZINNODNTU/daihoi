import {createHmac,timingSafeEqual} from "node:crypto";

// Mã se2 cố định theo Đại hội và phiên; xác thực danh tính và thời gian ở API.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIXED_TOKEN=/^se2\.([A-Za-z0-9_-]{22})$/;
const LEGACY_TOKEN=/^se1\.([0-9a-z]{5,8})\.([A-Za-z0-9_-]{22})$/;
export const ENTRY_QR_REFRESH_MS=45_000; // Chỉ để xác thực se1 cũ.
export const ENTRY_QR_VALIDITY_SECONDS=240;

function signed(congressId:string,sessionId:string,purpose:string,expires?:number){
 const secret=process.env.QR_HMAC_SECRET;
 if(!secret||secret.length<32)throw new Error("Máy chủ chưa cấu hình khóa bảo vệ QR.");
 const mac=createHmac("sha256",secret)
  .update("daihoi:session-entry:"+purpose+"|")
  .update(congressId).update("|").update(sessionId);
 if(expires!==undefined)mac.update("|").update(String(expires));
 return mac.digest().subarray(0,16);
}
function equalTag(candidate:string,expected:Buffer){
 const provided=Buffer.from(candidate,"base64url");
 return provided.length===16&&provided.toString("base64url")===candidate&&
  timingSafeEqual(expected,provided);
}
export function createSessionEntryQr(congressId:string,sessionId:string){
 if(!UUID.test(congressId)||!UUID.test(sessionId))
  throw new Error("Không thể tạo mã QR phiên không hợp lệ.");
 return {token:"se2."+signed(congressId,sessionId,"fixed:v2").toString("base64url")};
}
export function verifySessionEntryQr(
 token:string,congressId:string,sessionId:string,now=Date.now()
){
 if(!UUID.test(congressId)||!UUID.test(sessionId)||!Number.isFinite(now))return false;
 const fixed=FIXED_TOKEN.exec(token);
 if(fixed)return equalTag(fixed[1],signed(congressId,sessionId,"fixed:v2"));
 // QR luân phiên se1 cũ vẫn được chấp nhận cho tới lúc hết hạn.
 const legacy=LEGACY_TOKEN.exec(token);
 if(!legacy)return false;
 const expires=parseInt(legacy[1],36);
 const remaining=expires-now/1000;
 if(!Number.isSafeInteger(expires)||remaining<0||
  remaining>ENTRY_QR_VALIDITY_SECONDS+ENTRY_QR_REFRESH_MS/1000)return false;
 return equalTag(legacy[2],signed(congressId,sessionId,"v1",expires));
}
