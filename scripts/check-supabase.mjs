#!/usr/bin/env node
/** Chẩn đoán kết nối Supabase thật, không in khóa hay dữ liệu người dùng. */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publishable=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
const secret=(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const expectedUrl="https://pnxdxdagpeyqarucdphk.supabase.co";
let errors=0;
function state(ok,text){console.log((ok?"[OK] ":"[LỖI] ")+text);if(!ok)errors++;}

console.log("ĐẠI HỘI SỐ — kiểm tra kết nối Supabase");
state(url===expectedUrl,"Đúng project pnxdxdagpeyqarucdphk.");
state(Boolean(publishable),"Publishable Key hoặc legacy anon key: "+(publishable?"đã nhập":"đang thiếu"));
state(Boolean(secret),"Secret Key hoặc legacy service_role: "+(secret?"đã nhập":"đang thiếu"));

if(url===expectedUrl){
 try{
  const response=await fetch(expectedUrl+"/auth/v1/health",{
   headers:publishable?{apikey:publishable}:undefined,
   signal:AbortSignal.timeout(10000)
  });
  const reachable=response.ok||[401,403].includes(response.status);
  state(reachable,reachable?"Supabase Auth phản hồi từ máy local.":"Không truy cập được Supabase Auth (HTTP "+response.status+").");
  if(publishable){
   state(response.ok,response.ok?
    "Publishable Key đã được Supabase chấp nhận.":
    "Publishable Key chưa được xác thực (HTTP "+response.status+"). Hãy kiểm tra đúng project.");
  }else console.log("[INFO] Auth trả HTTP 401 khi không có API key là bình thường, không có nghĩa máy chủ mất kết nối.");

  if(secret){
   const admin=createClient(expectedUrl,secret,{auth:{persistSession:false,autoRefreshToken:false}});
   const {error}=await admin.auth.admin.listUsers({page:1,perPage:1});
   state(!error,!error?"Server Secret Key có quyền đọc Supabase Auth.":"Server Secret Key bị từ chối ("+(error.code||"Auth error")+").");
   if(!error){
    const {error:tableError}=await admin.from("delegates").select("id,student_id").limit(1);
    if(tableError)console.log("[CẦN KIỂM TRA] Chưa thấy cột delegates.student_id. Chạy migration v5 nếu dự án chưa cập nhật.");
    else console.log("[OK] Đọc được bảng đại biểu theo schema v5.");
   }
  }
 }catch(error){
  state(false,error instanceof Error?"Không kết nối mạng tới Supabase: "+error.message:"Không xác định được trạng thái mạng.");
 }
}
if(errors){
 console.log("\nHướng xử lý: chạy npm run setup:supabase trên máy Windows để cấu hình key trong .env.local;");
 console.log("sau đó khởi động lại npm run dev và chạy npm run check:supabase.");
 process.exitCode=1;
}else console.log("\nCấu hình và kết nối Supabase đã xác minh thành công.");
