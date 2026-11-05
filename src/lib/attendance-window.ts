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

export function validateWindow(startValue:unknown,endValue:unknown){
 if(typeof startValue!=="string"||typeof endValue!=="string"||
  !/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z))$/.test(startValue)||
  !/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z))$/.test(endValue))
   return null;
 const start=Date.parse(startValue),end=Date.parse(endValue);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>7*24*60*60*1000)
   return null;
 return {starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString()};
}
