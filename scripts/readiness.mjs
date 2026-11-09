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
 ["Publishable Key","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",v=>/^sb_publishable_[A-Za-z0-9_-]+$/.test(v)||v.startsWith("eyJ")],
 ["Secret Key (server only)","SUPABASE_SECRET_KEY",v=>/^sb_secret_[A-Za-z0-9_-]+$/.test(v)||v.startsWith("eyJ")],
 ["QR HMAC Secret >=32 ký tự","QR_HMAC_SECRET",v=>v.length>=32]
];
let failures=0;
console.log("ĐẠI HỘI SỐ — kiểm tra cấu hình");
for(const [label,key,verify] of checks){
 const value=key==="NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"?(env[key]||env.NEXT_PUBLIC_SUPABASE_ANON_KEY):key==="SUPABASE_SECRET_KEY"?(env[key]||env.SUPABASE_SERVICE_ROLE_KEY):env[key];
 const valid=Boolean(value&&verify(value));
 console.log((valid?"[OK] ":"[THIẾU] ")+label);
 if(!valid)failures++;
}
const scriptKeys=["GOOGLE_APPS_SCRIPT_URL","GOOGLE_APPS_SCRIPT_SECRET"];
const oauthKeys=["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","GOOGLE_REFRESH_TOKEN","GOOGLE_DRIVE_ROOT_FOLDER_ID"];
const scriptCount=scriptKeys.filter(k=>env[k]?.trim()).length;
const oauthCount=oauthKeys.filter(k=>env[k]?.trim()).length;
const scriptReady=scriptCount===2&&/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(env.GOOGLE_APPS_SCRIPT_URL);
const oauthReady=oauthCount===4;
const driveReady=scriptReady||oauthReady;
console.log((driveReady?"[OK] ":"[CHƯA] ")+"Google Drive: Apps Script "+scriptCount+"/2"+(scriptReady?" (hợp lệ)":"")+"; OAuth "+oauthCount+"/4");
if(!driveReady)failures++;
const hasGit=existsSync(join(root,".git"));
const hasVercel=existsSync(join(root,".vercel","project.json"));
console.log((hasGit?"[OK] ":"[CHƯA] ")+"Git repository");
console.log((hasVercel?"[OK] ":"[CHƯA] ")+"Vercel project");
if(!hasGit)failures++;
if(!hasVercel)failures++;
console.log("[PHẢI KIỂM TRA LIVE] SQL v2/v3, RLS/GRANT, camera HTTPS và kiểm thử tải 200");
if(failures){console.error("Chưa sẵn sàng production: "+failures+" nhóm cấu hình chưa đạt.");process.exitCode=1;}
else console.log("Biến môi trường đủ; chưa xác minh migration và deployment live.");