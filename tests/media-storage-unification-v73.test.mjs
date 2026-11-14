import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const js=ts.transpileModule(source("src/lib/portrait-policy.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const m={exports:{}};
new Function("require","module","exports",js)(()=>{throw Error("Unexpected import");},m,m.exports);
const policy=m.exports;
const congress="3a5ed2ff-eaa0-4686-9329-9c1ed2353b5c";
const delegate="3ca181ad-50f8-4c32-878c-e48c0d627f15";
const candidate="d1cc6dcf-ac80-4e80-8cc5-7bb5380b8cc2";
const user="77d449e3-3e4c-4511-8def-7bfe787ff3d6";

test("One normalized media/ tree, stable logical keys and legacy-compatible DB constraints",()=>{
 const d=policy.delegatePortraitKey(congress,delegate);
 const b=policy.bchPortraitKey(congress,candidate);
 const p=policy.sharedPortraitKey(user);
 assert.equal(d,congress+"/"+delegate+".jpg");
 assert.equal(b,congress+"/bch/"+candidate+".jpg");
 assert.equal(p,"people/"+user+".jpg");
 assert.equal(policy.portraitStoragePath(d),"media/congresses/"+congress+"/delegates/"+delegate+".jpg");
 assert.equal(policy.portraitStoragePath(b),"media/congresses/"+congress+"/bch/"+candidate+".jpg");
 assert.equal(policy.portraitStoragePath(p),"media/people/"+user+".jpg");
 for(const x of [d,b,p]){
  assert.equal(policy.isCanonicalPortraitKey(x),true);
  assert.equal(policy.isPhysicalPortraitPath(policy.portraitStoragePath(x)),true);
 }
 for(const bad of ["../admin","media/secrets.jpg",congress+"/bch/../../bad.jpg"]){
  assert.equal(policy.isCanonicalPortraitKey(bad),false);
  assert.throws(()=>policy.portraitStoragePath(bad));
 }
 const sql=source("supabase/upgrade-bch-photos-v9.sql");
 assert.match(sql,/photo_path = congress_id::text \|\| '[/]bch[/]' \|\| id::text/);
});

test("Private storage upload uses physical key, reads physical first then legacy, cleans only verified redundant keys",()=>{
 const upload=source("src/lib/portrait-upload.ts");
 const storage=source("src/lib/portrait-storage.ts");
 assert.match(upload,/const physical=portraitStoragePath\(path\)/);
 assert.match(upload,/storage.upload\(physical,bytes/);
 assert.match(upload,/const legacy=current\?null:await storage.download\(path\)/);
 assert.match(upload,/if\(legacy\?\.data\)\{/);
 assert.match(upload,/storage.remove\(\[path,\.\.\.derivedPortraitPaths\(path\)\]\)/);
 assert.match(storage,/const physical=portraitStoragePath\(path\)/);
 assert.match(storage,/await storage.download\(physical\)/);
 assert.match(storage,/await storage.download\(path\)/);
 assert.match(storage,/!isCanonicalPortraitKey\(path\)/);
 assert.doesNotMatch(upload,/storage.getPublicUrl|createSignedUrl/);
});

test("Admin uses full congress-scoped sidebar on Dashboard, RBAC, Logs and Media",()=>{
 const dashboard=source("src/app/dashboard/page.tsx");
 const access=source("src/app/dashboard/access/page.tsx");
 const logs=source("src/app/dashboard/system-logs/page.tsx");
 const media=source("src/app/dashboard/media/page.tsx");
 const shell=source("src/components/app-shell.tsx");
 const context=source("src/lib/admin-sidebar-context.ts");
 assert.match(dashboard,/congressId=\{sidebarCongress\?\.id\}/);
 assert.match(dashboard,/effectiveAbilities=\{scopedAbilities\}/);
 for(const text of [access,logs,media]){
  assert.match(text,/accessRole="super_admin"/);
  assert.match(text,/congressId=\{sidebar\?\.id\}/);
 }
 assert.match(shell,/name:"Thư viện ảnh Đại hội"/);
 assert.match(shell,/items:\[globalAccess,media,logs\]/);
 assert.match(shell,/name:"Nhật ký hệ thống",href:"\/dashboard\/system-logs"\+/);
 assert.match(context,/value.status==="live"/);
 assert.match(context,/All callers must have already verified Super Admin/);
 assert.match(media,/profile\?\.platform_role!=="super_admin"/);
 assert.match(media,/MediaLibraryClient/);
});

test("Migration utilities do not update DB photo_path or blindly remove orphan images",()=>{
 const organize=source("scripts/organize-photo-storage.mjs");
 const audit=source("scripts/audit-photo-storage.mjs");
 const archive=source("scripts/archive-unreferenced-photos.mjs");
 assert.match(organize,/--apply/);
 assert.match(organize,/--cleanup-legacy/);
 assert.match(organize,/storage.copy\(logical,physical\)/);
 assert.match(organize,/SHA\(latest\)!==SHA\(sourceLatest\)/);
 assert.match(organize,/if\(cleanup&&legacyBytes\)/);
 assert.doesNotMatch(organize,/\.update\(\{photo_path:/);
 assert.match(audit,/const physicalRefs=new Set/);
 assert.match(audit,/archivedUnlinkedPhotos/);
 assert.match(audit,/!archivedPaths.has\(row.path\)/);
 assert.match(audit,/allPaths.has\(portraitStoragePath\(path\)\)/);
 assert.match(archive,/const apply=process.argv.includes\("--apply"\)/);
 assert.match(archive,/if\(await isReferenced\(old\)\)/);
 assert.match(archive,/SHA|sha\(original\)!==sha\(confirmed\)/);
 assert.match(archive,/media\/archive\/unlinked/);
});
