import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {hasPortalAbility} from "@/lib/rbac-server";
import {createAdminClient} from "@/lib/supabase/admin";
import {normalizeGender,normalizeBirthDate} from "@/lib/delegate-demographics";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number,code?:string)=>NextResponse.json(
 {error,...(code?{code}:{})},{status,headers:{"Cache-Control":"private, no-store"}}
);

/**
 * A delegate owns their profile in a single congress.
 * This endpoint cannot change account IDs, congress IDs, QR, barcode, roles or seats.
 * The server derives the user ID from Supabase Auth rather than the request body.
 */
export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin){
   let originHost:string;
   try{originHost=new URL(origin).host;}
   catch{return fail("Nguồn cập nhật không hợp lệ.",403,"origin_invalid");}
   if(originHost!==request.headers.get("host"))
    return fail("Nguồn cập nhật không hợp lệ.",403,"origin_invalid");
  }
  const {user}=await getAuth();
  if(!user)return fail("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",401,"login_required");

  if(Number(request.headers.get("content-length")||0)>16000)
   return fail("Thông tin cập nhật vượt quá dung lượng cho phép.",413,"payload_too_large");
  let body:Record<string,unknown>;
  try{
   const parsed:unknown=await request.json();
   if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))
    return fail("Dữ liệu cập nhật không hợp lệ.",400,"invalid_json");
   body=parsed as Record<string,unknown>;
  }catch{
   return fail("Dữ liệu gửi lên không hợp lệ. Vui lòng tải lại trang.",400,"invalid_json");
  }

  const delegateId=typeof body.delegateId==="string"?body.delegateId.trim():"";
  // Supabase UUIDs have five groups: 8-4-4-4-12, not 8-4-4-12.
  if(!uuid.test(delegateId))
   return fail("Mã hồ sơ không hợp lệ. Hãy tải lại trang Tài khoản.",400,"invalid_delegate_id");

  if(typeof body.full_name!=="string"||typeof body.unit!=="string"||
   typeof body.position!=="string"||
   body.full_name.trim().length<2||body.full_name.trim().length>160||
   body.unit.trim().length>200||body.position.trim().length>160)
   return fail("Họ tên cần 2–160 ký tự; đơn vị tối đa 200 và chức vụ tối đa 160 ký tự.",400,"invalid_fields");

  const name=body.full_name.trim(),unit=body.unit.trim(),position=body.position.trim();
  if(/[\x00-\x1f\x7f]/.test(name+unit+position))
   return fail("Thông tin chứa ký tự không hợp lệ.",400,"invalid_fields");

  const changes:{full_name:string;unit:string;position:string;gender?:string|null;birth_date?:string|null}={
   full_name:name,unit,position
  };
  try{
   if("gender" in body)changes.gender=normalizeGender(body.gender);
   if("birth_date" in body)changes.birth_date=normalizeBirthDate(body.birth_date);
  }catch(error){
   return fail(error instanceof Error?error.message:"Giới tính hoặc ngày sinh không hợp lệ.",
    400,"invalid_demographics");
  }

  const db=createAdminClient();
  const {data:owned,error:ownershipError}=await db.from("delegates")
   .select("id,congress_id").eq("id",delegateId).eq("auth_user_id",user.id)
   .eq("is_active",true).maybeSingle();
  if(ownershipError){
   console.error("Delegate profile ownership query failed:",ownershipError.code||"unknown");
   return fail("Không xác minh được hồ sơ. Vui lòng thử lại.",503,"ownership_unavailable");
  }
  if(!owned)return fail("Không có quyền cập nhật hồ sơ này.",403,"not_owner");
   if(!(await hasPortalAbility(user.id,owned.congress_id,"portal.card")))
    return fail("Tài khoản không được phép chỉnh sửa hồ sơ của Đại hội này.",403,"rbac_denied");

  // Shared name sync is restricted to congresses where this account still
   // has a portal-card permission. Editing A must never change a denied B.
   const {data:ownedScopes,error:scopeError}=await db.from("delegates")
    .select("congress_id").eq("auth_user_id",user.id).eq("is_active",true).limit(100);
   if(scopeError)return fail("Không xác minh được phạm vi hồ sơ.",503,"scope_unavailable");
   const ids=[...new Set((ownedScopes||[]).map(row=>row.congress_id))];
   const allowedScopes=await Promise.all(ids.map(id=>hasPortalAbility(user.id,id,"portal.card")));
   const editableCongressIds=ids.filter((_,i)=>allowedScopes[i]);
   if(!editableCongressIds.includes(owned.congress_id))
    return fail("Tài khoản không được phép sửa hồ sơ này.",403,"rbac_denied");
   const {data,error}=await db.from("delegates").update(changes)
   .eq("auth_user_id",user.id).eq("is_active",true)
   .in("congress_id",editableCongressIds)
    .select("id,congress_id,full_name,unit,position,gender,birth_date");
  if(error){
   console.error("Delegate profile update failed:",error.code||"unknown");
   const missingColumn=error.code==="42703"||error.code==="PGRST204";
   return fail(missingColumn?
    "Hệ thống chưa đồng bộ cột hồ sơ đại biểu. Vui lòng báo Ban Tổ chức kiểm tra migration V15.":
    "Không lưu được hồ sơ do kết nối hoặc cấu hình cơ sở dữ liệu. Vui lòng thử lại.",
    503,missingColumn?"schema_outdated":"database_unavailable");
  }
  const updated=data?.find(item=>item.id===owned.id);
  if(!updated)return fail("Hồ sơ không còn được phép chỉnh sửa. Hãy tải lại trang.",409,"profile_changed");
  // Keep the single login identity consistent with every congress-owned delegate record.
  const {error:profileError}=await db.from("profiles").upsert(
   {id:user.id,full_name:name},{onConflict:"id"});
  if(profileError){
   console.error("Shared profile name sync failed:",profileError.code||"unknown");
   return fail("Thông tin đại biểu đã lưu, nhưng chưa đồng bộ tên tài khoản. Vui lòng tải lại hoặc liên hệ BTC.",
    503,"partial_profile_sync");
  }
  return NextResponse.json({ok:true,delegate:updated,updatedCongressCount:data?.length||0},
   {headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  // Never turn an infrastructure failure into the misleading "invalid request" error.
  console.error("Delegate profile unexpected failure:",error instanceof Error?error.name:"unknown");
  return fail("Không thể kết nối máy chủ lưu hồ sơ. Vui lòng thử lại.",503,"server_unavailable");
 }
}
