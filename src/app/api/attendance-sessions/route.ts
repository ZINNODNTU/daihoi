import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateWindowDetailed,type QrPolicy} from "@/lib/attendance-window";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  if(error)return NextResponse.json({error:"Không tạo được phiên điểm danh."},{status:500});
  return NextResponse.json({ok:true,session:data});
 }catch{
  return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});
 }
}
export async function PATCH(request:Request){
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
   const seating=await resolveSeatingLayout(admin,congressId,body.seatingLayoutId);
   if(seating.error)return NextResponse.json({error:seating.error},{status:400});
   update.seating_layout_id=seating.value;
  }
  if(!Object.keys(update).length)
   return NextResponse.json({error:"Không có thông tin cập nhật."},{status:400});
  const {data,error}=await admin.from("attendance_sessions")
   .update(update).eq("id",sessionId).eq("congress_id",congressId)
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id").maybeSingle();
  if(error||!data)return NextResponse.json({error:"Không cập nhật được phiên điểm danh."},{status:500});
  return NextResponse.json({ok:true,session:data});
 }catch{
  return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});
 }
}
