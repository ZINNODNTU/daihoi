import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

test("Production SQL bundle includes seating, logs, incidents and atomic BCH reorder in that order",()=>{
 const generator=read("scripts/prepare-production-logs.mjs");
 const files=["upgrade-seating-reusable-templates-v26.sql","upgrade-system-observability-v36.sql",
  "upgrade-system-incidents-v37.sql","upgrade-bch-order-v39.sql"];
 const positions=files.map(file=>generator.indexOf('"'+file+'"'));
 assert.ok(positions.every(index=>index>=0));
 assert.ok(positions.every((index,i)=>i===0||index>positions[i-1]));
 assert.match(generator,/V26-V36-V37-V39/);
 assert.match(generator,/This script does NOT change any database/);
 for(const file of files){
  const sql=read("supabase/"+file);
  assert.match(sql,/\bbegin\s*;/i);
  assert.match(sql,/\bcommit\s*;/i);
 }
});

test("Admin dashboard visibly links to system logs only for scoped privileged accounts",()=>{
 const dashboard=read("src/app/dashboard/page.tsx");
 const shell=read("src/components/app-shell.tsx");
 const logs=read("src/app/dashboard/system-logs/page.tsx");
 const bch=read("src/components/bch-candidates-client.tsx");
 assert.match(dashboard,/canViewSystemLogs\s*&&\s*<Link href="\/dashboard\/system-logs"/);
 assert.match(shell,/canViewSystemLogs\s*&&navLink\(logs\)/);
 assert.match(logs,/if\(!access.allowed\)redirect\("\/dashboard"\)/);
 assert.match(bch,/draggable=\{canReorder\}/);
 assert.match(bch,/dropCandidate\(item.id\)/);
 assert.match(bch,/Kéo thả hàng để sắp xếp/);
});
