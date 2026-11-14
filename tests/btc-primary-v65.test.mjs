import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const C="bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const A="aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const B="cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
async function fixture(duplicate=false){
 const db=new PGlite();
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;
 CREATE SCHEMA auth;CREATE SCHEMA private;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE public.congresses(id uuid PRIMARY KEY);
 CREATE TABLE public.btc_accounts(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
  login_email text NOT NULL UNIQUE,full_name text NOT NULL,
  disabled_at timestamptz
 );
 CREATE TABLE public.congress_members(
  congress_id uuid NOT NULL,user_id uuid NOT NULL,
  role text NOT NULL,PRIMARY KEY(congress_id,user_id)
 );
 INSERT INTO auth.users VALUES ('${A}'),('${B}');
 INSERT INTO congresses VALUES ('${C}');
 INSERT INTO btc_accounts VALUES
  ('${A}','${C}','admin@staff.daihoi.invalid','Primary',null),
  ('${B}','${C}','staff@staff.daihoi.invalid','Staff',null);
 INSERT INTO congress_members VALUES
  ('${C}','${A}','admin'),
  ('${C}','${B}','${duplicate?"admin":"checkin"}');`);
 return db;
}

test("V65 backfills exactly one primary BTC account without changing existing credentials",async t=>{
 const db=await fixture();t.after(()=>db.close());
 await db.exec(read("supabase/upgrade-btc-primary-account-v65.sql"));
 const rows=(await db.query("select user_id,is_primary from btc_accounts order by user_id")).rows;
 assert.equal(rows.length,2);
 assert.equal(rows.find(x=>x.user_id===A).is_primary,true);
 assert.equal(rows.find(x=>x.user_id===B).is_primary,false);
 await assert.rejects(()=>db.exec(`UPDATE btc_accounts SET is_primary=true WHERE user_id='${B}';`));
 await assert.rejects(()=>db.exec(`UPDATE btc_accounts SET disabled_at=now() WHERE user_id='${A}';`));
 await assert.rejects(()=>db.exec(`UPDATE congress_members SET role='secretary' WHERE user_id='${A}';`));
 await assert.rejects(()=>db.exec(`UPDATE congress_members SET role='admin' WHERE user_id='${B}';`));
 assert.equal((await db.query("select role from congress_members where user_id=$1",[A])).rows[0].role,"admin");
 assert.equal((await db.query("select role from congress_members where user_id=$1",[B])).rows[0].role,"checkin");
});

test("V65 fails safely when a congress already has multiple admin identities",async t=>{
 const db=await fixture(true);t.after(()=>db.close());
 await assert.rejects(()=>db.exec(read("supabase/upgrade-btc-primary-account-v65.sql")),
  /multiple BTC admins/);
 await db.exec("ROLLBACK");
 const rows=(await db.query("select role from congress_members")).rows;
 assert.deepEqual(rows.map(row=>row.role).sort(),["admin","admin"]);
});

test("Primary BTC provisioning is unique and staff may not promote themselves",()=>{
 const api=read("src/app/api/congress-members/route.ts");
 const helper=read("src/lib/btc-accounts.ts");
 const create=read("src/app/api/congresses/route.ts");
 const ui=read("src/components/congress-team-client.tsx");
 const login=read("src/app/api/auth/login/route.ts");
 assert.match(api,/role==="admin"&&current\?\.length/);
 assert.match(api,/role!=="admin"&&!current\?\.length/);
 assert.match(api,/if\(account\.is_primary\)return fail/);
 assert.match(api,/if\(role==="admin"\)return fail/);
 assert.match(helper,/is_primary:role==="admin"/);
 assert.match(create,/role:"admin"/);
 assert.match(create,/primaryAdmin:/);
 assert.match(ui,/member\.isPrimary/);
 assert.match(ui,/hasPrimary/);
 assert.match(read("src/app/api/admin/access/route.ts"),/btcAdmin\?\.is_primary/);
 assert.match(login,/isStaffUser/);
 assert.match(login,/destination=staff\?"\/dashboard":"\/my-card"/);
});
