import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getSystemLogAccess} from "@/lib/system-log-access";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const HEADERS={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEVELS=["critical","error","warning"];
const SOURCES=["auth","attendance","documents","seating","frontend","api"];
const STATES=["open","investigating","resolved"];
const PERIODS:Record<string,number>={"1h":3600000,"24h":86400000,"7d":604800000,"30d":2592000000};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});

export async function GET(request:Request){
 try{
  const access=await getSystemLogAccess();
  if(!access.user)return fail("Vui lòng đăng nhập.",401);
  if(!access.allowed)return fail("Không đủ quyền xem sự cố.",403);
  const params=new URL(request.url).searchParams;
  const fingerprint=params.get("fingerprint");
  const db=createAdminClient();
  if(fingerprint!==null){
   if(!/^[a-f0-9]{32}$/.test(fingerprint))return fail("Mã nhóm lỗi không hợp lệ.",400);
   let incidentQuery=db.from("system_incidents").select("id,congress_id,fingerprint")
    .eq("fingerprint",fingerprint);
   if(!access.superAdmin)incidentQuery=incidentQuery.in("congress_id",access.congressIds);
   const {data:incident,error}=await incidentQuery.maybeSingle();
   if(error)return fail("Không thể đọc nhóm sự cố. Kiểm tra migration V37.",503);
   if(!incident)return fail("Không tìm thấy nhóm lỗi thuộc phạm vi quyền.",404);
   const {data:events,error:eventsError}=await db.from("system_logs")
    .select("id,occurred_at,level,event,request_id,status_code,duration_ms,context,release,environment")
    .eq("fingerprint",incident.fingerprint)
    .order("occurred_at",{ascending:false})
    .limit(15);
   if(eventsError)return fail("Không thể đọc lịch sử lỗi.",503);
   return NextResponse.json({events:events||[],fingerprint},{headers:HEADERS});
  }
  const congressId=params.get("congressId")||"";
  const level=params.get("level")||"";
  const source=params.get("source")||"";
  const resolution=params.get("resolution")||"";
  const period=params.get("period")||"24h";
  const q=(params.get("q")||"").trim();
  const page=Number(params.get("page")||"0");
  if(congressId&&!UUID.test(congressId)||level&&!LEVELS.includes(level)||
   source&&!SOURCES.includes(source)||resolution&&!STATES.includes(resolution)||
   !PERIODS[period]||!Number.isInteger(page)||page<0||page>50||
   q.length>60||q&&!/^[a-zA-Z0-9_.:-]+$/.test(q))
   return fail("Bộ lọc sự cố không hợp lệ.",400);
  if(congressId&&!access.superAdmin&&!access.congressIds.includes(congressId))
   return fail("Đại hội ngoài phạm vi quản trị.",403);
  const since=new Date(Date.now()-PERIODS[period]).toISOString();
  let rows=db.from("system_incidents").select(
   "id,fingerprint,congress_id,source,event,title,level,first_seen_at,last_seen_at,occurrence_count,window_count,window_started_at,latest_log_id,latest_request_id,first_release,latest_release,resolution,reopened_count,handled_by,handled_at",
   {count:"exact"}
  ).gte("last_seen_at",since).order("last_seen_at",{ascending:false})
   .range(page*20,page*20+19);
  let unresolved=db.from("system_incidents").select("id",{head:true,count:"exact"})
   .gte("last_seen_at",since).neq("resolution","resolved");
  let spikes=db.from("system_incidents").select("id",{head:true,count:"exact"})
   .gte("window_started_at",new Date(Date.now()-300000).toISOString())
   .gte("window_count",3).in("level",["error","critical"]).neq("resolution","resolved");
  if(!access.superAdmin){
   rows=rows.in("congress_id",access.congressIds);
   unresolved=unresolved.in("congress_id",access.congressIds);
   spikes=spikes.in("congress_id",access.congressIds);
  }
  if(congressId){
   rows=rows.eq("congress_id",congressId);
   unresolved=unresolved.eq("congress_id",congressId);
   spikes=spikes.eq("congress_id",congressId);
  }
  if(level)rows=rows.eq("level",level);
  if(source)rows=rows.eq("source",source);
  if(resolution)rows=rows.eq("resolution",resolution);
  if(q)rows=rows.ilike("event","%"+q+"%");
  const [items,unresolvedResult,spikeResult]=await Promise.all([rows,unresolved,spikes]);
  if(items.error||unresolvedResult.error||spikeResult.error)
   return fail("Chưa tải được nhóm sự cố. Kiểm tra migration V37.",503);
  return NextResponse.json({
   incidents:items.data||[],total:items.count||0,page,pageSize:20,
   metrics:{unresolved:unresolvedResult.count||0,spikes:spikeResult.count||0},
   refreshedAt:new Date().toISOString()
  },{headers:HEADERS});
 }catch{return fail("Không thể tải danh sách sự cố.",503);}
}

export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(!origin||new URL(origin).host!==request.headers.get("host"))
   return fail("Nguồn yêu cầu không hợp lệ.",403);
  const access=await getSystemLogAccess();
  if(!access.user)return fail("Vui lòng đăng nhập.",401);
  if(!access.allowed)return fail("Không có quyền xử lý sự cố.",403);
  const raw=Number(request.headers.get("content-length")||"0");
  if(raw>2048)return fail("Nội dung quá lớn.",413);
  const body=await request.json().catch(()=>null);
  const id=body?.id, resolution=body?.resolution;
  if(typeof id!=="string"||!UUID.test(id)||!STATES.includes(resolution))
   return fail("Trạng thái không hợp lệ.",400);
  const db=createAdminClient();
  // A scoped UPDATE avoids cross-congress changes even if an incident changes
  // between a read and update. Service-role bypass must never be unscoped.
  let update=db.from("system_incidents").update({
   resolution,
   handled_at:resolution==="open"?null:new Date().toISOString(),
   handled_by:resolution==="open"?null:access.user.id
  }).eq("id",id);
  if(!access.superAdmin)update=update.in("congress_id",access.congressIds);
  const {data,error}=await update
   .select("id,resolution,handled_at,handled_by,reopened_count").maybeSingle();
  if(error)return fail("Không thể cập nhật tình trạng sự cố.",503);
  if(!data)return fail("Sự cố không tồn tại hoặc ngoài phạm vi quyền.",404);
  return NextResponse.json({ok:true,incident:data},{headers:HEADERS});
 }catch{return fail("Không thể xử lý yêu cầu.",503);}
}
