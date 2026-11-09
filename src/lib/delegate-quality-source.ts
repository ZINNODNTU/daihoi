import "server-only";
import type {PostgrestError} from "@supabase/supabase-js";
import {createAdminClient} from "@/lib/supabase/admin";
import type {DemographicPerson,CheckinIdentity} from "@/lib/delegate-demographics";

type Db=ReturnType<typeof createAdminClient>;
export type QualitySourceError="migration_missing"|"data_limit"|"read_failed";

const PAGE_SIZE=500;
const MAX_DELEGATES=1200;
const MAX_CHECKINS=10000;
function errorReason(error:PostgrestError):QualitySourceError{
 return error.code==="42703"||error.code==="PGRST204"?"migration_missing":"read_failed";
}

/**
 * Supabase Data API thường giới hạn 1.000 dòng mỗi response.
 * Phân trang thay vì .limit(10001), để không âm thầm bỏ qua phiên điểm danh.
 * Chỉ gọi sau khi route kiểm tra quyền staff với đúng Đại hội.
 */
export async function loadQualitySource(db:Db,congressId:string,sessionId:string):Promise<{
 delegates:DemographicPerson[];checkins:CheckinIdentity[];error:QualitySourceError|null
}>{
 const delegates:DemographicPerson[]=[];
 const checkins:CheckinIdentity[]=[];
 for(let offset=0;offset<=MAX_DELEGATES;offset+=PAGE_SIZE){
  const {data,error}=await db.from("delegates")
   .select("id,full_name,unit,gender,birth_date,delegate_type")
   .eq("congress_id",congressId).order("id",{ascending:true})
   .range(offset,offset+PAGE_SIZE-1);
  if(error){
   console.error("quality delegates query",error.code);
   return {delegates:[],checkins:[],error:errorReason(error)};
  }
  delegates.push(...((data||[]) as DemographicPerson[]));
  if(delegates.length>MAX_DELEGATES)return {delegates:[],checkins:[],error:"data_limit"};
  if((data?.length||0)<PAGE_SIZE)break;
 }
 for(let offset=0;offset<=MAX_CHECKINS;offset+=PAGE_SIZE){
  let query=db.from("checkins").select("delegate_id,session_id,checked_in_at")
   .eq("congress_id",congressId).order("id",{ascending:true})
   .range(offset,offset+PAGE_SIZE-1);
  if(sessionId!=="all")query=query.eq("session_id",sessionId);
  const {data,error}=await query;
  if(error){
   console.error("quality checkins query",error.code);
   return {delegates:[],checkins:[],error:"read_failed"};
  }
  checkins.push(...((data||[]) as CheckinIdentity[]));
  if(checkins.length>MAX_CHECKINS)return {delegates:[],checkins:[],error:"data_limit"};
  if((data?.length||0)<PAGE_SIZE)break;
 }
 return {delegates,checkins,error:null};
}
