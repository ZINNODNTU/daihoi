import "server-only";
import {randomUUID} from "node:crypto";
function env(name:string){const value=process.env[name];if(!value)throw new Error(`Thiếu biến môi trường ${name}`);return value;}
let cachedToken:{value:string;expiresAt:number}|null=null;
let refreshInFlight:Promise<string>|null=null;
export async function getDriveToken(){
 if(cachedToken && cachedToken.expiresAt>Date.now()+60_000)return cachedToken.value;
 if(refreshInFlight)return refreshInFlight;
 refreshInFlight=(async()=>{
  const params=new URLSearchParams({
   client_id:env("GOOGLE_CLIENT_ID"),client_secret:env("GOOGLE_CLIENT_SECRET"),
   refresh_token:env("GOOGLE_REFRESH_TOKEN"),grant_type:"refresh_token"
  });
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:params,cache:"no-store"});
  if(!r.ok)throw new Error("Không xác thực được Google Drive OAuth.");
  const j=await r.json() as {access_token?:string;expires_in?:number};
  if(!j.access_token)throw new Error("Google OAuth không trả về access token.");
  cachedToken={value:j.access_token,expiresAt:Date.now()+Math.max(60,j.expires_in||3600)*1000};
  return j.access_token;
 })();
 try{return await refreshInFlight;}finally{refreshInFlight=null;}
}
export async function makeDriveFolder(token:string,congressId:string){
 const r=await fetch("https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true",{
  method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
  body:JSON.stringify({name:`DAI_HOI_${congressId}`,mimeType:"application/vnd.google-apps.folder",parents:[env("GOOGLE_DRIVE_ROOT_FOLDER_ID")]})
 });
 if(!r.ok)throw new Error("Không tạo được thư mục Google Drive.");
 const j=await r.json() as {id:string};return j.id;
}
export async function uploadDriveFile(token:string,folderId:string,file:File){
 const boundary=`daihoi_${randomUUID()}`;
 const meta={name:file.name.slice(0,180),parents:[folderId],mimeType:file.type};
 const prefix=Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`);
 const suffix=Buffer.from(`\r\n--${boundary}--\r\n`);
 const bytes=Buffer.from(await file.arrayBuffer());
 const body=Buffer.concat([prefix,bytes,suffix]);
 const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size&supportsAllDrives=true",{
  method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":`multipart/related; boundary=${boundary}`},
  body
 });
 if(!r.ok)throw new Error("Google Drive không lưu được tài liệu.");
 return await r.json() as {id:string;name:string;size:string;mimeType:string};
}
export async function fetchDriveFile(token:string,fileId:string){
 return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,{
  headers:{Authorization:`Bearer ${token}`},cache:"no-store"
 });
}
