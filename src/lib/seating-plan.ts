import {
 seatGridCellIndex,seatGridSizeValid,setSeatGridCells,validateSeatDrafts,renumberGridSeats,
 type SeatDraft,type SeatGridResult,type SeatGridSize,type SeatType
} from "@/lib/seating";

/** Atomic, row/column-based editor commands. An operation either returns a
 * validated seat plan or leaves the entire source plan untouched. Seat UUIDs
 * remain stable, preserving the existing delegate-to-seat relations.
 */
export type SeatGridCommand=
 |{kind:"fill-row"|"clear-row"|"guest-row"|"delegate-row";row:number;seatType?:SeatType}
 |{kind:"fill-column"|"clear-column";column:number;seatType?:SeatType}
 |{kind:"clear-aisles";columns:number[]};

export function applySeatGridCommand(
 current:SeatDraft[],assignedSeatIds:ReadonlySet<string>,size:SeatGridSize,
 command:SeatGridCommand,makeId:()=>string
):SeatGridResult{
 const reject=(error:string):SeatGridResult=>({seats:current,error});
 if(!seatGridSizeValid(size))return reject("Kích thước hội trường không hợp lệ.");
 const target=new Set<number>();
 for(const seat of current){
  const index=seatGridCellIndex(seat,size);
  if(index!==null)target.add(index);
 }
 let changeTypes:{row:number;seatType:SeatType}|null=null;
 const fill=(indices:number[])=>{for(const index of indices)target.add(index);};
 const clear=(indices:number[])=>{for(const index of indices)target.delete(index);};
 const rowIndices=(row:number)=>Array.from({length:size.columns},(_,col)=>row*size.columns+col);
 const colIndices=(column:number)=>Array.from({length:size.rows},(_,row)=>row*size.columns+column);
 if("row" in command){
  if(!Number.isInteger(command.row)||command.row<0||command.row>=size.rows)
   return reject("Hàng đã chọn không hợp lệ.");
  if(command.kind==="fill-row")fill(rowIndices(command.row));
  if(command.kind==="clear-row")clear(rowIndices(command.row));
  if(command.kind==="guest-row"||command.kind==="delegate-row")
   changeTypes={row:command.row,seatType:command.kind==="guest-row"?"guest":"delegate"};
 }else if("column" in command){
  if(!Number.isInteger(command.column)||command.column<0||command.column>=size.columns)
   return reject("Cột đã chọn không hợp lệ.");
  if(command.kind==="fill-column")fill(colIndices(command.column));
  if(command.kind==="clear-column")clear(colIndices(command.column));
 }else{
  if(!command.columns.length||command.columns.some(c=>!Number.isInteger(c)||c<0||c>=size.columns))
   return reject("Danh sách cột lối đi không hợp lệ.");
  for(const column of new Set(command.columns))clear(colIndices(column));
 }
 if(changeTypes){
  let error="";
  const next=current.map(seat=>{
   const index=seatGridCellIndex(seat,size);
   if(index===null||Math.floor(index/size.columns)!==changeTypes.row||seat.blocked)
    return seat;
   const existingType=seat.seatType||"delegate";
   if(existingType===changeTypes.seatType)return seat;
   if(assignedSeatIds.has(seat.id)){
    error="Hàng có ghế đã phân công. Bỏ phân công trước khi chuyển loại ghế.";
    return seat;
   }
   return {...seat,seatType:changeTypes.seatType};
  });
  if(error)return reject(error);
  const renumbered=renumberGridSeats(next,size);
  const validation=validateSeatDrafts(renumbered);
  return validation?reject(validation):{seats:renumbered,error:null};
 }
 const result=setSeatGridCells(current,target,assignedSeatIds,makeId,size,
  ("seatType" in command&&command.seatType)||"delegate");
 return result;
}
