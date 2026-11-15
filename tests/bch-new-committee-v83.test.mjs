import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectNewBchMembers} from "../src/lib/bch-candidates.ts";
import {mapPublishedNewBch} from "../src/lib/bch-new-committee-selection.ts";

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

test("exact top-N from recorded votes; ties do not grow committee",()=>{
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
test("published snapshot returns only exactly the stored ordered member ids",()=>{
 const source=[bio(1),bio(2),bio(3),bio(4)];
 const result=mapPublishedNewBch({
  member_ids:[uuid(3),uuid(1),uuid(2)],member_count:3,
  published_at:"2026-11-15T09:00:00Z"
 },source);
 assert.equal(result?.memberCount,3);
 assert.deepEqual(result?.members.map(row=>row.id),[uuid(3),uuid(1),uuid(2)]);
 assert.ok(result?.members.every(row=>row.congress_id===uuid(99)));
});
test("never present partial or duplicate published member lists",()=>{
 const records=[bio(1),bio(2)];
 assert.throws(()=>mapPublishedNewBch({member_ids:[uuid(1),uuid(2)],member_count:3,published_at:"t"},records),/không hợp lệ/);
 assert.throws(()=>mapPublishedNewBch({member_ids:[uuid(1),uuid(3)],member_count:2,published_at:"t"},records),/không còn đủ/);
 assert.throws(()=>mapPublishedNewBch({member_ids:[uuid(1),uuid(1)],member_count:2,published_at:"t"},records),/không hợp lệ/);
 assert.equal(mapPublishedNewBch(null,records),null);
});
test("schema protects publication behind service role and atomic congress lock",()=>{
 const sql=read("supabase/upgrade-bch-new-committee-v83.sql");
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.bch_new_committee_publications/);
 assert.match(sql,/member_count integer NOT NULL/);
 assert.match(sql,/cardinality\(member_ids\)=member_count/);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON public\.bch_new_committee_publications FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.publish_bch_new_committee_v83/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.publish_bch_new_committee_v83.*TO service_role/s);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/v_highest_unselected>v_lowest_selected/);
 assert.match(sql,/p_acknowledge_tie IS DISTINCT FROM true/);
});
test("publish API verifies role, recounts on server and executes atomic RPC",()=>{
 const api=read("src/app/api/bch-candidates/new-committee/route.ts");
 assert.match(api,/hasCongressAbility\(supabase,user.id,congressId,ability\)/);
 assert.match(api,/permitted\(congressId,"ballots.write"\)/);
 assert.match(api,/selectNewBchMembers\(candidates/);
 assert.match(api,/members\.some\(\(id,index\)=>id!==expectedIds\[index\]\)/);
 assert.match(api,/rpc\("publish_bch_new_committee_v83"/);
 assert.match(api,/acknowledgeTie/);
 assert.match(api,/export async function DELETE/);
});
test("public guest feed only returns published committee, never private ballot tally",()=>{
 const api=read("src/app/api/guest/[slug]/bch-new/route.ts");
 const readService=read("src/lib/bch-new-committee.ts");
 assert.match(api,/eq\("status","live"\)/);
 assert.match(api,/if\(!publication\)/);
 assert.match(api,/memberCount:publication.memberCount/);
 assert.doesNotMatch(api,/\bvotes_received:/);
 assert.doesNotMatch(api,/\btotal_ballots:/);
 assert.doesNotMatch(readService,/\bvotes_received\b/);
 assert.doesNotMatch(readService,/\btotal_ballots\b/);
});
test("delegate and guest portals both show BCH khóa mới as flashcards",()=>{
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
test("launch count persists on explicit publication for guest and delegate visitors",()=>{
 const launch=read("src/components/bch-new-committee-launch.tsx");
 const ballots=read("src/components/bch-ballots-client.tsx");
 const page=read("src/app/congresses/[id]/ballots/page.tsx");
 assert.match(launch,/setCountInput\]=useState\(publication\?String\(publication.memberCount\)/);
 assert.match(launch,/memberIds:members\.map\(item=>item\.id\)/);
 assert.match(launch,/onPublicationChange\(/);
 assert.match(launch,/Công bố BCH khóa mới/);
 assert.match(launch,/Thu hồi công bố/);
 assert.match(ballots,/publication=\{published\}/);
 assert.match(page,/from\("bch_new_committee_publications"\)/);
});
