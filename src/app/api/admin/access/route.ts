import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {baseManagedAbilities,isManagedRole,validGroupAbilities,type ManagedRole} from "@/lib/access-rbac";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});
function validOrigin(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(!origin)return request.headers.get("sec-fetch-site")!=="cross-site";
  return new URL(origin).host===new URL(request.url).host;
 }catch{return false;}
}
async function principal(){
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Cần đăng nhập.",401)} as const;
 const {data,error}=await supabase.from("profiles").select("platform_role")
  .eq("id",user.id).maybeSingle();
 if(error||data?.platform_role!=="super_admin")
  return {error:fail("Chỉ quản trị hệ thống được quản lý RBAC toàn bộ tài khoản.",403)} as const;
 return {user} as const;
}
async function memberRole(db:ReturnType<typeof createAdminClient>,congressId:string,userId:string):Promise<ManagedRole|null>{
 const [{data:m,error},{data:btc,error:btcError},{data:delegate,error:delegateError}]=await Promise.all([
  db.from("congress_members").select("role").eq("congress_id",congressId).eq("user_id",userId).maybeSingle(),
  db.from("btc_accounts").select("user_id").eq("congress_id",congressId)
   .eq("user_id",userId).is("disabled_at",null).maybeSingle(),
  db.from("delegates").select("id").eq("congress_id",congressId).eq("auth_user_id",userId)
   .eq("is_active",true).limit(1)
 ]);
 if(error||btcError||delegateError)throw Error("RBAC_MEMBERSHIP_READ_FAILED");
 if(!isManagedRole(m?.role))return null;
 if(["admin","checkin","secretary"].includes(m.role)&&!btc)return null;
 if(m.role==="delegate"&&!delegate?.length)return null;
 return m.role;
}
async function audit(db:ReturnType<typeof createAdminClient>,congressId:string,actorId:string,
 action:string,targetId:string,details:Record<string,unknown>){
 const {error}=await db.from("audit_logs").insert({congress_id:congressId,actor_id:actorId,
  target_id:targetId,action,details});
 if(error)throw Error("RBAC_AUDIT_FAILED");
 await writeSystemLog({level:"info",source:"auth",event:action,actorId,
  congressId,message:"Quản trị hệ thống cập nhật RBAC.",
  context:{operation:action,targetId}});
}
export async function GET(){
 try{
  const principalResult=await principal();
  if("error" in principalResult)return principalResult.error;
  const db=createAdminClient();
  const [congresses,profiles,members,staff,delegates,groups,assignments,denials,overrides]=await Promise.all([
   db.from("congresses").select("id,name,kind").order("created_at",{ascending:false}).limit(1000),
   db.from("profiles").select("id,full_name,platform_role").limit(5000),
   db.from("congress_members").select("congress_id,user_id,role").limit(10000),
   db.from("btc_accounts").select("congress_id,user_id,is_primary").is("disabled_at",null).limit(5000),
   db.from("delegates").select("congress_id,auth_user_id").eq("is_active",true).not("auth_user_id","is",null).limit(10000),
   db.from("rbac_groups").select("id,congress_id,role,name,abilities,updated_at").order("name").limit(3000),
   db.from("rbac_account_assignments").select("congress_id,user_id,group_id").limit(10000),
   db.from("rbac_portal_denials").select("congress_id,user_id,ability").limit(10000),
   db.from("btc_account_capability_restrictions").select("congress_id,user_id,ability,allowed").limit(10000)
  ]);
  if([congresses,profiles,members,staff,delegates,groups,assignments,denials,overrides]
   .some(r=>r.error))return fail("Không đọc được RBAC. Hãy áp dụng migration upgrade-global-rbac-groups-v60.sql trên Supabase.",503);
  const users: {id:string;email:string;created_at:string;user_metadata:Record<string,unknown>}[]=[];
  let truncated=false;
  for(let page=1;page<=11;page++){
   const {data,error}=await db.auth.admin.listUsers({page,perPage:200});
   if(error)return fail("Không thể đọc danh sách tài khoản Auth.",503);
   if(page===11){truncated=data.users.length>0;break;}
   users.push(...data.users.map(u=>({
    id:u.id,email:u.email||"",created_at:u.created_at||"",user_metadata:u.user_metadata||{}
   })));
   if(data.users.length<200)break;
  }
  const profilesById=new Map((profiles.data||[]).map(p=>[p.id,p]));
  const staffSet=new Set((staff.data||[]).map(a=>a.congress_id+":"+a.user_id));
  const primarySet=new Set((staff.data||[]).filter(a=>a.is_primary).map(a=>a.congress_id+":"+a.user_id));
  const delegateSet=new Set((delegates.data||[]).map(a=>a.congress_id+":"+a.auth_user_id));
  const grouped=new Map<string,{congressId:string;role:ManagedRole;groupId:string|null;isPrimary:boolean;denials:string[];
   permissionOverrides:{ability:string;allowed:boolean}[]}[]>();
  for(const m of members.data||[]){
   const scope=m.congress_id+":"+m.user_id;
   if(!isManagedRole(m.role))continue;
   if(["admin","checkin","secretary"].includes(m.role)&&!staffSet.has(scope))continue;
   if(m.role==="delegate"&&!delegateSet.has(scope))continue;
   const a=(grouped.get(m.user_id)||[]);
   a.push({congressId:m.congress_id,role:m.role,isPrimary:primarySet.has(scope),
    groupId:assignments.data?.find(x=>x.user_id===m.user_id&&x.congress_id===m.congress_id)?.group_id||null,
    denials:(denials.data||[]).filter(d=>d.user_id===m.user_id&&d.congress_id===m.congress_id).map(d=>d.ability),
    permissionOverrides:(overrides.data||[]).filter(d=>d.user_id===m.user_id&&d.congress_id===m.congress_id)
     .map(d=>({ability:d.ability,allowed:d.allowed}))});
   grouped.set(m.user_id,a);
  }
  const accounts=users.map(u=>{
   const profile=profilesById.get(u.id);
   return {userId:u.id,name:profile?.full_name||String(u.user_metadata.full_name||u.email||"Tài khoản"),
    email:u.email,platformRole:profile?.platform_role||"user",createdAt:u.created_at,
    isSelf:u.id===principalResult.user.id,memberships:grouped.get(u.id)||[]};
  });
  return NextResponse.json({accounts,congresses:congresses.data||[],groups:groups.data||[],
   truncated},{headers:HEADERS});
 }catch{return fail("Không thể tải danh sách phân quyền toàn hệ thống.",503);}
}
export async function POST(req:Request){
 try{
  if(!validOrigin(req)||Number(req.headers.get("content-length")||0)>16384)
   return fail("Yêu cầu không hợp lệ.",403);
  const principalResult=await principal();
  if("error" in principalResult)return principalResult.error;
  const input=await req.json().catch(()=>null);
  const action=input?.action,congressId=input?.congressId;
  if(typeof congressId!=="string"||!UUID.test(congressId))return fail("Đại hội không hợp lệ.",400);
  const db=createAdminClient();
  const actor=principalResult.user.id;
  if(action==="createGroup"||action==="updateGroup"){
   const role=input?.role,name=typeof input?.name==="string"?input.name.trim().replace(/\s+/g," "):"";
   if(!isManagedRole(role)||name.length<2||name.length>80||
      !validGroupAbilities(role,input?.abilities))
    return fail("Tên, vai trò hoặc ma trận quyền nhóm không hợp lệ.",400);
   if(action==="updateGroup"){
    if(typeof input.groupId!=="string"||!UUID.test(input.groupId))return fail("Nhóm không hợp lệ.",400);
    const {data:current,error}=await db.from("rbac_groups").select("id,role")
     .eq("congress_id",congressId).eq("id",input.groupId).maybeSingle();
    if(error||!current||current.role!==role)return fail("Không được thay đổi loại vai trò của nhóm.",409);
    const {data,error:updateError}=await db.from("rbac_groups")
     .update({name,abilities:input.abilities,updated_at:new Date().toISOString()})
     .eq("id",input.groupId).eq("congress_id",congressId).select("id").single();
    if(updateError||!data)return fail("Không thể cập nhật nhóm quyền.",503);
    await audit(db,congressId,actor,"rbac.group_updated",data.id,{role,name,abilities:input.abilities});
   }else{
    const {data,error}=await db.from("rbac_groups").insert({
     congress_id:congressId,role,name,abilities:input.abilities,created_by:actor
    }).select("id").single();
    if(error||!data)return fail("Không tạo được nhóm; hãy kiểm tra tên trùng hoặc migration.",409);
    await audit(db,congressId,actor,"rbac.group_created",data.id,{role,name,abilities:input.abilities});
   }
   return NextResponse.json({ok:true},{headers:HEADERS});
  }
  if(action==="deleteGroup"){
   const groupId=input?.groupId;
   if(typeof groupId!=="string"||!UUID.test(groupId))return fail("Nhóm không hợp lệ.",400);
   const {count,error:memberError}=await db.from("rbac_account_assignments").select("user_id",
    {count:"exact",head:true}).eq("group_id",groupId).eq("congress_id",congressId);
   if(memberError)return fail("Không thể xác minh thành viên nhóm.",503);
   if(count)return fail("Cần gỡ toàn bộ thành viên trước khi xóa nhóm.",409);
   const {data,error}=await db.from("rbac_groups").delete()
    .eq("id",groupId).eq("congress_id",congressId).select("id").maybeSingle();
   if(error||!data)return fail("Không tìm thấy hoặc không xóa được nhóm.",404);
   await audit(db,congressId,actor,"rbac.group_deleted",groupId,{});
   return NextResponse.json({ok:true},{headers:HEADERS});
  }
  if(action==="assignGroup"||action==="portalPermission"){
   const userId=input?.userId;
   if(typeof userId!=="string"||!UUID.test(userId))return fail("Tài khoản không hợp lệ.",400);
   if(userId===actor)return fail("Không được tự sửa quyền của tài khoản đang đăng nhập.",409);
   const {data:target}=await db.from("profiles").select("platform_role").eq("id",userId).maybeSingle();
   if(target?.platform_role==="super_admin")return fail("Không thể giới hạn quyền super admin bằng nhóm Đại hội.",403);
   const role=await memberRole(db,congressId,userId);
   if(!role)return fail("Tài khoản không có tư cách tham dự hợp lệ tại Đại hội này.",404);
   if(role==="admin"){
    const {data:btcAdmin,error:btcAdminError}=await db.from("btc_accounts")
     .select("is_primary").eq("congress_id",congressId).eq("user_id",userId)
     .is("disabled_at",null).maybeSingle();
    if(btcAdminError)return fail("Không xác minh được tài khoản quản trị chính.",503);
    if(btcAdmin?.is_primary)return fail("Không được giới hạn quyền tài khoản quản trị chính.",409);
   }
   if(action==="assignGroup"){
    const groupId=input?.groupId;
    if(groupId!==null&&(typeof groupId!=="string"||!UUID.test(groupId)))
     return fail("Nhóm quyền không hợp lệ.",400);
    if(groupId){
     const {data:group,error}=await db.from("rbac_groups").select("id,role")
      .eq("congress_id",congressId).eq("id",groupId).maybeSingle();
     if(error||!group||group.role!==role)return fail("Nhóm không thuộc vai trò hoặc Đại hội của tài khoản.",409);
     const {error:assignmentError}=await db.from("rbac_account_assignments").upsert({
      congress_id:congressId,user_id:userId,group_id:groupId,updated_by:actor,
      updated_at:new Date().toISOString()
     },{onConflict:"congress_id,user_id"});
     if(assignmentError)return fail("Không thể gán nhóm quyền. Kiểm tra tình trạng tài khoản.",409);
    }else{
     const {error}=await db.from("rbac_account_assignments").delete()
      .eq("congress_id",congressId).eq("user_id",userId);
     if(error)return fail("Không thể gỡ nhóm quyền.",503);
    }
    await audit(db,congressId,actor,"rbac.group_assigned",userId,{groupId,role});
    return NextResponse.json({ok:true},{headers:HEADERS});
   }
   if(role!=="delegate"&&role!=="guest")return fail("Quyền cổng đại biểu chỉ dành cho đại biểu/khách mời.",409);
   const ability=input?.ability,denied=input?.denied;
   if(typeof ability!=="string"||!baseManagedAbilities(role).includes(ability)||typeof denied!=="boolean")
    return fail("Quyền và trạng thái không hợp lệ.",400);
   if(denied){
    const {error}=await db.from("rbac_portal_denials").upsert({
     congress_id:congressId,user_id:userId,ability,updated_by:actor,
     updated_at:new Date().toISOString()
    },{onConflict:"congress_id,user_id,ability"});
    if(error)return fail("Không thể giới hạn quyền đại biểu.",503);
   }else{
    const {error}=await db.from("rbac_portal_denials").delete()
     .eq("congress_id",congressId).eq("user_id",userId).eq("ability",ability);
    if(error)return fail("Không thể khôi phục quyền đại biểu.",503);
   }
   await audit(db,congressId,actor,"rbac.portal_permission_changed",userId,{role,ability,denied});
   return NextResponse.json({ok:true},{headers:HEADERS});
  }
  return fail("Thao tác RBAC không được hỗ trợ.",400);
 }catch{return fail("Cập nhật RBAC thất bại; kiểm tra nhật ký và schema Supabase.",503);}
}