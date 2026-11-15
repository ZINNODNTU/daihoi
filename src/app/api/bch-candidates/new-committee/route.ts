import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {selectNewBchMembers,type BchBallotCandidate} from "@/lib/bch-candidates";
import {writeSystemLog} from "@/lib/system-log";
import {congressBchPublication} from "@/lib/bch-new-committee-selection";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:HEADERS});
function sameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===request.headers.get("host");}catch{return false;}
}
async function permitted(congressId:string,ability:"ballots.read"|"ballots.write"){
 if(!UUID.test(congressId))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Cần đăng nhập.",401)} as const;
 if(!(await hasCongressAbility(supabase,user.id,congressId,ability)))
  return {error:fail("Không có quyền công bố hoặc xem BCH khóa mới.",403)} as const;
 return {user,db:createAdminClient()} as const;
}

export async function GET(request:Request){
 const congressId=new URL(request.url).searchParams.get("congressId")||"";
 const auth=await permitted(congressId,"ballots.read");
 if("error" in auth)return auth.error;
 const {data,error}=await auth.db.from("congresses")
  .select("bch_new_member_ids,bch_new_published_at").eq("id",congressId).maybeSingle();
 if(error)return fail("Chưa đọc được cấu hình công bố BCH khóa mới. Kiểm tra migration V84.",503);
 try{return NextResponse.json({publication:congressBchPublication(data)},{headers:HEADERS});}
 catch{return fail("Danh sách BCH khóa mới đã công bố không hợp lệ.",503);}
}

/** Only a person permitted to WRITE ballots can officially publish the new BCH.
 * Never accept the actual elected member list from the browser as authority. */
export async function POST(request:Request){
 if(!sameOrigin(request))return fail("Nguồn yêu cầu không hợp lệ.",403);
 if(Number(request.headers.get("content-length")||0)>20000)return fail("Yêu cầu quá lớn.",413);
 let body:Record<string,unknown>;
 try{body=await request.json();}catch{return fail("Dữ liệu yêu cầu không hợp lệ.",400);}
 const congressId=typeof body?.congressId==="string"?body.congressId:"";
 const auth=await permitted(congressId,"ballots.write");
 if("error" in auth)return auth.error;
 const count=body?.count;
 if((typeof count!=="number"&&!/^[1-9][0-9]*$/.test(String(count)))||
  !Number.isSafeInteger(Number(count))||Number(count)<1||Number(count)>500)
  return fail("Số ủy viên BCH cần từ 1 đến 500 người.",400);
 const expectedIds=body?.memberIds;
 if(!Array.isArray(expectedIds)||expectedIds.length!==Number(count)||
  expectedIds.some(id=>typeof id!=="string"||!UUID.test(id)))
  return fail("Danh sách ra mắt không hợp lệ. Hãy tải lại sổ kiểm phiếu.",400);
 try{
  const {data:congress,error:congressError}=await auth.db.from("congresses")
   .select("id,kind,bch_total_ballots").eq("id",congressId).maybeSingle();
  if(congressError||!congress||congress.kind!=="doan")
   return fail("Đại hội không áp dụng kiểm phiếu BCH.",404);
  const {data:candidates,error:ballotError}=await auth.db.from("bch_candidates")
   .select("id,full_name,display_order,created_at,updated_at,votes_received,total_ballots")
   .eq("congress_id",congressId).limit(501);
  if(ballotError||!candidates||candidates.length>500)
   return fail("Không đọc được toàn bộ nhân sự kiểm phiếu BCH.",503);
  const result=selectNewBchMembers(candidates as BchBallotCandidate[],
   congress.bch_total_ballots??null,count);
  if(result.error)return fail(result.error,400);
  if(result.cutoffTie&&body.acknowledgeTie!==true)
   return fail("Có đồng phiếu ở vị trí cuối. BTC cần xác nhận xử lý đồng phiếu.",409);
  const members=result.members.map(item=>item.id);
  if(members.some((id,index)=>id!==expectedIds[index]))
   return fail("Dữ liệu kiểm phiếu đã thay đổi. Hãy làm mới và xác nhận danh sách.",409);
  // Transactional server-side validation takes the same congress lock as tally RPC.
  const {data:published,error:publishError}=await auth.db.rpc("publish_bch_new_committee_v84",{
   p_congress_id:congressId,p_member_ids:members,
   p_acknowledge_tie:body.acknowledgeTie===true,p_published_by:auth.user.id
  });
  if(publishError){
   if(publishError.code==="PGRST202"||publishError.code==="42883")
    return fail("Chưa triển khai migration upgrade-bch-new-committee-v84.sql.",503);
   if(publishError.code==="22023")return fail(
    "Kết quả BCH không còn hợp lệ hoặc vừa thay đổi. Hãy làm mới, đối chiếu và công bố lại.",409);
   console.error("[new-bch] publication RPC failed",{code:publishError.code});
   return fail("Không công bố được BCH khóa mới. Vui lòng thử lại.",503);
  }
  const resultRow=published?.[0];
  await writeSystemLog({level:"info",source:"api",event:"bch.new_committee_published",
   message:"BTC đã công bố BCH khóa mới cho cổng đại biểu và khách mời.",
   actorId:auth.user.id,congressId,context:{
    operation:"bch.new_committee.publish",endpoint:"/api/bch-candidates/new-committee",
    httpMethod:"POST",memberCount:members.length
   }}).catch(()=>{});
  return NextResponse.json({ok:true,memberCount:members.length,
   publishedAt:resultRow?.publication_time||new Date().toISOString()},{headers:HEADERS});
 }catch{
  return fail("Không thể công bố BCH khóa mới. Vui lòng thử lại.",503);
 }
}

/** Retract an incorrect announcement without changing any ballot totals. */
export async function DELETE(request:Request){
 if(!sameOrigin(request))return fail("Nguồn yêu cầu không hợp lệ.",403);
 let body:Record<string,unknown>;
 try{body=await request.json();}catch{return fail("Dữ liệu yêu cầu không hợp lệ.",400);}
 const congressId=typeof body?.congressId==="string"?body.congressId:"";
 const auth=await permitted(congressId,"ballots.write");
 if("error" in auth)return auth.error;
 const {data,error}=await auth.db.from("congresses")
  .update({bch_new_member_ids:null,bch_new_published_at:null})
  .eq("id",congressId).select("id").maybeSingle();
 if(error)return fail("Không thu hồi được BCH khóa mới đã công bố.",503);
 if(!data)return fail("Đại hội không tồn tại.",404);
 await writeSystemLog({level:"info",source:"api",event:"bch.new_committee_retracted",
  message:"BTC thu hồi danh sách BCH khóa mới đã công bố.",
  actorId:auth.user.id,congressId,context:{operation:"bch.new_committee.retract",
   endpoint:"/api/bch-candidates/new-committee",httpMethod:"DELETE"}}).catch(()=>{});
 return NextResponse.json({ok:true},{headers:HEADERS});
}
