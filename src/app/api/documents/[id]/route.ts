import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {fetchDriveFile,getDriveToken} from "@/lib/drive";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(status:number,error:string)=>Response.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)return fail(401,"Cần đăng nhập.");
 const db=createAdminClient();
 const {data:doc,error}=await db.from("documents").select("*")
  .eq("id",id).maybeSingle();
 if(error||!doc)return fail(404,"Không tìm thấy tài liệu.");
 const staff=await hasRole(supabase,user.id,doc.congress_id,"viewer");
 if(!staff){
  if(!doc.delegate_visible)return fail(403,"Tài liệu chưa công bố cho đại biểu.");
  const {data:own,error:ownerError}=await db.from("delegates").select("id")
   .eq("congress_id",doc.congress_id).eq("auth_user_id",user.id)
   .eq("is_active",true).limit(1);
  if(ownerError||!own?.length)return fail(403,"Không có quyền xem tài liệu này.");
 }
 try{
  const file=await fetchDriveFile(await getDriveToken(),doc.drive_file_id);
  if(!file.ok||!file.body)return fail(502,"Không đọc được tệp từ Drive.");
  const inline=new URL(request.url).searchParams.get("inline")==="1" &&
   ["image/jpeg","image/png","image/webp","application/pdf"].includes(doc.mime_type);
  const safeName=doc.file_name.replace(/[\r\n"\\]/g,"_");
  return new Response(file.body,{headers:{
   "Content-Type":doc.mime_type,
   "Content-Disposition":`${inline?"inline":"attachment"}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
   "Cache-Control":"private, no-store",
   "X-Content-Type-Options":"nosniff",
   "Content-Security-Policy":"default-src 'none'; sandbox"
  }});
 }catch{return fail(502,"Lỗi kết nối Google Drive.");}
}
