import Link from "next/link";
import {
  ArrowRight, Armchair, BarChart3, Check, ChevronRight,
  ClipboardList, QrCode, ShieldCheck, Users
} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

const features=[
  {icon:Users,title:"Đại biểu",detail:"Hồ sơ và phân quyền"},
  {icon:QrCode,title:"Điểm danh",detail:"QR và barcode theo phiên"},
  {icon:Armchair,title:"Sơ đồ ghế",detail:"Bố trí vị trí trực quan"},
  {icon:BarChart3,title:"Báo cáo",detail:"Theo dõi và tổng hợp"}
] as const;

const stages=[
  {number:"01",name:"Chuẩn bị",detail:"Đại biểu · Chỗ ngồi"},
  {number:"02",name:"Điều hành",detail:"Phiên họp · Điểm danh"},
  {number:"03",name:"Tổng hợp",detail:"Báo cáo · Thống kê"}
] as const;

export default function Home(){
  return <main className="landing-page min-h-dvh overflow-x-hidden">
    <a href="#noi-dung-chinh" className="skip-link">Bỏ qua điều hướng</a>

    <header className="landing-header">
      <div className="landing-container flex h-full items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Đại hội số - Trang chủ">
          <BrandMark className="landing-logo"/>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[18px] font-extrabold tracking-[-.035em] text-[#073c5e]">Đại hội số<span className="text-[#ecb932]">.</span></span>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#6c8799]">Nền tảng điều hành Đại hội</span>
          </span>
        </Link>
        <nav aria-label="Điều hướng chính" className="flex shrink-0 items-center gap-3 sm:gap-7">
          <a href="#chuc-nang" className="hidden text-[13px] font-medium text-[#587086] transition-colors hover:text-[#006d9e] sm:block">Chức năng</a>
          <Link href="/preview" className="hidden text-[13px] font-medium text-[#587086] transition-colors hover:text-[#006d9e] md:block">Giao diện mẫu</Link>
          <Link href="/login" className="landing-nav-action">
            Đăng nhập <ArrowRight size={15} aria-hidden="true"/>
          </Link>
        </nav>
      </div>
    </header>

    <section id="noi-dung-chinh" className="landing-hero">
      <div className="landing-container landing-hero-grid">
        <div className="landing-intro">
          <p className="landing-kicker"><span aria-hidden="true"/> DÀNH CHO ĐẠI HỘI ĐOÀN – HỘI</p>
          <h1 className="landing-heading">
            Tổ chức Đại hội.<span>Điều hành tập trung.</span>
          </h1>
          <p className="landing-lead">
            Quản lý đại biểu, điểm danh QR, sơ đồ chỗ ngồi và báo cáo — tất cả trong một hệ thống.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login" className="landing-cta-primary">
              Truy cập hệ thống <ArrowRight size={18} aria-hidden="true"/>
            </Link>
            <Link href="/preview" className="landing-cta-secondary">
              Xem giao diện mẫu <ChevronRight size={18} aria-hidden="true"/>
            </Link>
          </div>
          <p className="landing-assurance"><ShieldCheck size={17} aria-hidden="true"/> Truy cập theo tài khoản và vai trò được cấp.</p>
        </div>

        <aside className="landing-preview" aria-label="Minh họa giao diện điều hành">
          <div className="landing-preview-top">
            <div className="flex items-center gap-2">
              <span className="landing-preview-dot" aria-hidden="true"/>
              <span className="text-[11px] font-bold tracking-[.02em] text-[#194761]">Bảng điều hành</span>
            </div>
            <span className="landing-preview-label">Giao diện minh họa</span>
          </div>
          <div className="landing-preview-body">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#61869c]">Không gian làm việc</p>
                <h2 className="mt-2 text-[21px] font-bold tracking-[-.04em] text-[#153d59]">Tổng quan Đại hội</h2>
              </div>
              <span className="landing-preview-pill"><span className="h-1.5 w-1.5 rounded-full bg-[#189369]"/> Chuẩn bị</span>
            </div>

            <div className="landing-preview-overview">
              <div className="landing-stage-list">
                {stages.map((stage,index)=><div className="landing-stage" key={stage.number}>
                  <span className={"landing-stage-icon "+(index===0?"is-active":"")}>
                    {index===0?<Check size={16} aria-hidden="true"/>:<span>{stage.number}</span>}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#24465c]">{stage.name}</p>
                    <p className="mt-1 text-[11px] text-[#6c8596]">{stage.detail}</p>
                  </div>
                </div>)}
              </div>
              <div className="landing-seating">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#385870]">Sơ đồ hội trường</span>
                  <Armchair size={16} className="text-[#5689a4]" aria-hidden="true"/>
                </div>
                <div className="landing-stage-platform">SÂN KHẤU</div>
                <div className="landing-seat-grid" aria-hidden="true">
                  {Array.from({length:48},(_,index)=><span key={index} className={"landing-seat "+(index%11===0?"is-gold":index%7===0?"is-muted":"")}/>)}
                </div>
                <p className="mt-3 text-center text-[10px] text-[#7c98aa]">Phân ghế theo từng vị trí</p>
              </div>
            </div>
            <div className="landing-preview-footer">
              <ClipboardList size={16} aria-hidden="true"/>
              <span>Thông tin được tổ chức theo từng Đại hội</span>
              <Check size={15} className="ml-auto text-[#198d70]" aria-hidden="true"/>
            </div>
          </div>
        </aside>
      </div>
    </section>

    <section id="chuc-nang" className="landing-features" aria-label="Chức năng chính">
      <div className="landing-container grid grid-cols-2 gap-x-4 gap-y-8 py-8 sm:py-10 lg:grid-cols-4 lg:gap-8">
        {features.map(feature=><div key={feature.title} className="landing-feature">
          <span className="landing-feature-icon"><feature.icon size={21} strokeWidth={1.8} aria-hidden="true"/></span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-[#183e57]">{feature.title}</h3>
            <p className="mt-1 text-[12px] leading-[1.6] text-[#6a8090]">{feature.detail}</p>
          </div>
        </div>)}
      </div>
    </section>

    <footer className="landing-footer">
      <div className="landing-container flex flex-col justify-between gap-2 py-5 text-[11px] text-[#7890a0] sm:flex-row sm:items-center">
        <span>Đại hội số · Nền tảng phục vụ công tác Đại hội Đoàn – Hội</span>
        <span>Gọn gàng. Rõ ràng. Hiệu quả.</span>
      </div>
    </footer>
  </main>;
}