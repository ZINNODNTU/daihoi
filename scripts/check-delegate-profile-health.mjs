import {readFileSync} from "node:fs";
import {createClient} from "@supabase/supabase-js";
const entries=readFileSync(".env.local","utf8").split(/\r?\n/);
const env={};
for(const line of entries){
 const match=/^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
 if(match)env[match[1]]=match[2].replace(/^["']|["']$/g,"");
}
const url=env.NEXT_PUBLIC_SUPABASE_URL;
const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.log("CONFIG: thiếu URL hoặc secret server");process.exitCode=2;}
else{
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const fields="id,congress_id,auth_user_id,is_active,full_name,unit,position,gender,birth_date";
 const result=await db.from("delegates").select(fields,{head:true,count:"exact"}).limit(1);
 console.log("PROFILE_COLUMNS_QUERY:",result.error?"FAILED":"OK");
 if(result.error){
  console.log("ERROR_CODE:",result.error.code||"unknown");
  console.log("ERROR_MESSAGE:",String(result.error.message||"").slice(0,240));
  process.exitCode=3;
 }else{
  console.log("PROFILE_COLUMNS:",fields.split(",").length,"columns available");
  console.log("DELEGATE_COUNT:",result.count??"unknown");
  const check=await db.from("delegates").select("id,auth_user_id,is_active").not("auth_user_id","is",null).limit(20);
  if(check.error){console.log("BOUND_ACCOUNTS_QUERY: FAILED",check.error.code||"");process.exitCode=4;}
  else{
   const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   const rows=check.data||[];
   console.log("BOUND_ACCOUNTS_QUERY: OK");
   console.log("SAMPLED_ACCOUNT_ID_SHAPE:",rows.every(row=>uuid.test(row.id))?"VALID_UUID":rows.length?"NON_STANDARD":"NO_SAMPLES");
   console.log("SAMPLED_ACTIVE:",rows.filter(row=>row.is_active).length);
   console.log("No delegate personal data was printed or modified.");
  }
 }
}
