import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import type {PortalHistory} from "@/lib/delegate-portal";

export type DelegateHistoryEntry=PortalHistory&{congressName:string;congressId:string};
export type DelegateHistoryResult={
 history:DelegateHistoryEntry[];congresses:{id:string;name:string}[];
};
/**
 * Full attendance archive belongs to the authenticated person, NOT the currently
 * selected congress. Include inactive delegate records to retain historical attendance.
 * Paginate checkins to avoid Supabase's server-side row limits silently hiding records.
 */
export async function loadDelegateHistory(userId:string):Promise<DelegateHistoryResult>{
 const db=createAdminClient();
 const {data:delegates,error:delegateError}=await db.from("delegates")
  .select("id,congress_id").eq("auth_user_id",userId).limit(500);
 if(delegateError)throw new Error("Không tải được danh tính đại biểu.");
 const owned=delegates||[];
 if(!owned.length)return {history:[],congresses:[]};
 if(owned.length===500)throw new Error("Số hồ sơ đại biểu vượt giới hạn truy vấn lịch sử.");
 const ids=owned.map(d=>d.id);
 const congressIds=[...new Set(owned.map(d=>d.congress_id))];
 const congressRows=await db.from("congresses")
  .select("id,name").in("id",congressIds).limit(500);
 if(congressRows.error)throw new Error("Không tải được tên Đại hội trong lịch sử.");
 const congresses=congressRows.data||[];
 const congressNames=new Map(congresses.map(row=>[row.id,row.name]));
 const records:{
  id:string;congress_id:string;session_id:string;delegate_id:string;
  checked_in_at:string;method:string;
 }[]=[];
 const pageSize=500;
 for(let from=0;from<20000;from+=pageSize){
  const result=await db.from("checkins")
   .select("id,congress_id,session_id,delegate_id,checked_in_at,method")
   .in("delegate_id",ids).order("checked_in_at",{ascending:false})
   .range(from,from+pageSize-1);
  if(result.error)throw new Error("Không tải được đầy đủ lịch sử điểm danh.");
  records.push(...(result.data||[]));
  if((result.data||[]).length<pageSize)break;
  if(from+pageSize>=20000)
   throw new Error("Lịch sử có trên 20.000 lượt; cần xuất dữ liệu theo trang để xem đầy đủ.");
 }
 const sessionIds=[...new Set(records.map(r=>r.session_id))];
 const sessionNames=new Map<string,string>();
 for(let start=0;start<sessionIds.length;start+=100){
  const chunk=sessionIds.slice(start,start+100);
  const response=await db.from("attendance_sessions")
   .select("id,name").in("id",chunk).limit(100);
  if(response.error)throw new Error("Không tải được tên các phiên điểm danh.");
  for(const session of response.data||[])sessionNames.set(session.id,session.name);
 }
 return {
  congresses,
  history:records.map(item=>({
   id:item.id,congressId:item.congress_id,
   congressName:congressNames.get(item.congress_id)||"Đại hội",
   sessionId:item.session_id,sessionName:sessionNames.get(item.session_id)||"Phiên Đại hội",
   checkedInAt:item.checked_in_at,method:item.method as PortalHistory["method"]
  }))
 };
}
