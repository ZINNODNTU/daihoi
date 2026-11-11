import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getSystemLogAccess} from "@/lib/system-log-access";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type Level="critical"|"error"|"warning"|"info";
type LogSample={occurred_at:string;level:Level;source:string};
const PERIODS:Record<string,{ms:number;step:number}>={
 "1h":{ms:3600000,step:300000},
 "24h":{ms:86400000,step:3600000},
 "7d":{ms:604800000,step:86400000},
 "30d":{ms:2592000000,step:86400000}
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});
const MAX_SAMPLE=3000;

export async function GET(request:Request){
 try{
  const access=await getSystemLogAccess();
  if(!access.user)return fail("Vui lòng đăng nhập.",401);
  if(!access.allowed)return fail("Không có quyền xem phân tích nhật ký.",403);
  const params=new URL(request.url).searchParams;
  const period=params.get("period")||"24h";
  const congressId=params.get("congressId")||"";
  const config=PERIODS[period];
  if(!config||(congressId&&!UUID.test(congressId)))
   return fail("Bộ lọc không hợp lệ.",400);
  if(congressId&&!access.superAdmin&&!access.congressIds.includes(congressId))
   return fail("Không có quyền xem nhật ký Đại hội này.",403);
  const now=Date.now();
  const since=now-config.ms;
  const db=createAdminClient();
  let query=db.from("system_logs")
   .select("occurred_at,level,source",{count:"exact"})
   .gte("occurred_at",new Date(since).toISOString())
   .order("occurred_at",{ascending:false})
   .limit(MAX_SAMPLE);
  if(!access.superAdmin)query=query.in("congress_id",access.congressIds);
  if(congressId)query=query.eq("congress_id",congressId);
  const {data,count,error}=await query;
  if(error)return fail("Không tải được biểu đồ nhật ký.",503);
  const bucketCount=Math.ceil(config.ms/config.step);
  const buckets=Array.from({length:bucketCount},(_,index)=>({
   start:new Date(since+index*config.step).toISOString(),
   critical:0,error:0,warning:0,info:0,total:0
  }));
  const sourceCounts=new Map<string,number>();
  const levels:Record<Level,number>={critical:0,error:0,warning:0,info:0};
  for(const row of (data||[]) as LogSample[]){
   if(!Object.hasOwn(levels,row.level))continue;
   const occurred=Date.parse(row.occurred_at);
   const index=Math.floor((occurred-since)/config.step);
   if(index<0||index>=bucketCount)continue;
   buckets[index][row.level]++;
   buckets[index].total++;
   levels[row.level]++;
   sourceCounts.set(row.source,(sourceCounts.get(row.source)||0)+1);
  }
  const sources=[...sourceCounts].sort((a,b)=>b[1]-a[1])
   .map(([source,total])=>({source,total}));
  return NextResponse.json({
   period,congressId,buckets,levels,sources,
   counted:count||0,sampled:(data||[]).length,truncated:(count||0)>MAX_SAMPLE,
   refreshedAt:new Date().toISOString()
  },{headers:HEADERS});
 }catch{
  return fail("Không thể kết nối phân tích nhật ký.",503);
 }
}
