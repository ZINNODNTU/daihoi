#!/usr/bin/env node
/**
 * Cấp quyền Super Admin cho tài khoản gốc được người vận hành tạo trực tiếp
 * trong Supabase Authentication > Users.
 *
 * Chỉ chạy ở máy tin cậy có SUPABASE_SECRET_KEY, không mở API công khai.
 * Không yêu cầu hoặc xử lý mật khẩu.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const expectedUrl="https://pnxdxdagpeyqarucdphk.supabase.co";
const internalEmail="admin@accounts.daihoi.invalid";
const loginAlias="admin@dntu.edu.vn";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if(url!==expectedUrl||!key){
 console.error("Sai Supabase project hoặc thiếu server Secret Key.");
 process.exit(1);
}

const admin=createClient(url,key,{
 auth:{persistSession:false,autoRefreshToken:false}
});

const users=[];
for(let page=1;page<=20;page++){
 const {data,error}=await admin.auth.admin.listUsers({page,perPage:200});
 if(error)throw error;
 users.push(...data.users);
 if(data.users.length<200)break;
}
const matches=users.filter(u=>u.email?.toLowerCase()===internalEmail);
if(matches.length!==1){
 console.error("Chưa tìm thấy đúng một tài khoản Auth: "+internalEmail);
 console.error("Vào Authentication > Users, tạo tài khoản này trước khi cấp quyền.");
 process.exitCode=2;
}else{
const user=matches[0];
if(user.is_anonymous){
 throw new Error("Không thể cấp quyền admin cho tài khoản ẩn danh.");
}

const {data:existingAdmins,error:adminsError}=await admin.from("profiles")
 .select("id").eq("platform_role","super_admin").limit(2);
if(adminsError)throw adminsError;
if(existingAdmins.some(p=>p.id!==user.id)){
 throw new Error("Đã tồn tại Super Admin khác; không tự động cấp thêm quyền.");
}

// Tài khoản email nội bộ sử dụng miền .invalid (không gửi mail đến @dntu).
// Nếu người quản trị tạo bằng Dashboard mà chưa bật "Auto confirm user",
// xác thực email nội bộ qua Admin API để có thể đăng nhập.
if(!user.email_confirmed_at){
 const {error}=await admin.auth.admin.updateUserById(user.id,{email_confirm:true});
 if(error)throw error;
}

const {error:upsertError}=await admin.from("profiles").upsert({
 id:user.id,
 full_name:"Quản trị hệ thống",
 platform_role:"super_admin"
},{onConflict:"id"});
if(upsertError)throw upsertError;

const {data:profile,error:verifyError}=await admin.from("profiles")
 .select("id,platform_role").eq("id",user.id).single();
if(verifyError||profile?.platform_role!=="super_admin"){
 throw verifyError || new Error("Không xác minh được quyền super_admin.");
}

console.log("[OK] Tài khoản Auth tồn tại và xác thực email nội bộ.");
console.log("[OK] profiles.platform_role = super_admin.");
console.log("[OK] Tên đăng nhập website: "+loginAlias);
console.log("Đăng nhập tại http://localhost:3000/login bằng mật khẩu đã đặt trong Supabase.");

}
