import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getAuth,hasRole} from "@/lib/auth";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Nguồn yêu cầu không hợp lệ.",403);
  const body=await request.json().catch(()=>null);
  const congressId=body?.congressId,userId=body?.userId;
  if(typeof congressId!=="string"||!UUID.test(congressId)||
   typeof userId!=="string"||!UUID.test(userId))return fail("Dữ liệu không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await hasRole(supabase,user.id,congressId,"admin")))
   return fail("Chỉ quản trị Đại hội được đặt lại mật khẩu BTC.",403);
  const db=createAdminClient();
  const {data:account,error}=await db.from("btc_accounts").select("user_id")
   .eq("congress_id",congressId).eq("user_id",userId)
   .is("disabled_at",null).maybeSingle();
  if(error||!account)return fail("Không tìm thấy tài khoản BTC thuộc Đại hội.",404);
  const initialPassword=randomBytes(21).toString("base64url")+"!A7";
  const {error:resetError}=await db.auth.admin.updateUserById(userId,{password:initialPassword});
  if(resetError)return fail("Không cập nhật được mật khẩu. Hãy thử lại.",503);
  await db.from("audit_logs").insert({
   congress_id:congressId,actor_id:user.id,action:"btc.password_reset",
   target_id:userId,details:{}
  });
  await writeSystemLog({level:"warning",source:"auth",event:"btc.password_reset",
   message:"Quản trị đã đặt lại mật khẩu tài khoản BTC.",congressId,actorId:user.id,
   context:{operation:"btc.password_reset"}});
  return NextResponse.json({ok:true,initialPassword},{headers:HEADERS});
 }catch{return fail("Không thể đặt lại mật khẩu BTC.",503);}
}
