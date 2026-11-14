import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {IMPERSONATION_COOKIE,IMPERSONATION_TRACE_COOKIE,readActingSession} from "@/lib/impersonation";
export async function proxy(request: NextRequest) {
    // Public pages and the login handler do not need an extra JWT verification.
  // This keeps the first-visit surge from consuming unnecessary auth requests.
  const path=request.nextUrl.pathname;
  const actingCookie=request.cookies.has(IMPERSONATION_COOKIE+"_n");
  const actingTrace=request.cookies.has(IMPERSONATION_TRACE_COOKIE);
  // A real acting session is allowed to execute normal RLS-protected writes.
  // When it expires, stop ALL API mutations and require Admin recovery.
  if((actingCookie||actingTrace)&&path!=="/acting/expired"&&
   path!=="/api/admin/impersonation/stop"&&path!=="/api/auth/logout"&&
   path!=="/login"&&path!=="/api/auth/login"){
   const acting=readActingSession(request.cookies);
   if(!acting||acting.expiresAt<=Math.floor(Date.now()/1000)){
    if(path.startsWith("/api/"))
     return NextResponse.json({error:"Phiên đóng vai đã hết hạn. Thoát đóng vai để tiếp tục."},
      {status:401,headers:{"Cache-Control":"no-store"}});
    return NextResponse.redirect(new URL("/acting/expired",request.url));
   }
   // Password, credential and identity changes are not part of delegated
   // congress work. Everything else executes with the target's real JWT.
   if(path==="/account"||path.startsWith("/api/admin/impersonation/start")){
    if(path.startsWith("/api/"))
     return NextResponse.json({error:"Không được đổi danh tính trong phiên đóng vai."},
      {status:403,headers:{"Cache-Control":"no-store"}});
    return NextResponse.redirect(new URL("/dashboard",request.url));
   }
  }
  if(path==="/"||path==="/login"||path==="/preview"||path==="/api/auth/login"||
    path==="/guest"||path.startsWith("/guest/"))
    return NextResponse.next({request});
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
        setAll(items,responseHeaders){
          items.forEach(({name,value})=>request.cookies.set(name,value));
          response=NextResponse.next({request});
          items.forEach(({name,value,options})=>response.cookies.set(name,value,{
            ...options,path:"/",sameSite:"lax",
            secure:request.nextUrl.protocol==="https:",httpOnly:false
          }));
          if(responseHeaders)for(const [name,value] of Object.entries(responseHeaders)){
            if(["cache-control","expires","pragma"].includes(name.toLowerCase()))
              response.headers.set(name,value);
          }
        }
      }
    }
  );
  try { await supabase.auth.getClaims(); } catch { /* API kiểm tra auth thật trong từng route; không làm sập trang công khai. */ }
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"]};
