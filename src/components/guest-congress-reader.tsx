"use client";
import {useEffect,useId,useState,type KeyboardEvent} from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {ArrowLeft,ArrowRight,Award,BookOpen,CalendarDays,FileText,MapPin,UsersRound} from "lucide-react";
import {BrandMark,congressBranding} from "@/components/brand-mark";
import {GuestSiteHeader} from "@/components/guest-site-header";
import {DelegateDocumentsList} from "@/components/delegate-documents-list";
// BCH swipe cards are optional. Keep the swipe library out of the
// initial JavaScript for guests who only read published documents.
const DelegateBchCarousel=dynamic(
 ()=>import("@/components/delegate-bch-carousel").then(mod=>mod.DelegateBchCarousel),
 {loading:()=> <div role="status" className="rounded-xl border border-[#dae6ee] bg-white p-6 text-sm text-[#567d92]">
  Đang tải danh sách nhân sự BCH…
 </div>}
);
import type {DocRow} from "@/lib/types";
import type {BchCandidate} from "@/lib/bch-candidates";

type GuestTab="documents"|"bch"|"bch-new";
 type PublishedBch={memberCount:number;publishedAt:string;
  members:(BchCandidate&{congressName:string})[]};
type PublicCongress={
 id:string;name:string;kind:"doan"|"hoi_sinh_vien";
 term:string|null;venue:string|null;starts_at?:string|null
};

