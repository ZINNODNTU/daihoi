import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getDriveToken,makeDriveFolder,uploadDriveFile} from "@/lib/drive";
export const runtime="nodejs";
const allowed=new Set(["image/jpeg","image/png","image/webp","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
export async function POST(req:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const f=await req.formData();
  const congressId=String(f.get("congressId")||"");
  const file=f.get("file");
  if(!(await hasRole(supabase,user.id,congressId,"admin")))return NextResponse.json({error:"Không đủ quyền tải tài liệu."},{status:403});
  if(!(file instanceof File)||file.size===0||file.size>4*1024*1024||!allowed.has(file.type))
    return NextResponse.json({error:"Chỉ cho phép JPG, PNG, WebP, PDF, DOCX, XLSX dưới 4 MB."},{status:400});
  const {data:congress}=await supabase.from("congresses").select("id,drive_folder_id").eq("id",congressId).maybeSingle();
  if(!congress)return NextResponse.json({error:"Không tìm thấy Đại hội."},{status:404});
  const token=await getDriveToken();
  let folder=congress.drive_folder_id;
  if(!folder){
   folder=await makeDriveFolder(token,congressId);
   const {error}=await createAdminClient().from("congresses").update({drive_folder_id:folder}).eq("id",congressId);
   if(error)throw new Error("Không lưu được thư mục của Đại hội.");
  }
  const uploaded=await uploadDriveFile(token,folder,file);
  const {data,error}=await createAdminClient().from("documents").insert({
    congress_id:congressId,file_name:file.name.slice(0,180),mime_type:file.type,
    byte_size:file.size,drive_file_id:uploaded.id,uploaded_by:user.id
  }).select("id,file_name").single();
  if(error){console.error("drive uploaded but database failed",uploaded.id,error.code);return NextResponse.json({error:"Đã tải lên Drive nhưng chưa ghi được CSDL. Cần đối soát tệp."},{status:500});}
  return NextResponse.json({ok:true,document:data});
 }catch(e){console.error("document upload",e);return NextResponse.json({error:e instanceof Error?e.message:"Không thể tải lên."},{status:500});}
}
