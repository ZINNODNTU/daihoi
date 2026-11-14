#!/usr/bin/env node
/**
 * Read-only production schema gate for daihoi.
 * Probes exact project and column availability via PostgREST without reading rows.
 * Security grants, RLS policy definitions, replication and index health require SQL/Advisors.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());

const expected="https://pnxdxdagpeyqarucdphk.supabase.co";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
if(url!==expected){
 console.error("[BLOCK] Wrong Supabase project. Only pnxdxdagpeyqarucdphk is allowed.");
 process.exit(2);
}
if(!secret){
 console.error("[BLOCK] Server-only Supabase key is missing.");
 process.exit(2);
}

const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const gates=[
 ["foundation","profiles","id,platform_role"],
 ["foundation","organizations","id"],
 ["foundation","congresses","id,organization_id"],
 ["foundation","congress_members","congress_id,user_id,role"],
 ["attendance","attendance_sessions","id,congress_id,qr_policy,starts_at,ends_at"],
 ["attendance","delegates","id,congress_id,student_id,barcode_code,auth_user_id,delegate_type"],
 ["attendance","checkins","id,congress_id,delegate_id,checked_in_at,qr_scope"],
 ["delegate-portal","delegates","is_active,login_email"],
 ["delegate-demographics-v15","delegates","gender,birth_date"],
 ["delegate-documents-v14","documents","id,congress_id,delegate_visible,drive_file_id"],
  ["document-management-v43","documents","id,congress_id,display_order"],
  ["btc-isolation-v45","btc_accounts","user_id,congress_id,login_email,full_name,disabled_at"],
   ["btc-primary-admin-v65","btc_accounts","user_id,congress_id,is_primary"],
  ["congress-lifecycle-v46","congress_identity_cleanup_queue","id,congress_id,user_id,status,attempts"],
 ["bch","bch_candidates","id,congress_id,full_name,photo_path"],
 ["seating-v6","seating_layouts","id,congress_id,grid_rows,grid_columns,version"],
 ["seating-v6","seats","id,congress_id,layout_id,seat_type"],
 ["seating-v6","seat_assignments","seat_id,delegate_id"],
 ["seating-reuse-v26","seating_templates","id,organization_id,created_by,visibility,seat_count"],
  ["observability-v36","system_logs","id,occurred_at,level,source,event,resolution,request_id,congress_id"],
  ["observability-v37","system_logs","id,fingerprint,release,environment"],
  ["observability-v37","system_incidents","id,fingerprint,occurrence_count,window_count,resolution,reopened_count"]
];
let missing=0;
console.log("Daihoi production schema gate — only metadata, no delegate rows");
for(const [feature,table,columns] of gates){
 try{
  const {error}=await db.from(table).select(columns).limit(0);
  const status=error?"MISSING":"OK";
  console.log("["+status+"] "+feature+": "+table+" ("+(error?.code||"schema-ready")+")");
  if(error)missing++;
 }catch(e){
  console.log("[MISSING] "+feature+": "+table+" ("+(e instanceof Error?e.name:"request-error")+")");
  missing++;
 }
}
console.log("Schema checks: "+(gates.length-missing)+"/"+gates.length+" passed.");
if(missing){
 console.error("BLOCK production: missing schema. Back up DB, review migration, apply only on expected project, then rerun.");
 process.exitCode=1;
}else{
 console.log("Schema columns present. Still verify RLS/policies, backups, Realtime and device-level tests.");
}
