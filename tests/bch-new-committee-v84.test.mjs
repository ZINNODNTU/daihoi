import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectNewBchMembers} from "../src/lib/bch-candidates.ts";
import {congressBchPublication,mapPublishedNewBch} from "../src/lib/bch-new-committee-selection.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const uuid=i=>"00000000-0000-4000-8000-"+String(i).padStart(12,"0");
const ballot=(index,votes)=>({
 id:uuid(index),full_name:["An","Bình","Cường","Dũng","Hà"][index-1],
 display_order:index,created_at:"2026-11-15T00:00:00Z",updated_at:"2026-11-15T00:00:00Z",
 votes_received:votes,total_ballots:100
});
const bio=(index)=>({
 ...ballot(index,null),
 congress_id:uuid(99),birth_year:2000,hometown:"Đồng Nai",ethnicity:"Kinh",
 education_level:"Đại học",union_join_year:2018,current_position:"Bí thư",
 photo_path:null
});
const publish=(ids,at="2026-11-15T09:00:00Z")=>({
 bch_new_member_ids:ids,bch_new_published_at:at
});

test("exact top N uses existing BTC ballot data; ties do not grow committee",()=>{
 const ballots=[ballot(1,90),ballot(2,88),ballot(3,88),ballot(4,75),ballot(5,60)];
 const two=selectNewBchMembers(ballots,100,2);
 assert.equal(two.members.length,2);
 assert.equal(two.cutoffTie,true);
 const three=selectNewBchMembers(ballots,100,3);
 assert.equal(three.cutoffTie,false);
 assert.deepEqual(three.members.map(d=>d.id),[uuid(1),uuid(2),uuid(3)]);
 const incomplete=selectNewBchMembers([ballot(1,null)],100,1);
 assert.ok(incomplete.error);
});

test("congress stores only published IDs + timestamp, derives exact N",()=>{
 assert.deepEqual(congressBchPublication(publish([uuid(2),uuid(1)])),{
  memberCount:2,publishedAt:"2026-11-15T09:00:00Z"
 });
 assert.equal(congressBchPublication(publish(null,null)),null);
 assert.throws(()=>congressBchPublication(publish([uuid(1)],null)),/không hợp lệ/);
 assert.throws(()=>congressBchPublication(publish(null)),/không hợp lệ/);
 assert.throws(()=>congressBchPublication(publish([])),/không hợp lệ/);
 assert.throws(()=>congressBchPublication(publish([uuid(1),uuid(1)])),/không hợp lệ/);
});

test("flashcards join existing BCH profiles in original published order, not later vote rankings",()=>{
 const records=[bio(1),bio(2),bio(3),bio(4)];
 const result=mapPublishedNewBch(publish([uuid(3),uuid(1),uuid(2)]),records);
 assert.equal(result?.memberCount,3);
 assert.deepEqual(result?.members.map(row=>row.id),[uuid(3),uuid(1),uuid(2)]);
 assert.ok(result?.members.every(row=>row.congress_id===uuid(99)));
 assert.deepEqual(records.map(x=>x.id),[uuid(1),uuid(2),uuid(3),uuid(4)]);
});

test("fail closed on missing candidate profile; no incomplete or duplicate list",()=>{
 const records=[bio(1),bio(2)];
 assert.throws(()=>mapPublishedNewBch(publish([uuid(1),uuid(3)]),records),/không còn đủ/);
 assert.throws(()=>mapPublishedNewBch(publish([uuid(1),uuid(1)]),records),/không hợp lệ/);
 assert.equal(mapPublishedNewBch(publish(null,null),records),null);
});

test("migration V84 extends existing congress, no new table or duplicated candidate bio",()=>{
 const sql=read("supabase/upgrade-bch-new-committee-v84.sql");
 assert.match(sql,/ALTER TABLE public\.congresses\s+ADD COLUMN IF NOT EXISTS bch_new_member_ids uuid\[\]/);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS bch_new_published_at timestamptz/);
 assert.match(sql,/CONSTRAINT congress_bch_new_publication_check CHECK/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.publish_bch_new_committee_v84/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.publish_bch_new_committee_v84/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.publish_bch_new_committee_v84.*TO service_role/s);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/UPDATE public\.congresses\s+SET bch_new_member_ids=p_member_ids/);
 assert.match(sql,/v_highest_unselected>v_lowest_selected/);
 assert.match(sql,/p_acknowledge_tie IS DISTINCT FROM true/);
 assert.match(sql,/to_regclass\('public\.bch_new_committee_publications'\)/,"backfills only if legacy V83 exists");
 assert.doesNotMatch(sql,/CREATE TABLE|DROP TABLE|DISABLE ROW LEVEL SECURITY/i);
 assert.doesNotMatch(sql,/\b(photo_path|full_name|hometown|education_level)\b/i);
});

