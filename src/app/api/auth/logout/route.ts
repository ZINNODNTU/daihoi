import {NextRequest,NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
export const dynamic="force-dynamic";
export const runtime="nodejs";

export async function POST(request:NextRequest){
 const origin=request.headers.get("origin");
 if(origin){
  try{const originHost=new URL(origin).host;
   if(originHost!==request.headers.get("host")&&originHost!==request.nextUrl.host)
    return NextResponse.json({error:"Không hợp lệ."},{status:403});}
  catch{return NextResponse.json({error:"Không hợp lệ."},{status:403});}
 }
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)return NextResponse.json({error:"Chưa cấu hình dịch vụ."},{status:503});
 const response=NextResponse.json({ok:true},{headers:{"Cache-Control":"private, no-store"}});
 const client=createServerClient(url,key,{
  cookies:{
   getAll:()=>request.cookies.getAll(),
   setAll(items,responseHeaders){
    for(const {name,value,options} of items){
     response.cookies.set(name,value,{
      ...options,path:"/",sameSite:"lax",secure:request.nextUrl.protocol==="https:",httpOnly:false
     });
    }
    if(responseHeaders)for(const [name,value] of Object.entries(responseHeaders)){
     if(["cache-control","expires","pragma"].includes(name.toLowerCase()))
      response.headers.set(name,value);
    }
   }
  }
 });
 try{
  const {error}=await client.auth.signOut();
  if(error)return NextResponse.json({error:"Không thể đăng xuất. Hãy thử lại."},{status:503});
  response.cookies.delete("daihoi_active_congress");
   return response;
 }catch{return NextResponse.json({error:"Không kết nối được máy chủ đăng xuất."},{status:503});}
}
