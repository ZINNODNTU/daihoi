import type {Checkin} from "@/lib/types";

export type SeatPlacement={
 code:string;layoutTitle:string;rowLabel:string;seatNumber:number;zone:string;
};
export type SeatingLayoutRef={id:string;title:string;updated_at:string};
export type SeatAssignmentRef={delegate_id:string;seat_id:string;layout_id:string};
export type SeatRef={id:string;code:string;row_label:string;seat_number:number;zone:string};

/** If a delegate is assigned in multiple rooms, display the room most recently edited.
 * An unassigned delegate never receives a fabricated seat.
 */
export function buildDelegateSeatMap(
 layouts:SeatingLayoutRef[],seats:SeatRef[],assignments:SeatAssignmentRef[]
):Record<string,SeatPlacement>{
 const layoutRank=new Map(layouts.map((layout,index)=>[layout.id,index]));
 const byLayout=new Map(layouts.map(layout=>[layout.id,layout]));
 const bySeat=new Map(seats.map(seat=>[seat.id,seat]));
 const chosen=new Map<string,{rank:number;placement:SeatPlacement}>();
 for(const assignment of assignments){
  const layout=byLayout.get(assignment.layout_id);
  const seat=bySeat.get(assignment.seat_id);
  if(!layout||!seat)continue;
  const rank=layoutRank.get(layout.id)??Number.MAX_SAFE_INTEGER;
  if((chosen.get(assignment.delegate_id)?.rank??Number.MAX_SAFE_INTEGER)<=rank)continue;
  chosen.set(assignment.delegate_id,{
   rank,placement:{
    code:seat.code,layoutTitle:layout.title,rowLabel:seat.row_label,
    seatNumber:seat.seat_number,zone:seat.zone
   }
  });
 }
 return Object.fromEntries([...chosen].map(([id,item])=>[id,item.placement]));
}

export function currentSessionCheckins(checkins:Checkin[],sessionId:string){
 return checkins.filter(item=>item.session_id===sessionId)
  .sort((a,b)=>Date.parse(b.checked_in_at)-Date.parse(a.checked_in_at)
   ||b.id.localeCompare(a.id));
}
