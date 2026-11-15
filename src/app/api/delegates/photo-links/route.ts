import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {canReuseDelegatePortrait,normalizePortraitStudentId,type PortraitLinkPerson} from "@/lib/delegate-photo-reuse";
import {readPortrait,removeUnreferencedPortrait} from "@/lib/portrait-storage";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"private, no-store","Vary":"Cookie"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
const personFields="id,congress_id,student_id,full_name,birth_date,auth_user_id,photo_path,is_active";

async function getTarget(congressId:string,delegateId:string){
 if(!UUID.test(congressId)||!UUID.test(delegateId))
  return {error:fail("Mã Đại hội hoặc đại biểu không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
  return {error:fail("Chỉ BTC có quyền quản lý đại biểu được liên kết ảnh.",403)} as const;
 const db=createAdminClient();
 const {data:target,error}=await db.from("delegates").select(personFields)
  .eq("id",delegateId).eq("congress_id",congressId).maybeSingle();
 if(error)return {error:fail("Không thể đọc hồ sơ đại biểu.",503)} as const;
 if(!target||!target.is_active)return {error:fail("Không tìm thấy hồ sơ đại biểu.",404)} as const;
 if(!normalizePortraitStudentId(target.student_id))
  return {error:fail("Đại biểu chưa có MSSV để đối chiếu liên kết ảnh.",422)} as const;
 return {db,supabase,target:target as PortraitLinkPerson,user} as const;
}

function sameAccount(target:PortraitLinkPerson,source:PortraitLinkPerson){
 return Boolean(target.auth_user_id&&source.auth_user_id&&
  target.auth_user_id===source.auth_user_id);
}

async function sourceVisible(
 checked:{supabase:Awaited<ReturnType<typeof getAuth>>["supabase"];user:{id:string};target:PortraitLinkPerson},
 source:PortraitLinkPerson
){
 // A matching Auth account is proof of ownership. Otherwise, BTC must also
 // have read access to the SOURCE congress before reusing its private photo.
 return sameAccount(checked.target,source)||
  hasCongressAbility(checked.supabase,checked.user.id,source.congress_id,"delegates.read");
}

async function compatibleSources(db:ReturnType<typeof createAdminClient>,
 checked:{supabase:Awaited<ReturnType<typeof getAuth>>["supabase"];user:{id:string};target:PortraitLinkPerson}){
 const target=checked.target;
 const student=normalizePortraitStudentId(target.student_id);
 // Exact match, never ILIKE: an underscore in a student ID is not a wildcard.
 const {data,error}=await db.from("delegates").select(personFields)
  .eq("student_id",student).eq("is_active",true).not("photo_path","is",null)
  .neq("congress_id",target.congress_id).limit(201);
 if(error)throw new Error("Không thể tìm ảnh tại Đại hội khác.");
 if((data?.length||0)>200)throw new Error("Có quá nhiều hồ sơ trùng MSSV; cần kiểm tra trước khi liên kết.");
 const candidates=(data||[]).filter(source=>
  canReuseDelegatePortrait(target,source as PortraitLinkPerson));
 const permissions=new Map<string,boolean>();
 for(const source of candidates){
  if(sameAccount(target,source))continue;
  if(!permissions.has(source.congress_id))
   permissions.set(source.congress_id,
    await hasCongressAbility(checked.supabase,checked.user.id,source.congress_id,"delegates.read"));
 }
 return candidates.filter(source=>sameAccount(target,source)||
  permissions.get(source.congress_id)===true);
}

export async function GET(request:Request){
 try{
  const {searchParams}=new URL(request.url);
  const checked=await getTarget(searchParams.get("congressId")||"",searchParams.get("delegateId")||"");
  if("error" in checked)return checked.error;
  const sources=await compatibleSources(checked.db,checked);
  const congressIds=[...new Set(sources.map(s=>s.congress_id))];
  const congresses=congressIds.length?
   await checked.db.from("congresses").select("id,name,kind").in("id",congressIds):null;
  if(congresses?.error)return fail("Không thể đọc tên Đại hội nguồn.",503);
  const labels=new Map((congresses?.data||[]).map(c=>[c.id,c.name]));
  return NextResponse.json({ok:true,options:sources.map(source=>({
   id:source.id,congressName:labels.get(source.congress_id)||"Đại hội khác"
  }))},{headers});
 }catch{return fail("Không tra cứu được ảnh đại biểu ở Đại hội khác.",503);}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin){
   try{if(new URL(origin).host!==request.headers.get("host"))
    return fail("Nguồn yêu cầu không hợp lệ.",403);}
   catch{return fail("Nguồn yêu cầu không hợp lệ.",403);}
  }
  if(Number(request.headers.get("content-length")||0)>4096)
   return fail("Yêu cầu vượt dung lượng cho phép.",413);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).some(k=>!["congressId","delegateId","sourceId"].includes(k)))
   return fail("Dữ liệu liên kết không hợp lệ.",400);
  const congressId=body.congressId,delegateId=body.delegateId,sourceId=body.sourceId;
  if(typeof congressId!=="string"||typeof delegateId!=="string"||
     typeof sourceId!=="string"||!UUID.test(sourceId))
   return fail("Mã hồ sơ liên kết không hợp lệ.",400);
  const checked=await getTarget(congressId,delegateId);
  if("error" in checked)return checked.error;
  const {data:source,error:sourceError}=await checked.db.from("delegates").select(personFields)
   .eq("id",sourceId).maybeSingle();
  if(sourceError)return fail("Không thể kiểm tra hồ sơ ảnh nguồn.",503);
  if(!source||!canReuseDelegatePortrait(checked.target,source as PortraitLinkPerson))
   return fail("Không thể liên kết: MSSV, họ tên, ngày sinh hoặc tài khoản không khớp, hoặc ảnh nguồn không hợp lệ.",409);
  if(!(await sourceVisible(checked,source as PortraitLinkPerson)))
   return fail("BTC không có quyền xem ảnh của Đại hội nguồn. Cần quyền đọc đại biểu ở Đại hội nguồn hoặc xác minh tài khoản chung.",403);
  // A DB key without an actual Storage image must never create a broken link.
  const sourcePath=source.photo_path as string;
  const image=await readPortrait(sourcePath,96);
  if(!image)return fail("Ảnh tại Đại hội nguồn không còn tồn tại. Vui lòng chọn ảnh khác.",409);
  // Compare-and-set avoids overwriting a portrait updated in another browser.
  const oldPath=checked.target.photo_path;
  if(oldPath===sourcePath)
   return NextResponse.json({ok:true,photo_path:sourcePath,unchanged:true},{headers});
  const update=checked.db.from("delegates").update({photo_path:sourcePath})
   .eq("id",delegateId).eq("congress_id",congressId).eq("is_active",true);
  const {data:linked,error:linkError}=await (oldPath?
   update.eq("photo_path",oldPath):update.is("photo_path",null))
   .select("id,photo_path").maybeSingle();
  if(linkError)return fail("Không cập nhật được liên kết ảnh đại biểu.",503);
  if(!linked)return fail("Hồ sơ đã được thay đổi. Tải lại danh sách trước khi liên kết.",409);
  // Free an old target-only master only after all references have moved.
  if(oldPath&&oldPath!==sourcePath){
   try{await removeUnreferencedPortrait(oldPath,sourcePath);}
   catch{console.warn("Portrait cleanup after relink unavailable");}
  }
  await writeSystemLog({level:"info",source:"api",event:"delegate.photo_reused",
   message:"BTC đã liên kết ảnh đại biểu sẵn có ở Đại hội khác, không sao chép Storage.",
   congressId,actorId:checked.user.id,
   context:{operation:"delegate.photo-link",endpoint:"/api/delegates/photo-links",
    httpMethod:"POST",targetId:delegateId,sourceId}});
  return NextResponse.json({ok:true,photo_path:sourcePath},{headers});
 }catch{return fail("Không thể liên kết ảnh từ Đại hội khác.",503);}
}
