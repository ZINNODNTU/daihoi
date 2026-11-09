import {
 SEAT_GRID_LEFT,SEAT_GRID_TOP,SEAT_GRID_STEP_X,SEAT_GRID_STEP_Y,
 seatGridSizeValid,seatGridCellIndex,type SeatGridSize
} from "@/lib/seating";
import type {LiveLayout,LiveSeat} from "@/lib/attendance-live";

/** Label projected at check-in time. Stored codes are updated only by BTC saving the seating plan. */
export function projectedSeatCode(seat:LiveSeat,numbers:ReadonlyMap<string,number>){
 const number=numbers.get(seat.id);
 return number===undefined?seat.code:
  seat.zone+"-"+seat.row_label+"-"+String(number).padStart(2,"0");
}

export type ProjectedSeatGrid={
 size:SeatGridSize;
 cells:Map<number,LiveSeat>;
 outside:LiveSeat[];
 seatNumbers:Map<string,number>;
};

/**
 * The saved map may have more physical grid rows than its old configured
 * grid_rows (e.g. row F of an A-E layout). Include G-zone chairs whose
 * coordinates match a grid cell, without changing their IDs or assignments.
 * Compute visible chair numbers per row, excluding aisles/empty slots and
 * including BOTH delegate/guest seats. This remains read-only.
 */
export function projectAttendanceSeats(
 layout:Pick<LiveLayout,"grid_rows"|"grid_columns">|null|undefined,
 seats:readonly LiveSeat[]
):ProjectedSeatGrid{
 let size={rows:layout?.grid_rows||0,columns:layout?.grid_columns||0};
 const cells=new Map<number,LiveSeat>();
 const outside:LiveSeat[]=[];
 const seatNumbers=new Map<string,number>();
 if(!seatGridSizeValid(size))return {size,cells,outside:[...seats],seatNumbers};

 let maxRow=size.rows-1,maxColumn=size.columns-1;
 for(const seat of seats){
  if(seat.zone!=="G")continue;
  const row=(seat.y-SEAT_GRID_TOP)/SEAT_GRID_STEP_Y;
  const col=(seat.x-SEAT_GRID_LEFT)/SEAT_GRID_STEP_X;
  if(Number.isInteger(row)&&Number.isInteger(col)&&row>=0&&row<25&&col>=0&&col<30){
   maxRow=Math.max(row,maxRow);maxColumn=Math.max(col,maxColumn);
  }
 }
 const expanded={rows:maxRow+1,columns:maxColumn+1};
 if(seatGridSizeValid(expanded))size=expanded;

 for(const seat of seats){
  const index=seatGridCellIndex(seat,size);
  if(index===null||cells.has(index))outside.push(seat);
  else cells.set(index,seat);
 }
 // These are visual position labels. Source seat_number/code stay intact
 // until the BTC saves the renumbered plan in Admin -> Seating.
 for(let row=0;row<size.rows;row++){
  let number=0;
  for(let col=0;col<size.columns;col++){
   const seat=cells.get(row*size.columns+col);
   if(seat)seatNumbers.set(seat.id,++number);
  }
 }
 return {size,cells,outside,seatNumbers};
}
