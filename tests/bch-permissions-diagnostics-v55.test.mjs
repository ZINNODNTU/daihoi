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
test("account-specific permission configuration uses batch writes and a secure audit timeline",()=>{
 const ui=read("src/components/congress-permissions-client.tsx");
 const api=read("src/app/api/congress-members/permissions/route.ts");
 const memberApi=read("src/app/api/congress-members/route.ts");
 assert.match(ui,/setSelectedId/);
 assert.match(ui,/permissionOverrides/);
 assert.match(ui,/type="checkbox" checked=\{checked\}/);
 assert.match(ui,/method:"PUT"/);
 assert.match(ui,/changes/);
 assert.match(ui,/Nhật ký phân quyền/);
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,"team\.manage"\)/);
 assert.match(api,/isAccountPermissionAbility/);
 assert.match(api,/set_btc_account_permissions_v58/);
 assert.match(api,/audit_logs/);
 assert.match(api,/canCustomizeCongressAbility/);
 assert.match(memberApi,/permissionOverrides:/);
});
test("BCH profile and tally access are unrelated capabilities and separate routes",()=>{
 const personnel=read("src/app/congresses/[id]/bch-candidates/page.tsx");
 const ballot=read("src/app/congresses/[id]/ballots/page.tsx");
 const ballotGuard=read("src/app/congresses/[id]/ballots/layout.tsx");
 const api=read("src/app/api/bch-candidates/ballots/route.ts");
 const personnelUI=read("src/components/bch-candidates-client.tsx");
 const tallyUI=read("src/components/bch-ballots-client.tsx");
 assert.match(personnel,/hasCongressAbility\(supabase,user\.id,id,"bch\.read"\)/);
 assert.match(personnel,/hasCongressAbility\(supabase,user\.id,id,"bch\.write"\)/);
 assert.match(personnel,/canViewBallots/);
 assert.match(ballot,/hasCongressAbility\(supabase,user\.id,id,"ballots\.read"\)/);
 assert.match(ballotGuard,/requireCongressAbility\(id,"ballots\.read"\)/);
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,"ballots\.write"\)/);
 assert.doesNotMatch(personnelUI,/BchBallotEditor/);
 assert.match(tallyUI,/BchBallotEditor/);
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