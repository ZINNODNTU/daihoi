import {DEFAULT_DELEGATE_PASSWORD} from "@/lib/delegate-password-policy";
import {isSameDelegateIdentity} from "@/lib/delegate-identity";
import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {toSupabaseAuthEmail} from "@/lib/login-identity";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});

type Created={id:string;name:string;email:string;password:string};
type Issue={id:string;name:string;reason:string};

/** Chỉ quản trị viên Đại hội được quyền cấp tài khoản và xem mật khẩu khởi tạo một lần. */
export async function POST(request:Request){
 try{
  if(!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
   return fail("Chưa cấu hình Supabase Publishable Key.",503);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Cần đăng nhập.",401);
  let body:{congressId?:unknown;delegateIds?:unknown};
  try{body=await request.json();}catch{return fail("Dữ liệu không hợp lệ.",400);}
  const congressId=String(body.congressId??"");
  if(!uuid.test(congressId)||!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return fail("Không có quyền cấp tài khoản.",403);
  const ids=body.delegateIds;
  if(!Array.isArray(ids)||!ids.length||ids.length>100||
    ids.some(id=>typeof id!=="string"||!uuid.test(id))||new Set(ids).size!==ids.length)
   return fail("Chọn từ 1 đến 100 đại biểu hợp lệ mỗi lần.",400);
  let db:ReturnType<typeof createAdminClient>;
  try{db=createAdminClient();}catch{return fail("Máy chủ chưa cấu hình SUPABASE_SECRET_KEY để cấp tài khoản.",503);}
  const {data:delegates,error}=await db.from("delegates")
   .select("id,full_name,student_id,login_email,auth_user_id,delegate_type,birth_date")
   .eq("congress_id",congressId).eq("is_active",true).in("id",ids);
  if(error)return fail("Không tải được hồ sơ đại biểu. Cần cập nhật schema v5.",500);
  const created:Created[]=[];
  const errors:Issue[]=[];
  let linkedExisting=0;

  // Một MSSV có thể tham dự nhiều Đại hội: tái sử dụng đúng Auth user, không đặt lại mật khẩu.
  async function findExisting(email:string){
   for(let page=1;page<=20;page++){
    const {data,error:lookupError}=await db.auth.admin.listUsers({page,perPage:200});
    if(lookupError)throw new Error("Không thể tra cứu tài khoản hiện có.");
    const match=data.users.find(record=>record.email?.toLowerCase()===email);
    if(match)return match;
    if(data.users.length<200)return null;
   }
   throw new Error("Danh sách người dùng quá lớn để tra cứu an toàn.");
  }

  for(const d of delegates??[]){
   const name=String(d.full_name??"");
   if(d.auth_user_id){errors.push({id:d.id,name,reason:"Đã có tài khoản."});continue;}
   if(!d.student_id||!d.login_email){errors.push({id:d.id,name,reason:"Thiếu MSSV hoặc email đăng nhập."});continue;}
   const email=String(d.login_email).toLowerCase();
   if(email!==String(d.student_id).toLowerCase()+"@dntu.edu.vn"){
    errors.push({id:d.id,name,reason:"Email đăng nhập không đúng MSSV."});continue;
   }
   const authEmail=toSupabaseAuthEmail(email);
   let targetId="";
   let issuedPassword="";
   let isNew=false;
   try{
    const existing=await findExisting(authEmail);
    if(existing){
     targetId=existing.id;
    }else{
     // Only freshly created Auth identities receive the default password.
     // Never reset a pre-existing account when it joins another congress.
     issuedPassword=DEFAULT_DELEGATE_PASSWORD;
     const {data:account,error:createError}=await db.auth.admin.createUser({
      email:authEmail,password:issuedPassword,email_confirm:true,
      user_metadata:{full_name:name,login_alias:email},app_metadata:{provisioned_by:"daihoi"}
     });
     if(createError||!account.user)throw createError||new Error("Không thể tạo tài khoản.");
     targetId=account.user.id;
     isNew=true;
    }

    // Verify the existing account belongs to the same person before linking.
     // Matching email/MSSV alone is not sufficient to merge identities.
     const priorResult=await db.from("delegates")
      .select("full_name,student_id,unit,position,gender,birth_date,photo_path")
      .eq("auth_user_id",targetId).eq("is_active",true).limit(20);
     if(priorResult.error)throw new Error("Không thể xác minh danh tính tài khoản cũ.");
     const previous=priorResult.data||[];
     if(previous.some(item=>
      (item.student_id&&String(item.student_id).toLowerCase()!==String(d.student_id).toLowerCase())||
      !isSameDelegateIdentity(String(item.full_name||""),name)||
      (item.birth_date&&d.birth_date&&item.birth_date!==d.birth_date)))
      throw new Error("MSSV, họ tên hoặc ngày sinh khác hồ sơ đã liên kết. BTC cần xác minh đúng người trước khi ghép tài khoản.");
     const memberRole=d.delegate_type==="guest"?"guest":"delegate";
    const {error:membershipError}=await db.from("congress_members").insert({
     congress_id:congressId,user_id:targetId,role:memberRole
    });
    // Tài khoản có thể là BTC hiện hữu: tuyệt đối không hạ quyền thành delegate.
    const membershipPreexisting=membershipError?.code==="23505";
    if(membershipError&&!membershipPreexisting)throw new Error("Không thể gán quyền truy cập Đại hội.");

    const {data:linked,error:linkError}=await db.from("delegates")
     .update({auth_user_id:targetId,...(previous.length?{
      full_name:previous[0].full_name,unit:previous[0].unit,
      position:previous[0].position,gender:previous[0].gender,
      birth_date:previous[0].birth_date,photo_path:previous[0].photo_path
     }:{})})
     .eq("id",d.id).eq("congress_id",congressId)
     .is("auth_user_id",null).select("id").maybeSingle();
    if(linkError||!linked){
     if(!membershipPreexisting){
      await db.from("congress_members").delete()
       .eq("congress_id",congressId).eq("user_id",targetId);
     }
     throw new Error("Không thể liên kết hồ sơ đại biểu.");
    }
    if(isNew)created.push({id:d.id,name,email,password:issuedPassword});
    else linkedExisting++;
    // Không bao giờ ghi mật khẩu vào audit/log/database.
    const {error:auditError}=await db.from("audit_logs").insert({
     congress_id:congressId,actor_id:user.id,
     action:isNew?"delegate.account_created":"delegate.account_linked",
     target_id:d.id,details:{email,userId:targetId,role:memberRole}
    });
    if(auditError)console.error("delegate account audit failure",auditError.code);
   }catch(reason){
    if(isNew&&targetId)await db.auth.admin.deleteUser(targetId);
    errors.push({id:d.id,name,reason:reason instanceof Error?reason.message:"Không tạo được tài khoản."});
   }
  }
  if((delegates??[]).length!==ids.length){
   const found=new Set((delegates??[]).map(d=>d.id));
   for(const id of ids)if(!found.has(id))
    errors.push({id,name:"",reason:"Không tìm thấy đại biểu đang hoạt động."});
  }
  if(created.length||linkedExisting)
   await writeSystemLog({level:"info",source:"auth",event:"delegate.accounts_provisioned",
    message:"Quản trị đã cấp hoặc liên kết tài khoản đại biểu.",actorId:user.id,congressId,
    context:{operation:"delegate.provision",endpoint:"/api/delegates/accounts",httpMethod:"POST"}});
  return NextResponse.json({created,linkedExisting,errors},{
   headers:{"Cache-Control":"no-store","Pragma":"no-cache"}
  });
 }catch{
  return fail("Không xử lý được yêu cầu cấp tài khoản. Hãy thử lại hoặc kiểm tra cấu hình Supabase.",500);
 }
}