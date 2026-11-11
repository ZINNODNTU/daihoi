import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {validateBchInput} from "@/lib/bch-candidates";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";

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
  // Secretary access additionally requires an active, congress-scoped BTC identity.
  canView=["delegate","guest"].includes(data?.role||"")||
   (data?.role==="secretary"&&await hasRole(supabase,user.id,congressId,"viewer"));
   if(!canView){
    const own=await createAdminClient().from("delegates").select("id")
     .eq("congress_id",congressId).eq("auth_user_id",user.id)
     .eq("is_active",true).limit(1);
    if(own.error)return {error:fail("Không xác minh được hồ sơ đại biểu.",500)} as const;
    canView=Boolean(own.data?.length);
   }
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
  const {data,error}=await createAdminClient().from("bch_candidates").select(
   "id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at"
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
  await writeSystemLog({level:"info",source:"api",event:"bch.candidate_created",
   message:"Quản trị đã thêm nhân sự giới thiệu BCH.",actorId:auth.user.id,congressId,
   context:{operation:"bch.create",endpoint:"/api/bch-candidates",httpMethod:"POST"}});
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
  await writeSystemLog({level:"info",source:"api",event:"bch.candidate_updated",
   message:"Quản trị đã sửa nhân sự giới thiệu BCH.",actorId:auth.user.id,congressId,
   context:{operation:"bch.update",endpoint:"/api/bch-candidates",httpMethod:"PATCH"}});
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
   .eq("id",id).eq("congress_id",congressId).select("id,photo_path").maybeSingle();
  if(error)return fail("Không thể xóa hồ sơ nhân sự.",500);
  if(!data)return fail("Không tìm thấy hồ sơ cần xóa.",404);
  const expected=congressId+"/bch/"+id+".jpg";
  if(data.photo_path===expected){
   const {error:cleanupError}=await createAdminClient().storage
    .from("delegate-photos").remove([expected,expected.replace(/\.jpg$/i,"-96.jpg"),expected.replace(/\.jpg$/i,"-160.jpg")]);
   if(cleanupError)console.error("bch photo cleanup failed",cleanupError.name);
  }
  await writeSystemLog({level:"warning",source:"api",event:"bch.candidate_deleted",
   message:"Quản trị đã xóa nhân sự giới thiệu BCH.",actorId:auth.user.id,congressId,
   context:{operation:"bch.delete",endpoint:"/api/bch-candidates",httpMethod:"DELETE"}});
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Dữ liệu gửi lên không hợp lệ.",400);}
}
