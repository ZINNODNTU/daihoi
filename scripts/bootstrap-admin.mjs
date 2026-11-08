import process from "node:process";
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const loginAlias="admin@dntu.edu.vn";
// Không xác minh hộp thư dntu.edu.vn mà BTC không sở hữu: dùng email Auth .invalid.
const email="admin@accounts.daihoi.invalid";
const password=process.env.DAIHOI_BOOTSTRAP_PASSWORD;
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!key||!password){
 console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY / DAIHOI_BOOTSTRAP_PASSWORD.");
 process.exit(1);
}
if(password.length<12){
 console.error("Mật khẩu ban đầu phải dài từ 12 ký tự.");
 process.exit(1);
}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
let alreadyExists=false;
for(let page=1;page<=20;page++){
 const {data,error}=await db.auth.admin.listUsers({page,perPage:200});
 if(error)throw error;
 if(data.users.some(u=>[email,loginAlias].includes(u.email?.toLowerCase()||""))){alreadyExists=true;break;}
 if(data.users.length<200)break;
}
if(alreadyExists){
 console.error("Email đã tồn tại. Không nâng quyền hoặc đổi mật khẩu tài khoản đang có.");
 process.exit(2);
}
const {data:created,error}=await db.auth.admin.createUser({
 email,password,email_confirm:true,
 user_metadata:{full_name:"Quản trị hệ thống",login_alias:loginAlias},
 app_metadata:{login_origin:"admin_bootstrap"}
});
if(error||!created.user)throw error||new Error("Không tạo được user.");
const {error:profileError}=await db.from("profiles").upsert({
 id:created.user.id,full_name:"Quản trị hệ thống",platform_role:"super_admin"
},{onConflict:"id"});
if(profileError){
 await db.auth.admin.deleteUser(created.user.id);
 throw new Error("Không gán được quyền super_admin; đã dọn tài khoản tạm.");
}
console.log("Đã tạo tài khoản Super Admin. Tên đăng nhập:",loginAlias);
console.log("Email Auth dùng miền dự trữ .invalid; không gửi email tới dntu.edu.vn.");
console.log("Không dùng chức năng quên mật khẩu qua email chưa sở hữu; đổi mật khẩu ban đầu ngay sau khi đăng nhập.");
