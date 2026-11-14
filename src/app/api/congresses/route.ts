import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {provisionBtcAccount} from "@/lib/btc-accounts";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
const HEADERS={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});

export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Nguồn yêu cầu không hợp lệ.",403);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Cần đăng nhập.",401);
  const {data:profile,error:profileError}=await supabase.from("profiles")
   .select("platform_role").eq("id",user.id).maybeSingle();
  if(profileError||profile?.platform_role!=="super_admin")
   return fail("Chỉ quản trị hệ thống được tạo Đại hội.",403);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object")return fail("Dữ liệu không hợp lệ.",400);
  const name=String(body.name||"").trim().slice(0,250);
  const slug=String(body.slug||"").trim().toLowerCase();
  const orgName=String(body.organization_name||"").trim().slice(0,180);
  const orgCode=String(body.organization_code||"").trim().toLowerCase().slice(0,60);
  const kind=body.kind==="hoi_sinh_vien"?"hoi_sinh_vien":"doan";
  const adminName=typeof body.btc_admin_name==="string"?
   body.btc_admin_name.trim().replace(/\s+/g," "):"";
  if(name.length<5||orgName.length<2||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||
   !/^[a-z0-9-]+$/.test(orgCode)||adminName.length<2||adminName.length>120)
   return fail("Vui lòng nhập đủ thông tin Đại hội và họ tên người quản trị chính.",400);
  const db=createAdminClient();
  const {data:existingOrg,error:orgError}=await db.from("organizations").select("id").eq("code",orgCode).maybeSingle();
  let org=existingOrg;
  if(orgError)return fail("Không tìm được đơn vị tổ chức.",503);
  if(!org){
   const inserted=await db.from("organizations").insert({name:orgName,code:orgCode}).select("id").single();
   if(inserted.error)return fail("Không tạo được đơn vị tổ chức.",503);
   org=inserted.data;
  }
  const result=await db.from("congresses").insert({
   organization_id:org.id,name,slug,kind,term:String(body.term||"").slice(0,50),
   venue:String(body.venue||"").slice(0,180)
  }).select("id,slug").single();
  if(result.error)return fail(result.error.code==="23505"?"Đường dẫn Đại hội đã tồn tại.":"Không tạo được Đại hội.",409);
  try{
   const {account,initialPassword}=await provisionBtcAccount({
    db,congressId:result.data.id,fullName:adminName,role:"admin",actorId:user.id
   });
   await writeSystemLog({level:"info",source:"auth",event:"btc.primary_created",
    message:"Tạo Đại hội và cấp tài khoản quản trị chính.",congressId:result.data.id,
    actorId:user.id,context:{operation:"congress.create_with_primary"}});
   // Credentials returned exactly once and never stored in congress metadata.
   return NextResponse.json({ok:true,congress:result.data,
    primaryAdmin:{...account,initialPassword}},{status:201,headers:HEADERS});
  }catch(error){
   console.error("Primary BTC provisioning failed",error instanceof Error?error.message:"unknown");
   const {error:rollbackError}=await db.from("congresses").delete().eq("id",result.data.id);
   if(rollbackError)console.error("Failed to roll back unprovisioned congress",rollbackError.code);
   return fail("Không cấp được tài khoản quản trị chính. Đại hội chưa sẵn sàng; kiểm tra migration V65.",503);
  }
 }catch{return fail("Yêu cầu không hợp lệ.",400);}
}
