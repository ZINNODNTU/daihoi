import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {writeSystemLog} from "@/lib/system-log";
import {validateBchReorder} from "@/lib/bch-candidates";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});

export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Yêu cầu không cùng nguồn.",403);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  const body=await request.json().catch(()=>null);
  const congressId=typeof body?.congressId==="string"?body.congressId:"";
  const ids=body?.orderedIds;
  if(!UUID.test(congressId)||!validateBchReorder(ids))
   return fail("Danh sách thứ tự không hợp lệ.",400);
  if(!(await hasRole(supabase,user.id,congressId,"admin")))
   return fail("Không có quyền sắp xếp nhân sự BCH.",403);
  // SECURITY INVOKER RPC validates the full exact ID set and applies one atomic UPDATE.
  const {error}=await supabase.rpc("reorder_bch_candidates",{p_congress_id:congressId,p_ids:ids});
  if(error){
   if(error.code==="PGRST202"||error.code==="42883")
    return fail("Chưa kích hoạt sắp xếp BCH. Cần chạy migration upgrade-bch-order-v39.sql.",503);
   return fail("Thứ tự không thể lưu. Danh sách có thể đã thay đổi, hãy làm mới rồi thử lại.",409);
  }
  await writeSystemLog({level:"info",source:"api",event:"bch.order_updated",
   message:"Quản trị đã sắp xếp lại danh sách nhân sự BCH.",actorId:user.id,congressId,
   context:{operation:"bch.reorder",endpoint:"/api/bch-candidates/reorder",httpMethod:"POST"}});
  return NextResponse.json({ok:true,count:ids.length},{headers:HEADERS});
 }catch{return fail("Không thể lưu thứ tự nhân sự.",500);}
}
