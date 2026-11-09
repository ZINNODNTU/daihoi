import "server-only";
import {createHmac,randomUUID} from "node:crypto";
import {DriveStorageError} from "@/lib/drive";
import {GOOGLE_FILE_ID} from "@/lib/drive-links";

type ScriptAction =
 |{action:"status";congressId:string}
 |{action:"upload";congressId:string;name:string;mimeType:string;base64:string}
 |{action:"sharing";congressId:string;fileId:string;visible:boolean}
 |{action:"delete";congressId:string;fileId:string};
type ScriptResponse={
 ok?:boolean;error?:string;code?:string;id?:string;url?:string;
 name?:string;rootName?:string;folderName?:string;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function scriptStorageSelected(){
 return !!(process.env.GOOGLE_APPS_SCRIPT_URL?.trim()||
  process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim());
}
export function scriptStorageConfigured(){
 return !!(process.env.GOOGLE_APPS_SCRIPT_URL?.trim()&&
  process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim());
}
export function missingScriptSettings(){
 return ["GOOGLE_APPS_SCRIPT_URL","GOOGLE_APPS_SCRIPT_SECRET"]
  .filter(name=>!process.env[name]?.trim());
}
async function callScript(request:ScriptAction):Promise<ScriptResponse>{
 const url=process.env.GOOGLE_APPS_SCRIPT_URL?.trim()||"";
 const secret=process.env.GOOGLE_APPS_SCRIPT_SECRET?.trim()||"";
 if(!url||!secret)throw new DriveStorageError("Chưa cấu hình Google Apps Script trên máy chủ.","missing_config",503);
 if(secret.length<32)throw new DriveStorageError("Khóa kết nối Apps Script phải dài ít nhất 32 ký tự.","invalid_secret",503);
 let endpoint:URL;
 try{endpoint=new URL(url);}catch{
  throw new DriveStorageError("URL Web App của Google Apps Script không hợp lệ.","invalid_url",503);
 }
 if(endpoint.protocol!=="https:"||endpoint.hostname!=="script.google.com"||
  !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint.pathname))
  throw new DriveStorageError("URL Apps Script phải là địa chỉ triển khai /macros/s/.../exec của Google.","invalid_url",503);
 if(!UUID.test(request.congressId))throw new DriveStorageError("Đại hội không hợp lệ.","invalid_congress",400);
 if("fileId" in request&&!GOOGLE_FILE_ID.test(request.fileId))
  throw new DriveStorageError("Mã file Google Drive không hợp lệ.","invalid_file_id",400);
 const time=Date.now();
 const nonce=randomUUID();
 const payload=JSON.stringify(request);
 const signature=createHmac("sha256",secret).update(time+"."+nonce+"."+payload).digest("base64url");
 let response:Response;
 try{
  response=await fetch(endpoint.toString(),{
   method:"POST",headers:{"Content-Type":"text/plain; charset=utf-8"},
   body:JSON.stringify({time,nonce,payload,signature}),
   redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(50_000)
  });
 }catch{throw new DriveStorageError("Không kết nối được Google Apps Script. Kiểm tra URL Web App và quyền triển khai.","script_unreachable",503);}
 let data:ScriptResponse;
 try{data=await response.json() as ScriptResponse;}catch{
  throw new DriveStorageError("Apps Script không trả về JSON. Cần triển khai Web App kiểu 'Execute as me' và quyền truy cập phù hợp.","script_invalid_reply",502);
 }
 if(!response.ok||!data.ok)
  throw new DriveStorageError(data.error||"Google Apps Script từ chối yêu cầu.",data.code||"script_failed",response.status>=400?502:503);
 return data;
}
export async function checkScriptDrive(congressId:string){
 const data=await callScript({action:"status",congressId});
 return {ready:true,rootName:data.rootName||"Google Drive"};
}
export async function uploadScriptDrive(congressId:string,file:File){
 const data=await callScript({action:"upload",congressId,name:file.name,
  mimeType:file.type,base64:Buffer.from(await file.arrayBuffer()).toString("base64")});
 if(!data.id||!GOOGLE_FILE_ID.test(data.id))
  throw new DriveStorageError("Apps Script không trả về ID file hợp lệ.","invalid_upload",502);
 return {id:data.id,name:data.name||file.name};
}
export async function shareScriptDrive(congressId:string,fileId:string,visible:boolean){
 await callScript({action:"sharing",congressId,fileId,visible});
}
export async function deleteScriptDrive(congressId:string,fileId:string){
 await callScript({action:"delete",congressId,fileId});
}
