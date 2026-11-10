#!/usr/bin/env node
// Safe, read-only HTTP benchmark for the locally running production build.
// Never run against Vercel or Supabase production; no credentialed login or writes.
import {performance} from "node:perf_hooks";

const base=new URL(process.env.LOCAL_LOAD_URL||"http://127.0.0.1:3107");
if(!["127.0.0.1","localhost","[::1]"].includes(base.hostname)||base.protocol!=="http:")
 throw new Error("Only a loopback HTTP endpoint is allowed.");
const endpoints=[
 {name:"Trang đăng nhập (HTML)",url:"/login",expected:[200]},
 {name:"Cổng đại biểu (chưa xác thực)",url:"/my-card",expected:[302,303,307,308]},
 {name:"Điểm danh API (chưa xác thực)",url:"/api/attendance/live?congressId=00000000-0000-4000-8000-000000000001&sessionId=00000000-0000-4000-8000-000000000001",expected:[401]}
];
const percentile=(list,p)=>list[Math.max(0,Math.ceil(list.length*p)-1)]||0;
async function request(path){
 const start=performance.now();
 try{
  const response=await fetch(new URL(path,base),{
   redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(15000),
   headers:{"X-Local-Load-Probe":"true"}
  });
  const body=await response.arrayBuffer();
  return {ms:performance.now()-start,status:response.status,bytes:body.byteLength};
 }catch(e){
  return {ms:performance.now()-start,status:0,bytes:0,error:e instanceof Error?e.name:"unknown"};
 }
}
console.log(JSON.stringify({target:base.origin,test:"anonymous requests only, excludes logged-in users and Supabase mutations",timestamp:new Date().toISOString()}));
for(const scenario of endpoints){
 await Promise.all(Array.from({length:8},()=>request(scenario.url)));
 for(const concurrency of [20,100,200]){
  const start=performance.now();
  const results=await Promise.all(Array.from({length:concurrency},()=>request(scenario.url)));
  const seconds=(performance.now()-start)/1000;
  const latencies=results.map(r=>r.ms).sort((a,b)=>a-b);
  const statuses=Object.fromEntries([...new Set(results.map(r=>r.status))].sort().map(x=>[x,results.filter(r=>r.status===x).length]));
  const failures=results.filter(r=>!scenario.expected.includes(r.status)).length;
  console.log(JSON.stringify({scenario:scenario.name,concurrency,failures,statuses,
   p50ms:Math.round(percentile(latencies,.50)),p95ms:Math.round(percentile(latencies,.95)),
   p99ms:Math.round(percentile(latencies,.99)),maxMs:Math.round(latencies.at(-1)||0),
   durationS:Number(seconds.toFixed(2)),rps:Number((concurrency/seconds).toFixed(1)),
   meanBytes:Math.round(results.reduce((a,b)=>a+b.bytes,0)/results.length)}));
 }
}
