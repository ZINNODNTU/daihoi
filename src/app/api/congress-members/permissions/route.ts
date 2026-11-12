import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {canCongress,isAccountPermissionAbility} from "@/lib/congress-permissions";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{status,
 headers:{"Cache-Control":"private, no-store"}});
export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Nguồn yêu cầu không hợp lệ.",403);
  const body=await request.json().catch(()=>null);
  const congressId=body?.congressId,userId=body?.userId,ability=body?.ability;
  const allowed=body?.allowed;
  if(typeof congressId!=="string"||!UUID.test(congressId)||
     typeof userId!=="string"||!UUID.test(userId)||
     !isAccountPermissionAbility(ability)||typeof allowed!=="boolean")
   return fail("Dữ liệu cấp quyền không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"team.manage")))
   return fail("Chỉ quản trị BTC của Đại hội được phân quyền tài khoản.",403);
  if(user.id===userId)return fail("Không tự thay đổi quyền của mình.",409);
  const db=createAdminClient();
  const [{data:btc,error:btcError},{data:member,error:memberError}]=await Promise.all([
   db.from("btc_accounts").select("user_id")
    .eq("congress_id",congressId).eq("user_id",userId).is("disabled_at",null).maybeSingle(),
   db.from("congress_members").select("role")
    .eq("congress_id",congressId).eq("user_id",userId).maybeSingle()
  ]);
  if(btcError||memberError)return fail("Không xác minh được tài khoản BTC.",503);
  if(!btc||!member)return fail("Tài khoản BTC không hoạt động trong Đại hội này.",404);
  const role=member.role;
  if(role!=="admin"&&role!=="checkin"&&role!=="secretary")
   return fail("Vai trò BTC không hợp lệ.",400);
  if(!canCongress(role,ability))
   return fail("Quyền này không thuộc phạm vi vai trò hiện tại. Hãy đổi vai trò trước.",409);
  // "allowed: true" clears a denial (role default); false stores a denial.
  // Service key writes are scoped to the verified BTC account and congress.
  if(allowed){
   const {error}=await db.from("btc_account_capability_restrictions").delete()
    .eq("congress_id",congressId).eq("user_id",userId).eq("ability",ability);
   if(error)return fail("Không bỏ được hạn chế của tài khoản.",503);
  }else{
   const {error}=await db.from("btc_account_capability_restrictions").upsert({
    congress_id:congressId,user_id:userId,ability,allowed:false,updated_by:user.id,
    updated_at:new Date().toISOString()
   },{onConflict:"congress_id,user_id,ability"});
   if(error)return fail("Không cập nhật được quyền tài khoản.",503);
  }
  await writeSystemLog({level:"info",source:"auth",event:"btc.account_permission_updated",
   message:"Đã cập nhật quyền truy cập cho tài khoản BTC.",actorId:user.id,congressId,
   context:{operation:"btc.permission.update",ability,allowed,targetId:userId}});
  return NextResponse.json({ok:true,ability,allowed},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return fail("Không cập nhật được quyền tài khoản.",503);}
}
