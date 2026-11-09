import {readFileSync} from "node:fs";
import {createClient} from "@supabase/supabase-js";

const config={};
for(const line of readFileSync(".env.local","utf8").split(/\r?\n/)){
 const match=/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
 if(match)config[match[1]]=match[2].replace(/^["']|["']$/g,"");
}
const url=config.NEXT_PUBLIC_SUPABASE_URL;
const secret=config.SUPABASE_SECRET_KEY||config.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!secret){
 console.error("CHƯA CẤU HÌNH: cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SECRET_KEY.");
 process.exitCode=2;
}else{
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const [table,columns] of [
  ["seating_layouts","id,congress_id,version,grid_rows,grid_columns"],
  ["seats","id,layout_id,congress_id,code,seat_type"],
  ["seating_templates","id,organization_id,created_by,visibility,seat_count"]
 ]){
  const result=await db.from(table).select(columns).limit(0);
  if(result.error){
   console.error(table+": MISSING/ERROR "+(result.error.code||"unknown"));
   process.exitCode=1;
  }else console.log(table+": OK");
 }
 console.log("Kiểm tra chỉ đọc; không in thông tin cá nhân hoặc bí mật.");
}
