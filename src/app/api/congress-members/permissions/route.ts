import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 canCongress,canCustomizeCongressAbility,isAccountPermissionAbility,
 type AccountPermissionAbility,type CongressRole
} from "@/lib/congress-permissions";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});
const sameOrigin=(req:Request)=>{
 try{const origin=req.headers.get("origin");return !origin||new URL(origin).host===req.headers.get("host");}
 catch{return false;}
};
type Change={ability:AccountPermissionAbility;allowed:boolean};
const staffRole=(value:unknown):value is Exclude<CongressRole,"super_admin"|null>=>
 value==="admin"||value==="checkin"||value==="secretary";

async function authenticate(congressId:string){
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 if(!UUID.test(congressId)||
    !(await hasCongressAbility(supabase,user.id,congressId,"team.manage")))
  return {error:fail("Chỉ quản trị BTC mới được quản lý phân quyền tài khoản.",403)} as const;
 return {user} as const;
}
async function target(congressId:string,userId:string,actorId:string){
 if(!UUID.test(userId))return {error:fail("Mã tài khoản BTC không hợp lệ.",400)} as const;
 if(actorId===userId)return {error:fail("Không được thay đổi quyền của chính mình.",409)} as const;
 const db=createAdminClient();
 const [{data:btc,error:btcError},{data:member,error:memberError}]=await Promise.all([
  db.from("btc_accounts").select("user_id").eq("congress_id",congressId)
   .eq("user_id",userId).is("disabled_at",null).maybeSingle(),
  db.from("congress_members").select("role").eq("congress_id",congressId)
   .eq("user_id",userId).maybeSingle()
 ]);
 if(btcError||memberError)return {error:fail("Không xác minh được tài khoản BTC.",503)} as const;
 if(!btc||!member||!staffRole(member.role))
  return {error:fail("Tài khoản BTC này không hoạt động tại Đại hội.",404)} as const;
 return {db,role:member.role} as const;
}
function parseChanges(input:unknown):Change[]|null{
 if(!Array.isArray(input)||input.length<1||input.length>16)return null;
 const changes:Change[]=[];
 const unique=new Set<string>();
 for(const item of input){
  if(!item||typeof item!=="object"||
     !isAccountPermissionAbility(item.ability)||typeof item.allowed!=="boolean"||
     unique.has(item.ability))return null;
  unique.add(item.ability);
  changes.push({ability:item.ability,allowed:item.allowed});
 }
 return changes;
}
function effectiveBallot(
 role:Exclude<CongressRole,"super_admin"|null>,
 current:Map<string,boolean>,changes:Change[],ability:"ballots.read"|"ballots.write"
){
 const change=changes.find(item=>item.ability===ability);
 if(change)return change.allowed;
 return current.get(ability)??canCongress(role,ability);
}

/** Read a permission-change audit timeline for exactly one eligible BTC account. */
export async function GET(request:Request){
 try{
  const url=new URL(request.url),congressId=url.searchParams.get("congressId")||"";
  const userId=url.searchParams.get("userId")||"";
  const principal=await authenticate(congressId);
  if("error" in principal)return principal.error;
  const member=await target(congressId,userId,principal.user.id);
  if("error" in member)return member.error;
  const {data,error}=await member.db.from("audit_logs")
   .select("id,actor_id,action,created_at,details")
   .eq("congress_id",congressId).eq("target_id",userId)
   .in("action",["btc.permissions_changed","btc.role_changed"])
   .order("created_at",{ascending:false}).limit(24);
  if(error)return fail("Không tải được nhật ký phân quyền.",503);
  return NextResponse.json({history:data||[]},{headers:HEADERS});
 }catch{return fail("Không đọc được nhật ký phân quyền.",503);}
}

async function updatePermissions(request:Request,mode:"PATCH"|"PUT"){
 try{
  if(!sameOrigin(request))return fail("Nguồn cập nhật không hợp lệ.",403);
  if(Number(request.headers.get("content-length")||0)>16384)
   return fail("Dữ liệu phân quyền vượt giới hạn.",413);
  const body=await request.json().catch(()=>null);
  const congressId=body?.congressId,userId=body?.userId;
  if(typeof congressId!=="string"||!UUID.test(congressId)||
     typeof userId!=="string"||!UUID.test(userId))
   return fail("Dữ liệu tài khoản hoặc Đại hội không hợp lệ.",400);
  const changes=parseChanges(mode==="PATCH"?[{
   ability:body?.ability,allowed:body?.allowed
  }]:body?.changes);
  if(!changes)return fail("Danh sách quyền không hợp lệ, trùng hoặc vượt giới hạn.",400);
  const principal=await authenticate(congressId);
  if("error" in principal)return principal.error;
  const member=await target(congressId,userId,principal.user.id);
  if("error" in member)return member.error;
  const role=member.role;
  for(const {ability,allowed} of changes){
   if(!canCustomizeCongressAbility(role,ability))
    return fail("Chức năng "+ability+" không thuộc phạm vi vai trò. Đổi vai trò nền trước.",409);
   if(allowed&&!canCongress(role,ability)&&ability!=="ballots.read"&&ability!=="ballots.write")
    return fail("Không thể cấp quyền vượt vai trò.",403);
  }
  const {data:overrides,error:readError}=await member.db
   .from("btc_account_capability_restrictions")
   .select("ability,allowed").eq("congress_id",congressId).eq("user_id",userId).limit(30);
  if(readError)return fail("Không đọc được quyền tài khoản hiện có.",503);
  const existing=new Map((overrides||[]).map(row=>[row.ability,row.allowed]));
  if(effectiveBallot(role,existing,changes,"ballots.write")&&
     !effectiveBallot(role,existing,changes,"ballots.read"))
   return fail("Cần cấp quyền xem kiểm phiếu trước khi cấp quyền nhập kiểm phiếu.",409);
  // One service-only invoker RPC validates target membership, locks the row,
  // applies the entire change set and writes an audit event in one transaction.
  const {data,error}=await member.db.rpc("set_btc_account_permissions_v58",{
   p_congress_id:congressId,p_user_id:userId,p_actor_id:principal.user.id,
   p_changes:changes
  });
  if(error){
   if(error.code==="42501")return fail("Vượt thẩm quyền tài khoản hoặc quyền không hợp lệ.",403);
   if(error.code==="22023")return fail("Danh sách thay đổi quyền không hợp lệ.",400);
   console.error("BTC permission RPC failed",error.code);
   return fail("Không lưu được phân quyền tài khoản. Kiểm tra migration V58. Mã "+String(error.code||"UNKNOWN")+".",503);
  }
  await writeSystemLog({level:"info",source:"auth",event:"btc.permissions_changed",
   message:"Quản trị đã cập nhật quyền riêng của tài khoản BTC.",actorId:principal.user.id,
   congressId,context:{operation:"btc.permissions.update",targetId:userId,
    changedCount:data?.updated??0,httpMethod:mode}});
  return NextResponse.json({ok:true,updated:data?.updated??0,changes:data?.changes||[]},
   {headers:HEADERS});
 }catch{return fail("Không cập nhật được phân quyền tài khoản.",503);}
}
export async function PATCH(request:Request){return updatePermissions(request,"PATCH");}
export async function PUT(request:Request){return updatePermissions(request,"PUT");}
