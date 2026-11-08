export type QrPolicy="fixed"|"session"|"both";
export type WindowStatus="not-configured"|"closed"|"upcoming"|"open"|"expired";
export type WindowConfig={
 status:"open"|"closed";
 starts_at:string|null;
 ends_at:string|null;
 qr_policy:QrPolicy;
};
export function getWindowStatus(session:WindowConfig,now=new Date()):WindowStatus{
 if(session.status==="closed")return "closed";
 if(!session.starts_at||!session.ends_at)return "not-configured";
 const start=Date.parse(session.starts_at);
 const end=Date.parse(session.ends_at);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return "not-configured";
 if(now.getTime()<start)return "upcoming";
 if(now.getTime()>=end)return "expired";
 return "open";
}
export function isQrAllowed(policy:QrPolicy,scope:"fixed"|"session"):boolean{
 return policy==="both"||policy===scope;
}
export function getWindowLabel(status:WindowStatus):string{
 switch(status){
 case "open":return "Đang trong giờ điểm danh";
 case "upcoming":return "Chưa đến giờ điểm danh";
 case "expired":return "Đã hết giờ điểm danh";
 case "closed":return "BTC đã đóng điểm danh";
 default:return "Chưa thiết lập thời gian";
 }
}
export function getQrPolicyLabel(policy:QrPolicy):string{
 switch(policy){
 case "fixed":return "QR cá nhân cố định";
 case "session":return "QR riêng từng phiên";
 default:return "Chấp nhận cả hai loại QR";
 }
}
/** Bắt buộc thời gian rõ ràng trong API và giới hạn tối đa 7 ngày. */
/** Dữ liệu datetime-local của BTC được hiểu là GIỜ VIỆT NAM (UTC+7), không tùy thiết bị. */
export function vietnamTimeToUtc(value:string):string|null{
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const date=new Date(value+":00+07:00");
 if(!Number.isFinite(date.getTime()))return null;
 const iso=date.toISOString();
 return utcToVietnamInput(iso)===value?iso:null;
}
export function utcToVietnamInput(value:string|null|undefined):string{
 if(!value)return "";
 const timestamp=Date.parse(value);
 if(!Number.isFinite(timestamp))return "";
 return new Date(timestamp+7*60*60*1000).toISOString().slice(0,16);
}

/** Accept full RFC3339 timestamps including the milliseconds output by toISOString().
 * Validate both the UTC date and the original calendar fields to reject normalized dates.
 */
const timestampPattern=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/;
function parseTimestamp(value:unknown):number|null{
 if(typeof value!=="string")return null;
 const parts=timestampPattern.exec(value);
 if(!parts)return null;
 const [,year,month,day,hour,minute,second="00",fraction="",zone]=parts;
 const y=Number(year),m=Number(month),d=Number(day);
 const h=Number(hour),min=Number(minute),sec=Number(second);
 if(m<1||m>12||d<1||d>31||h>23||min>59||sec>59)return null;
 if(new Date(Date.UTC(y,m-1,d)).getUTCFullYear()!==y||
  new Date(Date.UTC(y,m-1,d)).getUTCMonth()+1!==m||
  new Date(Date.UTC(y,m-1,d)).getUTCDate()!==d)return null;
 if(zone!=="Z"){
  const zh=Number(zone.slice(1,3)),zm=Number(zone.slice(4));
  if(zh>23||zm>59)return null;
 }
 const time=Date.parse(value);
 return Number.isFinite(time)&&fraction.length<=3?time:null;
}
export type WindowValidation={
 window:{starts_at:string;ends_at:string}|null;
 error:string|null;
};
/** Error-specific validation shared between client and API; at most seven days. */
export function validateWindowDetailed(startValue:unknown,endValue:unknown):WindowValidation{
 if(typeof startValue!=="string"||typeof endValue!=="string"||!startValue||!endValue)
  return {window:null,error:"Vui lòng nhập đầy đủ giờ mở và giờ đóng điểm danh."};
 const start=parseTimestamp(startValue),end=parseTimestamp(endValue);
 if(start===null||end===null)
  return {window:null,error:"Ngày giờ không đúng định dạng. Vui lòng chọn lại giờ mở/đóng."};
 if(end<=start)
  return {window:null,error:"Giờ đóng điểm danh phải sau giờ mở."};
 if(end-start>7*24*60*60*1000)
  return {window:null,error:"Một phiên điểm danh được mở tối đa 7 ngày. Vui lòng rút ngắn khoảng thời gian."};
 return {window:{starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString()},error:null};
}
export function validateWindow(startValue:unknown,endValue:unknown){
 return validateWindowDetailed(startValue,endValue).window;
}
