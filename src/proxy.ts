import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function proxy(request: NextRequest) {
    const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    const pathname=request.nextUrl.pathname;
    if(pathname.startsWith("/api/")){
      return NextResponse.json({error:"Supabase chưa cấu hình. Thiếu public key trong máy chủ."},{status:503,headers:{"Cache-Control":"no-store"}});
    }
    if(pathname==="/dashboard" || pathname.startsWith("/dashboard/") || pathname==="/congresses" || pathname.startsWith("/congresses/")){
      const redirectUrl=new URL("/login",request.url);
      redirectUrl.searchParams.set("setup","supabase");
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next({ request });
  }
  let response=NextResponse.next({request});
  const supabase=createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    key,
    {
      cookies:{
        getAll:()=>request.cookies.getAll(),
        setAll(items){
          items.forEach(({name,value})=>request.cookies.set(name,value));
          response=NextResponse.next({request});
          items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
        }
      }
    }
  );
  try { await supabase.auth.getClaims(); } catch { /* API kiểm tra auth thật trong từng route; không làm sập trang công khai. */ }
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"]};
