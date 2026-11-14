import Link from "next/link";
import {ArrowDownRight,ArrowRight,BookOpen,CalendarDays,ChevronRight,FileText,MapPin,Radio,UsersRound} from "lucide-react";
import {BrandMark,congressBranding} from "@/components/brand-mark";
import {GuestSiteHeader} from "@/components/guest-site-header";

export type GuestCongress={
 id:string;slug:string;name:string;term:string|null;
 kind:"doan"|"hoi_sinh_vien";venue:string|null;
 starts_at:string|null;ends_at:string|null
};

function formatDate(value:string|null){
 if(!value)return null;
 const date=new Date(value);
 return Number.isNaN(date.getTime())?null:new Intl.DateTimeFormat("vi-VN",{
  day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Asia/Ho_Chi_Minh"
 }).format(date);
}

export function GuestAccessEntry({options}:{options:GuestCongress[]}){
 return <main className="guest-experience guest-directory">
  <GuestSiteHeader/>
  <section className="guest-intro">
   <div className="guest-container guest-intro-inner">
    <div className="guest-intro-copy">
     <p className="guest-eyebrow"><span className="guest-eyebrow-rule"/> KHÔNG GIAN ĐẠI HỘI · CHẾ ĐỘ KHÁCH</p>
     <h1 className="guest-intro-title">Đại hội đang diễn ra<span>.</span><br/>
      <em>Khám phá từ đây.</em></h1>
     <p className="guest-intro-description">
      Theo dõi thông tin các kỳ Đại hội Đoàn – Hội, khám phá văn kiện và hồ sơ
      nhân sự được Ban Tổ chức công bố.
     </p>
     <a href="#danh-sach-dai-hoi" className="guest-hero-link">
      Khám phá Đại hội <ArrowDownRight size={19} aria-hidden="true"/>
     </a>
    </div>
    <div className="guest-intro-aside" aria-hidden="true">
     <div className="guest-intro-aside-frame">
      <span className="guest-aside-overline">CỔNG THÔNG TIN</span>
      <span className="guest-aside-giant">ĐH</span>
      <span className="guest-aside-meta">ĐOÀN · HỘI<br/>VIỆT NAM</span>
      <span className="guest-aside-index">ĐH<span>/</span>VN</span>
     </div>
    </div>
   </div>
   <div className="guest-intro-bottom" aria-hidden="true"><div className="guest-container"><span>THÔNG TIN CHÍNH THỨC</span><span>ĐOÀN TNCS HỒ CHÍ MINH · HỘI SINH VIÊN VIỆT NAM</span></div></div>
  </section>

  <section className="guest-container guest-directory-section" id="danh-sach-dai-hoi" aria-labelledby="guest-list-title">
   <div className="guest-section-heading">
    <div>
     <p className="guest-section-kicker"><Radio size={15} aria-hidden="true"/> CẬP NHẬT TRỰC TIẾP</p>
     <h2 id="guest-list-title">Các Đại hội <span>đang diễn ra</span></h2>
     <p>Lựa chọn Đại hội bạn muốn tìm hiểu.</p>
    </div>
    <div className="guest-directory-tally" aria-label={options.length+" Đại hội đang diễn ra"}>
     <strong>{String(options.length).padStart(2,"0")}</strong>
     <span>ĐẠI HỘI<br/>ĐANG DIỄN RA</span>
    </div>
   </div>

   {options.length===0?
    <div className="guest-empty" role="status">
     <span className="guest-empty-number" aria-hidden="true">00</span>
     <div className="guest-empty-copy">
      <span className="guest-empty-marker">CHƯA CÓ LỊCH ĐẠI HỘI</span>
      <h3>Chưa có Đại hội đang diễn ra</h3>
      <p>Danh sách sẽ được cập nhật khi Ban Tổ chức bắt đầu Đại hội.</p>
      <Link href="/" className="guest-text-link">Về trang chủ <ArrowRight size={16} aria-hidden="true"/></Link>
     </div>
    </div>:
    <ol className="guest-congress-grid">
     {options.map((congress,index)=><li key={congress.id} className="guest-congress-list-item">
      <Link className="guest-congress-card" href={"/guest/"+encodeURIComponent(congress.slug)}
       aria-label={"Xem thông tin "+congress.name}>
       <span className="guest-congress-card-line" aria-hidden="true"/>
       <span className="guest-congress-card-top">
        <span className="guest-live-indicator"><span className="guest-live-dot"/> ĐANG DIỄN RA</span>
        <span className="guest-congress-serial">{String(index+1).padStart(2,"0")}</span>
       </span>
       <span className="guest-congress-card-identity">
        <span className="guest-congress-logo"><BrandMark kind={congress.kind}/></span>
        <span className="guest-congress-organization">{congressBranding[congress.kind].name}</span>
       </span>
       <span className="guest-congress-name">{congress.name}</span>
       {congress.term&&<span className="guest-congress-term">Nhiệm kỳ {congress.term}</span>}
       <span className="guest-congress-info">
        {congress.venue&&<span><MapPin size={15} aria-hidden="true"/>{congress.venue}</span>}
        {formatDate(congress.starts_at)&&<span><CalendarDays size={15} aria-hidden="true"/>{formatDate(congress.starts_at)}</span>}
       </span>
       <span className="guest-congress-card-bottom">
        <span>Khám phá Đại hội</span>
        <span className="guest-congress-card-arrow"><ArrowRight size={20} aria-hidden="true"/></span>
       </span>
      </Link>
     </li>)}
    </ol>}
  </section>

  <section className="guest-container guest-directory-guide" aria-label="Nội dung có thể khám phá">
   <div className="guest-guide-heading"><span>01 /</span> THÔNG TIN CÔNG BỐ</div>
   <div className="guest-guide-items">
    <div><span className="guest-guide-icon"><FileText size={22} aria-hidden="true"/></span><div>
     <h3>Văn kiện Đại hội</h3><p>Tra cứu tài liệu và các nội dung được công bố.</p>
    </div></div>
    <div><span className="guest-guide-icon"><UsersRound size={22} aria-hidden="true"/></span><div>
     <h3>Nhân sự giới thiệu BCH</h3><p>Khám phá hồ sơ trích ngang các ứng viên.</p>
    </div></div>
    <div><span className="guest-guide-icon"><BookOpen size={22} aria-hidden="true"/></span><div>
     <h3>Thông tin Đại hội</h3><p>Tên Đại hội, nhiệm kỳ và địa điểm tổ chức.</p>
    </div></div>
   </div>
  </section>
  <footer className="guest-footer">
   <div className="guest-container"><span>ĐẠI HỘI SỐ · KHÔNG GIAN ĐOÀN – HỘI</span>
    <Link href="/login">Cổng đăng nhập <ChevronRight size={16} aria-hidden="true"/></Link>
   </div>
  </footer>
 </main>;
}
