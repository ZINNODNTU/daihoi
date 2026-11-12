import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility,isStaffUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const HEADERS={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MESSAGES:Record<string,string>={
 "frontend.runtime_error":"Lỗi JavaScript chưa được xử lý trong trang quản trị.",
 "frontend.unhandled_rejection":"Promise bị từ chối nhưng không được xử lý trong trang quản trị.",
 "frontend.react_boundary":"Lỗi hiển thị React trong trang quản trị."
};
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(!origin||new URL(origin).host!==request.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);
  const size=Number(request.headers.get("content-length")||0);
  if(size>2048)return fail("Báo cáo quá lớn.",413);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await isStaffUser(supabase,user.id)))return fail("Không được phép gửi nhật ký.",403);
  const data=await request.json().catch(()=>null);
  const event=String(data?.event||"");
  const route=String(data?.route||"");
  if(!MESSAGES[event]||route.length>180||route.includes("?")||route.includes("#")||
    !/^\/(?:dashboard(?:\/[\w/-]*)?|congresses\/[a-f0-9-]{36}(?:\/[\w/-]*)?)$/.test(route))
   return fail("Sự kiện không hợp lệ.",400);
  const congressId=route.match(/^\/congresses\/([a-f0-9-]{36})(?:\/|$)/)?.[1]||null;
  if(congressId&&(!UUID.test(congressId)||!(await hasCongressAbility(supabase,user.id,congressId,"reports.read"))))
   return fail("Không thuộc Đại hội này.",403);
  const {count,error}=await createAdminClient().from("system_logs")
   .select("id",{count:"exact",head:true})
   .eq("actor_id",user.id).eq("source","frontend")
   .gte("occurred_at",new Date(Date.now()-60000).toISOString());
  if(error)return fail("Chưa cấu hình nhật ký hệ thống.",503);
  if((count||0)>=5)return fail("Đã đạt giới hạn báo cáo lỗi.",429);
  const errorName=typeof data?.errorName==="string"&&/^[A-Za-z]{1,40}$/.test(data.errorName)
   ?data.errorName:"Error";
  const filename=typeof data?.filename==="string"&&/^[A-Za-z0-9_./-]{1,120}$/.test(data.filename)
   ?data.filename:"";
  const line=Number.isInteger(data?.line)&&data.line>=0&&data.line<=1000000?data.line:null;
  const column=Number.isInteger(data?.column)&&data.column>=0&&data.column<=1000000?data.column:null;
  const requestId=await writeSystemLog({
   level:"error",source:"frontend",event,message:MESSAGES[event],
   actorId:user.id,congressId,
   context:{operation:"browser",endpoint:route,errorName,filename,line,column}
  });
  return NextResponse.json({ok:true,requestId},{headers:HEADERS});
 }catch{return fail("Không thể tiếp nhận báo cáo.",503);}
}