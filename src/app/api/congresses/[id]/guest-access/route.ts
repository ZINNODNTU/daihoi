import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {hashGuestCode} from "@/lib/guest-congress-access";
import {writeSystemLog} from "@/lib/system-log";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
async function authorize(id:string){
 if(!UUID.test(id))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 if(!(await hasCongressAbility(supabase,user.id,id,"team.manage")))
  return {error:fail("Không có quyền quản lý mã khách của Đại hội.",403)} as const;
 return {user,db:createAdminClient()} as const;
}
function validOrigin(req:Request){
 try{const origin=req.headers.get("origin");return !origin||new URL(origin).host===req.headers.get("host");}
 catch{return false;}
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,session=await authorize(id);
 if("error" in session)return session.error;
 const [link,congress]=await Promise.all([
  session.db.from("congress_guest_links").select("enabled,rotated_at").eq("congress_id",id).maybeSingle(),
  session.db.from("congresses").select("slug").eq("id",id).maybeSingle()
 ]);
 if(link.error||congress.error)return fail("Chưa cập nhật migration V66 hoặc chưa đọc được Đại hội.",503);
 if(!congress.data)return fail("Đại hội không tồn tại.",404);
 return NextResponse.json({slug:congress.data.slug,configured:Boolean(link.data),enabled:Boolean(link.data?.enabled),
  rotatedAt:link.data?.rotated_at||null},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!validOrigin(req))return fail("Nguồn yêu cầu không hợp lệ.",403);
 const {id}=await params,session=await authorize(id);
 if("error" in session)return session.error;
 const {data:congress,error:congressError}=await session.db.from("congresses")
  .select("slug").eq("id",id).maybeSingle();
 if(congressError||!congress)return fail("Đại hội không tồn tại.",404);
 const accessCode="gv_"+randomBytes(24).toString("base64url");
 const {error}=await session.db.from("congress_guest_links").upsert({
  congress_id:id,access_hash:hashGuestCode(accessCode),enabled:true,
  rotated_at:new Date().toISOString(),updated_by:session.user.id
 },{onConflict:"congress_id"});
 if(error)return fail("Không thể tạo mã khách. Kiểm tra migration V66.",503);
 await writeSystemLog({level:"info",source:"auth",event:"guest_link.rotated",
  message:"Đã cấp lại mã truy cập khách xem Đại hội.",congressId:id,
  actorId:session.user.id,context:{operation:"guest_link.rotate"}});
 return NextResponse.json({ok:true,slug:congress.slug,accessCode},{
  headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!validOrigin(req))return fail("Nguồn yêu cầu không hợp lệ.",403);
 const body=await req.json().catch(()=>null);
 if(typeof body?.enabled!=="boolean")return fail("Trạng thái không hợp lệ.",400);
 const {id}=await params,session=await authorize(id);
 if("error" in session)return session.error;
 const {data,error}=await session.db.from("congress_guest_links").update({
  enabled:body.enabled,updated_by:session.user.id
 }).eq("congress_id",id).select("congress_id").maybeSingle();
 if(error||!data)return fail("Chưa tạo mã khách hoặc không lưu được thay đổi.",409);
 await writeSystemLog({level:"info",source:"auth",event:"guest_link.status_changed",
  message:body.enabled?"Đã bật chế độ khách Đại hội.":"Đã khóa chế độ khách Đại hội.",
  congressId:id,actorId:session.user.id,
  context:{operation:"guest_link.status",allowed:body.enabled}});
 return NextResponse.json({ok:true,enabled:body.enabled},{headers:{"Cache-Control":"private, no-store"}});
}
