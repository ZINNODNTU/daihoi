import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {googleDriveFileUrl,googleDrivePreviewUrl} from "@/lib/drive-links";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(status:number,error:string)=>NextResponse.json({error},{
 status,headers:{"Cache-Control":"private, no-store"}
});
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)return fail(401,"Cần đăng nhập.");
 const db=createAdminClient();
 const {data:doc,error}=await db.from("documents")
  .select("id,congress_id,drive_file_id,mime_type,delegate_visible")
  .eq("id",id).maybeSingle();
 if(error||!doc)return fail(404,"Không tìm thấy tài liệu.");
 const staff=await hasRole(supabase,user.id,doc.congress_id,"viewer");
 if(!staff){
  if(!doc.delegate_visible)return fail(403,"Tài liệu chưa công bố cho đại biểu.");
  const {data:own,error:ownerError}=await db.from("delegates").select("id")
   .eq("congress_id",doc.congress_id).eq("auth_user_id",user.id)
   .eq("is_active",true).limit(1);
  if(ownerError)return fail(500,"Không xác minh được quyền xem tài liệu.");
   if(!own?.length){
    const {data:member,error:memberError}=await db.from("congress_members")
     .select("role").eq("congress_id",doc.congress_id)
     .eq("user_id",user.id).eq("role","guest").maybeSingle();
    if(memberError||!member)return fail(403,"Không có quyền xem tài liệu này.");
   }
 }
 try{
  const preview=new URL(_request.url).searchParams.get("preview")==="1";
  if(preview&&doc.mime_type!=="application/pdf")
   return fail(415,"Trình xem chỉ hỗ trợ PDF. Hãy mở tệp trực tiếp trên Google Drive.");
  const destination=preview?googleDrivePreviewUrl(doc.drive_file_id):googleDriveFileUrl(doc.drive_file_id);
  // Google phục vụ tệp trực tiếp: Vercel chỉ kiểm tra quyền và chuyển hướng.
  const response=NextResponse.redirect(destination,302);
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("Referrer-Policy","no-referrer");
  return response;
 }catch{return fail(404,"Liên kết Google Drive của tài liệu không hợp lệ.");}
}

// Gỡ tài liệu khỏi danh mục Đại hội. Không xóa tệp gốc Google Drive:
// tránh mất dữ liệu hoặc ảnh hưởng đến các liên kết được BTC chia sẻ.
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
   return fail(400,"Mã tài liệu không hợp lệ.");
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail(403,"Nguồn yêu cầu không hợp lệ.");
  const {supabase,user}=await getAuth();
  if(!user)return fail(401,"Vui lòng đăng nhập.");
  const payload=await request.json().catch(()=>null);
  const congressId=payload?.congressId;
  if(typeof congressId!=="string"||
   !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(congressId))
   return fail(400,"Đại hội không hợp lệ.");
  if(!(await hasRole(supabase,user.id,congressId,"admin")))
   return fail(403,"Chỉ quản trị Đại hội được gỡ tài liệu.");
  const db=createAdminClient();
  const {data:removed,error}=await db.from("documents").delete()
   .eq("id",id).eq("congress_id",congressId)
   .select("id,file_name").maybeSingle();
  if(error)return fail(503,"Chưa gỡ được tài liệu. Vui lòng thử lại.");
  if(!removed)return fail(404,"Không tìm thấy tài liệu trong Đại hội này.");
  await writeSystemLog({level:"info",source:"documents",event:"documents.removed",
   message:"Quản trị đã gỡ tài liệu khỏi thư viện Đại hội; file Drive gốc được giữ lại.",
   congressId,actorId:user.id,context:{operation:"documents.remove"}});
  return NextResponse.json({ok:true,removedId:removed.id,driveFilePreserved:true},{
   headers:{"Cache-Control":"private, no-store"}
  });
 }catch{return fail(503,"Không thể gỡ tài liệu. Vui lòng thử lại.");}
}
