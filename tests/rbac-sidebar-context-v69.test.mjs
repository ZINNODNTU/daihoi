import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isAdminNavActive,findAdminNavActive} from "../src/lib/admin-navigation.ts";

const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Super Admin opens congress RBAC inside existing congress shell, no redirect to system-only sidebar",()=>{
 const congressRoute=source("src/app/congresses/[id]/permissions/page.tsx");
 const congressLayout=source("src/app/congresses/[id]/layout.tsx");
 assert.match(congressRoute,/profile\?\.platform_role==="super_admin"\)return <Suspense/);
 assert.match(congressRoute,/<AccessControlClient key=\{id\} initialCongressId=\{id\}/);
 assert.doesNotMatch(congressRoute,/redirect\("\/dashboard\/access\?congressId="/);
 assert.match(congressLayout,/<AppShell/);
 assert.match(congressLayout,/congressId=\{id\}/);
 assert.match(congressLayout,/congressName=\{congress.name\}/);
 assert.match(congressLayout,/canViewSystemLogs=\{accessRole==="super_admin"\}/);
});

test("Global RBAC keeps congress sidebar and breadcrumbs when navigated from a congress",()=>{
 const page=source("src/app/dashboard/access/page.tsx");
 const shell=source("src/components/app-shell.tsx");
 const client=source("src/components/access-control-client.tsx");
 assert.match(page,/searchParams:Promise<\{congressId\?:string\|string\[\]\}>/);
 assert.match(page,/if\(requestedId!==undefined&&\(typeof requestedId!=="string"\|\|!UUID.test\(requestedId\)\)\)/);
 assert.match(page,/if\(error\|\|!data\)notFound\(\)/);
 assert.match(page,/congressId=\{congress\?\.id\} congressName=\{congress\?\.name\} congressKind=\{congress\?\.kind\}/);
 assert.match(page,/accessRole="super_admin"/);
 assert.match(page,/<AccessControlClient key=\{congress\?\.id\|\|"global"\} initialCongressId=\{congress\?\.id\}/);
 assert.match(shell,/href:"\/dashboard\/access"\+\(congressId\?"\?congressId="/);
 assert.match(client,/router.replace\("\/dashboard\/access\?congressId="\+encodeURIComponent\(nextId\)/);
 assert.match(client,/router.push\("\/congresses\/"\+encodeURIComponent\(nextId\)\+"\/permissions"\)/);
});

test("Contextual sidebar active state remains correct for global and congress-level permission routes",()=>{
 const items=[
  {name:"Tổng quan",href:"/dashboard"},
  {name:"Phân quyền Đại hội",href:"/congresses/abc/permissions"},
  {name:"Global RBAC",href:"/dashboard/access?congressId=abc"}
 ];
 assert.equal(findAdminNavActive("/congresses/abc/permissions",items,items[0]).name,"Phân quyền Đại hội");
 assert.equal(findAdminNavActive("/dashboard/access",items,items[0]).name,"Global RBAC");
 assert.equal(isAdminNavActive("/dashboard/access/preview/123",items[2].href),true);
 assert.equal(isAdminNavActive("/dashboard/accessory",items[2].href),false);
});
