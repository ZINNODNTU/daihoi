import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {canReuseDelegatePortrait,type PortraitLinkPerson} from "@/lib/delegate-photo-reuse";
import {readPortrait} from "@/lib/portrait-storage";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>Response.json({error},{status,
 headers:{"Cache-Control":"private, no-store"}});
const fields="id,congress_id,student_id,full_name,birth_date,auth_user_id,photo_path,is_active";

export async function GET(request:Request){
 try{
  const qs=new URL(request.url).searchParams;
  const congressId=qs.get("congressId")||"",delegateId=qs.get("delegateId")||"",
   sourceId=qs.get("sourceId")||"";
  if(![congressId,delegateId,sourceId].every(id=>UUID.test(id)))
   return fail("Mã đại biểu không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Chưa đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return fail("Không có quyền xem ảnh này.",403);
  const db=createAdminClient();
  const [targetResult,sourceResult]=await Promise.all([
   db.from("delegates").select(fields).eq("id",delegateId).eq("congress_id",congressId).maybeSingle(),
   db.from("delegates").select(fields).eq("id",sourceId).maybeSingle()
  ]);
  if(targetResult.error||sourceResult.error)return fail("Không xác minh được ảnh nguồn.",503);
  const target=targetResult.data as PortraitLinkPerson|null;
  const source=sourceResult.data as PortraitLinkPerson|null;
  if(!target||!source||!canReuseDelegatePortrait(target,source))
   return fail("Không có ảnh hợp lệ.",404);
  const sameAccount=Boolean(target.auth_user_id&&target.auth_user_id===source.auth_user_id);
  if(!sameAccount&&!(await hasCongressAbility(supabase,user.id,source.congress_id,"delegates.read")))
   return fail("Không có quyền xem ảnh nguồn.",403);
  const bytes=await readPortrait(source.photo_path!,96);
  if(!bytes)return fail("Ảnh nguồn không tồn tại.",404);
  return new Response(new Uint8Array(bytes),{headers:{
   "Content-Type":"image/jpeg","Cache-Control":"private, no-store",
   "Vary":"Cookie","Cross-Origin-Resource-Policy":"same-origin",
   "X-Content-Type-Options":"nosniff","Content-Disposition":"inline"
  }});
 }catch{return fail("Không thể xem ảnh đại biểu.",503);}
}
