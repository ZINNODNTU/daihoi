import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
export async function POST(request:Request) {
 try {
  const {supabase,user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const {data:profile}=await supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle();
  if(profile?.platform_role!=="super_admin")return NextResponse.json({error:"Chỉ quản trị hệ thống được tạo đại hội."},{status:403});
  const body=await request.json();
  const name=String(body.name||"").trim().slice(0,250);
  const slug=String(body.slug||"").trim().toLowerCase();
  const orgName=String(body.organization_name||"").trim().slice(0,180);
  const orgCode=String(body.organization_code||"").trim().toLowerCase().slice(0,60);
  const kind=body.kind==="hoi_sinh_vien"?"hoi_sinh_vien":"doan";
  if(name.length<5||orgName.length<2||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!/^[a-z0-9-]+$/.test(orgCode))
   return NextResponse.json({error:"Tên, mã đơn vị hoặc đường dẫn không hợp lệ."},{status:400});
  let {data:org}=await supabase.from("organizations").select("id").eq("code",orgCode).maybeSingle();
  if(!org){
   const inserted=await supabase.from("organizations").insert({name:orgName,code:orgCode}).select("id").single();
   if(inserted.error)return NextResponse.json({error:"Không tạo được đơn vị tổ chức."},{status:500});
   org=inserted.data;
  }
  const result=await supabase.from("congresses").insert({
   organization_id:org.id,name,slug,kind,term:String(body.term||"").slice(0,50),
   venue:String(body.venue||"").slice(0,180)
  }).select("id,slug").single();
  if(result.error)return NextResponse.json({error:result.error.code==="23505"?"Đường dẫn đại hội đã tồn tại.":"Không tạo được đại hội."},{status:409});
  const {error:memberError}=await createAdminClient().from("congress_members").insert({congress_id:result.data.id,user_id:user.id,role:"admin"});
  if(memberError)console.error("Add creator to congress",memberError.code);
  return NextResponse.json({ok:true,congress:result.data,warning:memberError?"Không thêm được quản trị viên.":undefined});
 } catch {return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});}
}
