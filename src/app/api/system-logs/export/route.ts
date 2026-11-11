import {getSystemLogAccess} from "@/lib/system-log-access";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS=["critical","error","warning","info"];
const SOURCES=["auth","attendance","documents","seating","frontend","api"];
const RESOLUTIONS=["open","investigating","resolved"];
const PERIODS:Record<string,number>={"1h":3600000,"24h":86400000,"7d":604800000,"30d":2592000000};
const LIMIT=2000;
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(message:string,status:number)=>Response.json({error:message},{status,headers:HEADERS});

export function csvCell(value:unknown):string{
 let s=value===undefined||value===null?"":String(value);
 // Protect CSV consumers such as Excel/LibreOffice from formula execution.
 // Prefix even after whitespace, tabs or newlines.
 if(/^[\s\uFEFF]*[=+@-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}

export async function GET(request:Request){
 try{
  const access=await getSystemLogAccess();
  if(!access.user)return fail("Vui lòng đăng nhập.",401);
  if(!access.allowed)return fail("Không có quyền xuất nhật ký hệ thống.",403);
  const params=new URL(request.url).searchParams;
  const congressId=params.get("congressId")||"";
  const period=params.get("period")||"24h";
  const level=params.get("level")||"";
  const source=params.get("source")||"";
  const resolution=params.get("resolution")||"";
  const q=(params.get("q")||"").trim();
  const requestId=params.get("requestId")||"";
  if(congressId&&!UUID.test(congressId)||
   level&&!LEVELS.includes(level)||source&&!SOURCES.includes(source)||
   resolution&&!RESOLUTIONS.includes(resolution)||!PERIODS[period]||
   requestId&&!UUID.test(requestId)||
   q.length>60||q&&!/^[a-zA-Z0-9_.:-]+$/.test(q))
   return fail("Bộ lọc không hợp lệ.",400);
  if(congressId&&!access.superAdmin&&!access.congressIds.includes(congressId))
   return fail("Không có quyền xuất nhật ký Đại hội này.",403);
  const db=createAdminClient();
  const since=new Date(Date.now()-PERIODS[period]).toISOString();
  let query=db.from("system_logs")
   .select("occurred_at,level,source,event,message,congress_id,request_id,status_code,duration_ms,resolution,release,environment,fingerprint",{count:"exact"})
   .gte("occurred_at",since)
   .order("occurred_at",{ascending:false}).order("id",{ascending:false})
   .limit(LIMIT);
  if(!access.superAdmin)query=query.in("congress_id",access.congressIds);
  if(congressId)query=query.eq("congress_id",congressId);
  if(level)query=query.eq("level",level);
  if(source)query=query.eq("source",source);
  if(resolution)query=query.eq("resolution",resolution);
  if(q)query=query.ilike("event","%"+q+"%");
  if(requestId)query=query.eq("request_id",requestId);
  const {data,count,error}=await query;
  if(error)return fail("Không thể xuất dữ liệu nhật ký.",503);
  const cols=[
   "occurred_at","level","source","event","message","congress_id",
   "request_id","status_code","duration_ms","resolution","release","environment","fingerprint"
  ] as const;
  const lines=[cols.join(","),...(data||[]).map(row=>cols.map(col=>csvCell(row[col])).join(","))];
  const bom="\uFEFF";
  const date=new Date().toISOString().slice(0,10);
  return new Response(bom+lines.join("\r\n")+"\r\n",{
   status:200,headers:{
    ...HEADERS,"Content-Type":"text/csv; charset=utf-8",
    "Content-Disposition":'attachment; filename="daihoi-system-logs-'+date+'.csv"',
    "X-Export-Truncated":String((count||0)>LIMIT),
    "X-Export-Rows":String((data||[]).length)
   }
  });
 }catch{return fail("Không thể xuất nhật ký hệ thống.",503);}
}
