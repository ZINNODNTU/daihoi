import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {unstable_cache} from "next/cache";
import type {PortalDelegate,PortalSession} from "@/lib/delegate-portal";

export type HallLayout={
 id:string;title:string;stage_label:string;grid_rows:number;grid_columns:number;
};
export type HallSeat={
 id:string;code:string;zone:string;row_label:string;seat_number:number;
 x:number;y:number;blocked:boolean;seat_type:"delegate"|"guest";
};
export type MyHallMap={
 congressName:string;session:PortalSession;layout:HallLayout|null;
 seats:HallSeat[];ownSeatId:string|null;
};

// Physical hall geometry is shared by all delegates of the SAME congress.
 // Only cache shared layout/seats, never the personal seat assignment.
 // This cache is bounded to 15s so organizer changes become visible quickly.
 const loadSharedHallGeometry=unstable_cache(async (congressId:string,layoutId:string)=>{
  const db=createAdminClient();
  const [layoutResult,seatResult]=await Promise.all([
   db.from("seating_layouts").select("id,title,stage_label,grid_rows,grid_columns")
    .eq("id",layoutId).eq("congress_id",congressId).maybeSingle(),
   db.from("seats").select("id,code,zone,row_label,seat_number,x,y,blocked,seat_type")
    .eq("layout_id",layoutId).eq("congress_id",congressId)
    .order("y").order("x").limit(501)
  ]);
  if(layoutResult.error||seatResult.error||seatResult.data?.length===501)
   throw new Error("Không thể tải đủ sơ đồ ghế cho phiên.");
  return {layout:layoutResult.data as HallLayout|null,seats:(seatResult.data||[]) as HallSeat[]};
 },["delegate-shared-hall-v1"],{revalidate:15,tags:["daihoi-hall-geometry"]});

// The session must belong to one of the caller's server-verified delegate profiles.
// Only the physical map is returned: NEVER other delegates or their assignments.
export async function loadMyHallMap(
 items:PortalDelegate[],requestedSessionId:string|null
):Promise<MyHallMap|null>{
 const owned=items.flatMap(item=>item.sessions.map(session=>({item,session})));
 const selected=owned.find(x=>x.session.id===requestedSessionId)||
  owned.find(x=>x.session.status==="open"&&x.session.ends_at&&Date.parse(x.session.ends_at)>Date.now())||
  owned[0];
 if(!selected)return null;
 const {item,session}=selected;
 const base={congressName:item.congressName,session,layout:null,seats:[],ownSeatId:session.seat?.id||null};
 if(!session.layoutId)return base;
 const geometry=await loadSharedHallGeometry(item.congressId,session.layoutId);
 return {...base,...geometry};
}
