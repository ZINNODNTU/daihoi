#!/usr/bin/env node
// Read-only diagnostics, intentionally logs only counts/error codes, never PII or secrets.
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error("Missing database server settings");process.exit(1);}
console.log("DATABASE_REF",new URL(url).hostname.split(".")[0]);
const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const probes=[
 ["delegates.id",()=>admin.from("delegates").select("id",{head:true,count:"exact"}).limit(0)],
 ["delegates.gender",()=>admin.from("delegates").select("gender").limit(0)],
 ["delegates.birth_date",()=>admin.from("delegates").select("birth_date").limit(0)],
 ["delegates.delegate_type",()=>admin.from("delegates").select("delegate_type").limit(0)],
 ["checkins.checked_in_at",()=>admin.from("checkins").select("checked_in_at",{head:true,count:"exact"}).limit(0)],
 ["checkins.congress_id",()=>admin.from("checkins").select("congress_id").limit(0)],
 ["attendance_sessions.created_at",()=>admin.from("attendance_sessions").select("created_at").limit(0)]
];
let failed=0;
for(const [name,fn] of probes){
 try{const r=await fn();
  console.log(JSON.stringify({name,ok:!r.error,code:r.error?.code||null,reason:r.error?.message?.slice(0,180)||null,count:r.count??undefined}));
  if(r.error)failed++;
 }catch(e){failed++;console.log(JSON.stringify({name,ok:false,error:e instanceof Error?e.name:"unknown"}));}
}
const count=await admin.from("checkins").select("id",{count:"exact",head:true});
console.log("CHECKINS_COUNT",count.count??"unavailable");
const delegates=await admin.from("delegates").select("id",{count:"exact",head:true});
console.log("DELEGATES_COUNT",delegates.count??"unavailable");
if(failed)process.exitCode=2;
