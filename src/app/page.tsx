import Link from "next/link";
import {
 ArrowRight,Armchair,ArrowUpRight,BarChart3,Check,ChevronRight,
 ClipboardCheck,Clock3,FileCheck2,LockKeyhole,QrCode,ShieldCheck,
 Layers3,Users,Workflow
} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

const capabilities=[
 {number:"01",icon:QrCode,title:"Điểm danh thông minh",
  detail:"Một mã QR cho từng phiên. Nắm bắt lượt đến, vị trí ghế và trạng thái tham dự."},
 {number:"02",icon:Armchair,title:"Hội trường trực quan",
  detail:"Thiết kế sơ đồ theo không gian thực, phân ghế và theo dõi trực tiếp."},
 {number:"03",icon:Users,title:"Hồ sơ tập trung",
  detail:"Đại biểu, khách mời và nhân sự BCH được quản lý theo từng Đại hội."},
 {number:"04",icon:BarChart3,title:"Báo cáo tức thời",
  detail:"Dữ liệu được tổng hợp thành những con số rõ ràng, sẵn sàng cho điều hành."}
] as const;
const stages=[
 {number:"01",title:"Chuẩn bị",detail:"Hồ sơ · Hội trường"},
 {number:"02",title:"Điều hành",detail:"Phiên họp · Điểm danh"},
 {number:"03",title:"Tổng kết",detail:"Thống kê · Báo cáo"}
] as const;

