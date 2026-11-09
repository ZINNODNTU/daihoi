#!/usr/bin/env node
/**
 * Live, read-only Apps Script connection check.
 * Does not upload files, log tokens, or modify Google Drive.
 *
 * Usage: npm run check:drive
 */
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
import {createHmac,randomUUID} from "node:crypto";

function config(){
 const env={...process.env};
 const p=resolve(process.cwd(),".env.local");
 if(existsSync(p)){
  for(const line of readFileSync(p,"utf8").split(/\r?\n/)){
   const m=/^\s*(GOOGLE_APPS_SCRIPT_URL|GOOGLE_APPS_SCRIPT_SECRET)\s*=\s*(.*?)\s*$/.exec(line);
   if(!m||env[m[1]])continue;
   const v=m[2].trim();
   env[m[1]]=((v.startsWith('"')&&v.endsWith('"'))||
    (v.startsWith("'")&&v.endsWith("'")))?v.slice(1,-1):v;
  }
 }
 return env;
}
const redacted=(code)=>String(code||"unknown").replace(/[^a-z0-9_-]/gi,"").slice(0,60);
async function run(){
 const env=config();
 const url=env.GOOGLE_APPS_SCRIPT_URL||"";
 const secret=env.GOOGLE_APPS_SCRIPT_SECRET||"";
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)||
  secret.length<32)throw new Error("missing_or_invalid_config");
 const payload=JSON.stringify({
  action:"status",congressId:"00000000-0000-4000-8000-000000000001"
 });
 const time=Date.now(),nonce=randomUUID();
 const signature=createHmac("sha256",secret)
  .update(time+"."+nonce+"."+payload).digest("base64url");
 const response=await fetch(url,{
  method:"POST",headers:{"Content-Type":"text/plain; charset=utf-8"},
  body:JSON.stringify({time,nonce,payload,signature}),
  redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(45_000)
 });
 let data;
 try{data=await response.json();}catch{throw new Error("not_json");}
 if(!response.ok||data?.ok!==true)throw new Error(redacted(data?.code||"bad_response"));
 if(typeof data.rootName!=="string"||!data.rootName)
  throw new Error("root_unavailable");
 console.log("[OK] Apps Script Web App đã xác thực HMAC-SHA256.");
 console.log("[OK] Google Drive root:",data.rootName);
 console.log("[CHƯA KIỂM TRA] Quyền admin tại website, Supabase, Vercel và giao diện đại biểu.");
}
run().catch(err=>{
 const allowed=new Set(["missing_or_invalid_config","not_json","bad_response","root_unavailable",
  "request_expired","invalid_signature","missing_config","root_not_found",
  "script_failed","drive_error","unauthorized_file","replay_detected"]);
 const kind=String(err?.message||"");
 console.error("[LỖI] Apps Script:",allowed.has(kind)?kind:"unreachable_or_unexpected");
 process.exitCode=1;
});
