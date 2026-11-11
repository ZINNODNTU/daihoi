#!/usr/bin/env node
/** Compose safe, reviewed DAIHOI SQL upgrades into one local file.
 * No database writes are performed by this script.
 */
import nextEnv from "@next/env";
const {loadEnvConfig}=nextEnv;
import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {homedir} from "node:os";
import {join,resolve} from "node:path";

loadEnvConfig(process.cwd());
const project="pnxdxdagpeyqarucdphk";
const actual=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
if(actual!=="https://"+project+".supabase.co"){
 console.error("[BLOCK] Supabase project URL does not match the intended project.");
 process.exit(2);
}
const files=[
 "upgrade-seating-reusable-templates-v26.sql",
 "upgrade-system-observability-v36.sql",
 "upgrade-system-incidents-v37.sql",
 "upgrade-bch-order-v39.sql",
 "upgrade-document-management-v43.sql"
];
const statements=files.map((name)=>{
 const sql=readFileSync(resolve("supabase",name),"utf8").trim();
 if(!/\bbegin\s*;/i.test(sql)||!/\bcommit\s*;/i.test(sql))
  throw new Error("Migration lacks transaction boundaries: "+name);
 return "-- >>> BEGIN "+name+"\n"+sql+"\n-- <<< END "+name;
});
const folder=join(process.env.LOCALAPPDATA||homedir(),"DAIHOI","production-migrations");
mkdirSync(folder,{recursive:true});
const suffix=new Date().toISOString().replace(/[:.]/g,"-");
const path=join(folder,"daihoi-"+project+"-V26-V36-V37-V39-V43-"+suffix+".sql");
const notice=[
 "-- DAIHOI PRODUCTION DATABASE UPGRADE",
 "-- TARGET PROJECT: "+project,
 "-- Verify target project in Supabase Dashboard before executing.",
 "-- BACKUP REQUIRED: This file contains real DDL and is NOT executed by the generator.",
 "-- Execute in SQL Editor with privileges for CREATE TABLE/TRIGGER/SCHEMA.",
 "-- These migrations are idempotent and must stay in V26 -> V36 -> V37 -> V39 -> V43 order.",
 ""
].join("\n");
writeFileSync(path,notice+statements.join("\n\n")+"\n",{flag:"wx",encoding:"utf8",mode:0o600});
console.log("[OK] Prepared one-file production migration plan for project "+project+".");
console.log("[OK] SQL file: "+path);
console.log("[INFO] This script does NOT change any database.");
console.log("[NEXT] After verifying a PostgreSQL backup, execute this SQL in the correct Supabase SQL Editor.");
