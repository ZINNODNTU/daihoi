#!/usr/bin/env node
/** Kiem tra live Supabase: key, Auth, schema v2-v5 va quyen RLS.
 * KHONG in mat khau, Secret Key, token, hay du lieu dai bieu.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const expectedUrl="https://pnxdxdagpeyqarucdphk.supabase.co";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()??"";
const publishable=(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"").trim();
const secret=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
let failures=0;
function state(ok,message){console.log((ok?"[OK] ":"[LỖI] ")+message);if(!ok)failures++;}
const clientOptions={auth:{persistSession:false,autoRefreshToken:false}};

console.log("ĐẠI HỘI SỐ — kiểm tra triển khai Supabase");
state(url===expectedUrl,"Đúng project pnxdxdagpeyqarucdphk.");
state(Boolean(publishable),"Publishable Key đã được cấu hình.");
state(Boolean(secret),"Server Secret Key đã được cấu hình.");
if(url===expectedUrl){
 try{
  const response=await fetch(expectedUrl+"/auth/v1/health",{
   headers:publishable?{apikey:publishable}:undefined,
   signal:AbortSignal.timeout(12000)
  });
  state(response.ok,"Supabase Auth và Publishable Key phản hồi hợp lệ.");
  if(secret){
   const admin=createClient(expectedUrl,secret,clientOptions);
   const {data:list,error:userError}=await admin.auth.admin.listUsers({page:1,perPage:200});
   state(!userError,"Server Secret Key có quyền truy cập Auth.");
   if(!userError){
    const users=[...list.users];
    if(users.length===200){
     for(let page=2;page<=30;page++){
      const result=await admin.auth.admin.listUsers({page,perPage:200});
      if(result.error){state(false,"Không thể phân trang danh sách Auth.");break;}
      users.push(...result.data.users);
      if(result.data.users.length<200)break;
     }
    }
    const matches=users.filter(u=>u.email?.toLowerCase()==="admin@accounts.daihoi.invalid");
    state(matches.length===1&&Boolean(matches[0]?.email_confirmed_at),"Super Admin Auth tồn tại và đã xác thực.");
    if(matches.length===1){
     const {data:profile,error:profileError}=await admin.from("profiles").select("platform_role").eq("id",matches[0].id).single();
     state(!profileError&&profile?.platform_role==="super_admin","Tài khoản có quyền profiles.platform_role=super_admin.");
    }
   }
   const checks=[
    ["profiles","platform_role"],["congresses","id"],
    ["attendance_sessions","qr_policy"],["delegates","barcode_code"],
    ["delegates","student_id"],["delegates","position"],
    ["delegates","login_email"],["delegates","auth_user_id"],
    ["checkins","qr_scope"],["seating_layouts","id"],
    ["seats","id"],["seat_assignments","seat_id"],
    ["seating_layouts","grid_rows"],["seating_layouts","grid_columns"],["seats","seat_type"]
   ];
   for(const [table,column] of checks){
    const {error}=await admin.from(table).select(column).limit(0);
    state(!error,table+"."+column+" hiện diện"+(error?" ("+error.code+")":"")+".");
   }
  }
  if(publishable){
   const anon=createClient(expectedUrl,publishable,clientOptions);
   const {error:seatingError}=await anon.from("seating_layouts").select("id").limit(0);
   state(seatingError?.code==="42501","Quyền đọc bảng sơ đồ ghế bị chặn với anon.");
   // Must be denied before reaching DB function validation, with no write possible.
   const {error:rpcError}=await anon.rpc("seating_save_layout",{
    p_congress_id:"00000000-0000-0000-0000-000000000000",
    p_layout_id:"00000000-0000-0000-0000-000000000000",
    p_expected_version:0,
    p_actor:"00000000-0000-0000-0000-000000000000",
    p_title:"check",p_stage_label:"check",p_seats:[]
   });
   state(rpcError?.code==="42501","Quyền gọi RPC sơ đồ ghế bị chặn với anon.");
   const {error:v6Error}=await anon.rpc("seating_save_layout_v6",{
    p_congress_id:"00000000-0000-0000-0000-000000000000",
    p_layout_id:"00000000-0000-0000-0000-000000000000",
    p_expected_version:0,p_actor:"00000000-0000-0000-0000-000000000000",
    p_title:"check",p_stage_label:"check",p_grid_rows:10,p_grid_columns:20,p_seats:[]
   });
   state(v6Error?.code==="42501","Quyền ghi sơ đồ v6 bị chặn với anon.");
  }
 }catch(error){
  state(false,"Không kết nối được Supabase: "+(error instanceof Error?error.name:"unknown"));
 }
}
if(failures){
 console.error("Chưa đạt "+failures+" bước kiểm tra. Xem README phần triển khai Supabase.");
 process.exitCode=1;
}else console.log("Supabase và schema v2–v6 đã kiểm tra thành công.");
