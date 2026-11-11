import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getSystemLogAccess} from "@/lib/system-log-access";

export const dynamic="force-dynamic";
export const runtime="nodejs";
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
export async function GET(){
 try{
  const access=await getSystemLogAccess();
  if(!access.user)return NextResponse.json({error:"Cần đăng nhập."},{status:401,headers:HEADERS});
  if(!access.allowed)return NextResponse.json({error:"Không có quyền."},{status:403,headers:HEADERS});
  let query=createAdminClient().from("system_logs")
   .select("id",{count:"exact",head:true})
   .gte("occurred_at",new Date(Date.now()-86400000).toISOString())
   .in("level",["error","critical"]).neq("resolution","resolved");
  if(!access.superAdmin)query=query.in("congress_id",access.congressIds);
  const {count,error}=await query;
  if(error)return NextResponse.json({error:"Chưa cấu hình nhật ký."},{status:503,headers:HEADERS});
  return NextResponse.json({unresolved24h:count||0},{headers:HEADERS});
 }catch{return NextResponse.json({error:"Không đọc được trạng thái nhật ký."},{status:503,headers:HEADERS});}
}
