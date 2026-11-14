import "server-only";
import {createServerClient} from "@supabase/ssr";
import {NextRequest,NextResponse} from "next/server";

export function createExchangeClient(request:NextRequest,response:NextResponse){
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)throw Error("Dịch vụ Supabase chưa sẵn sàng.");
 return createServerClient(base,key,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll(changes){
   for(const {name,value,options} of changes){
    request.cookies.set(name,value);
    response.cookies.set(name,value,{...options,path:"/",sameSite:"lax",
     secure:request.nextUrl.protocol==="https:",httpOnly:false});
   }
  }
 }});
}
