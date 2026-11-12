import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {validateSharedBchTotal} from "@/lib/bch-candidates";
import {writeSystemLog} from "@/lib/system-log";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const err=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))return err("Yêu cầu khác nguồn.",403);
  const body=await request.json().catch(()=>null);
  const congressId=body?.congressId;
  if(typeof congressId!=="string"||!UUID.test(congressId))return err("Đại hội không hợp lệ.",400);
  const total=validateSharedBchTotal(body?.total_ballots);
  if(total===undefined)return err("Tổng phiếu phải là số nguyên từ 1 đến 1.000.000.",400);
  const {supabase,user}=await getAuth();
  if(!user)return err("Vui lòng đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"ballots.write")))
   return err("Tài khoản không có quyền nhập phiếu.",403);
  const {data:congress,error:congressError}=await supabase.from("congresses")
   .select("id,kind,bch_total_ballots").eq("id",congressId).maybeSingle();
  if(congressError||!congress)return err("Không thể đọc Đại hội.",503);
  if(congress.kind!=="doan")return err("Chỉ Đại hội Đoàn được nhập kiểm phiếu BCH.",400);
  // Invoker-rights SQL function atomically updates the one shared total and
  // each candidate's legacy denormalized denominator, rejecting incompatible votes.
  const {data,error}=await createAdminClient().rpc("set_bch_shared_ballot_total",{
   p_congress_id:congressId,p_total:total
  });
  if(error){
   if(error.code==="23514")return err("Có ứng viên đã lưu phiếu lớn hơn tổng mới, hoặc đang còn phiếu nên không thể xóa tổng. Hãy điều chỉnh số phiếu của ứng viên trước.",409);
   if(error.code==="42883"||error.code==="PGRST202")return err("Chưa cài đặt phân hệ kiểm phiếu V58 trên Supabase.",503);
   console.error("shared BCH tally total update",error.code);
   return err("Không ghi được tổng phiếu chung. Mã lỗi: "+String(error.code||"UNKNOWN")+".",503);
  }
  await writeSystemLog({level:"info",source:"api",event:"bch.shared_total_updated",
   message:"BTC đã cập nhật tổng số phiếu dùng chung cho BCH.",congressId,actorId:user.id,
   context:{operation:"bch.ballots.total",httpMethod:"PATCH",affectedCandidates:data}});
  return NextResponse.json({total_ballots:total,updatedCandidates:data},{
   headers:{"Cache-Control":"private, no-store"}
  });
 }catch{return err("Không xử lý được tổng phiếu chung.",400);}
}
