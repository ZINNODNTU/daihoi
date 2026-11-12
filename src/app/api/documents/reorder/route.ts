import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"private, no-store"}});

export async function POST(req:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  const origin=req.headers.get("origin");
  if(origin&&new URL(origin).host!==req.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);
  const body=await req.json().catch(()=>null);
  const congressId=body?.congressId, orderedIds=body?.orderedIds;
  if(typeof congressId!=="string"||!UUID.test(congressId)||
   !Array.isArray(orderedIds)||orderedIds.length<1||orderedIds.length>800||
   !orderedIds.every((id:unknown)=>typeof id==="string"&&UUID.test(id))||
   new Set(orderedIds.map((id:string)=>id.toLowerCase())).size!==orderedIds.length)
   return fail("Danh sách thứ tự tài liệu không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"documents.write")))
   return fail("Chỉ quản trị Đại hội được sắp xếp tài liệu.",403);
  const {error}=await createAdminClient().rpc("reorder_congress_documents",{
   p_congress_id:congressId,p_ids:orderedIds
  });
  if(error){
   if(error.code==="PGRST202"||error.code==="42883")
    return fail("Chưa cấu hình chức năng sắp xếp tài liệu. Cần áp dụng migration V43.",503);
   return fail("Không lưu được thứ tự. Danh sách có thể đã thay đổi; hãy tải lại.",409);
  }
  await writeSystemLog({level:"info",source:"documents",event:"documents.order_updated",
   message:"Quản trị đã sắp xếp lại thứ tự hiển thị tài liệu.",congressId,actorId:user.id,
   context:{operation:"documents.reorder",attempt:orderedIds.length}});
  return NextResponse.json({ok:true,orderedIds},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return fail("Không thể sắp xếp tài liệu. Vui lòng thử lại.",503);}
}