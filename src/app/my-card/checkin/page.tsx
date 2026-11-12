import Link from "next/link";
import {ArrowRight,Armchair,Camera,CheckCircle2,Clock3,IdCard,ScanLine,ShieldCheck} from "lucide-react";
import {getWindowStatus,getWindowLabel,isQrAllowed} from "@/lib/attendance-window";
import {getMyDelegateData} from "@/lib/delegate-page";
import {getPortalViewerAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
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
 return <div className="mx-auto max-w-[1110px] space-y-5 sm:space-y-6">
  <section className={"relative isolate overflow-hidden rounded-[26px] border px-5 pb-7 pt-6 shadow-[0_16px_45px_rgba(28,64,89,.07)] sm:px-9 sm:pb-9 sm:pt-8 "+theme.header+" "+theme.border}>
   <span className={"pointer-events-none absolute inset-x-0 top-0 h-[5px] "+theme.stripe} aria-hidden="true"/>
   <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[42px] border-white/65" aria-hidden="true"/>
   <div className="relative flex items-start gap-3 sm:gap-5">
    <BrandMark kind={current.kind} className="!h-[60px] !w-[60px] !shrink-0 !rounded-[17px] !border-white !bg-white !p-2 !shadow-[0_8px_20px_rgba(30,80,115,.1)] sm:!h-[72px] sm:!w-[72px]"/>
    <div className="min-w-0 flex-1">
     <p className={"text-[10px] font-extrabold uppercase tracking-[.17em] "+theme.eyebrow}>
      CỔNG ĐẠI BIỂU / XÁC NHẬN THAM DỰ
     </p>
     <h1 className="mt-1.5 text-[clamp(25px,4.5vw,37px)] font-extrabold leading-[1.18] tracking-[-.035em] text-[#203d54]">
      Điểm danh Đại hội
     </h1>
     <p className="mt-2 max-w-[650px] text-[12px] font-semibold leading-5 text-[#56748a] sm:text-[13px]">
      {current.congressName}
     </p>
    </div>
   </div>
   <div className="relative mt-6 flex flex-wrap items-center gap-2.5">
    <span className={"inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-extrabold "+theme.chip}>
     <ShieldCheck size={15}/> Xác thực qua tài khoản đại biểu
    </span>
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white bg-white/80 px-3 text-[11px] font-bold text-[#526d80]">
     <IdCard size={15}/>{current.fullName}
    </span>
   </div>
  </section>

  <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_315px] lg:gap-6">
   <div className="min-w-0 space-y-5">
    <section aria-label="Trạng thái phiên điểm danh" className="overflow-hidden rounded-[21px] border border-[#dce8ee] bg-white p-4 shadow-[0_8px_24px_rgba(28,64,89,.045)] sm:p-5">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
       <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#7792a5]">
        PHIÊN ĐẠI HỘI ĐÃ CHỌN
       </p>
       <h2 className="mt-1.5 text-[17px] font-extrabold leading-6 text-[#1d3c50] sm:text-[19px]">
        {primary?.name||"Chưa có phiên điểm danh"}
       </h2>
       {primary?.starts_at&&<p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#6c8596]">
        <Clock3 size={15}/> {localWindow(primary.starts_at)} – {localWindow(primary.ends_at)}
       </p>}
      </div>
      {joined?<span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#e5f7ed] px-3 text-[11px] font-bold text-[#186c4e]">
       <CheckCircle2 size={16}/> Đã điểm danh
      </span>:open.length?<span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#e6f8ee] px-3 text-[11px] font-bold text-[#16734e]">
       <span className="h-2 w-2 rounded-full bg-[#26a66e]"/> Đang mở điểm danh
      </span>:<span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#f0f4f7] px-3 text-[11px] font-bold text-[#597587]">
       <Clock3 size={15}/> {primary?getWindowLabel(getWindowStatus(primary)):"Chờ BTC mở phiên"}
      </span>}
     </div>
     <div className="mt-4 grid grid-cols-2 gap-2.5">
      <div className={"rounded-xl border px-3 py-3 "+theme.seat}>
       <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7d94a3]">Chỗ ngồi</p>
       <p className={"mt-1 text-[15px] font-extrabold "+theme.accent}>
        {primary?.seat?.code||"Chưa phân ghế"}
       </p>
      </div>
      <div className="rounded-xl border border-[#e2ebef] bg-[#f7fafc] px-3 py-3">
       <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7d94a3]">Lượt tham dự</p>
       <p className="mt-1 text-[15px] font-extrabold text-[#1f4e68]">
        {current.history.length} lượt đã ghi nhận
       </p>
      </div>
     </div>
     {!open.length&&<p className="mt-3 text-[12px] leading-6 text-[#6f8797]">
      {sessions.length?"Khi BTC mở phiên, bạn có thể quét QR được chiếu tại hội trường để xác nhận tham dự.":"Ban Tổ chức chưa công bố phiên điểm danh cho Đại hội này."}
     </p>}
     {open.length>1&&<p className="mt-3 text-[11px] font-semibold text-[#407a91]">
      Có {open.length} phiên đang mở. Hãy quét mã QR đúng phiên do BTC cung cấp.
     </p>}
    </section>
    {otherOpen.length>0&&<p className="rounded-xl border border-[#d8e7ee] bg-[#f1f7fb] px-4 py-3 text-[11px] leading-5 text-[#53768a]">
     {otherOpen.length} phiên ở Đại hội khác cũng đang mở. Bạn vẫn có thể quét QR hợp lệ của các Đại hội được cấp quyền.
    </p>}
    <DelegateCheckinScanner kind={current.kind}/>
   </div>
   <aside className="min-w-0 space-y-4 lg:sticky lg:top-28">
    <section className="rounded-[21px] border border-[#dce8ee] bg-white p-5 shadow-[0_8px_24px_rgba(28,64,89,.045)]">
     <div className="flex items-center gap-2.5">
      <span className={"flex h-10 w-10 items-center justify-center rounded-xl "+theme.icon}><ScanLine size={20}/></span>
      <div>
       <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#849cad]">QUY TRÌNH</p>
       <h2 className="text-[17px] font-extrabold text-[#213e53]">3 bước điểm danh</h2>
      </div>
     </div>
     <ol className="mt-5 space-y-4">
      {[
       ["01","Mở camera","Cho phép truy cập camera trên điện thoại."],
       ["02","Hướng vào QR phiên","Quét mã QR do BTC chiếu tại hội trường."],
       ["03","Nhận xác nhận","Kiểm tra thông báo và lịch sử tham dự."]
      ].map(([num,title,description])=><li key={num} className="flex items-start gap-3">
       <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold "+theme.soft+" "+theme.accent}>{num}</span>
       <span className="min-w-0"><span className="block text-[13px] font-extrabold text-[#2a4558]">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-5 text-[#718b9b]">{description}</span></span>
      </li>)}
     </ol>
     <p className="mt-4 border-t border-[#ecf0f2] pt-4 text-[11px] leading-5 text-[#738a99]">
      Mã vạch trên thẻ dùng cho BTC hỗ trợ, không dùng để tự điểm danh.
     </p>
    </section>
    <section className={"rounded-[21px] border p-5 "+theme.panel+" "+theme.border}>
     <p className={"text-[10px] font-extrabold uppercase tracking-[.14em] "+theme.eyebrow}>THÔNG TIN CỦA BẠN</p>
     <h2 className="mt-1.5 break-words text-[17px] font-extrabold leading-6 text-[#213e53]">{current.fullName}</h2>
     <p className="mt-1 text-[12px] leading-5 text-[#668194]">{current.unit||"Đại biểu tham dự Đại hội"}</p>
     <div className="mt-4 flex flex-col gap-2">
      <Link href="/my-card" className={"flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3.5 text-[12px] font-bold transition "+theme.secondary}>
       <span className="inline-flex items-center gap-2"><IdCard size={17}/> Xem thẻ đại biểu</span><ArrowRight size={16}/>
      </Link>
      <Link href="/my-card/history" className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#dce7ec] bg-white px-3.5 text-[12px] font-bold text-[#426980] transition hover:bg-[#f6fafc]">
       <span className="inline-flex items-center gap-2"><CheckCircle2 size={17}/> Lịch sử điểm danh</span><ArrowRight size={16}/>
      </Link>
      <Link href="/my-card/seats" className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#dce7ec] bg-white px-3.5 text-[12px] font-bold text-[#426980] transition hover:bg-[#f6fafc]">
       <span className="inline-flex items-center gap-2"><Armchair size={17}/> Sơ đồ chỗ ngồi</span><ArrowRight size={16}/>
      </Link>
     </div>
    </section>
    <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-[#7d96a5]">
     <Camera size={15} className="mt-0.5 shrink-0"/> Camera chỉ dùng để nhận diện mã QR trên thiết bị của bạn.
    </p>
   </aside>
  </div>
 </div>;
}
