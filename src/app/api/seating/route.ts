import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateSeatDrafts,seatGridSizeValid,type SeatDraft} from "@/lib/seating";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noCache={"Cache-Control":"private, no-store"};
function fail(error:string,status:number){return NextResponse.json({error},{status,headers:noCache});}
function databaseProblem(error:{code?:string;message?:string}){
  if(error.code==="42P01"||error.code==="PGRST205"||error.code==="PGRST202")
    return fail("Chưa cài đặt cơ sở dữ liệu sơ đồ ghế. Quản trị viên cần chạy supabase/upgrade-seating-v4.sql.",503);
  const msg=String(error.message||"");
  if(msg.includes("SEATING_VERSION_CONFLICT"))
    return fail("Dữ liệu đã thay đổi từ thiết bị khác. Vui lòng tải lại sơ đồ trước khi lưu.",409);
  if(msg.includes("SEATING_ASSIGNED_SEAT_REMOVE"))
    return fail("Không thể xóa ghế đã gán đại biểu. Hãy bỏ phân ghế trước.",409);
  if(msg.includes("SEATING_ASSIGNED_SEAT_BLOCK"))
    return fail("Không thể khóa ghế vẫn đang được phân cho đại biểu.",409);
  if(msg.includes("SEATING_ASSIGNED_TYPE_MISMATCH"))
    return fail("Loại ghế không phù hợp với người đang ngồi. Hãy bỏ phân công trước khi đổi loại ghế.",409);
  if(msg.includes("SEATING_INVALID_REFERENCE"))
    return fail("Không thể phân công: ghế và loại người ngồi không phù hợp, hoặc hồ sơ đã ngừng hoạt động.",400);
  if(msg.includes("SEATING_DUPLICATE")||error.code==="23505")
    return fail("Mã ghế, vị trí hoặc phân công bị trùng.",409);
  if(msg.includes("SEATING_BAD_")||msg.includes("SEATING_SEAT_FOREIGN_LAYOUT")||error.code==="23503"||error.code==="23514")
    return fail("Dữ liệu sơ đồ/ghế không hợp lệ hoặc không thuộc Đại hội này.",400);
  console.error("seating database",error.code||"unknown");
  return fail("Không thể cập nhật sơ đồ. Vui lòng kiểm tra cấu hình Supabase hoặc thử lại.",500);
}
async function authorize(congressId:string,edit:boolean){
  const {supabase,user}=await getAuth();
  if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
  if(!uuid.test(congressId))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
  if(!(await hasRole(supabase,user.id,congressId,edit?"admin":"viewer")))
    return {error:fail("Bạn không có quyền truy cập sơ đồ Đại hội này.",403)} as const;
  return {user} as const;
}
export async function GET(request:Request){
  try{
    const query=new URL(request.url).searchParams;
    const congressId=query.get("congressId")||"";
    const session=await authorize(congressId,false);
    if("error" in session)return session.error;
    const db=createAdminClient();
    const [layoutsResult,delegatesResult,sessionsResult]=await Promise.all([
      db.from("seating_layouts").select("id,congress_id,title,stage_label,grid_rows,grid_columns,version,created_at,updated_at")
        .eq("congress_id",congressId).order("updated_at",{ascending:false}).limit(30),
      db.from("delegates").select("id,code,full_name,unit,is_active,delegate_type")
        .eq("congress_id",congressId).order("code").limit(1000),
      db.from("attendance_sessions").select("id,name,status,created_at")
        .eq("congress_id",congressId).order("created_at",{ascending:false}).limit(100)
    ]);
    if(layoutsResult.error)return databaseProblem(layoutsResult.error);
    if(delegatesResult.error||sessionsResult.error)return fail("Không tải được dữ liệu đại biểu hoặc phiên.",500);
    const layouts=layoutsResult.data||[];
    const requestedLayout=query.get("layoutId");
    const layout=layouts.find(l=>l.id===requestedLayout)||(!requestedLayout?layouts[0]:null);
    if(requestedLayout&&!layout)return fail("Không tìm thấy sơ đồ trong Đại hội này.",404);
    const currentSessionId=query.get("sessionId")||sessionsResult.data?.[0]?.id||"";
    const validSession=sessionsResult.data?.some(s=>s.id===currentSessionId);
    const [seatsResult,assignmentsResult,checkinsResult]=await Promise.all([
      layout?db.from("seats").select("id,layout_id,congress_id,code,zone,row_label,seat_number,x,y,blocked,seat_type")
        .eq("layout_id",layout.id).eq("congress_id",congressId).order("y").order("x").limit(500)
        :Promise.resolve({data:[],error:null}),
      layout?db.from("seat_assignments").select("seat_id,layout_id,delegate_id,assigned_at")
        .eq("layout_id",layout.id).eq("congress_id",congressId).limit(500)
        :Promise.resolve({data:[],error:null}),
      validSession?db.from("checkins").select("delegate_id").eq("congress_id",congressId)
        .eq("session_id",currentSessionId).limit(1000)
        :Promise.resolve({data:[],error:null})
    ]);
    if(seatsResult.error||assignmentsResult.error||checkinsResult.error)
      return databaseProblem(seatsResult.error||assignmentsResult.error||checkinsResult.error||{});
    const seats=(seatsResult.data||[]).map(s=>({
      id:s.id,layout_id:s.layout_id,congress_id:s.congress_id,code:s.code,zone:s.zone,
      rowLabel:s.row_label,seatNumber:s.seat_number,x:s.x,y:s.y,blocked:s.blocked,seatType:s.seat_type
    }));
    return NextResponse.json({
      layouts,layout,seats,assignments:assignmentsResult.data||[],
      delegates:delegatesResult.data||[],sessions:sessionsResult.data||[],
      selectedSessionId:validSession?currentSessionId:"",
      checkedInDelegateIds:(checkinsResult.data||[]).map(row=>row.delegate_id)
    },{headers:noCache});
  }catch{
    return fail("Chưa kết nối được Supabase. Vui lòng kiểm tra cấu hình máy chủ.",500);
  }
}
/**
 * Delete unused layouts only. Never delete assigned seats or a map referenced
 * by any attendance session; optimistic version check protects stale edits.
 */
