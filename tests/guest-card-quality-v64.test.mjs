import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import {calculateDelegateQuality} from "../src/lib/delegate-demographics.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Guests may have a card and BCH without check-in rights by default",()=>{
 const rbac=read("src/lib/access-rbac.ts");
 const portal=read("src/app/my-card/page.tsx");
 const shell=read("src/components/delegate-shell.tsx");
 assert.match(rbac,/if\(role==="guest"\)return \["portal.access","portal.card","portal.documents","portal.bch"\]/);
 assert.match(portal,/hasPortalAbility\(user.id,selected.id,"portal.card"\)/);
 assert.match(portal,/MyDelegateCards items=\{visible\}/);
 assert.match(shell,/guestOnly\?links.filter\(link=>\["\/my-card"/);
 const checkin=read("src/app/api/attendance/self-checkin/route.ts");
 assert.match(checkin,/hasPortalAbility\(user.id,session.congress_id,"portal.checkin"\)/);
});

test("Guest check-ins are not delegate quality even with populated demographics",()=>{
 const delegates=[
  {id:"delegate",full_name:"Delegate",unit:"A",gender:"female",birth_date:"2000-01-01",delegate_type:"official"},
  {id:"guest",full_name:"Guest",unit:"B",gender:"male",birth_date:"1950-01-01",delegate_type:"guest"},
  {id:"alternate",full_name:"Alternate",unit:"C",gender:"male",birth_date:"2001-01-01",delegate_type:"alternate"}
 ];
 const checkins=delegates.map(d=>({delegate_id:d.id,session_id:"s1",checked_in_at:"2026-11-13T08:00:00"}));
 const stats=calculateDelegateQuality(delegates,checkins,"2026-11-13");
 assert.equal(stats.total,2);
 assert.equal(stats.men,1);
 assert.equal(stats.women,1);
 assert.equal(stats.oldest[0].id,"delegate");
 assert.equal(stats.people.some(p=>p.id==="guest"),false);
 assert.equal(stats.ageGroups.reduce((sum,g)=>sum+g.count,0),2);
 assert.match(read("src/lib/delegate-quality-source.ts"),/\.neq\("delegate_type","guest"\)/);
});

test("Legacy unrestricted guest groups gain card, custom restricted groups remain limited",async t=>{
 const db=new PGlite();
 t.after(()=>db.close());
 await db.exec(`
 CREATE TABLE rbac_groups (
   id int primary key, role text not null, abilities text[] not null, updated_at timestamptz not null default now()
 );
 INSERT INTO rbac_groups(id,role,abilities) VALUES
 (1,'guest',ARRAY['portal.access','portal.documents','portal.bch']),
 (2,'guest',ARRAY['portal.access','portal.documents']),
 (3,'delegate',ARRAY['portal.access','portal.documents','portal.bch']),
 (4,'guest',ARRAY['portal.access','portal.card','portal.documents','portal.bch']);
 `);
 const script=read("supabase/upgrade-guest-portal-card-v64.sql");
 await db.exec(script);
 await db.exec(script);
 const result=await db.query("SELECT id,abilities FROM rbac_groups ORDER BY id");
 assert.deepEqual(result.rows.map(r=>r.abilities),[
  ["portal.access","portal.card","portal.documents","portal.bch"],
  ["portal.access","portal.documents"],
  ["portal.access","portal.documents","portal.bch"],
  ["portal.access","portal.card","portal.documents","portal.bch"]
 ]);
});
