import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {getPortalCongressAccess} from "@/lib/portal-congress-access";
import {ACTIVE_CONGRESS_COOKIE} from "@/lib/active-congress";

export const dynamic="force-dynamic";
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return NextResponse.json({error:"Nguồn truy cập không hợp lệ."},{status:403});
  const {user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const body=await request.json() as {congressId?:unknown};
  if(typeof body?.congressId!=="string"||
   !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.congressId))
   return NextResponse.json({error:"Đại hội không hợp lệ."},{status:400});
  const access=await getPortalCongressAccess(user.id);
  if(!access.congressIds.includes(body.congressId))
   return NextResponse.json({error:"Không có quyền xem Đại hội này."},{status:403});
  const response=NextResponse.json({ok:true,congressId:body.congressId},
   {headers:{"Cache-Control":"private, no-store"}});
  response.cookies.set(ACTIVE_CONGRESS_COOKIE,body.congressId,{
   path:"/",httpOnly:true,secure:process.env.NODE_ENV==="production",
   sameSite:"lax",maxAge:60*60*24*60
  });
  return response;
 }catch{
  return NextResponse.json({error:"Không thể lựa chọn Đại hội. Vui lòng thử lại."},{status:503});
 }
}
