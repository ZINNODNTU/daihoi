import {NextResponse} from "next/server";
import {deleteScriptDrive,scriptStorageSelected,shareScriptDrive,uploadScriptDrive} from "@/lib/google-apps-script";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 DriveStorageError,getDriveToken,inspectDriveFolder,makeDriveFolder,
 uploadDriveFile,deleteDriveFile,setDriveLinkSharing
} from "@/lib/drive";
import {
 DocumentValidationError,MAX_DOCUMENT_BYTES,validateDocumentBytes,validateDocumentName
} from "@/lib/document-validation";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message:string,status:number){
 return NextResponse.json({error:message},{status,headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(req:Request){
 let uploadedId="";
 let token="";
 let storageMode:"script"|"oauth"="oauth";
 let uploadCongressId="";
 try{
  const {supabase,user}=await getAuth();
  if(!user)return fail("Cần đăng nhập để tải tài liệu.",401);
  const origin=req.headers.get("origin");
  if(origin&&new URL(origin).host!==req.headers.get("host"))
   return fail("Nguồn yêu cầu không hợp lệ.",403);
  const form=await req.formData();
  const congressId=String(form.get("congressId")||"");
  // Explicit opt-in: uploaded documents stay private by default.
   const publishAfterUpload=form.get("publish")==="true";
   uploadCongressId=congressId;
  if(!UUID.test(congressId))return fail("Đại hội không hợp lệ.",400);
  if(!(await hasRole(supabase,user.id,congressId,"admin")))
   return fail("Chỉ quản trị Đại hội được tải tài liệu.",403);
  const input=form.get("file");
  if(!(input instanceof File))return fail("Chưa chọn tệp tài liệu.",400);
  if(input.size===0||input.size>MAX_DOCUMENT_BYTES)
   return fail("Mỗi tài liệu phải có dung lượng từ 1 byte đến 4 MB.",413);
  const safeName=validateDocumentName(input.name);
  const bytes=new Uint8Array(await input.arrayBuffer());
  const mime=validateDocumentBytes(safeName,bytes);
  const file=new File([bytes],safeName,{type:mime});

  const db=createAdminClient();
  const {data:congress,error:findError}=await db.from("congresses")
   .select("id,drive_folder_id").eq("id",congressId).maybeSingle();
  if(findError||!congress)return fail("Không tìm thấy Đại hội hoặc lỗi truy vấn cơ sở dữ liệu.",404);

  let uploaded:{id:string;name:string};
  if(scriptStorageSelected()){
   storageMode="script";
   uploaded=await uploadScriptDrive(congressId,file);
  }else{
   token=await getDriveToken();
   let folder=congress.drive_folder_id;
   if(folder){
    try{await inspectDriveFolder(token,folder);}
    catch(e){
     if(!(e instanceof DriveStorageError)||!["not_found","invalid_folder"].includes(e.code))throw e;
     folder=null;
    }
   }
   if(!folder){
    folder=await makeDriveFolder(token,congressId);
    const {error:folderError}=await db.from("congresses")
     .update({drive_folder_id:folder}).eq("id",congressId);
    if(folderError)return fail("Không lưu được mã thư mục Drive vào Đại hội.",500);
   }
   uploaded=await uploadDriveFile(token,folder,file);
  }
  uploadedId=uploaded.id;
  const {data,error}=await db.from("documents").insert({
   congress_id:congressId,file_name:safeName,mime_type:mime,
   byte_size:file.size,drive_file_id:uploaded.id,uploaded_by:user.id,
    delegate_visible:false
  }).select("id,file_name,delegate_visible").single();
  if(error){
   // Compensating transaction prevents orphaned private Drive files when
   // the SQL insert fails (missing table, permissions, network etc).
   try{
    if(storageMode==="script")await deleteScriptDrive(uploadCongressId,uploadedId);
    else await deleteDriveFile(token,uploadedId);
    uploadedId="";
   }
   catch(cleanupError){
    console.error("orphan document cleanup failed",{
     googleFileId:uploadedId,code:cleanupError instanceof DriveStorageError?cleanupError.code:"unknown"
    });
   }
   console.error("document db insert failed",error.code);
   return fail("Drive đã nhận tệp nhưng không lưu được thông tin vào Supabase. Kiểm tra bảng documents và quyền truy cập.",500);
  }
  let published=false;
   let warning="";
   // Google Drive must be shareable before the metadata becomes visible.
   // A sharing error never exposes a private file to delegates.
   if(publishAfterUpload){
    try{
     if(storageMode==="script")await shareScriptDrive(congressId,uploaded.id,true);
     else await setDriveLinkSharing(token,uploaded.id,true);
     const {data:updated,error:publishError}=await db.from("documents")
      .update({delegate_visible:true}).eq("id",data.id).eq("congress_id",congressId)
      .select("id,delegate_visible").single();
     if(publishError||!updated?.delegate_visible){
      try{
       if(storageMode==="script")await shareScriptDrive(congressId,uploaded.id,false);
       else await setDriveLinkSharing(token,uploaded.id,false);
      }catch(rollbackError){
       console.error("document sharing rollback failed",
        rollbackError instanceof DriveStorageError?rollbackError.code:"unknown");
      }
      warning="Đã lưu tệp nội bộ, nhưng chưa đồng bộ được công bố. Hãy thử công bố lại trong danh sách tài liệu.";
     }else published=true;
    }catch(e){
     console.error("document publication after upload failed",
      e instanceof DriveStorageError?e.code:"unknown");
     warning="Tệp đã lưu nội bộ. Google Drive chưa cấp được quyền xem; hãy kiểm tra cấu hình chia sẻ rồi công bố lại.";
    }
   }
   return NextResponse.json({ok:true,document:{...data,delegate_visible:published},published,warning},{
    headers:{"Cache-Control":"private, no-store"}
   });
 }catch(e){
  if(e instanceof DocumentValidationError)return fail(e.message,400);
  if(e instanceof DriveStorageError)return fail(e.message,e.status);
  console.error("document upload failed",e instanceof Error?e.name:"unknown");
  return fail("Không thể tải tài liệu lên Google Drive. Vui lòng thử lại.",500);
 }
}