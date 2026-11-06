import Link from "next/link";
import {ArrowLeft,ArrowRight,CheckCircle2,MousePointerClick} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {ExperiencePreview} from "@/components/experience-preview";

export const metadata={
  title:"Xem thử giao diện | Đại hội số",
  description:"Khám phá bản xem thử giao diện điều hành Đại hội với số liệu minh họa. Không cần đăng nhập."
};

export default function Preview(){
  return <main className="preview-page">
    <nav className="border-b border-[#e2e6ec] bg-white">
      <div className="premium-container flex min-h-[77px] items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Trang chủ Đại hội số">
          <BrandMark className="brand-symbol-light"/>
          <span className="text-[16px] font-bold tracking-[-.04em] text-[#23334d]">Đại hội số.</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="btn btn-secondary !min-h-10 !px-3 !text-[11px] sm:!px-4"><ArrowLeft size={15}/> <span className="hidden sm:inline">Trang chủ</span></Link>
          <Link href="/login" className="btn btn-primary !min-h-10 !px-3 !text-[11px] sm:!px-4">Đăng nhập <ArrowRight size={15}/></Link>
        </div>
      </div>
    </nav>

    <section className="premium-container pb-8 pt-12 sm:pb-10 sm:pt-16">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-[740px]">
          <p className="page-kicker">BẢN TRẢI NGHIỆM GIAO DIỆN</p>
          <h1 className="mt-5 text-[clamp(32px,4.5vw,56px)] font-bold leading-[1.12] tracking-[-.06em] text-[#192940]">
            Một không gian điều hành.<br/><span className="font-[Georgia] font-normal italic text-[#3c5eaa]">Mọi thứ trong tầm nhìn.</span>
          </h1>
          <p className="mt-5 max-w-[680px] text-[14px] leading-[1.85] text-[#67778d]">
            Chuyển giữa các phân hệ để khám phá bố cục, biểu đồ và sơ đồ ghế. Đây là giao diện mẫu tương tác; mọi con số và tên đại biểu đều được giả lập.
          </p>
        </div>
        <span className="preview-demo-label inline-flex items-center gap-2"><CheckCircle2 size={16}/> Dữ liệu minh họa, không kết nối Supabase</span>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#dde4ee] pt-4 text-[12px] text-[#73849a]">
        <span className="flex items-center gap-2"><MousePointerClick size={16} className="text-[#4268b1]"/> Chọn “Tổng quan”, “Sơ đồ ghế” hoặc “Điểm danh” trong thanh điều hướng của bản xem thử.</span>
        <span>DESIGN EXPERIENCE · 2026</span>
      </div>
    </section>

    <section aria-label="Ứng dụng mô phỏng" className="premium-container pb-16 sm:pb-20">
      <ExperiencePreview/>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[#dce4ef] bg-white p-5">
        <div>
          <p className="text-[13px] font-bold text-[#293b56]">Muốn bắt đầu với dữ liệu Đại hội thật?</p>
          <p className="mt-1 text-[12px] text-[#8090a4]">Cần tài khoản và quyền truy cập của Ban Tổ chức.</p>
        </div>
        <Link href="/login" className="btn btn-primary">Vào hệ thống <ArrowRight size={16}/></Link>
      </div>
    </section>

    <footer className="border-t border-[#dde4ee] bg-white">
      <div className="premium-container flex flex-wrap items-center justify-between gap-3 py-6 text-[11px] text-[#8290a4]">
        <span>Đại hội số · Bản trải nghiệm giao diện</span><span>Không thay thế hệ thống vận hành thực tế</span>
      </div>
    </footer>
  </main>;
}
