import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {checkDriveConnection,DriveStorageError,missingDriveSettings} from "@/lib/drive";
import {checkScriptDrive,missingScriptSettings,scriptStorageSelected} from "@/lib/google-apps-script";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 const {supabase,user}=await getAuth();
 if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
 const congressId=new URL(request.url).searchParams.get("congressId")||"";
 if(!UUID.test(congressId))return NextResponse.json({error:"Đại hội không hợp lệ."},{status:400});
 if(!(await hasRole(supabase,user.id,congressId,"admin")))
  return NextResponse.json({error:"Chỉ quản trị Đại hội được kiểm tra kết nối Drive."},{status:403});
 const useScript=scriptStorageSelected();
 const missing=useScript?missingScriptSettings():missingDriveSettings();
 if(missing.length)return NextResponse.json({
  ready:false,reason:"missing_config",missing,
  message:"Chưa cấu hình Google Drive trên máy chủ/Vercel."
 },{headers:{"Cache-Control":"private, no-store"}});
 try{
  const checked=useScript?await checkScriptDrive(congressId):await checkDriveConnection();
  return NextResponse.json({ready:true,rootName:checked.rootName,
   message:"Đã kết nối Google Drive; có thể tải tài liệu lên."},
   {headers:{"Cache-Control":"private, no-store"}});
 }catch(e){
  return NextResponse.json({ready:false,reason:e instanceof DriveStorageError?e.code:"unknown",
   message:e instanceof DriveStorageError?e.message:"Chưa kiểm tra được kết nối Google Drive."},
   {headers:{"Cache-Control":"private, no-store"}});
 }
}