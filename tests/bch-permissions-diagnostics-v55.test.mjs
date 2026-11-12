import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("permission policy limits administrative abilities to privileged staff roles",()=>{
 const source=read("src/lib/congress-permissions.ts");
 const moduleBox={exports:{}};
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function("module","exports",js)(moduleBox,moduleBox.exports);
 const {canCongress}=moduleBox.exports;
 assert.equal(canCongress("admin","team.manage"),true);
 assert.equal(canCongress("super_admin","team.manage"),true);
 assert.equal(canCongress("checkin","team.manage"),false);
 assert.equal(canCongress("secretary","team.manage"),false);
 assert.equal(canCongress(null,"team.manage"),false);
 assert.equal(canCongress("admin","bch.write"),true);
 assert.equal(canCongress("secretary","bch.write"),false);
 assert.equal(canCongress("secretary","bch.read"),true);
 assert.equal(canCongress("checkin","attendance.scan"),true);
 assert.equal(canCongress("secretary","attendance.scan"),false);
});

test("permission management route and menu require congress-scoped server-side ability",()=>{
 const page=read("src/app/congresses/[id]/permissions/page.tsx");
 const shell=read("src/components/app-shell.tsx");
 assert.match(page,/getAuth\(\)/);
 assert.match(page,/hasCongressAbility\(supabase,user\.id,id,"team\.manage"\)/);
 assert.match(page,/if\(!UUID\.test\(id\)\)/);
 assert.match(page,/redirect\("\/congresses\/"\+id\)/);
 assert.match(page,/CongressPermissionsClient congressId=\{id\}/);
 assert.match(shell,/canCongress\(accessRole,"team\.manage"\)/);
 assert.match(shell,/name:"Phân quyền",href:base\+"\/permissions"/);
 assert.match(shell,/name:"Tài khoản BTC",href:base\+"\/team"/);
});

test("permissions UI uses existing hardened BTC API and never promises per-user toggles",()=>{
 const ui=read("src/components/congress-permissions-client.tsx");
 const server=read("src/app/api/congress-members/route.ts");
 const team=read("src/components/congress-team-client.tsx");
 assert.match(ui,/\/api\/congress-members/);
 assert.match(ui,/method:"PATCH",credentials:"same-origin"/);
 assert.match(ui,/body:JSON\.stringify\(\{congressId,userId:member\.userId,role:nextRole\}\)/);
 assert.match(ui,/canCongress\(role,row\.id\)/);
 assert.match(ui,/Đây là các nhóm quyền cố định/);
 assert.match(ui,/window\.confirm/);
 assert.match(server,/authorize\(congressId\)/);
 assert.match(server,/session\.user\.id===userId/);
 assert.match(server,/btc_accounts/);
 assert.match(server,/btc\.role_changed/);
 assert.match(team,/\/permissions/);
});

test("BCH reading verifies staff membership and only fallback on a genuinely absent tally column",()=>{
 const page=read("src/app/congresses/[id]/bch-candidates/page.tsx");
 const api=read("src/app/api/bch-candidates/route.ts");
 const ui=read("src/components/bch-candidates-client.tsx");
 assert.match(page,/getCongressRole\(supabase,user\.id,id\)/);
 assert.match(page,/canCongress\(role,"bch\.read"\)/);
 assert.match(page,/canManage=canCongress\(role,"bch\.write"\)/);
 assert.match(page,/BASE_FIELDS\+\(canManage\?BALLOT_FIELDS:""\)/);
 assert.match(page,/fallback=people\.error\?\.code==="42703"&&canManage/);
 assert.match(page,/ballotReady=canManage&&!people\.error/);
 assert.match(api,/error\?\.code==="42703"&&auth\.canManage/);
 assert.doesNotMatch(ui,/Phân quyền BTC/);
 assert.match(ui,/BchBallotEditor/);
 assert.match(ui,/congressKind==="doan"&&canManage&&!ballotReady&&!initialError/);
 assert.match(ui,/upgrade-bch-ballot-results-v47\.sql/);
});

test("V47 migration is additive, safe for existing BCH rows, and never widens table permissions",()=>{
 const sql=read("supabase/upgrade-bch-ballot-results-v47.sql");
 assert.match(sql,/ADD COLUMN IF NOT EXISTS votes_received integer/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS total_ballots integer/);
 assert.match(sql,/votes_received<=total_ballots/);
 assert.match(sql,/votes_received IS NULL AND total_ballots IS NULL/);
 assert.doesNotMatch(sql,/DROP TABLE|TRUNCATE|DELETE FROM/i);
 assert.doesNotMatch(sql,/GRANT\s+.*\b(?:anon|PUBLIC)\b/i);
});
