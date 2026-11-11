import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {toSupabaseAuthEmail} from "@/lib/login-identity";
import {writeSystemLog} from "@/lib/system-log";

export const dynamic="force-dynamic";
export const runtime="nodejs";

const headers={"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","Vary":"Cookie"};

function fail(error:string,status:number){
 return NextResponse.json({error},{status,headers:status===429?{...headers,"Retry-After":"15"}:headers});
}

export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");
 if(origin){
  try{
   const originHost=new URL(origin).host;
   const requestHost=request.headers.get("host");
   if(originHost!==requestHost&&originHost!==request.nextUrl.host)return fail("Yêu cầu không hợp lệ.",403);
  }catch{return fail("Yêu cầu không hợp lệ.",403);}
 }
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)return fail("Máy chủ chưa cấu hình Supabase. Liên hệ quản trị viên.",503);
 let body:unknown;
 try{body=await request.json();}catch{return fail("Dữ liệu đăng nhập không hợp lệ.",400);}
 if(!body||typeof body!=="object")return fail("Dữ liệu đăng nhập không hợp lệ.",400);
 const {email,password}=body as {email?:unknown;password?:unknown};
 if(typeof email!=="string"||typeof password!=="string"||
  !email.includes("@")||email.length>254||password.length<1||password.length>512)
  return fail("Địa chỉ đăng nhập hoặc mật khẩu không hợp lệ.",400);
 const normalized=email.trim().toLowerCase();
 const internal=toSupabaseAuthEmail(normalized);
 const reply=NextResponse.json({ok:true,destination:"/my-card"},{
  status:200,headers
 });
 // Host-only cookies: on HTTP LAN use secure=false; HTTPS in production secure=true.
 // HTTP-only cookies can't be read by the Supabase browser client, so leave httpOnly=false.
 const secure=request.nextUrl.protocol==="https:";
 const supabase=createServerClient(base,key,{
  cookies:{
   getAll:()=>request.cookies.getAll(),
   setAll(items,responseHeaders){
    items.forEach(({name,value,options})=>reply.cookies.set(name,value,{
     ...options,path:"/",sameSite:"lax",secure,httpOnly:false
    }));
    if(responseHeaders){
     for(const [name,value] of Object.entries(responseHeaders)){
      if(["cache-control","expires","pragma"].includes(name.toLowerCase()))
       reply.headers.set(name,value);
     }
    }
   }
  }
 });
 try{
  let result=await supabase.auth.signInWithPassword({email:internal,password});
  if(result.error&&internal!==normalized){
   result=await supabase.auth.signInWithPassword({email:normalized,password});
  }
  if(result.error||!result.data.user){
   if(result.error?.status===429){
     await writeSystemLog({level:"warning",source:"auth",event:"auth.rate_limited",
      message:"Supabase Auth giới hạn số lượt đăng nhập.",statusCode:429,
      context:{operation:"signInWithPassword",endpoint:"/api/auth/login"}});
     return fail("Hệ thống đang nhận nhiều lượt đăng nhập. Vui lòng đợi 15 giây rồi thử lại.",429);
    }
   return fail("Tên đăng nhập hoặc mật khẩu không đúng.",401);
  }
  const id=result.data.user.id;
  const [profile,members]=await Promise.all([
   supabase.from("profiles").select("platform_role").eq("id",id).maybeSingle(),
   supabase.from("congress_members").select("role").eq("user_id",id)
    .in("role",["admin","checkin","secretary"]).limit(1)
  ]);
  const staff=profile.data?.platform_role==="super_admin"||Boolean(members.data?.length);
  // Newly issued cookies must accompany the same-origin HTTP response.
  const destination=staff?"/dashboard":"/my-card";
  const data=NextResponse.json({ok:true,destination},{headers});
  reply.cookies.getAll().forEach(cookie=>data.cookies.set(cookie));
  return data;
 }catch{
  await writeSystemLog({level:"error",source:"auth",event:"auth.login_service_failed",
    message:"Dịch vụ đăng nhập không hoạt động như mong đợi.",statusCode:503,
    context:{operation:"signInWithPassword",endpoint:"/api/auth/login"}});
   return fail("Không thể kết nối máy chủ xác thực. Kiểm tra mạng và thử lại.",503);
 }
}
