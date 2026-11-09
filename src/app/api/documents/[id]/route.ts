import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {googleDriveFileUrl} from "@/lib/drive-links";

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
  .select("id,congress_id,drive_file_id,delegate_visible")
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
  const destination=googleDriveFileUrl(doc.drive_file_id);
  // Chỉ chuyển hướng qua link Google Drive; không truyền byte tài liệu qua Vercel.
  const response=NextResponse.redirect(destination,302);
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("Referrer-Policy","no-referrer");
  return response;
 }catch{return fail(404,"Liên kết Google Drive của tài liệu không hợp lệ.");}
}
