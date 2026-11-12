import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("RBAC capabilities are bounded by each account's base role",()=>{
 const source=read("src/lib/congress-permissions.ts");
 const moduleBox={exports:{}};
 const js=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 new Function("module","exports",js)(moduleBox,moduleBox.exports);
 const {canCongress,canCongressForAccount,isAccountPermissionAbility}=moduleBox.exports;
 assert.equal(canCongress("admin","team.manage"),true);
 assert.equal(canCongress("secretary","bch.write"),false);
 assert.equal(canCongressForAccount("admin","bch.write",["bch.write"]),false);
 assert.equal(canCongressForAccount("admin","bch.write",[]),true);
 assert.equal(canCongressForAccount("secretary","bch.write",[]),false);
 assert.equal(isAccountPermissionAbility("bch.write"),true);
 assert.equal(isAccountPermissionAbility("team.manage"),false);
 assert.equal(isAccountPermissionAbility("settings.manage"),false);
 assert.equal(isAccountPermissionAbility("system.logs"),false);
});
test("permission page requires verified server entitlement and nav checks account rights",()=>{
 const page=read("src/app/congresses/[id]/permissions/page.tsx");
 const layout=read("src/app/congresses/[id]/layout.tsx");
 const shell=read("src/components/app-shell.tsx");
 assert.match(page,/getAuth\(\)/);
 assert.match(page,/hasCongressAbility\(supabase,user\.id,id,"team\.manage"\)/);
 assert.match(page,/CongressPermissionsClient congressId=\{id\}/);
 assert.match(layout,/getCongressEffectiveAbilities/);
 assert.match(layout,/effectiveAbilities=\{\[\.\.\.effectiveAbilities\]\}/);
 assert.match(shell,/canUse\("team\.manage"\)/);
 assert.match(shell,/name:"Phân quyền",href:base\+"\/permissions"/);
});
test("permission UI selects individual BTC accounts and persists each account's allowed actions",()=>{
 const ui=read("src/components/congress-permissions-client.tsx");
 const api=read("src/app/api/congress-members/permissions/route.ts");
 const memberApi=read("src/app/api/congress-members/route.ts");
 assert.match(ui,/setSelectedId/);
 assert.match(ui,/selected\.deniedAbilities\.includes\(ability\)/);
 assert.match(ui,/type="checkbox" checked=\{allowed\}/);
 assert.match(ui,/\/api\/congress-members\/permissions/);
 assert.match(ui,/userId:member\.userId,ability,allowed/);
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,"team\.manage"\)/);
 assert.match(api,/isAccountPermissionAbility/);
 assert.match(api,/session\.user\.id===userId|user\.id===userId/);
 assert.match(api,/btc_account_capability_restrictions/);
 assert.match(api,/canCongress\(role,ability\)/);
 assert.match(memberApi,/deniedAbilities:/);
});
test("BCH access and manual tally are scoped to effective account permissions",()=>{
 const page=read("src/app/congresses/[id]/bch-candidates/page.tsx");
 const api=read("src/app/api/bch-candidates/route.ts");
 const ui=read("src/components/bch-candidates-client.tsx");
 assert.match(page,/hasCongressAbility\(supabase,user\.id,id,"bch\.read"\)/);
 assert.match(page,/hasCongressAbility\(supabase,user\.id,id,"bch\.write"\)/);
 assert.match(page,/BASE_FIELDS\+\(canManage\?BALLOT_FIELDS:""\)/);
 assert.match(page,/fallback=people\.error\?\.code==="42703"&&canManage/);
 assert.match(page,/bch_total_ballots/);
 assert.match(api,/error\?\.code==="42703"&&auth\.canManage/);
 assert.doesNotMatch(ui,/Phân quyền BTC/);
 assert.match(ui,/BchBallotEditor/);
});
test("migration V57 is additive and grants per-account restrictions without privilege escalation",()=>{
 const sql=read("supabase/upgrade-bch-shared-ballot-account-permissions-v57.sql");
 assert.match(sql,/ADD COLUMN IF NOT EXISTS bch_total_ballots integer/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.btc_account_capability_restrictions/);
 assert.match(sql,/CHECK \(allowed=false\)/);
 assert.match(sql,/CREATE POLICY btc_account_restriction_self_read/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/set_bch_shared_ballot_total/);
 assert.doesNotMatch(sql,/TRUNCATE|DROP TABLE|DELETE FROM public\.bch_candidates/i);
});
