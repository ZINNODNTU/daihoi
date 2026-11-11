import "server-only";
import {randomUUID} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {redactLogText} from "@/lib/system-log-redaction";

export type SystemLogLevel="critical"|"error"|"warning"|"info";
export type SystemLogSource="auth"|"attendance"|"documents"|"seating"|"frontend"|"api";
type ContextValue=string|number|boolean|null;

export type SystemLogInput={
 level:SystemLogLevel;
 source:SystemLogSource;
 event:string;
 message:string;
 congressId?:string|null;
 actorId?:string|null;
 requestId?:string;
 statusCode?:number;
 durationMs?:number;
 context?:Record<string,ContextValue>;
};

const CONTEXT_KEYS=new Set([
 "operation","errorName","dbCode","httpMethod","endpoint","component",
 "reason","sessionId","filename","line","column","attempt","service"
]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanContext(context?:Record<string,ContextValue>){
 const result:Record<string,ContextValue>={};
 for(const [key,val] of Object.entries(context||{})){
  if(!CONTEXT_KEYS.has(key)||Object.keys(result).length>=12)continue;
  if(typeof val==="string")result[key]=redactLogText(val,120);
  else if(val===null||typeof val==="boolean"||typeof val==="number"&&Number.isFinite(val))
   result[key]=val;
 }
 return result;
}

export async function writeSystemLog(input:SystemLogInput):Promise<string>{
 const requestId=input.requestId&&UUID.test(input.requestId)?input.requestId:randomUUID();
 const payload={
  level:input.level,
  source:input.source,
  event:redactLogText(input.event,120),
  message:redactLogText(input.message,500),
  congress_id:input.congressId&&UUID.test(input.congressId)?input.congressId:null,
  actor_id:input.actorId&&UUID.test(input.actorId)?input.actorId:null,
  request_id:requestId,
  status_code:input.statusCode&&input.statusCode>=100&&input.statusCode<=599?input.statusCode:null,
  duration_ms:input.durationMs!==undefined&&Number.isInteger(input.durationMs)
   ?Math.max(0,Math.min(input.durationMs,3600000)):null,
  context:cleanContext(input.context)
 };
 const consoleLine=JSON.stringify({type:"system_log",...payload});
 if(input.level==="critical"||input.level==="error")console.error(consoleLine);
 else if(input.level==="warning")console.warn(consoleLine);
 else console.info(consoleLine);
 try{
  const {error}=await createAdminClient().from("system_logs")
   .insert(payload).abortSignal(AbortSignal.timeout(1800));
  if(error)console.warn(JSON.stringify({type:"system_log_persist_failed",code:error.code||"unknown",requestId}));
 }catch{
  console.warn(JSON.stringify({type:"system_log_persist_unavailable",requestId}));
 }
 return requestId;
}
