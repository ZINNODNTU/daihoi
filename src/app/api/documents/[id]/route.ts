import {getAuth,hasRole} from "@/lib/auth";
import {fetchDriveFile,getDriveToken} from "@/lib/drive";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {supabase,user}=await getAuth();
 if(!user)return Response.json({error:"Cần đăng nhập."},{status:401});
 const {data:doc}=await supabase.from("documents").select("congress_id,file_name,mime_type,drive_file_id").eq("id",id).maybeSingle();
 if(!doc)return Response.json({error:"Không tìm thấy tài liệu."},{status:404});
 if(!(await hasRole(supabase,user.id,doc.congress_id,"viewer")))return Response.json({error:"Không có quyền."},{status:403});
 try{
  const file=await fetchDriveFile(await getDriveToken(),doc.drive_file_id);
  if(!file.ok||!file.body)return Response.json({error:"Không đọc được tệp từ Drive."},{status:502});
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
 }catch{return Response.json({error:"Lỗi kết nối Google Drive."},{status:502});}
}
