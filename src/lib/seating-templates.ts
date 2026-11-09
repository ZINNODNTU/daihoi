import {validateSeatDrafts,type SeatDraft,type SeatType} from "@/lib/seating";

/** Geometry-only snapshot: explicitly excludes delegate IDs, assignment IDs and seat IDs. */
export type SeatTemplateSlot={
 code:string;zone:string;rowLabel:string;seatNumber:number;
 x:number;y:number;blocked:boolean;seatType:SeatType;
};

export type SeatTemplateSummary={
 id:string;title:string;stage_label:string;grid_rows:number;grid_columns:number;
 seat_count:number;visibility:"private"|"organization";organization_id:string;
 created_by:string;created_at:string;updated_at:string;
};

export function snapshotTemplateSeats(source:SeatDraft[]):SeatTemplateSlot[]{
 if(!Array.isArray(source)||source.length<1||source.length>500)
  throw new Error("Mẫu sơ đồ phải có từ 1 đến 500 ghế.");
 const issue=validateSeatDrafts(source);
 if(issue)throw new Error(issue);
 return source.map(seat=>({
  code:seat.code.trim(),zone:seat.zone.trim(),rowLabel:seat.rowLabel.trim(),
  seatNumber:seat.seatNumber,x:seat.x,y:seat.y,blocked:seat.blocked,
  seatType:seat.seatType||"delegate"
 }));
}

/** Recreate every seat identity: no foreign UUID can cross a congress boundary. */
export function instantiateTemplateSeats(raw:unknown,makeId:()=>string):SeatDraft[]{
 if(!Array.isArray(raw)||raw.length<1||raw.length>500)
  throw new Error("Mẫu sơ đồ không chứa số ghế hợp lệ.");
 const result=raw.map((value:unknown):SeatDraft=>{
  if(!value||typeof value!=="object"||Array.isArray(value))
   throw new Error("Dữ liệu ghế trong mẫu bị lỗi.");
  const row=value as Record<string,unknown>;
  if(typeof row.code!=="string"||typeof row.zone!=="string"||
   typeof row.rowLabel!=="string"||typeof row.blocked!=="boolean"||
   !Number.isInteger(row.seatNumber)||!Number.isInteger(row.x)||!Number.isInteger(row.y)||
   (row.seatType!=="delegate"&&row.seatType!=="guest"))
   throw new Error("Mẫu ghế chứa dữ liệu không hợp lệ.");
  return {
   id:makeId(),code:row.code.trim(),zone:row.zone.trim(),rowLabel:row.rowLabel.trim(),
   seatNumber:row.seatNumber as number,x:row.x as number,y:row.y as number,
   blocked:row.blocked,seatType:row.seatType as SeatType
  };
 });
 const issue=validateSeatDrafts(result);
 if(issue)throw new Error(issue);
 return result;
}