export async function DELETE(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin){
   try{if(new URL(origin).host!==request.headers.get("host"))
     return fail("Nguồn yêu cầu không hợp lệ.",403);}
   catch{return fail("Nguồn yêu cầu không hợp lệ.",403);}
  }
  if(Number(request.headers.get("content-length")||0)>4096)
   return fail("Dữ liệu xóa quá lớn.",413);
  let body:Record<string,unknown>;
  try{
   const value:unknown=await request.json();
   if(!value||typeof value!=="object"||Array.isArray(value))
    return fail("Dữ liệu yêu cầu xóa không hợp lệ.",400);
   body=value as Record<string,unknown>;
  }catch{return fail("Không đọc được dữ liệu xóa.",400);}
  const congressId=typeof body.congressId==="string"?body.congressId:"";
  const layoutId=typeof body.layoutId==="string"?body.layoutId:"";
  const version=body.expectedVersion;
  const authorized=await authorize(congressId,true);
  if("error" in authorized)return authorized.error;
  if(!uuid.test(layoutId)||typeof version!=="number"||!Number.isSafeInteger(version)||version<1)
   return fail("Mã hoặc phiên bản sơ đồ không hợp lệ.",400);
  const db=createAdminClient();
  const {data:layout,error:layoutError}=await db.from("seating_layouts")
   .select("id,version,title").eq("id",layoutId).eq("congress_id",congressId).maybeSingle();
  if(layoutError)return databaseProblem(layoutError);
  if(!layout)return fail("Không tìm thấy sơ đồ trong Đại hội này.",404);
  if(layout.version!==version)return fail("Sơ đồ đã thay đổi, hãy tải lại trước khi xóa.",409);
  const [assigned,used]=await Promise.all([
   db.from("seat_assignments").select("seat_id",{count:"exact",head:true})
    .eq("layout_id",layoutId).eq("congress_id",congressId),
   db.from("attendance_sessions").select("id",{count:"exact",head:true})
    .eq("seating_layout_id",layoutId).eq("congress_id",congressId)
  ]);
  if(assigned.error||used.error)return fail("Không xác minh được liên kết ghế và phiên; chưa xóa để bảo vệ dữ liệu.",503);
  if((assigned.count??0)>0)return fail(
   "Sơ đồ đang có đại biểu được phân ghế. Hãy bỏ phân công trước khi xóa.",409);
  if((used.count??0)>0)return fail(
   "Sơ đồ đang được sử dụng trong phiên điểm danh. Hãy đổi sơ đồ tại tất cả phiên liên quan trước khi xóa.",409);
  const {data:deleted,error:deleteError}=await db.from("seating_layouts")
   .delete().eq("id",layoutId).eq("congress_id",congressId)
   .eq("version",version).select("id").maybeSingle();
  if(deleteError)return databaseProblem(deleteError);
  if(!deleted)return fail("Không thể xóa do sơ đồ đã thay đổi. Vui lòng tải lại.",409);
  const {error:auditError}=await db.from("audit_logs").insert({
   congress_id:congressId,actor_id:authorized.user.id,
   action:"seating.layout_deleted",target_id:layoutId,
   details:{title:layout.title,version}
  });
  if(auditError)console.error("seating delete audit",auditError.code||"unknown");
  return NextResponse.json({ok:true,deletedLayoutId:layoutId},{headers:noCache});
 }catch{return fail("Không thể xóa sơ đồ. Vui lòng thử lại.",503);}
}

