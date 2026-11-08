import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

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
 const {data,error}=await db.from("documents").update({delegate_visible:body.visible})
  .eq("id",documentId).eq("congress_id",congressId)
  .select("id,delegate_visible").maybeSingle();
 if(error)return fail("Không cập nhật được tài liệu. Kiểm tra nâng cấp database v14.",500);
 if(!data)return fail("Không tìm thấy tài liệu của Đại hội.",404);
 return NextResponse.json({ok:true,visible:data.delegate_visible},{headers:{"Cache-Control":"no-store"}});
}
