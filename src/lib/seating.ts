export type SeatDraft={
  id:string;
  code:string;
  zone:string;
  rowLabel:string;
  seatNumber:number;
  x:number;
  y:number;
  blocked:boolean;
};
export type Seat=SeatDraft & {layout_id:string;congress_id:string};
export type SeatingLayout={
  id:string;congress_id:string;title:string;stage_label:string;version:number;
  created_at:string;updated_at:string;
};
export type SeatAssignment={seat_id:string;layout_id:string;delegate_id:string;assigned_at:string};
export type SeatingDelegate={id:string;code:string;full_name:string;unit:string;is_active:boolean};
export type SeatingSession={id:string;name:string;status:string};
export type GeneratedSection={
  zone:string;startRow:string;rowCount:number;seatsPerRow:number;
  startX:number;startY:number;aisleAfter:number;
};

export function rowLabelAt(label:string,offset:number){
  const clean=label.trim().toUpperCase();
  if(!/^[A-Z]{1,2}$/.test(clean))throw new Error("Hàng bắt đầu chỉ gồm 1–2 chữ cái A–Z.");
  let n=0;
  for(const character of clean)n=n*26+character.charCodeAt(0)-64;
  n+=offset;
  let out="";
  while(n>0){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26);}
  return out;
}
export function generateSection(settings:GeneratedSection,existing:SeatDraft[],makeId:()=>string):SeatDraft[]{
  const zone=settings.zone.trim().toUpperCase();
  if(!/^[A-Z0-9_-]{1,12}$/.test(zone))throw new Error("Mã khu chỉ gồm chữ A–Z, số, gạch ngang hoặc gạch dưới.");
  if(!Number.isInteger(settings.rowCount)||settings.rowCount<1||settings.rowCount>25||
     !Number.isInteger(settings.seatsPerRow)||settings.seatsPerRow<1||settings.seatsPerRow>30||
     settings.rowCount*settings.seatsPerRow+existing.length>500)
    throw new Error("Tối đa 25 hàng, 30 ghế/hàng và 500 ghế/sơ đồ.");
  if(!Number.isInteger(settings.aisleAfter)||settings.aisleAfter<0||settings.aisleAfter>=settings.seatsPerRow)
    throw new Error("Vị trí lối đi không hợp lệ.");
  if(!Number.isInteger(settings.startX)||!Number.isInteger(settings.startY)||
      settings.startX<30||settings.startY<120||settings.startX>3500||settings.startY>3500)
    throw new Error("Tọa độ khu vực không hợp lệ.");
  const taken=new Set(existing.map(s=>s.code.toUpperCase()));
  const takenPositions=new Set(existing.map(s=>s.x+":"+s.y));
  const result:SeatDraft[]=[];
  for(let r=0;r<settings.rowCount;r++){
    const rowLabel=rowLabelAt(settings.startRow,r);
    for(let col=0;col<settings.seatsPerRow;col++){
      const number=col+1;
      const code=zone+"-"+rowLabel+"-"+String(number).padStart(2,"0");
      const x=settings.startX+col*58+(settings.aisleAfter&&col>=settings.aisleAfter?48:0);
      const y=settings.startY+r*61;
      if(x>3900||y>3900)throw new Error("Sơ đồ vượt kích thước tối đa 4000px.");
      if(taken.has(code))throw new Error("Mã ghế trùng: "+code);
      if(takenPositions.has(x+":"+y))throw new Error("Vị trí ghế trùng: "+code);
      taken.add(code);takenPositions.add(x+":"+y);
      result.push({id:makeId(),code,zone,rowLabel,seatNumber:number,x,y,blocked:false});
    }
  }
  return result;
}
export function validateSeatDrafts(seats:SeatDraft[]):string|null{
  if(seats.length>500)return "Sơ đồ chỉ hỗ trợ tối đa 500 ghế.";
  const ids=new Set<string>(),codes=new Set<string>(),positions=new Set<string>();
  for(const seat of seats){
    const code=seat.code.trim().toUpperCase();
    const position=seat.x+":"+seat.y;
    if(!code||code.length>36||!seat.zone||seat.zone.length>40||
       !seat.rowLabel||seat.rowLabel.length>12||
       !Number.isInteger(seat.seatNumber)||seat.seatNumber<1||seat.seatNumber>10000||
       !Number.isInteger(seat.x)||!Number.isInteger(seat.y)||
       seat.x<0||seat.y<0||seat.x>4000||seat.y>4000)return "Một số ghế chứa thông tin không hợp lệ.";
    if(ids.has(seat.id)||codes.has(code)||positions.has(position))return "Sơ đồ chứa mã, ID hoặc vị trí ghế trùng nhau.";
    ids.add(seat.id);codes.add(code);positions.add(position);
  }
  return null;
}
export type ImportEntry={seatCode:string;delegateCode:string};
export type ImportIssue={line:number;message:string};
export function parseSeatImport(matrix:(string|number|null)[][]):ImportEntry[]{
  if(matrix.length<2||matrix.length>1000)throw new Error("Excel cần hàng tiêu đề và tối đa 999 hàng dữ liệu.");
  const normalized=matrix[0].map(c=>String(c??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d"));
  const seatCol=normalized.findIndex(s=>s==="ma ghe"||s==="seatcode"||s==="seat code");
  const delegateCol=normalized.findIndex(s=>s==="ma dai bieu"||s==="delegatecode"||s==="delegate code");
  if(seatCol<0||delegateCol<0)throw new Error("Excel phải có cột 'Mã ghế' và 'Mã đại biểu'.");
  return matrix.slice(1).map(row=>({
    seatCode:String(row[seatCol]??"").trim(),
    delegateCode:String(row[delegateCol]??"").trim()
  })).filter(row=>row.seatCode!==""||row.delegateCode!=="");
}
export function validateImport(entries:ImportEntry[],seats:SeatDraft[],delegates:SeatingDelegate[]):ImportIssue[]{
  const codes=new Set(seats.map(s=>s.code.toUpperCase()));
  const seatByCode=new Map(seats.map(s=>[s.code.toUpperCase(),s]));
  const delegateByCode=new Map(delegates.map(d=>[d.code.toUpperCase(),d]));
  const usedSeats=new Set<string>(),usedPeople=new Set<string>(),issues:ImportIssue[]=[];
  if(entries.length>500)issues.push({line:0,message:"Tối đa 500 dòng phân ghế."});
  entries.forEach((entry,index)=>{
    const line=index+2;
    const seatCode=entry.seatCode.toUpperCase();
    const delegateCode=entry.delegateCode.toUpperCase();
    if(!seatCode||!codes.has(seatCode))issues.push({line,message:"Mã ghế không tồn tại: "+entry.seatCode});
    else if(seatByCode.get(seatCode)?.blocked&&delegateCode)
      issues.push({line,message:"Ghế đã khóa: "+entry.seatCode});
    if(usedSeats.has(seatCode))issues.push({line,message:"Ghế xuất hiện nhiều lần: "+entry.seatCode});
    usedSeats.add(seatCode);
    if(delegateCode){
      const person=delegateByCode.get(delegateCode);
      if(!person)issues.push({line,message:"Không có mã đại biểu: "+entry.delegateCode});
      else if(!person.is_active)issues.push({line,message:"Đại biểu không còn hoạt động: "+entry.delegateCode});
      if(usedPeople.has(delegateCode))issues.push({line,message:"Đại biểu được phân nhiều ghế: "+entry.delegateCode});
      usedPeople.add(delegateCode);
    }
  });
  return issues;
}
