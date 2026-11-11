import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {redactLogText} from "../src/lib/system-log-redaction.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Technical log redaction removes credentials and private URLs",()=>{
 const line="User demo@example.com visited https://host.test/file?token=abc password=secret123 Bearer abc.efg.hij sb_secret_123456789";
 const clean=redactLogText(line);
 for(const item of ["demo@example.com","token=abc","secret123","abc.efg.hij","sb_secret_123456789"])
  assert.ok(!clean.includes(item),"sensitive substring: "+item);
 assert.match(clean,/\[EMAIL\]/);
 assert.match(clean,/\[URL\]/);
 assert.match(clean,/\[TOKEN\]/);
 assert.match(clean,/\[REDACTED\]/);
 assert.ok(redactLogText("X".repeat(1000)).length<=160);
 assert.equal(redactLogText({password:"abc"}),"");
});

test("Migration uses server-only system_logs, RLS, indexes and restricted grants",()=>{
 const sql=read("supabase/upgrade-system-observability-v36.sql");
 assert.match(sql,/create table if not exists public\.system_logs/i);
 assert.match(sql,/alter table public\.system_logs enable row level security/i);
 assert.match(sql,/revoke all on public\.system_logs from public, anon, authenticated/i);
 assert.match(sql,/grant select, insert, update on public\.system_logs to service_role/i);
 assert.match(sql,/system_logs_congress_time_idx/i);
 assert.match(sql,/resolution in \('open','investigating','resolved'\)/);
 assert.doesNotMatch(sql,/grant (?:select|insert|update) on public\.system_logs to authenticated/i);
});

test("Read and triage API checks authorization and scopes every query",()=>{
 const api=read("src/app/api/system-logs/route.ts");
 const access=read("src/lib/system-log-access.ts");
 assert.match(access,/\.eq\("role","admin"\)/);
 assert.match(access,/profile\.error\|\|members\.error/);
 assert.match(api,/if\(!access\.allowed\)/);
 assert.match(api,/access\.congressIds\.includes\(congressId\)/);
 assert.match(api,/rowsQuery=rowsQuery\.in\("congress_id",access\.congressIds\)/);
 assert.match(api,/query=query\.in\("congress_id",access\.congressIds\)/);
 assert.match(api,/\.range\(page\*30,page\*30\+29\)/);
 assert.match(api,/if\(!access\.superAdmin&&?|\!access\.superAdmin\)/);
 assert.match(api,/handled_by/);
});

test("Browser reports are staff-only, bounded, rate-limited and sanitized",()=>{
 const api=read("src/app/api/system-logs/report/route.ts");
 const monitor=read("src/components/admin-error-monitor.tsx");
 assert.match(api,/isStaffUser\(supabase,user\.id\)/);
 assert.match(api,/hasRole\(supabase,user\.id,congressId,"viewer"\)/);
 assert.match(api,/content-length/);
 assert.match(api,/>=5/);
 assert.match(api,/MESSAGES\[event\]/);
 assert.doesNotMatch(api,/data\?\.message|data\?\.stack/);
 assert.doesNotMatch(monitor,/\b(?:event\.error|event\.reason)\.(?:message|stack)\b/);
 assert.match(monitor,/window\.addEventListener\("unhandledrejection"/);
});

test("Critical APIs emit structured failures; admin sees alert count and status controls",()=>{
 const paths=[
  "src/app/api/auth/login/route.ts",
  "src/app/api/checkins/route.ts",
  "src/app/api/attendance/self-checkin/route.ts",
  "src/app/api/attendance/live/route.ts",
  "src/app/api/attendance-sessions/route.ts",
  "src/app/api/documents/route.ts"
 ];
 for(const path of paths)assert.match(read(path),/writeSystemLog\(/,path);
 const shell=read("src/components/app-shell.tsx");
 const page=read("src/components/system-logs-client.tsx");
 assert.match(shell,/api\/system-logs\/summary/);
 assert.match(shell,/Nhật ký hệ thống/);
 assert.match(page,/setInterval\(\(\)=>\{if\(document\.visibilityState==="visible"\)void load\(\);\},15000\)/);
 assert.match(page,/updateResolution/);
 assert.match(page,/request_id/);
});
