import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function PATCH(request:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const body=await request.json();
  const congressId=String(body.congressId||"");
  if(!uuid.test(congressId)||!(await hasRole(supabase,user.id,congressId,"admin")))
   return NextResponse.json({error:"Chỉ quản trị Đại hội được cập nhật thông tin."},{status:403});
  const name=String(body.name||"").trim();
  const venue=String(body.venue||"").trim();
  const term=String(body.term||"").trim();
  const status=body.status;
  if(name.length<5||name.length>250||venue.length>180||term.length>50||
    !["preparing","live","completed"].includes(status))
   return NextResponse.json({error:"Tên, nhiệm kỳ, địa điểm hoặc trạng thái không hợp lệ."},{status:400});
  const {data,error}=await createAdminClient().from("congresses").update({name,venue,term,status})
   .eq("id",congressId).select("id,name,venue,term,status").maybeSingle();
  if(error||!data)return NextResponse.json({error:"Không thể lưu cấu hình Đại hội."},{status:500});
  return NextResponse.json({ok:true,congress:data},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});}
}
