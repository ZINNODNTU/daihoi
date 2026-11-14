"use client";
import {useId,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,BookOpen,CalendarDays,FileText,MapPin,UsersRound} from "lucide-react";
import {BrandMark,congressBranding} from "@/components/brand-mark";
import {GuestSiteHeader} from "@/components/guest-site-header";
import {DelegateDocumentsList} from "@/components/delegate-documents-list";
import {DelegateBchCarousel} from "@/components/delegate-bch-carousel";
import type {DocRow} from "@/lib/types";
import type {BchCandidate} from "@/lib/bch-candidates";

type GuestTab="documents"|"bch";
type PublicCongress={
 id:string;name:string;kind:"doan"|"hoi_sinh_vien";
 term:string|null;venue:string|null;starts_at?:string|null
};

export function GuestCongressReader({congress,docs,candidates}:{congress:PublicCongress;
 docs:DocRow[];candidates:(BchCandidate&{congressName:string})[]}){
 const [tab,setTab]=useState<GuestTab>("documents");
 const tabsId=useId();
 const panelId=tabsId+"-panel";
 const activeDocuments=tab==="documents";
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
      <strong>{String(candidates.length).padStart(2,"0")}</strong>
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
     onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();setTab("bch");e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-tab="bch"]')?.focus();}}}
     data-tab="documents" className={"guest-detail-tab "+(activeDocuments?"is-active":"")}>
     <span className="guest-detail-tab-icon"><BookOpen size={20} aria-hidden="true"/></span>
     <span><strong>Tài liệu Đại hội</strong><small>Văn kiện được công bố</small></span>
     <span className="guest-detail-tab-count">{docs.length}</span>
    </button>
    <button type="button" role="tab" id={tabsId+"-bch"} aria-controls={panelId}
     aria-selected={!activeDocuments} tabIndex={!activeDocuments?0:-1}
     onClick={()=>setTab("bch")}
     onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();setTab("documents");e.currentTarget.parentElement?.querySelector<HTMLButtonElement>('[data-tab="documents"]')?.focus();}}}
     data-tab="bch" className={"guest-detail-tab "+(!activeDocuments?"is-active":"")}>
     <span className="guest-detail-tab-icon"><UsersRound size={20} aria-hidden="true"/></span>
     <span><strong>Nhân sự BCH</strong><small>Hồ sơ trích ngang</small></span>
     <span className="guest-detail-tab-count">{candidates.length}</span>
    </button>
   </div>

   <section className="guest-detail-panel" role="tabpanel" id={panelId}
    aria-labelledby={tabsId+(activeDocuments?"-documents":"-bch")} tabIndex={0}>
    <div className="guest-detail-panel-header">
     <div>
      <p className="guest-section-kicker">{activeDocuments?"THƯ VIỆN ĐẠI HỘI":"NHÂN SỰ GIỚI THIỆU"}</p>
      <h3>{activeDocuments?"Kho tài liệu":"Ứng viên Ban Chấp hành"}</h3>
     </div>
     <span className="guest-detail-panel-counter">{activeDocuments?docs.length:candidates.length} {activeDocuments?"tài liệu":"ứng viên"}</span>
    </div>
    {activeDocuments?
     <DelegateDocumentsList docs={docs} congresses={[{id:congress.id,name:congress.name}]} initialCongressId={congress.id}/>:
     candidates.length?<DelegateBchCarousel items={candidates} initialCongressId={congress.id}/>:
     <div className="guest-detail-panel-empty"><UsersRound size={28} aria-hidden="true"/>
      <strong>Danh sách nhân sự đang cập nhật</strong>
      <p>Thông tin sẽ được hiển thị khi Ban Tổ chức công bố.</p>
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
