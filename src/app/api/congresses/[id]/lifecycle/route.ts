import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed=new Set(["delegates","bch","sessions","documents","seating","checkins"]);
const noCache={"Cache-Control":"private, no-store"};
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:noCache});
async function onlySuperAdmin(id:string){
 if(!uuid.test(id))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 const {data,error}=await supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle();
 if(error||data?.platform_role!=="super_admin")
  return {error:fail("Chỉ quản trị viên hệ thống (Super Admin) có quyền reset hoặc xóa Đại hội.",403)} as const;
 return {user} as const;
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,permission=await onlySuperAdmin(id);
 if("error" in permission)return permission.error;
 try{
  const db=createAdminClient();
  const [congress,delegates,bch,sessions,documents,seating,checkins,btc,layouts,sessionRows]=await Promise.all([
   db.from("congresses").select("id,name").eq("id",id).maybeSingle(),
   db.from("delegates").select("id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("bch_candidates").select("id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("attendance_sessions").select("id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("documents").select("id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("seating_layouts").select("id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("checkins").select("id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("btc_accounts").select("user_id",{count:"exact",head:true}).eq("congress_id",id),
   db.from("seating_layouts").select("id,title,updated_at").eq("congress_id",id)
    .order("updated_at",{ascending:false}).limit(50),
   db.from("attendance_sessions").select("id,name,status,seating_layout_id").eq("congress_id",id)
    .order("created_at",{ascending:false}).limit(100)
  ]);
  if(btc.error?.code==="PGRST205")return fail("Chưa cập nhật Supabase V45: thiếu bảng btc_accounts. Hãy chạy migration V45 trước V46.",503);
  if([congress,delegates,bch,sessions,documents,seating,checkins,btc,layouts,sessionRows]
    .some(item=>item.error))
   return fail("Không đọc được thống kê hoặc dữ liệu sơ đồ. Kiểm tra Supabase/schema.",503);
  if(!congress.data)return fail("Đại hội không tồn tại.",404);
  const counts={delegates:delegates.count||0,bch:bch.count||0,sessions:sessions.count||0,
   documents:documents.count||0,seating:seating.count||0,checkins:checkins.count||0,btc:btc.count||0};
  const layoutNames=new Map((layouts.data||[]).map(l=>[l.id,l.title]));
  // Count assignments per relevant layout server-side; do not truncate after 500 rows.
  const layoutIds=[...new Set((sessionRows.data||[]).map(s=>s.seating_layout_id).filter((v):v is string=>Boolean(v)))];
  const assignmentCounts=await Promise.all(layoutIds.map(async layoutId=>{
   const result=await db.from("seat_assignments").select("seat_id",{count:"exact",head:true})
    .eq("congress_id",id).eq("layout_id",layoutId);
   return {layoutId,...result};
  }));
  if(assignmentCounts.some(result=>result.error))
   return fail("Không đếm được phân ghế; vui lòng kiểm tra kết nối Supabase.",503);
  const assignmentsByLayout=new Map(assignmentCounts.map(result=>[result.layoutId,result.count||0]));
  const sessionMaps=(sessionRows.data||[]).map(s=>({
   id:s.id,name:s.name,status:s.status,layoutId:s.seating_layout_id,
   layoutTitle:s.seating_layout_id?layoutNames.get(s.seating_layout_id)||null:null,
   assigned:assignmentsByLayout.get(s.seating_layout_id||"")||0
  }));
  const warnings:string[]=[];
  if(counts.seating&&sessionMaps.some(s=>!s.layoutId))
   warnings.push("Một số phiên chưa gắn sơ đồ ghế.");
  if(sessionMaps.some(s=>s.layoutId&&!s.layoutTitle))
   warnings.push("Có phiên tham chiếu sơ đồ không tồn tại.");
  if(counts.seating>1&&sessionMaps.some(s=>s.layoutId!==layouts.data?.[0]?.id))
   warnings.push("Sơ đồ sửa gần nhất khác sơ đồ đang áp dụng cho phiên. Hãy kiểm tra và đồng bộ tại mục Sơ đồ ghế.");
  if(counts.seating&&counts.sessions===0)
   warnings.push("Đã có sơ đồ nhưng chưa có phiên để đại biểu truy cập.");
  return NextResponse.json({name:congress.data.name,counts,sessions:sessionMaps,
   layouts:(layouts.data||[]).map(l=>({id:l.id,title:l.title})),warnings},{headers:noCache});
 }catch{return fail("Không thể kiểm tra dữ liệu Đại hội.",503);}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,permission=await onlySuperAdmin(id);
 if("error" in permission)return permission.error;
 const origin=request.headers.get("origin");
 if(origin){
  try{if(new URL(origin).host!==request.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);}
  catch{return fail("Nguồn yêu cầu không hợp lệ.",403);}
 }
 if(Number(request.headers.get("content-length")||0)>4096)return fail("Yêu cầu quá lớn.",413);
 let body:Record<string,unknown>;
 try{
  const parsed:unknown=await request.json();
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return fail("Yêu cầu không hợp lệ.",400);
  body=parsed as Record<string,unknown>;
 }catch{return fail("Không đọc được yêu cầu.",400);}
 const deleting=body.mode==="delete";
 if(!deleting&&body.mode!=="reset")return fail("Thao tác không hợp lệ.",400);
 const sections=body.sections;
 if(!Array.isArray(sections)||sections.length>6||
    sections.some(x=>typeof x!=="string"||!allowed.has(x))||
    sections.length!==new Set(sections).size||(!deleting&&!sections.length))
  return fail("Hãy chọn nhóm dữ liệu cần reset.",400);
 if(body.acknowledged!==true||typeof body.confirmName!=="string"||body.confirmName.length>250)
  return fail("Vui lòng nhập đúng tên Đại hội và xác nhận tác động.",400);
 try{
  const db=createAdminClient();
  const {data:congress,error:readError}=await db.from("congresses").select("name").eq("id",id).maybeSingle();
  if(readError)return fail("Không xác minh được Đại hội.",503);
  if(!congress)return fail("Đại hội không tồn tại.",404);
  if(body.confirmName!==congress.name)return fail("Tên xác nhận không trùng với tên Đại hội.",400);
  // One transaction for every dependent row. DB also validates platform role.
  const {data,error}=await db.rpc("congress_purge_v46",{
   p_congress_id:id,p_actor:permission.user.id,p_expected_name:congress.name,
   p_delete:deleting,p_sections:sections
  });
  if(error){
   if(error.code==="PGRST202"||error.code==="42883")
    return fail("Chưa chạy supabase/upgrade-congress-lifecycle-v46.sql trên Supabase.",503);
   if(error.message?.includes("CONGRESS_CONFIRMATION_MISMATCH"))
    return fail("Tên Đại hội đã thay đổi. Vui lòng tải lại trang.",409);
   console.error("congress lifecycle database",error.code||"unknown");
   return fail("Giao dịch không hoàn thành. Dữ liệu không bị xóa từng phần.",503);
  }
  const {data:queued,error:queueError}=await db.from("congress_identity_cleanup_queue")
   .select("id,user_id,attempts").eq("congress_id",id).in("status",["pending","failed"]).limit(500);
  let cleaned=0,pending=queueError?Number(data?.queuedAuthUsers||0):0;
  for(const item of queued||[]){
   // Only orphaned Auth IDs produced by the database's guarded operation.
   const result=await db.auth.admin.deleteUser(item.user_id);
   const success=!result.error||result.error.status===404;
   const {error:updateError}=await db.from("congress_identity_cleanup_queue")
    .update({status:success?"completed":"failed",attempts:item.attempts+1,
     completed_at:success?new Date().toISOString():null,
     last_error:success?null:"Chưa xóa được Auth. Cần kiểm tra/thử lại."})
    .eq("id",item.id);
   if(success&&!updateError)cleaned++;else pending++;
  }
  await writeSystemLog({level:"warning",source:"api",
   event:deleting?"congress.deleted":"congress.reset",
   message:deleting?"Đại hội đã được xóa bởi quản trị hệ thống.":"Quản trị hệ thống đã reset dữ liệu Đại hội.",
   actorId:permission.user.id,congressId:deleting?undefined:id,
   context:{operation:deleting?"delete":"reset",service:"congress-lifecycle",attempt:pending,reason:sections.join(",")}});
  return NextResponse.json({ok:true,deleted:deleting,previousCounts:data?.previousCounts,
   cleanedAuthUsers:cleaned,pendingAuthUsers:pending},{headers:noCache});
 }catch{return fail("Không xử lý được yêu cầu. Kiểm tra nhật ký hệ thống.",503);}
}