export default function Home(){
 return <main className="landing-page min-h-dvh overflow-x-hidden">
  <a href="#noi-dung-chinh" className="skip-link">Bỏ qua điều hướng</a>
  <header className="landing-header">
   <div className="landing-container flex h-full items-center justify-between gap-4">
    <Link href="/" aria-label="Đại hội số — Trang chủ" className="landing-wordmark flex min-w-0 items-center gap-3">
     <BrandMark className="landing-logo"/>
     <span className="min-w-0 leading-tight">
      <span className="block text-[17px] font-extrabold tracking-[-.05em] text-[#102f46]">Đại hội số<span className="text-[#cf9b4b]">.</span></span>
      <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.17em] text-[#6f8694]">Không gian Đoàn – Hội</span>
     </span>
    </Link>
    <nav aria-label="Điều hướng chính" className="flex shrink-0 items-center gap-4 sm:gap-7">
     <a href="#chuc-nang" className="hidden text-[12px] font-semibold text-[#546f7e] transition-colors hover:text-[#035d86] sm:block">Giải pháp</a>
     <a href="#quy-trinh" className="hidden text-[12px] font-semibold text-[#546f7e] transition-colors hover:text-[#035d86] md:block">Quy trình</a>
     <Link href="/preview" className="hidden text-[12px] font-semibold text-[#546f7e] transition-colors hover:text-[#035d86] lg:block">Trải nghiệm</Link>
     <Link href="/guest" className="hidden text-[12px] font-semibold text-[#3f748d] hover:text-[#007fae] sm:block">Xem với tư cách khách</Link>
      <Link href="/login" className="landing-nav-action">Đăng nhập <ArrowUpRight size={16} aria-hidden="true"/></Link>
    </nav>
   </div>
  </header>

  <section id="noi-dung-chinh" className="landing-hero">
   <div className="landing-hero-glow" aria-hidden="true"/>
   <div className="landing-container landing-hero-grid">
    <div className="landing-intro">
     <div className="landing-kicker"><span aria-hidden="true"/> NỀN TẢNG ĐIỀU HÀNH ĐẠI HỘI ĐOÀN – HỘI</div>
     <h1 className="landing-heading">Mỗi kỳ Đại hội.<span>Một dấu ấn</span><em>trọn vẹn.</em></h1>
     <p className="landing-lead">Từ chuẩn bị đại biểu đến vận hành hội trường — mọi quy trình được kết nối trong một không gian chỉn chu, hiện đại và đáng tin cậy.</p>
     <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link href="/login" className="landing-cta-primary">Vào không gian điều hành <ArrowRight size={18} aria-hidden="true"/></Link>
      <Link href="/guest" className="landing-cta-secondary">Xem với tư cách khách <ChevronRight size={18} aria-hidden="true"/></Link>
     </div>
     <div className="landing-assurance">
      <span className="landing-assurance-mark"><ShieldCheck size={16} aria-hidden="true"/></span>
      <span>Phân quyền theo vai trò <span aria-hidden="true" className="mx-2 text-[#b5c4c9]">·</span> Đồng bộ theo từng phiên Đại hội</span>
     </div>
     <div className="landing-hero-footnote" aria-label="Những điểm nổi bật">
      <div><strong>01</strong><span>Nền tảng thống nhất</span></div>
      <div><strong>03</strong><span>Giai đoạn vận hành</span></div>
      <div><strong>24/7</strong><span>Truy cập đa thiết bị</span></div>
     </div>
    </div>

    <aside className="landing-preview" aria-label="Minh họa giao diện điều hành Đại hội số">
     <div className="landing-preview-window">
      <div className="landing-preview-top">
       <span className="flex items-center gap-2.5">
        <span className="landing-preview-dots" aria-hidden="true"><i/><i/><i/></span>
        <span className="text-[10px] font-bold tracking-[.025em] text-[#557184]">Đại hội số / Bảng điều hành</span>
       </span>
       <span className="landing-preview-label">DEMO VIEW</span>
      </div>
      <div className="landing-preview-body">
       <div className="landing-preview-masthead">
        <div className="min-w-0">
         <p className="landing-preview-eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-[#82dcc3]"/> KHÔNG GIAN ĐIỀU HÀNH</p>
         <h2 className="mt-3 text-[clamp(18px,2vw,25px)] font-extrabold tracking-[-.04em] text-white">Tổng quan Đại hội</h2>
         <p className="mt-1 text-[10px] text-[#bdcddd]">Trực quan. Đồng bộ. Chủ động.</p>
        </div>
        <span className="landing-preview-live"><span className="h-1.5 w-1.5 rounded-full bg-[#78e9bd]"/> Trạng thái mẫu</span>
       </div>
       <div className="landing-preview-stats">
        <div><span>TỔNG ĐẠI BIỂU</span><strong>200</strong><small>Hồ sơ dự kiến</small></div>
        <div><span>ĐÃ THAM DỰ</span><strong>158</strong><small>Minh họa tiến độ</small></div>
        <div><span>TỶ LỆ</span><strong>79<em>%</em></strong><small>Cập nhật theo phiên</small></div>
       </div>
       <div className="landing-preview-progress" aria-label="Thanh tỷ lệ tham dự minh họa 79 phần trăm"><span/></div>
       <div className="landing-preview-board">
        <div className="landing-preview-board-head">
         <div><p className="text-[9px] font-extrabold tracking-[.14em] text-[#438093]">SƠ ĐỒ HỘI TRƯỜNG</p><p className="mt-1 text-[12px] font-bold text-[#244c60]">Vị trí đại biểu</p></div>
         <span className="landing-preview-board-status"><Check size={12}/> Đồng bộ</span>
        </div>
        <div className="landing-preview-stage">SÂN KHẤU</div>
        <div className="landing-preview-aisle" aria-hidden="true">
         {Array.from({length:72},(_,i)=><span key={i} className={i%12===5||i%12===6?"is-aisle":i%8===0||i%13===0?"is-empty":i%4===0?"is-arrived":"is-seat"}/>)}
        </div>
        <div className="landing-preview-legend">
         <span><i className="is-arrived"/> Đã đến</span><span><i className="is-seat"/> Chưa đến</span><span><i className="is-aisle"/> Lối đi</span>
        </div>
       </div>
      </div>
      <div className="landing-preview-statusbar">
       <span className="inline-flex items-center gap-2"><ShieldCheck size={13}/> Giao diện minh họa — không phải dữ liệu thật</span>
       <span className="hidden sm:inline-flex items-center gap-1"><Clock3 size={13}/> Theo phiên</span>
      </div>
     </div>
     <div className="landing-floating-ticket" aria-hidden="true">
      <span className="landing-floating-icon"><ClipboardCheck size={18}/></span>
      <div><strong>Điểm danh QR</strong><span>Ghi nhận tức thời</span></div>
      <span className="landing-floating-check"><Check size={15}/></span>
     </div>
     <div className="landing-preview-ornament" aria-hidden="true">ĐẠI<br/>HỘI</div>
    </aside>
   </div>
   <div className="landing-container"><div className="landing-hero-bottomline"><span>THIẾT KẾ CHO NHỮNG KỲ ĐẠI HỘI CHỈN CHU</span><span>ĐOÀN TNCS HỒ CHÍ MINH · HỘI SINH VIÊN VIỆT NAM</span></div></div>
  </section>

  <section id="chuc-nang" className="landing-features" aria-label="Chức năng chính">
   <div className="landing-container py-16 sm:py-20">
    <div className="landing-section-heading">
     <div><p className="landing-section-kicker"><Layers3 size={15}/> GIẢI PHÁP TOÀN DIỆN</p>
      <h2>Đại hội được vận hành<br/><span>theo cách thông minh hơn.</span></h2></div>
     <p>Không rời rạc giữa các công cụ. Mọi thao tác có cùng một luồng làm việc rõ ràng cho Ban Tổ chức và đại biểu.</p>
    </div>
    <div className="landing-capability-grid">
     {capabilities.map((feature,index)=><article key={feature.number} className={"landing-capability "+(index===0?"landing-capability-featured":"")}>
      <div className="landing-capability-top">
       <span className="landing-capability-icon"><feature.icon size={23} strokeWidth={1.7} aria-hidden="true"/></span>
       <span className="landing-capability-index">{feature.number} / 04</span>
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.detail}</p>
      <span className="landing-capability-rule" aria-hidden="true"/>
     </article>)}
    </div>
   </div>
  </section>

  <section id="quy-trinh" className="landing-process">
   <div className="landing-container landing-process-layout">
    <div className="landing-process-intro">
     <span className="landing-process-label"><Workflow size={15}/> MỘT DÒNG CHẢY XUYÊN SUỐT</span>
     <h2>Từ kế hoạch<br/>đến thành công.</h2>
     <p>Ba giai đoạn. Một hệ thống vận hành nhất quán từ trước, trong và sau Đại hội.</p>
     <Link href="/preview" className="landing-process-link">Khám phá trải nghiệm <ArrowUpRight size={17}/></Link>
    </div>
    <div className="landing-process-list">
     {stages.map((stage,index)=><div className="landing-process-step" key={stage.number}>
      <span className="landing-process-number">{stage.number}</span>
      <div className="min-w-0"><h3>{stage.title}</h3><p>{stage.detail}</p></div>
      <span className="landing-process-indicator">{index===2?<FileCheck2 size={18}/>:<ArrowUpRight size={18}/>}</span>
     </div>)}
    </div>
   </div>
  </section>

  <section className="landing-final">
   <div className="landing-container">
    <div className="landing-final-panel">
     <div><span className="landing-final-kicker"><LockKeyhole size={14}/> KHÔNG GIAN RIÊNG CHO ĐẠI HỘI</span>
      <h2>Chuẩn mực trong tổ chức.<br/><em>Ấn tượng trong trải nghiệm.</em></h2>
     </div>
     <Link href="/login" className="landing-final-button">Truy cập Đại hội số <ArrowRight size={18}/></Link>
    </div>
   </div>
  </section>
  <footer className="landing-footer">
   <div className="landing-container flex flex-col justify-between gap-3 py-6 text-[11px] sm:flex-row sm:items-center">
    <span>© Đại hội số · Nền tảng điều hành Đại hội Đoàn – Hội</span>
    <span className="flex items-center gap-2"><ShieldCheck size={14}/> Truy cập theo tài khoản được cấp quyền</span>
   </div>
  </footer>
 </main>;
}
