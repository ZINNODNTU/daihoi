import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
export async function createClient() {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Thiếu cấu hình Supabase trên máy chủ.");
  return createServerClient(url,key,{
    cookies:{
      getAll(){ return jar.getAll(); },
      setAll(items){
        try { items.forEach(({name,value,options})=>jar.set(name,value,options)); }
        catch { /* Server Component không cho phép ghi cookie; proxy làm mới session. */ }
      }
    }
  });
}