export function GuestCongressReader({congress,docs,candidateCount,slug}:{
 congress:PublicCongress;docs:DocRow[];candidateCount:number;slug:string
}){
 const [tab,setTab]=useState<GuestTab>("documents");
  const [committee,setCommittee]=useState<PublishedBch|null|undefined>(undefined);
  const [committeeLoading,setCommitteeLoading]=useState(false);
  const [committeeError,setCommitteeError]=useState("");
  const [committeeRetry,setCommitteeRetry]=useState(0);
 const [candidates,setCandidates]=useState<(BchCandidate&{congressName:string})[]|null>(null);
 const [loading,setLoading]=useState(false);
 const [loadError,setLoadError]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  if(tab!=="bch"||candidateCount===0||candidates!==null)return;
  const controller=new AbortController();
  async function load(){
   setLoading(true);setLoadError("");
   try{
    const response=await fetch("/api/guest/"+encodeURIComponent(slug)+"/bch",{
     signal:controller.signal,credentials:"omit",cache:"no-store"
    });
    if(!response.ok)throw new Error(response.status===404?
     "Đại hội không còn ở trạng thái đang diễn ra.":"Không tải được danh sách BCH. Vui lòng thử lại.");
    const json=await response.json();
    if(!Array.isArray(json.candidates))throw new Error("Dữ liệu nhân sự không hợp lệ.");
    if(!controller.signal.aborted)setCandidates(json.candidates);
   }catch(error){
    if(!controller.signal.aborted)setLoadError(error instanceof Error?error.message:"Không tải được nhân sự.");
   }finally{
    if(!controller.signal.aborted)setLoading(false);
   }
  }
  void load();
  return ()=>controller.abort();
 },[tab,slug,candidateCount,candidates,retry]);
 useEffect(()=>{
   if(tab!=="bch-new")return;
   const controller=new AbortController();
   async function load(){
    setCommittee(undefined);setCommitteeLoading(true);setCommitteeError("");
    try{
     const response=await fetch("/api/guest/"+encodeURIComponent(slug)+"/bch-new",{
      signal:controller.signal,credentials:"omit",cache:"no-store"
     });
     if(!response.ok)throw new Error(response.status===404?
      "Đại hội không còn ở trạng thái đang diễn ra.":
      "Không tải được BCH khóa mới. Vui lòng thử lại.");
     const data=await response.json();
     if(data.committee!==null&&(!data.committee||!Array.isArray(data.committee.members)||
      data.committee.members.length!==data.committee.memberCount))
      throw new Error("Danh sách BCH khóa mới không hợp lệ.");
     if(!controller.signal.aborted)setCommittee(data.committee);
    }catch(error){
     if(!controller.signal.aborted)setCommitteeError(error instanceof Error?
      error.message:"Không thể tải BCH khóa mới.");
    }finally{if(!controller.signal.aborted)setCommitteeLoading(false);}
   }
   void load();
   return()=>controller.abort();
  },[tab,slug,committeeRetry]);
  function moveTabKey(event:KeyboardEvent<HTMLButtonElement>,current:GuestTab){
   if(event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return;
   event.preventDefault();
   const order:GuestTab[]=congress.kind==="doan"?["documents","bch","bch-new"]:["documents","bch"];
   const next=order[(order.indexOf(current)+(event.key==="ArrowRight"?1:-1)+order.length)%order.length];
   setTab(next);
   event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-tab="'+next+'"]')?.focus();
  }
  const tabsId=useId();
 const panelId=tabsId+"-panel";
 const activeDocuments=tab==="documents";
  const activeBch=tab==="bch";
  const activeNewCommittee=tab==="bch-new";
 const startingDate=congress.starts_at?new Date(congress.starts_at):null;
 const displayDate=startingDate&&!Number.isNaN(startingDate.getTime())?
  new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"}).format(startingDate):null;
 return <main className="guest-experience guest-detail">
  <GuestSiteHeader/>
  <div className="guest-detail-breadcrumb">
   <div className="guest-container">
    <Link href="/guest"><ArrowLeft size={15} aria-hidden="true"/> Các Đại hội</Link>
    <span aria-hidden="true">/</span><span>Thông tin Đại hội</span>
   </div>
  </div>
  <section className="guest-detail-hero">
   <div className="guest-container guest-detail-hero-inner">
    <div className="guest-detail-hero-copy">
     <div className="guest-detail-topline">
      <span className="guest-detail-hero-brand"><BrandMark kind={congress.kind}/></span>
      <span className="guest-detail-org">{congressBranding[congress.kind].name}</span>
     </div>
     <span className="guest-detail-status"><span className="guest-live-dot"/> ĐẠI HỘI ĐANG DIỄN RA</span>
     <h1>{congress.name}</h1>
     <div className="guest-detail-metadata">
      {congress.term&&<span><CalendarDays size={17} aria-hidden="true"/> Nhiệm kỳ {congress.term}</span>}
      {congress.venue&&<span><MapPin size={17} aria-hidden="true"/> {congress.venue}</span>}
      {displayDate&&<span><CalendarDays size={17} aria-hidden="true"/> {displayDate}</span>}
     </div>
    </div>
    <aside className="guest-detail-summary" aria-label="Các mục thông tin">
     <span className="guest-detail-summary-title">HỒ SƠ ĐẠI HỘI</span>
     <div className="guest-detail-summary-row">
      <span><FileText size={19} aria-hidden="true"/> Tài liệu công bố</span>
      <strong>{String(docs.length).padStart(2,"0")}</strong>
     </div>
     <div className="guest-detail-summary-row">
      <span><UsersRound size={19} aria-hidden="true"/> Ứng viên BCH</span>
      <strong>{String(candidateCount).padStart(2,"0")}</strong>
     </div>
     <span className="guest-detail-summary-footer">THÔNG TIN ĐƯỢC CẬP NHẬT TỪ BTC</span>
    </aside>
   </div>
  </section>

  <div className="guest-container guest-detail-main">
   <div className="guest-detail-toolbar">
    <div>
     <p className="guest-section-kicker">DANH MỤC THÔNG TIN</p>
     <h2>Khám phá <span>Đại hội</span></h2>
    </div>
    <Link href="/guest" className="guest-back-link">Xem các Đại hội khác <ArrowRight size={17} aria-hidden="true"/></Link>
   </div>
   <div className="guest-detail-tabs" role="tablist" aria-label="Các nội dung của Đại hội">
    <button type="button" role="tab" id={tabsId+"-documents"} aria-controls={panelId}
     aria-selected={activeDocuments} tabIndex={activeDocuments?0:-1}
     onClick={()=>setTab("documents")}
     onKeyDown={e=>moveTabKey(e,"documents")}
     data-tab="documents" className={"guest-detail-tab "+(activeDocuments?"is-active":"")}>
     <span className="guest-detail-tab-icon"><BookOpen size={20} aria-hidden="true"/></span>
     <span><strong>Tài liệu Đại hội</strong><small>Văn kiện được công bố</small></span>
     <span className="guest-detail-tab-count">{docs.length}</span>
    </button>
    <button type="button" role="tab" id={tabsId+"-bch"} aria-controls={panelId}
     aria-selected={activeBch} tabIndex={activeBch?0:-1}
     onClick={()=>setTab("bch")}
     onKeyDown={e=>moveTabKey(e,"bch")}
     data-tab="bch" className={"guest-detail-tab "+(activeBch?"is-active":"")}>
     <span className="guest-detail-tab-icon"><UsersRound size={20} aria-hidden="true"/></span>
     <span><strong>Nhân sự BCH</strong><small>Hồ sơ trích ngang</small></span>
     <span className="guest-detail-tab-count">{candidateCount}</span>
    </button>
    {congress.kind==="doan"&&<button type="button" role="tab" id={tabsId+"-bch-new"}
     aria-controls={panelId} aria-selected={activeNewCommittee} tabIndex={activeNewCommittee?0:-1}
     onClick={()=>setTab("bch-new")} onKeyDown={e=>moveTabKey(e,"bch-new")}
     data-tab="bch-new" className={"guest-detail-tab "+(activeNewCommittee?"is-active":"")}>
     <span className="guest-detail-tab-icon"><Award size={20} aria-hidden="true"/></span>
     <span><strong>BCH khóa mới</strong><small>Danh sách đã công bố</small></span>
     <span className="guest-detail-tab-count">{committee?.memberCount??"—"}</span>
    </button>}
   </div>

   <section className="guest-detail-panel" role="tabpanel" id={panelId}
    aria-labelledby={tabsId+"-"+tab} tabIndex={0}>
    <div className="guest-detail-panel-header">
     <div>
      <p className="guest-section-kicker">{activeDocuments?"THƯ VIỆN ĐẠI HỘI":activeBch?"NHÂN SỰ GIỚI THIỆU":"KẾT QUẢ ĐÃ CÔNG BỐ"}</p>
      <h3>{activeDocuments?"Kho tài liệu":activeBch?"Ứng viên Ban Chấp hành":"Ban Chấp hành khóa mới"}</h3>
     </div>
     <span className="guest-detail-panel-counter">{activeDocuments?docs.length:activeBch?candidateCount:committee?.memberCount??"—"} {activeDocuments?"tài liệu":activeBch?"ứng viên":"ủy viên"}</span>
    </div>
    {activeDocuments?
 <DelegateDocumentsList docs={docs} congresses={[{id:congress.id,name:congress.name}]} initialCongressId={congress.id}/>:
 activeBch?(
  loadError?<div role="alert" className="guest-detail-panel-empty">
   <UsersRound size={28} aria-hidden="true"/><strong>{loadError}</strong>
   <button type="button" onClick={()=>setRetry(n=>n+1)}
    className="mt-3 min-h-11 rounded-lg border border-[#9fbfcd] bg-white px-4 text-sm font-bold text-[#226f91]">Thử tải lại</button>
  </div>:
  loading||candidates===null&&candidateCount>0?
   <div role="status" className="guest-detail-panel-empty">Đang tải danh sách nhân sự BCH…</div>:
  candidates?.length?<DelegateBchCarousel items={candidates.map(item=>({...item,congressKind:congress.kind}))} initialCongressId={congress.id}/>:
   <div className="guest-detail-panel-empty"><UsersRound size={28} aria-hidden="true"/>
    <strong>Danh sách nhân sự đang cập nhật</strong>
    <p>Thông tin sẽ được hiển thị khi Ban Tổ chức công bố.</p>
   </div>
 ):
 committeeError?<div role="alert" className="guest-detail-panel-empty">
  <Award size={29} aria-hidden="true"/><strong>{committeeError}</strong>
  <button type="button" onClick={()=>setCommitteeRetry(value=>value+1)}
   className="mt-3 min-h-11 rounded-lg border border-[#9fbfcd] bg-white px-4 text-sm font-bold text-[#226f91]">Thử tải lại</button>
 </div>:
 committeeLoading||committee===undefined?
  <div role="status" className="guest-detail-panel-empty">Đang tải BCH khóa mới đã công bố…</div>:
 committee?<div className="space-y-4">
  <p className="rounded-xl border border-[#cfe6da] bg-[#f1faf6] px-4 py-3 text-[12px] font-bold text-[#287557]">
   <Award size={17} className="mr-2 inline-block"/>BCH khóa mới gồm đúng {committee.memberCount} ủy viên được công bố.
  </p>
  <DelegateBchCarousel items={committee.members.map(item=>({...item,congressKind:congress.kind}))} initialCongressId={congress.id} variant="new"/>
 </div>:
  <div className="guest-detail-panel-empty"><Award size={29} aria-hidden="true"/>
   <strong>Ban Chấp hành khóa mới chưa được công bố</strong>
   <p>Danh sách sẽ xuất hiện sau khi Ban Tổ chức hoàn tất ra mắt BCH khóa mới.</p>
  </div>}
   </section>
   <div className="guest-detail-bottom-nav"><Link href="/guest"><ArrowLeft size={17} aria-hidden="true"/> Quay lại danh sách Đại hội</Link></div>
  </div>
  <footer className="guest-footer">
   <div className="guest-container"><span>ĐẠI HỘI SỐ · KHÔNG GIAN ĐOÀN – HỘI</span>
    <Link href="/guest">Các Đại hội <ArrowRight size={16} aria-hidden="true"/></Link>
   </div>
  </footer>
 </main>;
}
