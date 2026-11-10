import {projectSeatGrid,type SeatGridSize} from "@/lib/seating";
import type {LiveLayout,LiveSeat} from "@/lib/attendance-live";

/** Projected labels are read-only; originals only change when BTC saves. */
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
/** One seating geometry in the projection screen and all other portal views. */
export function projectAttendanceSeats(
 layout:Pick<LiveLayout,"grid_rows"|"grid_columns">|null|undefined,
 seats:readonly LiveSeat[]
):ProjectedSeatGrid{
 return projectSeatGrid({rows:layout?.grid_rows||0,columns:layout?.grid_columns||0},seats);
}