export async function POST(request:Request){
  try{
    if(Number(request.headers.get("content-length")||0)>130000)
      return fail("Yêu cầu quá lớn.",413);
    const body=await request.json() as Record<string,unknown>;
    const congressId=String(body.congressId||"");
    const session=await authorize(congressId,true);
    if("error" in session)return session.error;
    const layoutId=String(body.layoutId||"");
    const version=Number(body.expectedVersion);
    if(!uuid.test(layoutId)||!Number.isSafeInteger(version)||version<0)
      return fail("Sơ đồ hoặc phiên bản không hợp lệ.",400);
    const db=createAdminClient();
    if(body.action==="save-layout"){
      const title=String(body.title||"").trim();
      const stageLabel=String(body.stageLabel||"").trim();
      if(title.length<1||title.length>120||stageLabel.length<1||stageLabel.length>120)
        return fail("Tên sơ đồ hoặc sân khấu không hợp lệ.",400);
      const gridRows=Number(body.gridRows),gridColumns=Number(body.gridColumns);
      if(!seatGridSizeValid({rows:gridRows,columns:gridColumns}))
        return fail("Canvas hỗ trợ tối đa 25 hàng, 30 cột và 500 ô.",400);
      const seats=body.seats;
      if(!Array.isArray(seats)||seats.length<1||seats.length>500)
        return fail("Sơ đồ phải có từ 1 đến 500 ghế.",400);
      const typed=seats as SeatDraft[];
      if(typed.some(s=>!s||!uuid.test(s.id)||typeof s.blocked!=="boolean"||
        typeof s.code!=="string"||typeof s.zone!=="string"||typeof s.rowLabel!=="string"||
        (s.seatType!=="delegate"&&s.seatType!=="guest")))
        return fail("Thông tin ghế không hợp lệ.",400);
      const validation=validateSeatDrafts(typed);
      if(validation)return fail(validation,400);
      const {data,error}=await db.rpc("seating_save_layout_v6",{
        p_congress_id:congressId,p_layout_id:layoutId,p_expected_version:version,
        p_actor:session.user.id,p_title:title,p_stage_label:stageLabel,
        p_grid_rows:gridRows,p_grid_columns:gridColumns,p_seats:typed
      });
      if(error)return databaseProblem(error);
      return NextResponse.json({ok:true,version:data},{headers:noCache});
    }
    if(body.action==="assign"){
      const items=body.items;
      const mode=body.mode;
      if(!Array.isArray(items)||items.length>500||!(mode==="merge"||mode==="replace")||
         items.some(i=>!i||typeof i!=="object"||
           !uuid.test(String(i.seatId||""))||
           !(i.delegateId===null||uuid.test(String(i.delegateId||"")))))
        return fail("Danh sách phân công ghế không hợp lệ.",400);
      const {data,error}=await db.rpc("seating_apply_assignments",{
        p_congress_id:congressId,p_layout_id:layoutId,p_expected_version:version,
        p_actor:session.user.id,p_mode:mode,p_items:items
      });
      if(error)return databaseProblem(error);
      return NextResponse.json({ok:true,version:data},{headers:noCache});
    }
    return fail("Thao tác không được hỗ trợ.",400);
  }catch{
    return fail("Không xử lý được yêu cầu. Kiểm tra cấu hình đăng nhập và dữ liệu gửi lên.",400);
  }
}
