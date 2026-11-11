import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";
import {validateWindowDetailed,type QrPolicy} from "@/lib/attendance-window";
import {revalidateTag} from "next/cache";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function sameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===request.headers.get("host");}catch{return false;}
}
function policy(input:unknown):QrPolicy|null{
 return input==="fixed"||input==="session"||input==="both"?input:null;
}
async function resolveSeatingLayout(admin:ReturnType<typeof createAdminClient>,
 congressId:string,provided:unknown){
 if(provided===null||provided==="")return {value:null as string|null,error:null};
 if(typeof provided!=="string"||!uuid.test(provided))
  return {value:null,error:"Mã sơ đồ ghế không hợp lệ."};
 const {data,error}=await admin.from("seating_layouts").select("id")
  .eq("id",provided).eq("congress_id",congressId).maybeSingle();
 if(error||!data)return {value:null,error:"Sơ đồ ghế không tồn tại trong Đại hội này."};
 return {value:data.id as string,error:null};
}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
 try{
  const {supabase,user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const name=String(body.name||"").trim().slice(0,160);
  if(!uuid.test(congressId)||!(await hasRole(supabase,user.id,congressId,"admin")))
   return NextResponse.json({error:"Không có quyền tạo phiên điểm danh."},{status:403});
  if(name.length<3)
   return NextResponse.json({error:"Tên phiên phải có tối thiểu 3 ký tự."},{status:400});
  const checked=validateWindowDetailed(body.startsAt,body.endsAt);
  if(!checked.window)
   return NextResponse.json({error:checked.error||"Giờ điểm danh không hợp lệ."},{status:400});
  const qrPolicy=policy(body.qrPolicy);
  if(!qrPolicy)
   return NextResponse.json({error:"Vui lòng chọn loại QR được phép."},{status:400});
  const admin=createAdminClient();
  const seating=await resolveSeatingLayout(admin,congressId,body.seatingLayoutId??null);
  if(seating.error)return NextResponse.json({error:seating.error},{status:400});
  const {data,error}=await admin.from("attendance_sessions").insert({
   congress_id:congressId,name,status:"open",qr_policy:qrPolicy,
   seating_layout_id:seating.value,...checked.window
  }).select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id").single();
  if(error){
   await writeSystemLog({level:"error",source:"attendance",event:"attendance.session_create_failed",
    message:"Không tạo được phiên điểm danh.",congressId,actorId:user.id,statusCode:500,
    context:{operation:"attendance_sessions.insert",dbCode:error.code||"unknown"}});
   return NextResponse.json({error:"Không tạo được phiên điểm danh."},{status:500});
  }
  revalidateTag("daihoi-portal-sessions",{expire:0});
   return NextResponse.json({ok:true,session:data});
 }catch{
  return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});
 }
}
export async function PATCH(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:"Nguồn yêu cầu không hợp lệ."},{status:403});
 try{
  const {supabase,user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const sessionId=String(body.sessionId||"");
  if(!uuid.test(congressId)||!uuid.test(sessionId)||
     !(await hasRole(supabase,user.id,congressId,"admin")))
    return NextResponse.json({error:"Không đủ quyền."},{status:403});
  const update:Record<string,unknown>={};
  if(body.status!==undefined){
   if(body.status!=="open"&&body.status!=="closed")
    return NextResponse.json({error:"Trạng thái phiên không hợp lệ."},{status:400});
   update.status=body.status;
  }
  const updateConfiguration=body.startsAt!==undefined||
   body.endsAt!==undefined||body.qrPolicy!==undefined;
  if(updateConfiguration){
   const checked=validateWindowDetailed(body.startsAt,body.endsAt);
   if(!checked.window)
    return NextResponse.json({error:checked.error||"Giờ điểm danh không hợp lệ."},{status:400});
   const qrPolicy=policy(body.qrPolicy);
   if(!qrPolicy)
    return NextResponse.json({error:"Vui lòng chọn loại QR được phép."},{status:400});
   const {count,error}=await supabase.from("checkins")
    .select("id",{head:true,count:"exact"})
    .eq("congress_id",congressId).eq("session_id",sessionId);
   if(error)return NextResponse.json({error:"Không kiểm tra được lịch sử điểm danh."},{status:500});
   if((count??0)>0)
    return NextResponse.json({error:"Phiên đã có điểm danh; không cho phép sửa giờ hoặc loại QR. Có thể đóng phiên."},{status:409});
   Object.assign(update,checked.window,{qr_policy:qrPolicy});
  }
  const admin=createAdminClient();
  if(body.seatingLayoutId!==undefined){
   // Compare-and-set: an organizer cannot overwrite a newly changed session map.
   if(body.expectedSeatingLayoutId!==undefined){
    const expected=body.expectedSeatingLayoutId;
    if(expected!==null&&(typeof expected!=="string"||!uuid.test(expected)))
     return NextResponse.json({error:"Sơ đồ đối chiếu không hợp lệ."},{status:400});
    const {data:current,error:currentError}=await admin.from("attendance_sessions")
     .select("seating_layout_id").eq("congress_id",congressId).eq("id",sessionId).maybeSingle();
    if(currentError||!current)
     return NextResponse.json({error:"Không xác minh được sơ đồ hiện tại."},{status:503});
    if(current.seating_layout_id!==expected)
     return NextResponse.json({error:"Sơ đồ phiên đã thay đổi từ thiết bị khác. Hãy tải lại trước khi áp dụng."},{status:409});
   }
   const seating=await resolveSeatingLayout(admin,congressId,body.seatingLayoutId);
   if(seating.error)return NextResponse.json({error:seating.error},{status:400});
   update.seating_layout_id=seating.value;
  }
  if(!Object.keys(update).length)
   return NextResponse.json({error:"Không có thông tin cập nhật."},{status:400});
  let mutation=admin.from("attendance_sessions")
    .update(update).eq("id",sessionId).eq("congress_id",congressId);
   // Keep the compare-and-set predicate in the UPDATE itself, not just the pre-read.
   const conditional=body.seatingLayoutId!==undefined&&body.expectedSeatingLayoutId!==undefined;
   if(conditional){
    mutation=body.expectedSeatingLayoutId===null
     ?mutation.is("seating_layout_id",null)
     :mutation.eq("seating_layout_id",body.expectedSeatingLayoutId);
   }
   const {data,error}=await mutation
    .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id").maybeSingle();
   if(!error&&!data&&conditional)
    return NextResponse.json({error:"Sơ đồ phiên đã được người khác thay đổi. Vui lòng tải lại."},{status:409});
  if(error||!data){
   await writeSystemLog({level:"error",source:"attendance",event:"attendance.session_update_failed",
    message:"Không cập nhật được phiên điểm danh.",congressId,actorId:user.id,statusCode:500,
    context:{operation:"attendance_sessions.update",dbCode:error?.code||"unknown",sessionId}});
   return NextResponse.json({error:"Không cập nhật được phiên điểm danh."},{status:500});
  }
  revalidateTag("daihoi-portal-sessions",{expire:0});
   return NextResponse.json({ok:true,session:data});
 }catch{
  return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});
 }
}
