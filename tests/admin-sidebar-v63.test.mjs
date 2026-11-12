import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 isAdminNavActive,findAdminNavActive,searchAdminNavGroups
} from "../src/lib/admin-navigation.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const shell=read("src/components/app-shell.tsx");
const css=read("src/app/admin-sidebar-v63.css");
const layout=read("src/app/layout.tsx");

test("most specific admin route wins and no root false positive",()=>{
 const overview={name:"Tổng quan",href:"/dashboard"};
 const access={name:"RBAC",href:"/dashboard/access"};
 const delegates={name:"Đại biểu",href:"/congresses/one/delegates"};
 const congress={name:"Điều hành",href:"/congresses/one"};
 const pages=[overview,congress,delegates,access];
 assert.equal(findAdminNavActive("/dashboard/access/preview/any",pages,overview),access);
 assert.equal(findAdminNavActive("/congresses/one/delegates/accounts",pages,overview),delegates);
 assert.equal(findAdminNavActive("/congresses/one",pages,overview),congress);
 assert.equal(findAdminNavActive("/dashboard",pages,overview),overview);
 assert.equal(isAdminNavActive("/dashboard/another","/dashboard"),false);
 assert.equal(isAdminNavActive("/dashboard/accessory","/dashboard/access"),false);
});

test("sidebar search matches Vietnamese names and groups without inventing permissions",()=>{
 const groups=[
  {id:"operations",title:"Điều hành",items:[
   {name:"Điểm danh",href:"/checkin"},
   {name:"Sơ đồ ghế",href:"/seats"}
  ]},
  {id:"security",title:"Quản trị hệ thống",items:[
   {name:"Quản lý RBAC",href:"/rbac"}
  ]}
 ];
 const byName=searchAdminNavGroups(groups,"  ĐIỂM DANH ");
 assert.equal(byName.length,1);
 assert.deepEqual(byName[0].items.map(i=>i.href),["/checkin"]);
 const byGroup=searchAdminNavGroups(groups,"quản trị hệ thống");
 assert.deepEqual(byGroup[0].items.map(i=>i.href),["/rbac"]);
 assert.deepEqual(searchAdminNavGroups(groups,"không được cấp quyền"),[]);
 assert.equal(groups[0].items.length,2,"input groups must not mutate");
});

test("navigation is grouped by real admin workflow, not a single unstructured list",()=>{
 for(const id of ["workspace","operations","personnel","materials","congress-admin","system-admin"])
  assert.ok(shell.includes('id:"'+id+'"'),id);
 for(const label of ["Điều hành & điểm danh","Đại biểu & nhân sự","Văn kiện & báo cáo",
  "Quản trị Đại hội","Quản trị hệ thống"])
  assert.ok(shell.includes(label),label);
 assert.match(shell,/const canUse=\(ability:CongressAbility\)=>effectiveAbilities\?/);
 assert.match(shell,/canViewSystemLogs\?\[\{id:"system-admin"/);
 assert.match(shell,/congressKind==="doan"&&canUse\("ballots.read"\)/);
 assert.match(shell,/canUse\("team.manage"\)/);
 assert.match(shell,/canUse\("settings.manage"\)/);
 assert.doesNotMatch(shell,/name:"Thẻ đại biểu"/);
});

test("desktop sidebar collapses to icons; mobile uses focus-managed accessible drawer",()=>{
 assert.match(layout,/import "\.\/admin-sidebar-v63\.css"/);
 assert.match(shell,/admin-sidebar-compact/);
 assert.match(shell,/aria-label=\{compact\?"Mở rộng thanh bên":"Thu gọn thanh bên"\}/);
 assert.match(shell,/title=\{condensed\?item.name:undefined\}/);
 assert.match(shell,/role=\{mobile\?"dialog":undefined\}/);
 assert.match(shell,/aria-modal=\{mobile\?true:undefined\}/);
 assert.match(shell,/event.key==="Escape"/);
 assert.match(shell,/event.key==="Tab"/);
 assert.match(shell,/aria-expanded=\{mobile\}/);
 assert.match(shell,/mobileItems.map/);
 assert.match(css,/\.admin-sidebar-compact \.admin-nav-text/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test("account menu remains in sticky footer and errors remain visible",()=>{
 assert.ok(shell.indexOf("admin-sidebar-footer")>shell.indexOf("admin-sidebar-menu"));
 assert.ok(shell.indexOf("navLink(myAccount)")>shell.indexOf("admin-sidebar-footer"));
 assert.match(shell,/aria-label="Đăng xuất"/);
 assert.match(shell,/logoutError&&<p role="alert"/);
});
