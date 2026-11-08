import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {validateBchInput} from "@/lib/bch-candidates";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{
 status,headers:{"Cache-Control":"no-store"}
});

async function authorize(congressId:string,write:boolean){
 if(!uuid.test(congressId))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 const canManage=await hasRole(supabase,user.id,congressId,"admin");
 let canView=canManage;
 if(!write&&!canView){
  const {data,error}=await supabase.from("congress_members")
   .select("role").eq("congress_id",congressId).eq("user_id",user.id).maybeSingle();
  if(error)return {error:fail("Không xác minh được phân quyền nhân sự.",500)} as const;
  canView=data?.role==="secretary";
 }
 if(write&&!canManage||!write&&!canView)
  return {error:fail("Không có quyền truy cập danh sách giới thiệu BCH.",403)} as const;
 return {supabase,user} as const;
}

export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  const auth=await authorize(congressId,false);
  if("error" in auth)return auth.error;
  const {data,error}=await auth.supabase.from("bch_candidates").select(
   "id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,display_order,created_at,updated_at"
  ).eq("congress_id",congressId).order("display_order",{ascending:true})
   .order("created_at",{ascending:true}).limit(500);
  if(error)return fail("Không đọc được danh sách nhân sự BCH. Kiểm tra migration v8.",500);
  return NextResponse.json({candidates:data||[]},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Không thể tải danh sách BCH.",500);}
}
export async function POST(request:Request){
 try{
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const auth=await authorize(congressId,true);
  if("error" in auth)return auth.error;
  const checked=validateBchInput(body);
  if(!checked.data)return fail(checked.error||"Dữ liệu không hợp lệ.",400);
  const {data,error}=await auth.supabase.from("bch_candidates").insert({
   congress_id:congressId,created_by:auth.user.id,...checked.data
  }).select().single();
  if(error){
   console.error("bch candidate insert failed",error.code);
   return fail("Không lưu được nhân sự. Kiểm tra cấu hình Supabase BCH v8.",500);
  }
  return NextResponse.json({candidate:data},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Dữ liệu gửi lên không hợp lệ.",400);}
}
export async function PATCH(request:Request){
 try{
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const id=String(body.id||"");
  if(!uuid.test(id))return fail("Mã nhân sự không hợp lệ.",400);
  const auth=await authorize(congressId,true);
  if("error" in auth)return auth.error;
  const checked=validateBchInput(body);
  if(!checked.data)return fail(checked.error||"Dữ liệu không hợp lệ.",400);
  const {data,error}=await auth.supabase.from("bch_candidates")
   .update({...checked.data,updated_at:new Date().toISOString()})
   .eq("id",id).eq("congress_id",congressId).select().maybeSingle();
  if(error)return fail("Không thể cập nhật hồ sơ nhân sự.",500);
  if(!data)return fail("Không tìm thấy hồ sơ nhân sự trong Đại hội.",404);
  return NextResponse.json({candidate:data},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Dữ liệu gửi lên không hợp lệ.",400);}
}
export async function DELETE(request:Request){
 try{
  const body=await request.json();
  const congressId=String(body.congressId||"");
  const id=String(body.id||"");
  if(!uuid.test(id))return fail("Mã nhân sự không hợp lệ.",400);
  const auth=await authorize(congressId,true);
  if("error" in auth)return auth.error;
  const {data,error}=await auth.supabase.from("bch_candidates").delete()
   .eq("id",id).eq("congress_id",congressId).select("id").maybeSingle();
  if(error)return fail("Không thể xóa hồ sơ nhân sự.",500);
  if(!data)return fail("Không tìm thấy hồ sơ cần xóa.",404);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Dữ liệu gửi lên không hợp lệ.",400);}
}
