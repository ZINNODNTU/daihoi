import "server-only";
import {createClient} from "@supabase/supabase-js";
/**
 * Chỉ server API được dùng client này. KHÔNG gọi trong React Client Components.
 * Secret Key bypass RLS: luôn kiểm tra Supabase Auth & role bằng getAuth trước.
 */
export function createAdminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SECRET_KEY;
 if(!url||!key||key.length<30)throw new Error("Thiếu SUPABASE_SECRET_KEY cho API điểm danh.");
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{"X-Client-Info":"daihoi-checkin-server"}}});
}
