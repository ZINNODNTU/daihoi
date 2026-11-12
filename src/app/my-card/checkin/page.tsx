import Link from "next/link";
import {ArrowRight,Armchair,CheckCircle2,Clock3,IdCard} from "lucide-react";
import {getWindowStatus,getWindowLabel,isQrAllowed} from "@/lib/attendance-window";
import {getMyDelegateData} from "@/lib/delegate-page";
import {getPortalViewerAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import {hasPortalAbility} from "@/lib/rbac-server";
import {BrandMark} from "@/components/brand-mark";
import {delegateTheme} from "@/lib/delegate-brand-theme";
import {DelegateCheckinScanner} from "@/components/delegate-checkin-scanner";
import {DelegateUnavailable} from "@/components/delegate-page-elements";

export const dynamic="force-dynamic";

function localWindow(iso:string|null){
 if(!iso)return "Theo thông báo BTC";
 return new Intl.DateTimeFormat("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",
  day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(iso));
}

export default async function DelegateCheckinPage(){
 const {user}=await getPortalViewerAuth();
 if(!user)return <DelegateUnavailable message="Vui lòng đăng nhập lại để sử dụng điểm danh."/>;
 const [data,context]=await Promise.all([
  getMyDelegateData(),getPortalCongressContext(user.id).catch(()=>null)
 ]);
 if(data.error)return <DelegateUnavailable message={data.error}/>;
 const items=data.items;
 // QR verification remains global to all congresses owned by this identity.
 // The session preview and branding only follow the selected congress.
 const allSessions=items.flatMap(d=>d.sessions.map(s=>({...s,congressName:d.congressName})));
 const activeId=context?.activeCongressId;
 if(!activeId)return <DelegateUnavailable message="Hãy chọn Đại hội ở thanh phía trên trước khi điểm danh."/>;
  if(!(await hasPortalAbility(user.id,activeId,"portal.checkin")))
   return <DelegateUnavailable message="Tài khoản không có quyền quét điểm danh tại Đại hội đang chọn."/>;
 const current=items.find(d=>d.congressId===activeId);
 if(!current)return <DelegateUnavailable message="Tài khoản không có hồ sơ đại biểu hoạt động tại Đại hội đã chọn."/>;
 const theme=delegateTheme(current.kind);
 const sessions=[...current.sessions].sort((a,b)=>
  (Date.parse(b.starts_at||"")||0)-(Date.parse(a.starts_at||"")||0));
 const open=sessions.filter(s=>getWindowStatus(s)==="open"&&isQrAllowed(s.qr_policy,"session"));
 const otherOpen=allSessions.filter(s=>getWindowStatus(s)==="open"&&
  isQrAllowed(s.qr_policy,"session")&&!sessions.some(own=>own.id===s.id));
 const primary=open[0]||sessions.find(s=>getWindowStatus(s)==="upcoming")||sessions[0];
 const joined=primary?.checkedInAt||null;
 return <div className="mx-auto max-w-[930px] space-y-5">
  <div className="flex items-start gap-3 border-b border-[#dbe5eb] pb-5 sm:gap-4">
   <BrandMark kind={current.kind} className="!h-[56px] !w-[56px] !shrink-0 !rounded-xl !border-[#dae5eb] !bg-white !p-2 !shadow-none"/>
   <div className="min-w-0">
    <p className={"text-[11px] font-bold uppercase tracking-[.11em] "+theme.eyebrow}>CỔNG ĐẠI BIỂU</p>
    <h1 className="mt-1 text-[clamp(24px,4vw,30px)] font-extrabold leading-[1.3] text-[#1b374c]">Điểm danh</h1>
    <p className="mt-1 text-[12px] leading-5 text-[#567387]">{current.congressName}</p>
   </div>
  </div>
  <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_270px] lg:gap-5">
   <div className="min-w-0 space-y-4">
    <section aria-label="Trạng thái phiên điểm danh" className="rounded-xl border border-[#d8e5eb] bg-white px-4 py-4 sm:px-5">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
       <p className="text-[11px] font-bold uppercase tracking-[.09em] text-[#71899a]">PHIÊN ĐIỂM DANH</p>
       <h2 className="mt-1 text-[17px] font-bold leading-6 text-[#1c3c51]">
        {primary?.name||"Chưa có phiên điểm danh"}
       </h2>
      </div>
      {joined?<span className="inline-flex items-center gap-1.5 rounded-md bg-[#e9f6ed] px-2.5 py-2 text-[11px] font-bold text-[#176443]">
       <CheckCircle2 size={15}/> Đã điểm danh
      </span>:open.length?<span className="inline-flex items-center gap-1.5 rounded-md bg-[#e8f5ed] px-2.5 py-2 text-[11px] font-bold text-[#176443]">
       <span className="h-[7px] w-[7px] rounded-full bg-[#20965a]"/> Đang mở
      </span>:<span className="inline-flex items-center gap-1.5 rounded-md bg-[#f1f5f7] px-2.5 py-2 text-[11px] font-bold text-[#547184]">
       <Clock3 size={14}/> {primary?getWindowLabel(getWindowStatus(primary)):"Chờ BTC"}
      </span>}
     </div>
     {primary?.starts_at&&<p className="mt-2 flex items-center gap-2 text-[12px] text-[#5d7a8b]">
      <Clock3 size={15} className="shrink-0"/> {localWindow(primary.starts_at)} – {localWindow(primary.ends_at)}
     </p>}
     <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#edf1f4] pt-3 text-[12px] text-[#58768a]">
      <span className="inline-flex items-center gap-1.5"><Armchair size={16} className={theme.accent}/> Ghế: <strong className="text-[#233f53]">{primary?.seat?.code||"Chưa phân"}</strong></span>
      <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={16} className={theme.accent}/> Đã tham dự: <strong className="text-[#233f53]">{current.history.length} lượt</strong></span>
     </div>
     {!open.length&&<p className="mt-3 text-[12px] leading-5 text-[#617c8c]">
      {sessions.length?"Khi Ban Tổ chức mở phiên, bạn quét mã QR được chiếu tại hội trường.":"Ban Tổ chức chưa công bố phiên điểm danh."}
     </p>}
     {open.length>1&&<p className="mt-2 text-[12px] text-[#53788b]">Có {open.length} phiên đang mở. Hãy quét đúng mã QR của phiên cần tham dự.</p>}
    </section>
    <DelegateCheckinScanner kind={current.kind}/>
    {otherOpen.length>0&&<p className="rounded-lg border border-[#d8e7ee] bg-white px-4 py-3 text-[12px] leading-5 text-[#527489]">
     Ngoài Đại hội đang chọn, bạn có {otherOpen.length} phiên khác đang mở. Các mã QR hợp lệ vẫn được phép quét theo quyền tham dự của tài khoản.
    </p>}
   </div>
   <aside className="space-y-4 lg:sticky lg:top-24">
    <section className="rounded-xl border border-[#d8e5eb] bg-white px-4 py-4">
     <h2 className="text-[14px] font-bold text-[#233e51]">Hướng dẫn điểm danh</h2>
     <p className="mt-2 text-[12px] leading-6 text-[#587588]">
      Chọn <strong>Mở camera quét QR</strong>, hướng điện thoại vào mã QR do Ban Tổ chức cung cấp và kiểm tra thông báo xác nhận.
     </p>
     <p className="mt-2 text-[11px] leading-5 text-[#738b99]">
      Nếu camera gặp lỗi, bạn có thể sử dụng ảnh QR hoặc dán đường dẫn ngay trong phần quét.
     </p>
    </section>
    <section className="rounded-xl border border-[#d8e5eb] bg-white px-4 py-4">
     <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#738b99]">TÀI KHOẢN ĐIỂM DANH</p>
     <p className="mt-1 break-words text-[14px] font-bold text-[#1b3f55]">{current.fullName}</p>
     <p className="mt-0.5 break-words text-[12px] leading-5 text-[#71899a]">{current.unit||"Đại biểu tham dự"}</p>
     <div className="mt-4 space-y-2 border-t border-[#e9eef1] pt-3">
      <Link href="/my-card" className="flex min-h-11 items-center justify-between gap-2 text-[12px] font-bold text-[#285a76] hover:underline">
       <span className="inline-flex items-center gap-2"><IdCard size={16}/> Thẻ đại biểu</span><ArrowRight size={15}/>
      </Link>
      <Link href="/my-card/history" className="flex min-h-11 items-center justify-between gap-2 text-[12px] font-bold text-[#285a76] hover:underline">
       <span className="inline-flex items-center gap-2"><CheckCircle2 size={16}/> Lịch sử tham dự</span><ArrowRight size={15}/>
      </Link>
     </div>
    </section>
   </aside>
  </div>
 </div>;
}