test("publication API checks BTC ballot role and revalidates top-N on the server",()=>{
 const api=read("src/app/api/bch-candidates/new-committee/route.ts");
 assert.match(api,/hasCongressAbility\(supabase,user.id,congressId,ability\)/);
 assert.match(api,/permitted\(congressId,"ballots.write"\)/);
 assert.match(api,/selectNewBchMembers\(candidates/);
 assert.match(api,/members\.some\(\(id,index\)=>id!==expectedIds\[index\]\)/);
 assert.match(api,/rpc\("publish_bch_new_committee_v84"/);
 assert.match(api,/acknowledgeTie/);
 assert.match(api,/\.update\(\{bch_new_member_ids:null,bch_new_published_at:null\}\)/);
 assert.doesNotMatch(api,/from\("bch_new_committee_publications"\)/);
});

test("guest API returns published BCH profiles, never private ballot tallies",()=>{
 const api=read("src/app/api/guest/[slug]/bch-new/route.ts");
 const readService=read("src/lib/bch-new-committee.ts");
 assert.match(api,/eq\("status","live"\)/);
 assert.match(api,/if\(!publication\)/);
 assert.match(api,/memberCount:publication.memberCount/);
 assert.doesNotMatch(api,/\bvotes_received:/);
 assert.doesNotMatch(api,/\btotal_ballots:/);
 assert.doesNotMatch(readService,/\bvotes_received\b/);
 assert.doesNotMatch(readService,/\btotal_ballots\b/);
 assert.match(readService,/\.from\("congresses"\)/);
 assert.match(readService,/\.from\("bch_candidates"\)/);
 assert.doesNotMatch(readService,/\.from\("bch_new_committee_publications"\)/);
});

test("delegate and guest portals keep new BCH flashcards and role boundaries",()=>{
 const shell=read("src/components/delegate-shell.tsx");
 const delegate=read("src/app/my-card/bch-new/page.tsx");
 const guest=read("src/components/guest-congress-reader.tsx");
 const card=read("src/components/delegate-bch-carousel.tsx");
 const preview=read("src/app/dashboard/access/preview/[userId]/page.tsx");
 assert.match(shell,/href:"\/my-card\/bch-new",label:"BCH khóa mới"/);
 assert.match(shell,/"\/my-card\/bch-new":"portal.bch"/);
 assert.match(delegate,/hasPortalAbility\(user.id,congressId,"portal.bch"\)/);
 assert.match(delegate,/readPublishedNewBch\(congressId\)/);
 assert.match(delegate,/variant="new"/);
 assert.match(guest,/data-tab="bch-new"/);
 assert.match(guest,/fetch\("\/api\/guest\/"\+encodeURIComponent\(slug\)\+"\/bch-new"/);
 assert.match(guest,/variant="new"/);
 assert.match(card,/variant==="new"\?"ỦY VIÊN BCH KHÓA MỚI"/);
 assert.match(preview,/DelegateNewCommitteePage/);
});

test("count input restores BTC's latest published count and status from congress",()=>{
 const launch=read("src/components/bch-new-committee-launch.tsx");
 const ballots=read("src/components/bch-ballots-client.tsx");
 const page=read("src/app/congresses/[id]/ballots/page.tsx");
 assert.match(launch,/setCountInput\]=useState\(publication\?String\(publication.memberCount\)/);
 assert.match(launch,/memberIds:members\.map\(item=>item\.id\)/);
 assert.match(launch,/onPublicationChange\(/);
 assert.match(launch,/Công bố BCH khóa mới/);
 assert.match(launch,/Thu hồi công bố/);
 assert.match(ballots,/publication=\{published\}/);
 assert.match(page,/from\("congresses"\)/);
 assert.match(page,/congressBchPublication\(publication.data\)/);
});
