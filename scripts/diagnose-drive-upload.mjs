#!/usr/bin/env node
// Diagnostic upload with automatic cleanup. Requires local .env.local.
import {existsSync,readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createHmac,randomUUID} from "node:crypto";
import {serializeSignedPayload} from "../src/lib/drive-signature.ts";

const env={...process.env};
const envFile=resolve(".env.local");
if(existsSync(envFile)){
 for(const line of readFileSync(envFile,"utf8").split(/\r?\n/)){
  const m=/^\s*(GOOGLE_APPS_SCRIPT_URL|GOOGLE_APPS_SCRIPT_SECRET)=(.*?)\s*$/.exec(line);
  if(m&&!env[m[1]])env[m[1]]=m[2].trim().replace(/^["']|["']$/g,"");
 }
}
const endpoint=env.GOOGLE_APPS_SCRIPT_URL||"";
const secret=env.GOOGLE_APPS_SCRIPT_SECRET||"";
if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)||secret.length<32){
 console.error("Cấu hình Apps Script chưa đầy đủ.");process.exit(1);
}
const congressId="00000000-0000-4000-8000-000000000001";
async function send(data){
 const payload=serializeSignedPayload(data);
 const time=Date.now(),nonce=randomUUID();
 const signature=createHmac("sha256",secret).update(time+"."+nonce+"."+payload,"utf8").digest("base64url");
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"text/plain; charset=utf-8"},
  body:JSON.stringify({time,nonce,payload,signature}),redirect:"follow",signal:AbortSignal.timeout(90000)});
 const raw=await res.text();
 let json={};try{json=JSON.parse(raw);}catch{}
 return {http:res.status,ok:json.ok===true,code:json.code||"unknown",id:json.id||null};
}
let failed=false;
for(const [label,bytes,name] of [
 ["ascii-small",50000,"BC_DKCNTT_T10_2026.pdf"],
 ["unicode-small",50000,"Báo cáo Đại hội.pdf"],
 ["ascii-medium",800000,"BC_DKCNTT_T10_2026.pdf"],
 ["ascii-large",2400000,"BC_DKCNTT_T10_2026.pdf"],
 ["ascii-boundary",4100000,"BC_DKCNTT_T10_2026.pdf"]
]){
 const b=Buffer.alloc(bytes,65);
 Buffer.from("%PDF-1.4\n").copy(b);
 let id=null;
 try{
  const result=await send({action:"upload",congressId,name:"HEALTHCHECK_"+randomUUID().slice(0,8)+"_"+name,
   mimeType:"application/pdf",base64:b.toString("base64")});
  id=result.id;
  console.log(JSON.stringify({test:label,size:bytes,http:result.http,ok:result.ok,code:result.ok?null:result.code}));
  if(!result.ok)failed=true;
 }catch(error){console.log(JSON.stringify({test:label,error:error instanceof Error?error.name:"error"}));failed=true;}
 finally{
  if(id){
   try{
    const out=await send({action:"delete",congressId,fileId:id});
    console.log(JSON.stringify({test:label+"-cleanup",ok:out.ok,code:out.ok?null:out.code}));
    if(!out.ok)failed=true;
   }catch{console.log(JSON.stringify({test:label+"-cleanup",ok:false}));failed=true;}
  }
 }
}
if(failed)process.exitCode=2;
