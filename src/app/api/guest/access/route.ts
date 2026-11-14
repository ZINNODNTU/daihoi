import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {compareGuestCode,GUEST_VIEW_COOKIE,guestCodePattern} from "@/lib/guest-congress-access";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,
 headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const slugRe=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);
  if(Number(request.headers.get("content-length")||0)>2048)return fail("Dữ liệu vượt giới hạn.",413);
  const body=await request.json().catch(()=>null);
  const slug=typeof body?.slug==="string"?body.slug.trim().toLowerCase():"";
  const code=typeof body?.code==="string"?body.code.trim():"";
  if(!slugRe.test(slug)||slug.length>120||!guestCodePattern.test(code))
   return fail("Mã đường dẫn hoặc mã truy cập không hợp lệ.",400);
  const db=createAdminClient();
  const {data:congress,error}=await db.from("congresses")
   .select("id,slug").eq("slug",slug).maybeSingle();
  if(error)return fail("Không thể xác minh Đại hội.",503);
  if(!congress)return fail("Mã truy cập Đại hội không đúng hoặc đã bị thu hồi.",403);
  const {data:link,error:linkError}=await db.from("congress_guest_links")
   .select("access_hash,enabled").eq("congress_id",congress.id).maybeSingle();
  if(linkError)return fail("Không xác minh được quyền truy cập khách.",503);
  if(!link?.enabled||!compareGuestCode(code,link.access_hash))
   return fail("Mã truy cập Đại hội không đúng hoặc đã bị thu hồi.",403);
  const response=NextResponse.json({ok:true,destination:"/guest/"+encodeURIComponent(slug)},
   {headers:{"Cache-Control":"no-store"}});
  response.cookies.set(GUEST_VIEW_COOKIE,congress.id+"."+code,{
   httpOnly:true,sameSite:"lax",secure:new URL(request.url).protocol==="https:",
   path:"/",maxAge:60*60*12
  });
  return response;
 }catch{return fail("Không thể truy cập chế độ khách. Vui lòng thử lại.",503);}
}
export async function DELETE(request:Request){
 const origin=request.headers.get("origin");
 try{if(origin&&new URL(origin).host!==request.headers.get("host"))return fail("Nguồn yêu cầu không hợp lệ.",403);}
 catch{return fail("Nguồn yêu cầu không hợp lệ.",403);}
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 response.cookies.delete(GUEST_VIEW_COOKIE);
 return response;
}
