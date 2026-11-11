import {createHash} from "node:crypto";
import type {SeatTemplateSlot} from "@/lib/seating-templates";

/** A stable per-congress binding key for a source layout or shared template.
 * Different congresses get distinct IDs because their seat assignments are
 * independent. Repeated requests for the same source reuse the same ID.
 */
export function reusableLayoutId(congressId:string,sourceKind:"layout"|"template",sourceId:string):string{
 const hash=createHash("sha256").update("daihoi-seating-reuse-v49\0"+congressId+"\0"+sourceKind+"\0"+sourceId).digest("hex");
 const version="5"+hash.slice(13,16);
 const variant=((parseInt(hash[16],16)&3)|8).toString(16);
 return [hash.slice(0,8),hash.slice(8,12),version,variant+hash.slice(17,20),hash.slice(20,32)].join("-");
}

/** Canonical geometry comparison ignores seat UUIDs and array ordering.
 * Never compare delegate IDs or check-ins: each congress owns those separately.
 */
export function sameSeatGeometry(a:readonly SeatTemplateSlot[],b:readonly SeatTemplateSlot[]):boolean{
 if(a.length!==b.length)return false;
 const normalized=(value:readonly SeatTemplateSlot[])=>
  value.map(s=>JSON.stringify([
   s.code.trim(),s.zone.trim(),s.rowLabel.trim(),s.seatNumber,s.x,s.y,
   s.blocked,s.seatType||"delegate"
  ])).sort();
 const left=normalized(a),right=normalized(b);
 return left.every((value,index)=>value===right[index]);
}
