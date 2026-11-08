#!/usr/bin/env node
/**
 * Gán quyền Super Admin cho tài khoản khởi tạo bằng Supabase Dashboard.
 * Chỉ dùng trên máy chủ local được quản trị, đúng project và đúng email.
 * Không đọc, lưu hay in mật khẩu.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const expectedUrl="https://pnxdxdagpeyqarucdphk.supabase.co";
const loginAlias="admin@dntu.edu.vn";
const internalEmail="admin@accounts.daihoi.invalid";
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==expectedUrl){
  throw new Error("Sai Supabase project; từ chối cấp quyền.");
}
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!key)throw new Error("Thiếu SUPABASE_SECRET_KEY.");
const admin=createClient(expectedUrl,key,{auth:{persistSession:false,autoRefreshToken:false}});
const allUsers=[];
for(let page=1;page<=20;page++){
 const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});
 if(error)throw error;
 allUsers.push(...data.users);
 if(data.users.length<200)break;
}
const matches=allUsers.filter(u=>[internalEmail,loginAlias].includes(u.email?.toLowerCase()||""));
if(matches.length!==1){
 console.error("Cần đúng một tài khoản ban đầu: "+loginAlias+" hoặc "+internalEmail+".");
 process.exitCode=2;
}else{
 const user=matches[0];
 if(user.is_anonymous)throw new Error("Tài khoản ẩn danh không được cấp quyền.");
 const {data:admins,error:adminsError}=await admin.from("profiles")
  .select("id").eq("platform_role","super_admin").limit(2);
 if(adminsError)throw adminsError;
 if(admins.some(p=>p.id!==user.id)){
   throw new Error("Đã có Super Admin khác; từ chối cấp thêm quyền.");
 }
 if(user.email?.toLowerCase()===loginAlias){
  // Đồng nhất với mapping trong src/lib/login-identity.ts.
  // Chuyển Auth email sang miền nội bộ không tồn tại để ngăn
  // người sở hữu email @dntu.edu.vn chiếm tài khoản qua password reset.
  const {error:updateError}=await admin.auth.admin.updateUserById(user.id,{
   email:internalEmail,email_confirm:true,
   user_metadata:{...user.user_metadata,login_alias:loginAlias}
  });
  if(updateError)throw updateError;
  console.log("[OK] Chuyển Auth email sang miền nội bộ an toàn; mật khẩu giữ nguyên.");
 }else if(!user.email_confirmed_at){
  const {error:confirmError}=await admin.auth.admin.updateUserById(user.id,{email_confirm:true});
  if(confirmError)throw confirmError;
 }
 const {error:upsertError}=await admin.from("profiles").upsert({
  id:user.id,full_name:"Quản trị hệ thống",platform_role:"super_admin"
 },{onConflict:"id"});
 if(upsertError)throw upsertError;
 const [{data:profile,error:profileError},{data:verified,error:userError}]=await Promise.all([
  admin.from("profiles").select("id,platform_role").eq("id",user.id).single(),
  admin.auth.admin.getUserById(user.id)
 ]);
 if(profileError||profile?.platform_role!=="super_admin"){
  throw profileError||new Error("Không xác minh được profile super_admin.");
 }
 if(userError||verified.user.email!==internalEmail||!verified.user.email_confirmed_at){
  throw userError||new Error("Không xác minh được email nội bộ.");
 }
 console.log("[OK] Auth user hợp lệ; profile.platform_role = super_admin.");
 console.log("[OK] Tên đăng nhập website: "+loginAlias);
 console.log("Mật khẩu: giữ nguyên mật khẩu đã nhập trong Supabase.");
}
