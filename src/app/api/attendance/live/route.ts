import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{
 status,headers:{"Cache-Control":"private, no-store"}
});

export async function GET(request:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return fail("Bạn cần đăng nhập tài khoản BTC.",401);
  const q=new URL(request.url).searchParams;
  const congressId=q.get("congressId")||"";
  const sessionId=q.get("sessionId")||"";
  if(!uuid.test(congressId)||!uuid.test(sessionId))
   return fail("Mã phiên không hợp lệ.",400);
  if(!(await hasRole(supabase,user.id,congressId,"checkin")))
   return fail("Tài khoản không có quyền theo dõi điểm danh Đại hội.",403);
  // All privileged table reads happen only after the Congress role check.
  const db=createAdminClient();
   // A tiny incremental feed: no repeated delegate, layout or seat snapshots.
   if(q.get("mode")==="updates"){
    const raw=q.get("after")||"";
    const since=Date.parse(raw);
    if(!Number.isFinite(since)||since>Date.now()+60000||since<Date.now()-86400000)
     return fail("Mốc đồng bộ điểm danh không hợp lệ.",400);
    const {data,error}=await db.from("checkins")
     .select("id,delegate_id,checked_in_at,method,qr_scope")
     .eq("congress_id",congressId).eq("session_id",sessionId)
     .gte("checked_in_at",new Date(since).toISOString())
     .order("checked_in_at",{ascending:true}).order("id",{ascending:true}).limit(500);
    if(error){
      await writeSystemLog({level:"error",source:"attendance",event:"attendance.live_updates_failed",
       message:"Không đọc được dữ liệu điểm danh mới.",congressId,actorId:user.id,statusCode:500,
       context:{operation:"live.updates",dbCode:error.code||"unknown",sessionId}});
      return fail("Không đọc được lượt điểm danh mới.",500);
     }
    return NextResponse.json({checkins:data||[],refreshedAt:new Date().toISOString()},
     {headers:{"Cache-Control":"private, no-store"}});
   }
  const [sessionResult,delegatesResult,layoutsResult,checkinsResult]=await Promise.all([
   db.from("attendance_sessions")
    .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id")
    .eq("id",sessionId).eq("congress_id",congressId).maybeSingle(),
   db.from("delegates").select("id,code,full_name,unit,delegate_type,photo_path,is_active")
    .eq("congress_id",congressId).eq("is_active",true).order("code").limit(700),
   db.from("seating_layouts")
    .select("id,title,stage_label,grid_rows,grid_columns,updated_at")
    .eq("congress_id",congressId).order("updated_at",{ascending:false}).limit(100),
   db.from("checkins").select("id,delegate_id,checked_in_at,method,qr_scope")
    .eq("congress_id",congressId).eq("session_id",sessionId)
    .order("checked_in_at",{ascending:false}).limit(1000)
  ]);
  if(sessionResult.error||delegatesResult.error||layoutsResult.error||checkinsResult.error)
   {await writeSystemLog({level:"error",source:"attendance",event:"attendance.live_snapshot_failed",
     message:"Không đồng bộ được toàn bộ dữ liệu màn hình điểm danh.",congressId,actorId:user.id,statusCode:500,
     context:{operation:"live.snapshot",sessionId}});
     return fail("Không đồng bộ được dữ liệu điểm danh từ Supabase.",500);}
  if(!sessionResult.data)return fail("Phiên không tồn tại trong Đại hội.",404);
  const layouts=layoutsResult.data||[];
  // Each attendance session explicitly selects its auditorium.
  // Never silently substitute another session's seating layout.
  const configuredLayoutId=sessionResult.data.seating_layout_id;
  const layout=layouts.find(x=>x.id===configuredLayoutId)||null;
  let seats:unknown[]=[];
  let assignments:unknown[]=[];
  if(layout){
   const [seatResult,assignmentResult]=await Promise.all([
    db.from("seats").select("id,layout_id,code,row_label,seat_number,zone,x,y,blocked,seat_type")
     .eq("congress_id",congressId).eq("layout_id",layout.id).limit(700),
    db.from("seat_assignments").select("seat_id,delegate_id")
     .eq("congress_id",congressId).eq("layout_id",layout.id).limit(700)
   ]);
   if(seatResult.error||assignmentResult.error)
    {await writeSystemLog({level:"error",source:"seating",event:"seating.live_snapshot_failed",
      message:"Không tải được sơ đồ ghế phục vụ điểm danh.",congressId,actorId:user.id,statusCode:500,
      context:{operation:"live.seating",sessionId}});
      return fail("Không tải được sơ đồ ghế hoặc danh sách phân công.",500);}
   seats=seatResult.data||[];assignments=assignmentResult.data||[];
  }
  return NextResponse.json({
   session:sessionResult.data,delegates:delegatesResult.data||[],
   checkins:checkinsResult.data||[],
   layouts,layout,seats,assignments,refreshedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){
  await writeSystemLog({level:"error",source:"attendance",event:"attendance.live_unexpected_error",
   message:"Lỗi xử lý bảng điều hành điểm danh.",statusCode:500,
   context:{operation:"attendance.live",errorName:e instanceof Error?e.name:"unknown"}});
  return fail("Không thể tải bảng điều hành điểm danh.",500);
 }
}
