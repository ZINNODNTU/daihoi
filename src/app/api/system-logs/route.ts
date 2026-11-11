import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getSystemLogAccess} from "@/lib/system-log-access";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS=["critical","error","warning","info"];
const SOURCES=["auth","attendance","documents","seating","frontend","api"];
const RESOLUTIONS=["open","investigating","resolved"];
const PERIODS:Record<string,number>={"1h":3600000,"24h":86400000,"7d":604800000,"30d":2592000000};
const HEADERS={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:HEADERS});

export async function GET(request:Request){
 try{
  const access=await getSystemLogAccess();
  if(!access.user)return fail("Vui lòng đăng nhập.",401);
  if(!access.allowed)return fail("Bạn không có quyền đọc nhật ký kỹ thuật.",403);
  const params=new URL(request.url).searchParams;
  const congressId=params.get("congressId")||"";
  const level=params.get("level")||"";
  const source=params.get("source")||"";
  const resolution=params.get("resolution")||"";
  const period=params.get("period")||"24h";
  const q=(params.get("q")||"").trim();
  const page=Number(params.get("page")||0);
  if(congressId&&!UUID.test(congressId)||
   level&&!LEVELS.includes(level)||source&&!SOURCES.includes(source)||
   resolution&&!RESOLUTIONS.includes(resolution)||!PERIODS[period]||
   !Number.isInteger(page)||page<0||page>50||
   q.length>60||q&&!/^[a-zA-Z0-9_.:-]+$/.test(q))return fail("Bộ lọc không hợp lệ.",400);
  if(congressId&&!access.superAdmin&&!access.congressIds.includes(congressId))
   return fail("Bạn không có quyền xem nhật ký của Đại hội này.",403);
  const db=createAdminClient();
  const since=new Date(Date.now()-PERIODS[period]).toISOString();
  let rowsQuery=db.from("system_logs")
   .select("id,occurred_at,level,source,event,message,congress_id,actor_id,request_id,status_code,duration_ms,context,resolution,handled_at,handled_by",{count:"exact"})
   .gte("occurred_at",since)
   .order("occurred_at",{ascending:false}).order("id",{ascending:false})
   .range(page*30,page*30+29);
  if(!access.superAdmin)rowsQuery=rowsQuery.in("congress_id",access.congressIds);
  if(congressId)rowsQuery=rowsQuery.eq("congress_id",congressId);
  if(level)rowsQuery=rowsQuery.eq("level",level);
  if(source)rowsQuery=rowsQuery.eq("source",source);
  if(resolution)rowsQuery=rowsQuery.eq("resolution",resolution);
  if(q)rowsQuery=rowsQuery.ilike("event","%"+q+"%");

  const metricsSince=new Date(Date.now()-86400000).toISOString();
  let errorCount=db.from("system_logs").select("id",{count:"exact",head:true})
   .gte("occurred_at",metricsSince).in("level",["error","critical"]);
  let warningCount=db.from("system_logs").select("id",{count:"exact",head:true})
   .gte("occurred_at",metricsSince).eq("level","warning");
  let unresolvedCount=db.from("system_logs").select("id",{count:"exact",head:true})
   .gte("occurred_at",metricsSince).in("level",["error","critical"])
   .neq("resolution","resolved");
  let congressQuery=db.from("congresses").select("id,name").order("name").limit(500);
  if(!access.superAdmin){
   errorCount=errorCount.in("congress_id",access.congressIds);
   warningCount=warningCount.in("congress_id",access.congressIds);
   unresolvedCount=unresolvedCount.in("congress_id",access.congressIds);
   congressQuery=congressQuery.in("id",access.congressIds);
  }
  if(congressId){
   errorCount=errorCount.eq("congress_id",congressId);
   warningCount=warningCount.eq("congress_id",congressId);
   unresolvedCount=unresolvedCount.eq("congress_id",congressId);
  }
  const [rows,errors,warnings,unresolved,congresses]=await Promise.all([
   rowsQuery,errorCount,warningCount,unresolvedCount,congressQuery
  ]);
  if(rows.error||errors.error||warnings.error||unresolved.error||congresses.error)
   return fail("Chưa tải được System Logs. Kiểm tra migration V36 và kết nối Supabase.",503);
  return NextResponse.json({
   logs:rows.data||[],total:rows.count||0,page,pageSize:30,
   metrics:{errors24h:errors.count||0,warnings24h:warnings.count||0,unresolved24h:unresolved.count||0},
   congresses:congresses.data||[],superAdmin:access.superAdmin,
   refreshedAt:new Date().toISOString()
  },{headers:HEADERS});
 }catch{return fail("Không thể kết nối nhật ký hệ thống.",503);}
}

export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);
  const access=await getSystemLogAccess();
  if(!access.user)return fail("Vui lòng đăng nhập.",401);
  if(!access.allowed)return fail("Không có quyền xử lý sự cố.",403);
  const body=await request.json().catch(()=>null);
  const id=body?.id, resolution=body?.resolution;
  if(typeof id!=="string"||!UUID.test(id)||!RESOLUTIONS.includes(resolution))
   return fail("Dữ liệu không hợp lệ.",400);
  const db=createAdminClient();
  const {data:log,error}=await db.from("system_logs").select("id,congress_id").eq("id",id).maybeSingle();
  if(error)return fail("Không thể tra cứu sự cố.",503);
  if(!log||!access.superAdmin&&(!log.congress_id||!access.congressIds.includes(log.congress_id)))
   return fail("Không tìm thấy sự cố thuộc phạm vi quản trị.",404);
  let query=db.from("system_logs").update({
   resolution,handled_at:resolution==="open"?null:new Date().toISOString(),
   handled_by:resolution==="open"?null:access.user.id
  }).eq("id",id);
  if(!access.superAdmin)query=query.in("congress_id",access.congressIds);
  const {data,error:updateError}=await query
   .select("id,resolution,handled_at,handled_by").maybeSingle();
  if(updateError||!data)return fail("Không thể cập nhật trạng thái sự cố.",503);
  return NextResponse.json({ok:true,log:data},{headers:HEADERS});
 }catch{return fail("Không thể xử lý sự cố.",503);}
}
