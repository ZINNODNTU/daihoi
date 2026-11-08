#!/usr/bin/env node
/** Snapshot Supabase public rows and Auth user metadata before schema migration.
 * Backup is local-only, outside Git, with no API keys or passwords.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const projectId="pnxdxdagpeyqarucdphk";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(url!==`https://${projectId}.supabase.co`)throw new Error("Wrong project");
const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!secret)throw new Error("Missing server secret");
const client=createClient(url,secret,{
 auth:{persistSession:false,autoRefreshToken:false}
});
const tables=["profiles","organizations","congresses","congress_members","attendance_sessions","delegates","checkins","audit_logs","documents","voting_sessions","voting_options","voting_eligibilities","votes"];
const backup={projectId,capturedAt:new Date().toISOString(),tables:{},authUsers:[]};
for(const table of tables){
 const rows=[];
 for(let offset=0;offset<10000;offset+=500){
  const {data,error}=await client.from(table).select("*").range(offset,offset+499);
  if(error)throw new Error(`Backup failed for ${table}: ${error.code||"read-error"}`);
  rows.push(...(data||[]));
  if(!data||data.length<500)break;
  if(offset>=9500)throw new Error("Too many records; refusing incomplete backup");
 }
 backup.tables[table]=rows;
 console.log(`[OK] ${table}: ${rows.length} records`);
}
for(let page=1;page<=100;page++){
 const {data,error}=await client.auth.admin.listUsers({page,perPage:200});
 if(error)throw error;
 for(const user of data.users){
  backup.authUsers.push({
   id:user.id,email:user.email,email_confirmed_at:user.email_confirmed_at,
   user_metadata:user.user_metadata,app_metadata:user.app_metadata,
   created_at:user.created_at
  });
 }
 if(data.users.length<200)break;
}
const folder=join(process.env.LOCALAPPDATA||process.env.USERPROFILE||".","DAIHOI","database-backups");
mkdirSync(folder,{recursive:true});
const filename=`supabase-${projectId}-pre-v2-v5-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
const target=join(folder,filename);
writeFileSync(target,JSON.stringify(backup,null,2),{encoding:"utf8",flag:"wx",mode:0o600});
console.log("[OK] Local backup completed; authentication metadata and all public rows retained.");
console.log("[INFO] Backup under %LOCALAPPDATA%/DAIHOI/database-backups, outside Git repository.");
