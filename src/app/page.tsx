import Link from "next/link";
import {
  ArrowRight,ArrowUpRight,Armchair,BarChart3,ChevronRight,
  FileSpreadsheet,Layers3,QrCode,ShieldCheck,Users
} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {ExperiencePreview} from "@/components/experience-preview";

const capabilities=[
  {number:"01",icon:Users,title:"Danh sách đại biểu",description:"Hồ sơ, đơn vị, quyền tham dự và thẻ định danh — tổ chức trong một quy trình rõ ràng."},
  {number:"02",icon:QrCode,title:"Điểm danh theo phiên",description:"Quét QR, kiểm tra barcode hoặc xác nhận thủ công khi cần. Tách biệt từng phiên làm việc."},
  {number:"03",icon:Armchair,title:"Sơ đồ hội trường",description:"Tự bố trí các dãy ghế, gán đại biểu theo vị trí và nhập danh sách phân ghế bằng Excel."},
  {number:"04",icon:BarChart3,title:"Báo cáo điều hành",description:"Theo dõi số lượng tham dự, trạng thái đại biểu và xuất số liệu phục vụ tổng kết."}
];
const workflow=[
  {number:"01",title:"Chuẩn bị",description:"Khởi tạo Đại hội, phân quyền BTC, nhập đại biểu và thiết kế sơ đồ."},
  {number:"02",title:"Vận hành",description:"Mở phiên, tiếp nhận điểm danh và xử lý các tình huống phát sinh."},
  {number:"03",title:"Tổng hợp",description:"Đối chiếu dữ liệu, xuất báo cáo và lưu hồ sơ sau Đại hội."}
];

