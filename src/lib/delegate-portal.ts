import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {loadSharedCongressInfo,loadSharedSessionInfo} from "@/lib/portal-shared-reads";

export type PortalSeat={
 id:string;code:string;rowLabel:string;seatNumber:number;zone:string;layoutTitle:string;
};
export type PortalSession={
 id:string;name:string;status:"open"|"closed";starts_at:string|null;ends_at:string|null;
 qr_policy:"fixed"|"session"|"both";layoutId:string|null;seat:PortalSeat|null;checkedInAt:string|null;
};
export type PortalHistory={
 id:string;sessionId:string;sessionName:string;checkedInAt:string;
 method:"qr"|"manual"|"barcode";
};
export type PortalDelegate={
 id:string;fullName:string;unit:string;position:string;delegateType:"official"|"alternate"|"guest";
 photoPath:string|null;barcodeCode:string;congressId:string;
 congressName:string;kind:"doan"|"hoi_sinh_vien";term:string;venue:string;
 sessions:PortalSession[];history:PortalHistory[];
};

// Only call this with user.id obtained from server-side Supabase Auth.
// Service key never reaches the browser. Every query is scoped to owned IDs.
export async function loadDelegatePortal(authenticatedUserId:string):Promise<PortalDelegate[]>{
 const db=createAdminClient();
 const own=await db.from("delegates")
  .select("id,congress_id,full_name,unit,position,delegate_type,photo_path,barcode_code")
  .eq("auth_user_id",authenticatedUserId).eq("is_active",true)
  .order("created_at",{ascending:false}).limit(30);
 if(own.error)throw new Error("Không tải được hồ sơ đại biểu.");
 if(!own.data?.length)return [];
 const delegates=own.data;
 const congressIds=[...new Set(delegates.map(d=>d.congress_id))];
 const delegateIds=delegates.map(d=>d.id);
 const sharedIds=[...congressIds].sort();
 const [sharedCongresses,sharedSessions,assignmentResult,checkinsResult]=await Promise.all([
  loadSharedCongressInfo(sharedIds),
  loadSharedSessionInfo(sharedIds),
  db.from("seat_assignments").select("delegate_id,seat_id,layout_id")
   .in("delegate_id",delegateIds).limit(500),
  db.from("checkins").select("id,congress_id,delegate_id,session_id,checked_in_at,method")
   .in("delegate_id",delegateIds).order("checked_in_at",{ascending:false}).limit(1500)
 ]);
 if(assignmentResult.error||checkinsResult.error)
  throw new Error("Không tải được lịch sử điểm danh hoặc sơ đồ vị trí ghế.");
 const assignments=assignmentResult.data||[];
 const seatIds=[...new Set(assignments.map(a=>a.seat_id))];
 const layoutIds=[...new Set(assignments.map(a=>a.layout_id))];
 const [seatsResult,layoutsResult]=await Promise.all([
  seatIds.length?db.from("seats").select("id,layout_id,code,row_label,seat_number,zone")
   .in("id",seatIds).limit(500):Promise.resolve({data:[],error:null}),
  layoutIds.length?db.from("seating_layouts").select("id,title").in("id",layoutIds).limit(500)
   :Promise.resolve({data:[],error:null})
 ]);
 if(seatsResult.error||layoutsResult.error)throw new Error("Không đọc được vị trí ghế.");
 const congresses=new Map(sharedCongresses.map(c=>[c.id,c]));
 const sessions=sharedSessions;
 const checkins=checkinsResult.data||[];
 const seats=new Map((seatsResult.data||[]).map(s=>[s.id,s]));
 const layouts=new Map((layoutsResult.data||[]).map(l=>[l.id,l]));
 const sessionNames=new Map(sessions.map(s=>[s.id,s.name]));
 return delegates.map(delegate=>{
  const congress=congresses.get(delegate.congress_id);
  const mine=checkins.filter(c=>c.delegate_id===delegate.id&&c.congress_id===delegate.congress_id);
  const assignmentsByLayout=new Map(assignments.filter(a=>a.delegate_id===delegate.id)
   .map(a=>[a.layout_id,a.seat_id]));
  const sessionList:PortalSession[]=sessions.filter(s=>s.congress_id===delegate.congress_id)
   .map(s=>{
    const seatId=s.seating_layout_id?assignmentsByLayout.get(s.seating_layout_id):null;
    const seat=seatId?seats.get(seatId):null;
    const layout=s.seating_layout_id?layouts.get(s.seating_layout_id):null;
    return {
     id:s.id,name:s.name,status:s.status as "open"|"closed",starts_at:s.starts_at,
     ends_at:s.ends_at,qr_policy:s.qr_policy as PortalSession["qr_policy"],
     layoutId:s.seating_layout_id,
     checkedInAt:mine.find(c=>c.session_id===s.id)?.checked_in_at||null,
     seat:seat?{id:seat.id,code:seat.code,rowLabel:seat.row_label,seatNumber:seat.seat_number,
      zone:seat.zone,layoutTitle:layout?.title||"Hội trường"}:null
    };
   });
  const history:PortalHistory[]=mine.map(c=>({
   id:c.id,sessionId:c.session_id,sessionName:sessionNames.get(c.session_id)||"Phiên Đại hội",
   checkedInAt:c.checked_in_at,method:c.method as PortalHistory["method"]
  }));
  return {
   id:delegate.id,fullName:delegate.full_name,unit:delegate.unit,
   position:delegate.position||"",delegateType:delegate.delegate_type as PortalDelegate["delegateType"],
   photoPath:delegate.photo_path,barcodeCode:delegate.barcode_code||"",
   congressId:delegate.congress_id,congressName:congress?.name||"Đại hội",
   kind:(congress?.kind||"doan") as PortalDelegate["kind"],term:congress?.term||"",
   venue:congress?.venue||"",sessions:sessionList,history
  };
 });
}
