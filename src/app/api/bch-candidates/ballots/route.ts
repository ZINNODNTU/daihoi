import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateBchVotes,validateBchVoteEntry} from "@/lib/bch-candidates";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});

/** The private tally room reads only minimal person identifiers and vote counts.
 * No tally is included in delegate-facing BCH cards or the personnel CRUD.
 */
export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  if(!UUID.test(congressId))return fail("Đại hội không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"ballots.read")))
   return fail("Không có quyền xem sổ kiểm phiếu.",403);
  const {data:congress,error:congressError}=await supabase.from("congresses")
   .select("id,name,kind,bch_total_ballots").eq("id",congressId).maybeSingle();
  if(congressError||!congress)return fail("Không đọc được Đại hội.",503);
  if(congress.kind!=="doan")return fail("Sổ kiểm phiếu chỉ áp dụng cho Đại hội Đoàn.",404);
  const [canWrite,canViewBch]=await Promise.all([
    hasCongressAbility(supabase,user.id,congressId,"ballots.write"),
    hasCongressAbility(supabase,user.id,congressId,"bch.read")
   ]);
   const {data,error}=await createAdminClient().from("bch_candidates")
   .select("id,full_name,display_order,created_at,updated_at,votes_received,total_ballots"+
     (canViewBch?",photo_path,current_position":""))
   .eq("congress_id",congressId).order("display_order").order("created_at").limit(500);
  if(error)return fail("Không tải được danh sách kiểm phiếu ("+(error.code||"unknown")+").",503);
  return NextResponse.json({
   total_ballots:congress.bch_total_ballots,candidates:data||[],
   canWrite
  },{headers:HEADERS});
 }catch{return fail("Không tải được sổ kiểm phiếu.",503);}
}

/** User authorizes through verified account permissions, not a client-supplied
 * role. A server-only invoker RPC locks the common denominator and candidate,
 * updates a single vote count and enforces optimistic concurrency atomically.
 */
export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Yêu cầu không cùng nguồn.",403);
  const body=await request.json().catch(()=>null);
  const congressId=body?.congressId,id=body?.id;
  if(typeof congressId!=="string"||!UUID.test(congressId)||
     typeof id!=="string"||!UUID.test(id))
   return fail("Đại hội hoặc ứng viên BCH không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"ballots.write")))
   return fail("Tài khoản không được phép nhập kết quả kiểm phiếu.",403);
  const {data:congress,error:congressError}=await supabase.from("congresses")
   .select("kind,bch_total_ballots").eq("id",congressId).maybeSingle();
  if(congressError||!congress)return fail("Không xác minh được Đại hội.",503);
  if(congress.kind!=="doan")return fail("Chỉ Đại hội Đoàn có sổ kiểm phiếu BCH.",400);
  // New entry protocol accepts the transcribed count + explicit mode.
   // Legacy requests supplying votes_received remain direct achieved votes.
   const explicitMode=body?.vote_mode!==undefined;
   if(explicitMode&&body?.votes_received!==undefined)
    return fail("Không được gửi đồng thời phiếu đã quy đổi và phiếu gốc.",400);
   const checked=explicitMode?
    validateBchVoteEntry(body?.entered_votes,congress.bch_total_ballots,body?.vote_mode):
    validateBchVotes(body?.votes_received,congress.bch_total_ballots);
  if(checked.error)return fail(checked.error,400);
  const timestamp=body?.expectedUpdatedAt;
  if(typeof timestamp!=="string"||timestamp.length>64||
     !/^\d{4}-\d{2}-\d{2}T/.test(timestamp)||!Number.isFinite(Date.parse(timestamp)))
   return fail("Phiếu đã thay đổi hoặc chưa có mốc đối chiếu. Tải lại danh sách.",409);
  // The service-role key never reaches the browser. Authz was verified above.
  const {data,error}=await createAdminClient().rpc("set_bch_candidate_votes_v58",{
   p_congress_id:congressId,p_candidate_id:id,p_votes:checked.votes,
   p_expected_updated_at:timestamp
  });
  if(error){
   if(error.code==="40001")return fail("Phiếu đã được cập nhật từ thiết bị khác. Hãy tải lại.",409);
   if(error.code==="23514")return fail("Số phiếu vượt tổng phiếu chung hoặc tổng phiếu đã thay đổi. Hãy tải lại.",409);
   if(error.code==="P0002")return fail("Không tìm thấy Đại hội Đoàn.",404);
   console.error("ballot candidate RPC failed",{code:error.code});
   return fail("Không ghi được số phiếu. Kiểm tra cấu hình kiểm phiếu V58.",503);
  }
  await writeSystemLog({level:"info",source:"api",event:"bch.ballot_updated",
   message:"BTC ghi nhận số phiếu BCH tại phân hệ kiểm phiếu.",actorId:user.id,congressId,
   context:{operation:"bch.ballots.update",endpoint:"/api/bch-candidates/ballots",
    httpMethod:"PATCH",candidateId:id,hasResult:checked.votes!==null,
     entryMode:explicitMode?body.vote_mode:"legacy-direct",enteredVotes:explicitMode&&"entered" in checked?checked.entered:checked.votes}});
  return NextResponse.json({candidate:data},{headers:HEADERS});
 }catch{return fail("Không xử lý được kết quả kiểm phiếu.",400);}
}
