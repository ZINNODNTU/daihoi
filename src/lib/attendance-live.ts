export type LiveDelegate={
 id:string;code:string;full_name:string;unit:string;delegate_type:"official"|"alternate"|"guest";
 photo_path:string|null;is_active:boolean;
};
export type LiveCheckin={id:string;delegate_id:string;checked_in_at:string;
 method:"qr"|"manual"|"barcode";qr_scope:"session"|"fixed"|null};
export type LiveLayout={
 id:string;title:string;stage_label:string;grid_rows:number;grid_columns:number;updated_at:string;
};
export type LiveSeat={
 id:string;layout_id:string;code:string;row_label:string;seat_number:number;zone:string;
 x:number;y:number;blocked:boolean;seat_type:"delegate"|"guest";
};
export type LiveAssignment={seat_id:string;delegate_id:string};
export type LiveDashboardData={
 session:import("@/lib/types").AttendanceSession;
 delegates:LiveDelegate[];checkins:LiveCheckin[];
 layouts:LiveLayout[];layout:LiveLayout|null;seats:LiveSeat[];
 assignments:LiveAssignment[];refreshedAt:string;
};
export type LiveSeatState="present"|"absent"|"unassigned"|"blocked";
export function classifySeat(
 seat:LiveSeat,assignedDelegateId:string|undefined,
 checked:ReadonlySet<string>
):LiveSeatState{
 return seat.blocked?"blocked":!assignedDelegateId?"unassigned":
  checked.has(assignedDelegateId)?"present":"absent";
}
export function computeLiveSummary(data:LiveDashboardData){
 const eligible=new Set(data.delegates.filter(d=>d.is_active).map(d=>d.id));
 const checked=new Set(data.checkins.filter(c=>eligible.has(c.delegate_id)).map(c=>c.delegate_id));
 const assigned=new Map(data.assignments.map(a=>[a.seat_id,a.delegate_id]));
 const stateCounts={present:0,absent:0,unassigned:0,blocked:0};
 for(const seat of data.seats)stateCounts[classifySeat(seat,assigned.get(seat.id),checked)]++;
 const total=eligible.size,present=checked.size;
 return {total,present,absent:Math.max(0,total-present),
  percentage:total?Math.round(present/total*100):0,
  seats:stateCounts,
  qr:data.checkins.filter(c=>eligible.has(c.delegate_id)&&c.method==="qr").length,
  manual:data.checkins.filter(c=>eligible.has(c.delegate_id)&&c.method==="manual").length,
  barcode:data.checkins.filter(c=>eligible.has(c.delegate_id)&&c.method==="barcode").length
 };
}
