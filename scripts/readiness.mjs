#!/usr/bin/env node
// Chỉ kiểm tra cấu hình; không in khóa và không gọi API.
import {existsSync,readFileSync} from "node:fs";
import {join} from "node:path";
const root=process.cwd();
const env={...process.env};
for(const file of [".env.local",".env.production.local"]){
 const path=join(root,file);
 if(!existsSync(path))continue;
 for(const line of readFileSync(path,"utf8").split(/\r?\n/)){
  const match=line.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if(!match)continue;
  let value=match[2].trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  if(!env[match[1]])env[match[1]]=value;
 }
}
const checks=[
 ["Supabase URL","NEXT_PUBLIC_SUPABASE_URL",v=>v==="https://pnxdxdagpeyqarucdphk.supabase.co"],
 ["Publishable Key","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",v=>/^sb_publishable_[A-Za-z0-9_-]+$/.test(v)],
 ["Secret Key (server only)","SUPABASE_SECRET_KEY",v=>/^sb_secret_[A-Za-z0-9_-]+$/.test(v)||v.startsWith("eyJ")],
 ["QR HMAC Secret >=32 ký tự","QR_HMAC_SECRET",v=>v.length>=32]
];
let failures=0;
console.log("ĐẠI HỘI SỐ — kiểm tra cấu hình");
for(const [label,key,verify] of checks){
 const valid=Boolean(env[key]&&verify(env[key]));
 console.log((valid?"[OK] ":"[THIẾU] ")+label);
 if(!valid)failures++;
}
const drive=["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN","GOOGLE_DRIVE_ROOT_FOLDER_ID"];
const driveCount=drive.filter(k=>env[k]?.trim()).length;
console.log((driveCount===4?"[OK] ":"[CHƯA] ")+"Google Drive OAuth: "+driveCount+"/4");
if(driveCount!==4)failures++;
const hasGit=existsSync(join(root,".git"));
const hasVercel=existsSync(join(root,".vercel","project.json"));
console.log((hasGit?"[OK] ":"[CHƯA] ")+"Git repository");
console.log((hasVercel?"[OK] ":"[CHƯA] ")+"Vercel project");
if(!hasGit)failures++;
if(!hasVercel)failures++;
console.log("[PHẢI KIỂM TRA LIVE] SQL v2/v3, RLS/GRANT, camera HTTPS và kiểm thử tải 200");
if(failures){console.error("Chưa sẵn sàng production: "+failures+" nhóm cấu hình chưa đạt.");process.exitCode=1;}
else console.log("Biến môi trường đủ; chưa xác minh migration và deployment live.");