export default function Home(){
  return <main className="min-h-dvh overflow-x-hidden bg-[#f5f7fa]">
    <div className="premium-hero">
      <nav className="premium-nav">
        <div className="premium-container flex h-full items-center justify-between gap-4">
          <Link href="/" aria-label="Trang chủ Đại hội số" className="flex shrink-0 items-center gap-3">
            <BrandMark/>
            <span className="text-[17px] font-bold tracking-[-.04em] text-white sm:text-[18px]">Đại hội số<span className="ml-1 text-[#dbb875]">.</span></span>
          </Link>
          <div className="hidden items-center gap-8 text-[12px] font-medium text-[#adbed8] md:flex">
            <a href="#giai-phap" className="hover:text-white">Giải pháp</a>
            <a href="#quy-trinh" className="hover:text-white">Quy trình</a>
            <Link href="/preview" className="hover:text-white">Giao diện mẫu</Link>
          </div>
          <Link href="/login" className="btn premium-secondary !min-h-10 !px-4 !text-[12px] sm:!px-5">
            Đăng nhập <ArrowUpRight size={15}/>
          </Link>
        </div>
      </nav>

      <section className="premium-container relative grid gap-14 pb-16 pt-17 md:pb-22 lg:min-h-[680px] lg:grid-cols-[minmax(0,.87fr)_minmax(0,1.13fr)] lg:items-center lg:gap-10 lg:py-23 2xl:min-h-[750px]">
        <div className="relative z-10">
          <div className="premium-eyebrow">HỆ THỐNG ĐIỀU HÀNH ĐẠI HỘI</div>
          <h1 className="premium-title mt-7">
            Tổ chức<br/>
            bài bản.<br/>
            Điều hành<br/>
            <span className="serif-accent">vượt kỳ vọng.</span>
          </h1>
          <p className="premium-description mt-7">
            Tất cả thông tin, con người và công việc trong một không gian điều hành. Đủ rõ ràng cho công tác chuẩn bị, đủ linh hoạt cho từng phiên Đại hội.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/preview" className="btn premium-primary px-5">Khám phá giao diện <ArrowRight size={17}/></Link>
            <Link href="/login" className="btn premium-secondary px-5">Vào hệ thống <ChevronRight size={16}/></Link>
          </div>
          <div className="premium-proof mt-11 grid max-w-[500px] gap-4 sm:grid-cols-2">
            <div className="premium-proof-item"><ShieldCheck size={17}/> Quyền truy cập theo từng Đại hội</div>
            <div className="premium-proof-item"><FileSpreadsheet size={17}/> Phân bổ dữ liệu nhanh bằng Excel</div>
            <div className="premium-proof-item"><QrCode size={17}/> QR, barcode & điểm danh thủ công</div>
            <div className="premium-proof-item"><Armchair size={17}/> Sơ đồ chỗ ngồi trực quan</div>
          </div>
        </div>

        <div className="relative z-10 min-w-0 lg:-mr-6 2xl:-mr-12">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.13em] text-[#bdcce2]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e2ba79]"/> Không gian làm việc
            </div>
            <span className="text-[10px] text-[#7f94b5]">TƯƠNG TÁC ĐỂ XEM THỬ →</span>
          </div>
          <ExperiencePreview compact/>
          <p className="premium-side-note mt-5">
            Bản minh họa tương tác · Chỉ dùng dữ liệu mẫu. Đăng nhập để sử dụng Đại hội thực tế.
          </p>
        </div>
      </section>

      <div className="relative border-t border-white/10">
        <div className="premium-container flex flex-wrap items-center justify-between gap-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#849bb9]">Tập trung vào nghiệp vụ thực tế</span>
          <div className="flex flex-wrap gap-x-7 gap-y-2 text-[11px] text-[#a2b4cb]">
            <span>01 / Chuẩn bị</span><span>02 / Điều hành</span><span>03 / Tổng hợp</span>
          </div>
        </div>
      </div>
    </div>

    <section id="giai-phap" className="editorial-section bg-white">
      <div className="premium-container">
        <div className="grid gap-6 lg:grid-cols-[.68fr_1fr] lg:items-end">
          <div>
            <p className="editorial-kicker">XÂY DỰNG CHO BAN TỔ CHỨC</p>
            <h2 className="editorial-heading mt-5">Không chỉ là<br/>một trang <em>quản lý.</em></h2>
          </div>
          <div className="max-w-xl lg:ml-auto">
            <p className="text-[15px] leading-[1.85] text-[#64748b]">Một Đại hội có nhiều công việc cần phối hợp. Giao diện được thiết kế để mỗi thành viên BTC thấy đúng thông tin cần xử lý, từ lúc chuẩn bị cho đến khi hoàn tất.</p>
          </div>
        </div>
        <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.map(item=><article className="editorial-feature" key={item.number}>
            <div className="flex items-start justify-between">
              <span className="feature-icon"><item.icon size={19}/></span>
              <span className="feature-count">{item.number} / 04</span>
            </div>
            <h3 className="mt-9">{item.title}</h3>
            <p className="mt-3">{item.description}</p>
          </article>)}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
          <div className="editorial-feature wide min-h-[230px] sm:min-h-[254px]">
            <div className="flex items-start justify-between gap-3"><span className="editorial-kicker">HỆ THỐNG NHIỀU ĐẠI HỘI</span><Layers3 size={23} className="text-[#4866a2]"/></div>
            <h3 className="mt-auto max-w-md !text-[24px] !leading-snug !tracking-[-.04em]">Tách dữ liệu từng Đại hội.<br/>Thống nhất cách vận hành.</h3>
            <p className="mt-3 max-w-[485px]">Quản lý nhiều nhiệm kỳ và đơn vị, mỗi không gian có quyền truy cập và dữ liệu riêng.</p>
          </div>
          <div className="editorial-feature dark min-h-[230px] sm:min-h-[254px]">
            <div className="flex items-start justify-between gap-3"><span className="feature-count">SẴN SÀNG CHO VẬN HÀNH</span><QrCode size={24} className="text-[#e1bd7c]"/></div>
            <h3 className="mt-auto max-w-sm !text-[24px] !leading-snug !tracking-[-.04em]">Mọi phiên làm việc.<br/>Một cách điều hành.</h3>
            <p className="mt-3 max-w-[440px]">Cấu hình phiên điểm danh theo khung giờ, kết hợp quét QR và phương án thủ công dự phòng.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="quy-trinh" className="editorial-section border-t border-[#e5e9f0] bg-[#f5f7fa]">
      <div className="premium-container">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="editorial-kicker">CÁCH VẬN HÀNH</p><h2 className="editorial-heading mt-4">Chuẩn hóa quy trình.<br/><em>Giảm thao tác thừa.</em></h2></div>
          <Link href="/preview" className="btn btn-secondary">Xem giao diện thử <ArrowUpRight size={16}/></Link>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {workflow.map(step=><article className="border-t-[2px] border-[#294c85] bg-white p-6 shadow-[0_3px_12px_rgba(23,36,60,.025)] sm:p-7" key={step.number}>
            <p className="text-[11px] font-bold tracking-[.13em] text-[#59749e]">{step.number} / 03</p>
            <h3 className="mt-9 text-[20px] font-bold tracking-[-.035em] text-[#23344c]">{step.title}</h3>
            <p className="mt-3 text-[13px] leading-[1.8] text-[#7b899a]">{step.description}</p>
          </article>)}
        </div>
      </div>
    </section>

    <section className="bg-[#17263e] text-white">
      <div className="premium-container flex flex-col items-start justify-between gap-6 py-12 sm:py-16 lg:flex-row lg:items-center">
        <div>
          <p className="premium-eyebrow">DÀNH CHO BAN TỔ CHỨC ĐẠI HỘI</p>
          <h2 className="mt-4 text-[28px] font-bold tracking-[-.045em] sm:text-[37px]">Sẵn sàng cho kỳ Đại hội tiếp theo?</h2>
          <p className="mt-3 max-w-xl text-[13px] leading-7 text-[#b2c3d9]">Đăng nhập bằng tài khoản BTC được cấp để truy cập không gian điều hành của đơn vị.</p>
        </div>
        <Link href="/login" className="btn premium-primary min-h-[47px] shrink-0 px-6">Truy cập hệ thống <ArrowRight size={17}/></Link>
      </div>
    </section>

    <footer className="bg-[#101a2d] text-white">
      <div className="premium-container flex flex-col items-start justify-between gap-4 py-8 text-[11px] text-[#8193af] sm:flex-row sm:items-center">
        <Link href="/" className="flex items-center gap-2.5 text-[13px] font-bold text-white"><BrandMark className="!h-8 !w-8 !flex-[0_0_32px] !rounded-[8px] [&_svg]:!h-6 [&_svg]:!w-6"/>Đại hội số.</Link>
        <span>Nền tảng quản lý và điều hành Đại hội Đoàn – Hội</span>
        <Link href="/preview" className="hover:text-white">Giao diện mẫu <ArrowUpRight size={13} className="inline"/></Link>
      </div>
    </footer>
  </main>;
}
