import "server-only";
import {randomUUID} from "node:crypto";

export class DriveStorageError extends Error{
 constructor(message:string,public readonly code:string,public readonly status=502){
  super(message);this.name="DriveStorageError";
 }
}
export const DRIVE_ENV_NAMES=[
 "GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN","GOOGLE_DRIVE_ROOT_FOLDER_ID"
] as const;
export function missingDriveSettings(){
 return DRIVE_ENV_NAMES.filter(name=>!process.env[name]?.trim());
}
function env(name:typeof DRIVE_ENV_NAMES[number]){
 const value=process.env[name]?.trim();
 if(!value)throw new DriveStorageError("Thiếu cấu hình Google Drive: "+name+". Hãy cấu hình trên máy chủ/Vercel.","missing_config",503);
 return value;
}
const API="https://www.googleapis.com/drive/v3/files";
const UPLOAD="https://www.googleapis.com/upload/drive/v3/files";
let cachedToken:{value:string;expiresAt:number}|null=null;
let refreshInFlight:Promise<string>|null=null;

async function jsonOrNull(response:Response):Promise<Record<string,unknown>|null>{
 try{
  const value:unknown=await response.json();
  return value&&typeof value==="object"?value as Record<string,unknown>:null;
 }catch{return null;}
}
function googleError(status:number,kind:"oauth"|"folder"|"upload"|"download"|"delete",body:Record<string,unknown>|null){
 const inner=body?.error;
 const code=typeof inner==="string"?inner:
  inner&&typeof inner==="object"&&typeof (inner as {status?:string}).status==="string"?
   (inner as {status:string}).status:"http_"+status;
 if(kind==="oauth"){
  if(code==="invalid_grant")return new DriveStorageError(
   "Quyền Google Drive đã hết hạn hoặc bị thu hồi. Cần tạo lại GOOGLE_REFRESH_TOKEN.","oauth_expired",503);
  return new DriveStorageError("Không thể xác thực Google Drive. Kiểm tra OAuth Client ID, Client Secret và Refresh Token.","oauth_invalid",503);
 }
 if(status===401)return new DriveStorageError("Google Drive từ chối token. Vui lòng kết nối lại tài khoản.","token_invalid",503);
 if(status===403)return new DriveStorageError(
  "Google Drive từ chối quyền truy cập. Kiểm tra quyền chỉnh sửa thư mục và phạm vi OAuth.","permission_denied",502);
 if(status===404)return new DriveStorageError("Không tìm thấy tệp/thư mục trên Google Drive hoặc đã bị xóa.","not_found",404);
 if(status===429||status>=500)return new DriveStorageError("Google Drive đang bận. Vui lòng thử lại.","upstream_retry",503);
 return new DriveStorageError("Google Drive không thể "+({folder:"truy cập thư mục",upload:"lưu tệp",download:"đọc tệp",delete:"xóa tệp"}[kind])+".","drive_"+code,502);
}
async function driveRequest(url:string,token:string,options:RequestInit={}){
 try{
  return await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers},
   cache:"no-store",signal:options.signal??AbortSignal.timeout(30_000)});
 }catch{throw new DriveStorageError("Không thể kết nối Google Drive. Kiểm tra mạng của máy chủ.","network_error",503);}
}
export async function getDriveToken(){
 if(cachedToken&&cachedToken.expiresAt>Date.now()+60_000)return cachedToken.value;
 if(refreshInFlight)return refreshInFlight;
 refreshInFlight=(async()=>{
  const params=new URLSearchParams({
   client_id:env("GOOGLE_CLIENT_ID"),client_secret:env("GOOGLE_CLIENT_SECRET"),
   refresh_token:env("GOOGLE_REFRESH_TOKEN"),grant_type:"refresh_token"
  });
  let r:Response;
  try{
   r=await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:params,cache:"no-store",signal:AbortSignal.timeout(15_000)
   });
  }catch{throw new DriveStorageError("Không kết nối được máy chủ Google OAuth.","oauth_unreachable",503);}
  const j=await jsonOrNull(r);
  if(!r.ok)throw googleError(r.status,"oauth",j);
  if(typeof j?.access_token!=="string")
   throw new DriveStorageError("Google OAuth không trả về access token.","oauth_invalid",503);
  cachedToken={value:j.access_token,expiresAt:Date.now()+Math.max(60,Number(j.expires_in)||3600)*1000};
  return j.access_token;
 })();
 try{return await refreshInFlight;}finally{refreshInFlight=null;}
}
type DriveMeta={id:string;name:string;mimeType:string;trashed?:boolean;capabilities?:{canAddChildren?:boolean}};
export async function inspectDriveFolder(token:string,id:string):Promise<DriveMeta>{
 if(!id)throw new DriveStorageError("Chưa cấu hình thư mục Google Drive.","missing_folder",503);
 const q=new URLSearchParams({fields:"id,name,mimeType,trashed,capabilities(canAddChildren)",supportsAllDrives:"true"});
 const r=await driveRequest(API+"/"+encodeURIComponent(id)+"?"+q,token);
 const body=await jsonOrNull(r);
 if(!r.ok)throw googleError(r.status,"folder",body);
 const folder=body as DriveMeta|null;
 if(!folder||folder.mimeType!=="application/vnd.google-apps.folder"||folder.trashed)
  throw new DriveStorageError("ID thư mục Google Drive không hợp lệ hoặc đã bị xóa.","invalid_folder",502);
 if(folder.capabilities?.canAddChildren===false)
  throw new DriveStorageError("Tài khoản Google không có quyền thêm tệp vào thư mục.","folder_read_only",502);
 return folder;
}
export async function checkDriveConnection(){
 const missing=missingDriveSettings();
 if(missing.length)throw new DriveStorageError(
  "Chưa cấu hình Google Drive: "+missing.join(", ")+".","missing_config",503);
 const token=await getDriveToken();
 const root=await inspectDriveFolder(token,env("GOOGLE_DRIVE_ROOT_FOLDER_ID"));
 return {ready:true,rootName:root.name,folderId:root.id};
}
export async function makeDriveFolder(token:string,congressId:string){
 const root=env("GOOGLE_DRIVE_ROOT_FOLDER_ID");
 await inspectDriveFolder(token,root);
 const folderName="DAI_HOI_"+congressId;
 const escaped=folderName.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
 const query=new URLSearchParams({
  q:`name = '${escaped}' and '${root.replace(/'/g,"\\'")}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  fields:"files(id,name,mimeType),nextPageToken",pageSize:"100",
  supportsAllDrives:"true",includeItemsFromAllDrives:"true"
 });
 const existing=await driveRequest(API+"?"+query,token);
 const list=await jsonOrNull(existing);
 if(!existing.ok)throw googleError(existing.status,"folder",list);
 const files=Array.isArray(list?.files)?list.files as DriveMeta[]:[];
 if(files[0]?.id)return files[0].id;
 const r=await driveRequest(API+"?fields=id&supportsAllDrives=true",token,{
  method:"POST",headers:{"Content-Type":"application/json; charset=UTF-8"},
  body:JSON.stringify({name:folderName,mimeType:"application/vnd.google-apps.folder",parents:[root]})
 });
 const j=await jsonOrNull(r);
 if(!r.ok)throw googleError(r.status,"folder",j);
 if(typeof j?.id!=="string")throw new DriveStorageError("Google Drive tạo thư mục nhưng không trả về ID.","folder_invalid",502);
 return j.id;
}
export async function uploadDriveFile(token:string,folderId:string,file:File){
 const boundary="daihoi_"+randomUUID();
 const meta={name:file.name.slice(0,180),parents:[folderId],mimeType:file.type};
 const prefix=Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`);
 const suffix=Buffer.from(`\r\n--${boundary}--\r\n`);
 const bytes=Buffer.from(await file.arrayBuffer());
 const body=Buffer.concat([prefix,bytes,suffix]);
 const r=await driveRequest(UPLOAD+"?uploadType=multipart&fields=id,name,mimeType,size&supportsAllDrives=true",token,{
  method:"POST",headers:{"Content-Type":`multipart/related; boundary=${boundary}`},
  body,signal:AbortSignal.timeout(45_000)
 });
 const j=await jsonOrNull(r);
 if(!r.ok)throw googleError(r.status,"upload",j);
 if(typeof j?.id!=="string")throw new DriveStorageError("Google Drive không trả về ID của tệp đã lưu.","upload_invalid",502);
 return {id:j.id,name:String(j.name||file.name),mimeType:String(j.mimeType||file.type),size:String(j.size||file.size)};
}
export async function deleteDriveFile(token:string,fileId:string){
 const r=await driveRequest(API+"/"+encodeURIComponent(fileId)+"?supportsAllDrives=true",token,{method:"DELETE"});
 if(!r.ok&&r.status!==404)throw googleError(r.status,"delete",await jsonOrNull(r));
}
export async function fetchDriveFile(token:string,fileId:string){
 return driveRequest(API+"/"+encodeURIComponent(fileId)+"?alt=media&supportsAllDrives=true",token);
}
/**
 * Đồng bộ quyền "Người có đường liên kết được xem" khi BTC công bố tệp.
 * Phương án này không tải byte của tệp xuống website; URL Google Drive được
 * tạo từ fileId. File không công bố không có quyền xem bằng liên kết.
 */
export async function setDriveLinkSharing(token:string,fileId:string,visible:boolean){
 const endpoint=API+"/"+encodeURIComponent(fileId)+"/permissions";
 const params="?supportsAllDrives=true";
 const result=await driveRequest(endpoint+params+"&fields=permissions(id,type,role),nextPageToken&pageSize=100",token);
 const data=await jsonOrNull(result);
 if(!result.ok)throw new DriveStorageError(
  "Không đọc được quyền chia sẻ Google Drive. Kiểm tra tài khoản sở hữu tệp.",
  "sharing_unavailable",502);
 const permissions=Array.isArray(data?.permissions)?
  data.permissions as Array<{id:string;type:string;role:string}>:[];
 const anyone=permissions.filter(p=>p.type==="anyone");
 if(visible){
  // Không để tồn tại quyền bình luận/chỉnh sửa công khai từ cấu hình trước.
  const previous=anyone[0];
  const res=await driveRequest(previous?
   endpoint+"/"+encodeURIComponent(previous.id)+params+"&fields=id":
   endpoint+params+"&fields=id",token,{
   method:previous?"PATCH":"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify(previous?
    {role:"reader",allowFileDiscovery:false}:
    {type:"anyone",role:"reader",allowFileDiscovery:false})
  });
  if(!res.ok)throw new DriveStorageError(
   "Google Drive không cho phép chia sẻ file cho người có liên kết. Kiểm tra chính sách Workspace.",
   "sharing_blocked",502);
 }else{
  for(const permission of anyone){
   const res=await driveRequest(endpoint+"/"+encodeURIComponent(permission.id)+params,token,{method:"DELETE"});
   if(!res.ok&&res.status!==404)throw new DriveStorageError(
    "Không thu hồi được quyền xem theo liên kết trên Google Drive.","unshare_failed",502);
  }
 }
}