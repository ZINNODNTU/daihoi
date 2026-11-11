import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("V37 migration creates server-only aggregate with atomic grouping",()=>{
 const sql=read("supabase/upgrade-system-incidents-v37.sql");
 assert.match(sql,/to_regclass\('public\.system_logs'\)/i);
 assert.match(sql,/create table if not exists public\.system_incidents/i);
 assert.match(sql,/fingerprint text not null unique/i);
 assert.match(sql,/revoke all on public\.system_incidents from public, anon, authenticated/i);
 assert.match(sql,/create schema if not exists daihoi_private/i);
 assert.match(sql,/grant usage on schema daihoi_private to service_role/i);
 assert.match(sql,/grant execute on function daihoi_private\.system_log_assign_fingerprint\(\) to service_role/i);
 assert.match(sql,/grant execute on function daihoi_private\.system_log_aggregate_incident\(\) to service_role/i);
 assert.match(sql,/grant select,insert,update on public\.system_incidents to service_role/i);
 assert.match(sql,/alter table public\.system_incidents enable row level security/i);
 assert.match(sql,/on conflict \(fingerprint\) do update set/i);
 assert.match(sql,/occurrence_count=public\.system_incidents\.occurrence_count\+1/);
 assert.match(sql,/reopened_count=public\.system_incidents\.reopened_count\+/);
 assert.match(sql,/system_logs_fingerprint_before_insert/i);
 assert.match(sql,/system_logs_aggregate_after_insert/i);
 assert.match(sql,/coalesce\(new\.context->>'endpoint',''\)/);
 assert.doesNotMatch(sql,/grant (?:select|insert|update) on public\.system_incidents to authenticated/i);
});

test("Incident API authorizes all reads, drill-down and updates per congress",()=>{
 const api=read("src/app/api/system-incidents/route.ts");
 assert.match(api,/getSystemLogAccess/);
 assert.match(api,/if\(!access\.allowed\)/);
 assert.match(api,/access\.congressIds\.includes\(congressId\)/);
 assert.match(api,/incidentQuery=incidentQuery\.in\("congress_id",access\.congressIds\)/);
 assert.match(api,/rows=rows\.in\("congress_id",access\.congressIds\)/);
 assert.match(api,/update=update\.in\("congress_id",access\.congressIds\)/);
 assert.match(api,/\.eq\("fingerprint",incident\.fingerprint\)/);
 assert.match(api,/\.limit\(15\)/);
 assert.match(api,/\.range\(page\*20,page\*20\+19\)/);
 assert.match(api,/origin/);
 assert.doesNotMatch(api,/grant\s+all|select\s+\*/i);
});

test("Next.js instrumentation collects only safe context and release metadata",()=>{
 const file=read("src/instrumentation.ts");
 const writer=read("src/lib/system-log.ts");
 assert.match(file,/export async function onRequestError/);
 assert.match(file,/process\.env\.NEXT_RUNTIME==="edge"/);
 assert.match(file,/await import\("@\/lib\/system-log"\)/);
 assert.match(file,/context\.routePath/);
 assert.doesNotMatch(file,/error\.message|error\.stack|request\.headers|request\.path/);
 assert.match(writer,/VERCEL_GIT_COMMIT_SHA/);
 assert.match(writer,/VERCEL_ENV/);
 assert.match(writer,/redactLogText/);
});

test("Admin incident panel tracks count, regression, history and triage",()=>{
 const panel=read("src/components/system-incidents-panel.tsx");
 const logs=read("src/components/system-logs-client.tsx");
 const summary=read("src/app/api/system-logs/summary/route.ts");
 assert.match(panel,/occurrence_count/);
 assert.match(panel,/reopened_count/);
 assert.match(panel,/window_count/);
 assert.match(panel,/change\(item,next\)/);
 assert.match(panel,/api\/system-incidents\?fingerprint=/);
 assert.match(panel,/refreshTick/);
 assert.match(logs,/SystemIncidentsPanel/);
 assert.match(summary,/from\("system_incidents"\)/);
});

test("Admin React error boundaries send only sanitized diagnostics",()=>{
 const boundary=read("src/components/admin-error-boundary.tsx");
 const report=read("src/app/api/system-logs/report/route.ts");
 assert.match(boundary,/frontend\.react_boundary/);
 assert.match(boundary,/usePathname/);
 assert.doesNotMatch(boundary,/error\.message|error\.stack/);
 assert.match(report,/MESSAGES\[event\]/);
 assert.match(report,/>=5/);
});
