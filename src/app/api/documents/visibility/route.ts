import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {DriveStorageError,getDriveToken,setDriveLinkSharing} from "@/lib/drive";
import {scriptStorageSelected,shareScriptDrive} from "@/lib/google-apps-script";

export const runtime="nodejs";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
export async function PATCH(request:Request){
 const {supabase,user}=await getAuth();
 if(!user)return fail("Vui lòng đăng nhập.",401);
 const origin=request.headers.get("origin");
 if(origin&&new URL(origin).host!==request.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);
 const body=await request.json().catch(()=>null);
 const congressId=String(body?.congressId||"");
 const documentId=String(body?.documentId||"");
 if(!UUID.test(congressId)||!UUID.test(documentId)||typeof body?.visible!=="boolean")
  return fail("Yêu cầu không hợp lệ.",400);
 if(!(await hasRole(supabase,user.id,congressId,"admin")))return fail("Chỉ quản trị Đại hội được công bố tài liệu.",403);

 const db=createAdminClient();
 const {data:record,error:lookupError}=await db.from("documents")
  .select("id,drive_file_id,delegate_visible").eq("id",documentId)
  .eq("congress_id",congressId).maybeSingle();
 if(lookupError)return fail("Không đọc được tài liệu. Kiểm tra migration v14.",500);
 if(!record)return fail("Không tìm thấy tài liệu thuộc Đại hội.",404);
 if(record.delegate_visible===body.visible)
  return NextResponse.json({ok:true,visible:record.delegate_visible},{headers:{"Cache-Control":"no-store"}});
 const driveFileId:string=record.drive_file_id;
 const previouslyVisible:boolean=record.delegate_visible===true;

 // Quyền bên Google Drive phải được cập nhật trước rồi mới đánh dấu công bố
 // trong Supabase để tránh hiện liên kết không đọc được.
 let token="";
 async function share(visible:boolean){
  if(scriptStorageSelected())await shareScriptDrive(congressId,driveFileId,visible);
  else{
   token ||= await getDriveToken();
   await setDriveLinkSharing(token,driveFileId,visible);
  }
 }
 try{await share(body.visible);}
 catch(e){return fail(e instanceof DriveStorageError?e.message:
  "Chưa cập nhật được quyền xem trên Google Drive.",e instanceof DriveStorageError?e.status:502);}

 const {data,error}=await db.from("documents").update({delegate_visible:body.visible})
  .eq("id",documentId).eq("congress_id",congressId)
  .select("id,delegate_visible").maybeSingle();
 if(error||!data){
  try{await share(previouslyVisible);}
  catch(e){console.error("document sharing rollback failed",e instanceof DriveStorageError?e.code:"unknown");}
  return fail("Google Drive đã đổi quyền nhưng Supabase chưa lưu được. Kiểm tra migration v14.",500);
 }
 return NextResponse.json({ok:true,visible:data.delegate_visible},{headers:{"Cache-Control":"no-store"}});
}
