/**
 * Báo cáo ĐIỂM DANH, không phải quyết định công nhận tư cách đại biểu
 * hoặc danh sách người có quyền biểu quyết.
 *
 * Một đại biểu chỉ có tối đa một lượt check-in/phiên trong CSDL.
 */
export type ReportDelegate = {
  id:string;
  code:string;
  full_name:string;
  unit:string;
  delegate_type:"official"|"alternate"|"guest";
  is_active:boolean;
};
export type ReportCheckin = {
  id:string;
  delegate_id:string;
  checked_in_at:string;
  checked_in_by:string;
  method:"qr"|"manual"|"barcode";
  note:string|null;
};
export type ReportRow=ReportDelegate & {present:boolean;checkin:ReportCheckin|null};
type DelegateType=ReportDelegate["delegate_type"];
export const delegateLabels:Record<DelegateType,string>={
  official:"Chính thức",alternate:"Dự khuyết",guest:"Khách mời"
};
export function calculateAttendance(delegates:ReportDelegate[],checkins:ReportCheckin[]){
  const byId=new Map<string,ReportCheckin>();
  for(const c of checkins) if(!byId.has(c.delegate_id)) byId.set(c.delegate_id,c);
  const active=delegates.filter(d=>d.is_active);
  const rows:ReportRow[]=active.map(d=>({...d,present:byId.has(d.id),checkin:byId.get(d.id)||null}));
  const kinds:(DelegateType)[]=["official","alternate","guest"];
  const byType=Object.fromEntries(kinds.map(kind=>[kind,{
    total:rows.filter(r=>r.delegate_type===kind).length,
    present:rows.filter(r=>r.delegate_type===kind&&r.present).length
  }])) as Record<DelegateType,{total:number;present:number}>;
  const units=new Map<string,{unit:string;total:number;present:number;officialTotal:number;officialPresent:number}>();
  for(const r of rows){
    const key=r.unit.trim()||"Chưa xác định";
    if(!units.has(key))units.set(key,{unit:key,total:0,present:0,officialTotal:0,officialPresent:0});
    const v=units.get(key)!;
    v.total++;
    if(r.present)v.present++;
    if(r.delegate_type==="official"){v.officialTotal++;if(r.present)v.officialPresent++;}
  }
  const unitsSorted=[...units.values()].sort((a,b)=>a.unit.localeCompare(b.unit,"vi"));
  const activeIds=new Set(active.map(d=>d.id));
  return {
    total:rows.length,
    present:rows.filter(r=>r.present).length,
    absent:rows.filter(r=>!r.present).length,
    byType,
    byMethod:{qr:rows.filter(r=>r.checkin?.method==="qr").length,manual:rows.filter(r=>r.checkin?.method==="manual").length,barcode:rows.filter(r=>r.checkin?.method==="barcode").length},
    units:unitsSorted,
    rows,
    unmatchedCheckins:checkins.filter(c=>!activeIds.has(c.delegate_id)).length
  };
}
export function percentage(numerator:number,denominator:number):string{
  return denominator>0?(100*numerator/denominator).toLocaleString("vi-VN",{minimumFractionDigits:1,maximumFractionDigits:1})+"%":"—";
}
const vnTime=new Intl.DateTimeFormat("vi-VN",{
  day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"Asia/Ho_Chi_Minh",hour12:false
});
export function displayTime(value:string|null|undefined){
  if(!value)return "—";
  const timestamp=new Date(value);
  return Number.isNaN(timestamp.getTime())?"—":vnTime.format(timestamp);
}
/** Chống CSV formula injection khi file được mở bằng Excel/Sheets. */
export function csvCell(value:unknown):string{
  let raw=String(value??"");
  if(/^[\s\u0000-\u001f]*[=+\-@]/.test(raw))raw="'"+raw;
  return '"'+raw.replaceAll('"','""')+'"';
}
export function makeAttendanceCsv(
 congressName:string,sessionName:string,rows:ReportRow[],
 options:{presentOnly?:boolean}={}
):string{
  const records:string[][]=[
    ["ĐẠI HỘI",congressName],
    ["PHIÊN ĐIỂM DANH",sessionName],
    ["Ghi chú","Chỉ là thống kê check-in, không thay báo cáo thẩm tra tư cách hay danh sách đủ quyền biểu quyết."],
    [],
    ["STT","Mã đại biểu","Họ tên","Đơn vị","Loại","Trạng thái","Thời gian (GMT+7)","Phương thức","Lý do điểm danh thủ công","Mã người ghi nhận"]
  ];
  const selected=options.presentOnly?rows.filter(r=>r.present):rows;
  selected.forEach((r,index)=>records.push([
    String(index+1),r.code,r.full_name,r.unit,delegateLabels[r.delegate_type],
    r.present?"Đã điểm danh":"Chưa điểm danh",displayTime(r.checkin?.checked_in_at),
    r.checkin?.method==="qr"?"QR":r.checkin?.method==="manual"?"Thủ công":r.checkin?.method==="barcode"?"Barcode":"—",
    r.checkin?.note??"",r.checkin?.checked_in_by??""
  ]));
  return "\ufeff"+records.map(r=>r.map(csvCell).join(",")).join("\r\n");
}
