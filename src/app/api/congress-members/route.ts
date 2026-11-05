import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type MemberRole="admin"|"checkin"|"secretary";
function validRole(value:unknown):value is MemberRole{
 return value==="admin"||value==="checkin"||value==="secretary";
}
function failure(error:string,status:number){
 return NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
}
async function authorize(congressId:string){
 const {supabase,user}=await getAuth();
 if(!user)return {error:failure("Vui lòng đăng nhập.",401)} as const;
 if(!uuid.test(congressId)||!(await hasRole(supabase,user.id,congressId,"admin")))
  return {error:failure("Không có quyền quản lý nhân sự tại Đại hội này.",403)} as const;
 return {supabase,user} as const;
}
async function audit(congressId:string,actorId:string,action:string,targetId:string,details:Record<string,string>){
 const {error}=await createAdminClient().from("audit_logs").insert({
  congress_id:congressId,actor_id:actorId,action,target_id:targetId,details
 });
 if(error)console.error("member audit failed",error.code);
}

export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  const {data,error}=await createAdminClient().from("congress_members")
   .select("user_id,role").eq("congress_id",congressId).order("role");
  if(error)return failure("Không đọc được danh sách BTC.",500);
  const db=createAdminClient();
  const members=await Promise.all((data||[]).map(async member=>{
   const {data:record,error:userError}=await db.auth.admin.getUserById(member.user_id);
   if(userError)console.error("member lookup failed",userError.status);
   return {
    userId:member.user_id,role:member.role,
    email:record.user?.email||"",
    name:String(record.user?.user_metadata?.full_name||"").slice(0,120),
    invited:!record.user?.email_confirmed_at
   };
  }));
  return NextResponse.json({members},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return failure("Chưa cấu hình Supabase Secret Key hoặc không tải được nhân sự.",500);
 }
}
async function findUserByEmail(email:string){
 const db=createAdminClient();
 for(let page=1;page<=10;page++){
  const {data,error}=await db.auth.admin.listUsers({page,perPage:200});
  if(error)throw new Error("Không thể kiểm tra người dùng hiện có.");
  const user=data.users.find(u=>u.email?.toLowerCase()===email);
  if(user)return user;
  if(data.users.length<200)return null;
 }
 throw new Error("Danh sách tài khoản quá lớn; cần thêm nhân sự qua quản trị Supabase.");
}
export async function POST(request:Request){
 try{
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const email=String(body.email||"").trim().toLowerCase();
  const role=body.role;
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  if(email.length>254||!emailPattern.test(email)||!validRole(role))
   return failure("Email hoặc vai trò không hợp lệ.",400);
  const db=createAdminClient();
  let target=await findUserByEmail(email);
  let invited=false;
  if(!target){
   const {data,error}=await db.auth.admin.inviteUserByEmail(email);
   if(error)return failure("Không gửi được thư mời. Kiểm tra cấu hình email Supabase.",502);
   target=data.user;
   invited=true;
  }
  if(!target)return failure("Không tìm thấy tài khoản.",404);
  const {error}=await createAdminClient().from("congress_members")
   .insert({congress_id:congressId,user_id:target.id,role});
  if(error)return failure(error.code==="23505"?"Tài khoản đã thuộc BTC Đại hội này.":"Không phân quyền được nhân sự.",error.code==="23505"?409:500);
  await audit(congressId,session.user.id,"member.added",target.id,{role,email});
  return NextResponse.json({ok:true,invited},{status:201});
 }catch(error){
  return failure(error instanceof Error?error.message:"Yêu cầu không hợp lệ.",500);
 }
}
export async function PATCH(request:Request){
 try{
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const userId=String(body.userId||"");
  const role=body.role;
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  if(!uuid.test(userId)||!validRole(role))return failure("Nhân sự hoặc vai trò không hợp lệ.",400);
  if(userId===session.user.id)return failure("Không tự sửa quyền của chính mình. Hãy nhờ quản trị viên khác.",409);
  const {data,error}=await createAdminClient().from("congress_members")
   .update({role}).eq("congress_id",congressId).eq("user_id",userId)
   .select("user_id").maybeSingle();
  if(error||!data)return failure("Không thay đổi được vai trò nhân sự.",404);
  await audit(congressId,session.user.id,"member.role_changed",userId,{role});
  return NextResponse.json({ok:true});
 }catch{return failure("Yêu cầu không hợp lệ.",400);}
}
export async function DELETE(request:Request){
 try{
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const userId=String(body.userId||"");
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  if(!uuid.test(userId))return failure("Nhân sự không hợp lệ.",400);
  if(userId===session.user.id)return failure("Không tự xóa quyền của chính mình.",409);
  const {data,error}=await createAdminClient().from("congress_members")
   .delete().eq("congress_id",congressId).eq("user_id",userId)
   .select("user_id").maybeSingle();
  if(error||!data)return failure("Không gỡ được nhân sự khỏi Đại hội.",404);
  await audit(congressId,session.user.id,"member.removed",userId,{});
  return NextResponse.json({ok:true});
 }catch{return failure("Yêu cầu không hợp lệ.",400);}
}
