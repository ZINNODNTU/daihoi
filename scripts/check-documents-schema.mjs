#!/usr/bin/env node
/** Check only the documents schema, without reading document names, IDs or contents. */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error("Thiếu cấu hình Supabase phía server.");process.exit(1);}
const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
let hasError=false;
for(const column of ["id","delegate_visible","drive_file_id","congress_id"]){
 const res=await db.from("documents").select(column).limit(1);
 console.log(JSON.stringify({column,ok:!res.error,code:res.error?.code||null,
  message:res.error?.message?.replace(/[\r\n]/g," ").slice(0,180)||null}));
 hasError ||= !!res.error;
}
const r=await db.from("documents").select("id",{head:true,count:"exact"});
console.log("DOCUMENT_COUNT",r.error?"unavailable":r.count);
console.log("PROJECT",new URL(url).hostname.split(".")[0]);
if(hasError)process.exitCode=2;
