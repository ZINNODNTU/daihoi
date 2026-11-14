import "server-only";
import {createCipheriv,createDecipheriv,createHash,randomBytes} from "node:crypto";

/** The encrypted cookie is a recoverable copy of the Admin's real Auth
 * session. No server-side JWT forgery and no service_role JWT in the browser.
 * All normal requests use the TARGET'S real Supabase session and RLS.
 */
export const IMPERSONATION_COOKIE="daihoi_actor_v1";
export const IMPERSONATION_TRACE_COOKIE="daihoi_actor_trace_v1";
export const IMPERSONATION_PARTS=4;
export const IMPERSONATION_SECONDS=30*60;
export const BACKUP_SECONDS=10*60*60;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type ActingSession={
 version:1;adminId:string;targetId:string;congressId:string;
 targetName:string;createdAt:number;expiresAt:number;
 adminAccessToken:string;adminRefreshToken:string
};
type CookieReader={get:(name:string)=>{value:string}|undefined};

function key(){
 const secret=process.env.IMPERSONATION_ENCRYPTION_KEY||
  process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!secret||secret.length<30)throw Error("Máy chủ chưa cấu hình khóa bảo vệ phiên đóng vai.");
 return createHash("sha256").update("daihoi:acting-session:v1:").update(secret).digest();
}
export function encryptActingSession(session:ActingSession):string{
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",key(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(session),"utf8"),cipher.final()]);
 return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString("base64url");
}
export function decryptActingSession(value:string):ActingSession|null{
 try{
  const raw=Buffer.from(value,"base64url");
  if(raw.length<40||raw.length>16000)return null;
  const decipher=createDecipheriv("aes-256-gcm",key(),raw.subarray(0,12));
  decipher.setAuthTag(raw.subarray(12,28));
  const data=Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]);
  const obj=JSON.parse(data.toString("utf8")) as ActingSession;
  if(obj.version!==1||!UUID.test(obj.adminId)||!UUID.test(obj.targetId)||
   !UUID.test(obj.congressId)||obj.adminId===obj.targetId||
   typeof obj.targetName!=="string"||obj.targetName.length>120||
   typeof obj.adminAccessToken!=="string"||typeof obj.adminRefreshToken!=="string"||
   !Number.isInteger(obj.createdAt)||!Number.isInteger(obj.expiresAt)||
   obj.expiresAt-obj.createdAt!==IMPERSONATION_SECONDS||
   obj.createdAt>Date.now()/1000+60||
   obj.createdAt<Date.now()/1000-BACKUP_SECONDS)return null;
  return obj;
 }catch{return null;}
}
export function readActingSession(reader:CookieReader):ActingSession|null{
 const n=Number(reader.get(IMPERSONATION_COOKIE+"_n")?.value||0);
 if(!Number.isInteger(n)||n<1||n>IMPERSONATION_PARTS)return null;
 let content="";
 for(let i=0;i<n;i++){
  const part=reader.get(IMPERSONATION_COOKIE+"_"+i)?.value;
  if(!part||part.length>2900)return null;
  content+=part;
 }
 return decryptActingSession(content);
}
type CookieWriter={
 set:(name:string,value:string,options:Record<string,unknown>)=>unknown;
 delete:(name:string)=>unknown
};
export function setActingCookies(writer:CookieWriter,encrypted:string,secure:boolean){
 const pieces=encrypted.match(/.{1,2800}/g)||[];
 if(pieces.length<1||pieces.length>IMPERSONATION_PARTS)
  throw Error("Phiên Auth vượt giới hạn cookie an toàn.");
 const options={httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:BACKUP_SECONDS} as const;
 writer.set(IMPERSONATION_COOKIE+"_n",String(pieces.length),options);
 writer.set(IMPERSONATION_TRACE_COOKIE,"1",{...options,maxAge:365*24*60*60});
 for(let i=0;i<IMPERSONATION_PARTS;i++){
  if(i<pieces.length)writer.set(IMPERSONATION_COOKIE+"_"+i,pieces[i],options);
  else writer.delete(IMPERSONATION_COOKIE+"_"+i);
 }
}
export function clearActingCookies(writer:CookieWriter){
 writer.delete(IMPERSONATION_COOKIE+"_n");
 writer.delete(IMPERSONATION_TRACE_COOKIE);
 for(let i=0;i<IMPERSONATION_PARTS;i++)writer.delete(IMPERSONATION_COOKIE+"_"+i);
}
export function validateSameOrigin(request:{headers:Headers;nextUrl:URL}):boolean{
 const origin=request.headers.get("origin");
 const secSite=request.headers.get("sec-fetch-site");
 if(secSite&&secSite!=="same-origin"&&secSite!=="none")return false;
 if(!origin)return false;
 try{
  const claimed=new URL(origin);
  const host=request.headers.get("host")||request.nextUrl.host;
  return claimed.protocol===request.nextUrl.protocol&&
   (claimed.host===host||claimed.host===request.nextUrl.host);
 }catch{return false;}
}
