import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";

import {validateBchVotes} from "@/lib/bch-candidates";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEADERS={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});

/** A dedicated manual tally endpoint: never rewrites biographical information. */
export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Yêu cầu không cùng nguồn.",403);
  const body=await request.json().catch(()=>null);
  const congressId=body?.congressId,id=body?.id;
  if(typeof congressId!=="string"||!UUID.test(congressId)||
     typeof id!=="string"||!UUID.test(id))
   return fail("Đại hội hoặc nhân sự BCH không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"bch.write")))
   return fail("Không có quyền nhập kết quả kiểm phiếu BCH.",403);
  const congress=await supabase.from("congresses").select("kind,bch_total_ballots").eq("id",congressId).maybeSingle();
  if(congress.error||!congress.data)return fail("Không xác minh được Đại hội.",503);
  if(congress.data.kind!=="doan")
   return fail("Chỉ Đại hội Đoàn mới có phần kiểm phiếu BCH.",400);
  const checked=validateBchVotes(body?.votes_received,congress.data.bch_total_ballots);
  if(checked.error)return fail(checked.error,400);

  // Optimistic concurrency: prevent a stale tab from overwriting a newer result.
  const expectedUpdatedAt=body?.expectedUpdatedAt;
  if(typeof expectedUpdatedAt!=="string"||expectedUpdatedAt.length>64||
     !/^\d{4}-\d{2}-\d{2}T/.test(expectedUpdatedAt)||!Number.isFinite(Date.parse(expectedUpdatedAt)))
   return fail("Dữ liệu đã thay đổi. Hãy tải lại danh sách trước khi nhập phiếu.",409);
  const {data,error}=await supabase.from("bch_candidates")
   .update({votes_received:checked.votes,total_ballots:checked.votes===null?null:congress.data.bch_total_ballots,
    updated_at:new Date().toISOString()})
   .eq("congress_id",congressId).eq("id",id)
   .eq("updated_at",expectedUpdatedAt)
   .select("id,congress_id,votes_received,total_ballots,updated_at").maybeSingle();
  if(error){
   if(error.code==="42703")return fail("Database chưa được cập nhật V47. Hãy kiểm tra migration.",503);
   console.error("bch tally update failed",error.code);
   return fail("Không lưu được kết quả kiểm phiếu. Kiểm tra quyền truy cập và thử lại.",500);
  }
  if(!data)return fail("Hồ sơ đã được thay đổi hoặc xóa. Tải lại danh sách trước khi lưu.",409);
  await writeSystemLog({level:"info",source:"api",event:"bch.ballot_updated",
   message:"BTC cập nhật kết quả kiểm phiếu BCH (nhập tay).",actorId:user.id,congressId,
   context:{operation:"bch.ballots.update",endpoint:"/api/bch-candidates/ballots",
    httpMethod:"PATCH",candidateId:id,hasResult:checked.votes!==null}});
  return NextResponse.json({candidate:data},{headers:HEADERS});
 }catch{return fail("Không thể xử lý yêu cầu nhập phiếu.",400);}
}
