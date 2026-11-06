import Link from "next/link";
import {
  ArrowRight,ArrowUpRight,BarChart3,CalendarCheck2,Check,CheckCheck,
  ChevronRight,Layers3,QrCode,ShieldCheck,Sparkles,Users
} from "lucide-react";

const features=[
  {icon:Layers3,title:"Nhiều Đại hội, một nền tảng",text:"Tách biệt dữ liệu và phân quyền của từng kỳ Đại hội, giúp Ban Tổ chức dễ quản lý."},
  {icon:Users,title:"Hồ sơ đại biểu tập trung",text:"Nhập Excel, quản lý danh sách và cấp mã QR, barcode định danh cho từng đại biểu."},
  {icon:QrCode,title:"Điểm danh linh hoạt",text:"Quét QR theo phiên hoặc QR cố định, dự phòng bằng barcode và xác nhận thủ công."},
  {icon:BarChart3,title:"Báo cáo theo từng phiên",text:"Theo dõi số lượt check-in, phân loại đại biểu, tổng hợp số liệu theo đơn vị."}
];
const steps=[
  {number:"01",title:"Tạo & cấu hình",text:"Thiết lập Đại hội, phân quyền Ban Tổ chức và nhập hồ sơ đại biểu."},
  {number:"02",title:"Tổ chức & điểm danh",text:"Mở phiên theo khung giờ, quét mã QR hoặc xác nhận phương án dự phòng."},
  {number:"03",title:"Theo dõi & tổng hợp",text:"Kiểm tra danh sách có mặt, báo cáo và xuất số liệu phục vụ công tác Đại hội."}
];

export default function Home(){
  return <main className="min-h-dvh overflow-x-hidden">
    <div className="relative overflow-hidden bg-[#0c3048] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-48 -top-40 h-[650px] w-[650px] rounded-full bg-[#169f9a]/20 blur-[70px]"/>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 left-[5%] h-[370px] w-[370px] rounded-full bg-[#1883a3]/15 blur-[80px]"/>
      <nav aria-label="Điều hướng trang chủ" className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Trang chủ Đại hội số">
          <span className="brand-icon h-10 w-10 rounded-xl sm:h-11 sm:w-11"><Layers3 size={21}/></span>
          <span className="text-[16px] font-black tracking-[.065em] sm:text-xl">ĐẠI HỘI <span className="text-[#79ecdf]">SỐ</span></span>
        </Link>
        <Link href="/login" className="btn min-h-10 border border-white/20 bg-white/10 px-3 text-xs text-white hover:bg-white/20 sm:px-5 sm:text-sm">Đăng nhập <ArrowRight size={16}/></Link>
      </nav>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,.92fr)] lg:gap-14 lg:pb-30 lg:pt-24">
        <div className="min-w-0">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-[#73dace]/25 bg-white/[.06] px-3.5 py-2 text-[11px] font-bold text-[#b7f1e8] sm:px-4 sm:text-xs"><Sparkles size={15} className="shrink-0"/> Nền tảng dành cho Ban Tổ chức Đại hội</div>
          <h1 className="max-w-2xl text-[39px] font-black leading-[1.16] tracking-[-.05em] sm:text-[52px] lg:text-[54px] xl:text-[62px]">Điều hành Đại hội <span className="text-[#74e5d7]">chuyên nghiệp</span> hơn.</h1>
          <p className="mt-6 max-w-xl text-sm leading-[1.9] text-[#bad3df] sm:text-base">Một không gian thống nhất để quản lý nhiều Đại hội, điều phối đại biểu, điểm danh QR theo phiên và theo dõi báo cáo rõ ràng trên cả máy tính lẫn điện thoại.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/login" className="btn min-h-[48px] bg-[#69dfcd] px-6 font-extrabold text-[#0d414a] hover:bg-[#a0f0e5]">Vào hệ thống <ArrowRight size={18}/></Link>
            <a href="#tinh-nang" className="btn min-h-[48px] border border-white/25 bg-white/[.05] px-6 text-white hover:bg-white/10">Khám phá tính năng <ChevronRight size={17}/></a>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-semibold text-[#9bbecf] sm:text-sm">
            <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#69e2d6]"/> Phân quyền theo Đại hội</span>
            <span className="flex items-center gap-2"><QrCode size={18} className="text-[#69e2d6]"/> QR theo từng phiên</span>
          </div>
        </div>

        <div className="relative min-w-0">
          <div aria-hidden="true" className="absolute -inset-5 rounded-[42px] bg-[#36cab3]/12 blur-[45px]"/>
          <div className="card relative overflow-hidden border-white/10 bg-[#fcfefe] p-4 text-[#15354a] shadow-[0_35px_80px_rgba(4,18,31,.32)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eef0] pb-4">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e2f6f0] text-[#0b8581]"><Layers3 size={20}/></span><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#6e92a2]">Bảng điều hành</p><h2 className="text-sm font-extrabold sm:text-base">Phiên làm việc chính thức</h2></div></div>
              <span className="badge badge-gray">Minh họa</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              {[["200","Đại biểu"],["184","Có mặt"],["92%","Tỷ lệ"]].map(([n,label])=><div key={label} className="min-w-0 rounded-2xl bg-[#f0f8f9] p-3 sm:p-4"><p className="text-2xl font-black tracking-tight sm:text-3xl">{n}</p><p className="mt-2 text-[10px] font-semibold leading-relaxed text-[#688395] sm:text-xs">{label}</p></div>)}
            </div>
            <div className="mt-6 flex items-center justify-between gap-3"><span className="text-xs font-extrabold sm:text-sm">Tiến độ điểm danh</span><span className="text-sm font-black text-[#0c9688]">92%</span></div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e5f0f2]"><div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#1288a6] to-[#2bc6a4]"/></div>
            <div className="mt-6 space-y-2.5">
              {[["NA","Nguyễn Văn A","Quét QR"],["TB","Trần Thị B","Thủ công"],["LC","Lê Văn C","Quét QR"]].map(([initial,name,method])=><div key={name} className="flex items-center justify-between gap-2 rounded-xl border border-[#edf2f3] bg-[#fbfdfd] px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3f5f3] text-[10px] font-black text-[#0c8083]">{initial}</span><span className="truncate text-xs font-extrabold sm:text-sm">{name}</span></div>
                <span className={`badge shrink-0 ${method==="Quét QR"?"badge-green":"badge-yellow"}`}>{method}</span>
              </div>)}
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-[11px] text-[#8094a1]"><Check size={14}/> Số liệu giả lập để minh họa giao diện.</p>
          </div>
          <div className="absolute -bottom-5 right-3 hidden items-center gap-2 rounded-2xl border border-white/70 bg-white px-4 py-3 text-xs font-bold text-[#155a63] shadow-[0_15px_35px_rgba(4,20,30,.14)] sm:flex"><CheckCheck size={18} className="text-[#0d9f87]"/> Ghi nhận theo từng phiên</div>
        </div>
      </section>
    </div>

    <section id="tinh-nang" className="mx-auto max-w-7xl scroll-mt-16 px-4 py-18 sm:px-6 sm:py-22">
      <div className="max-w-2xl">
        <p className="eyebrow">Các chức năng trọng tâm</p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-.035em] sm:text-4xl">Tập trung mọi công việc điều hành tại một nơi.</h2>
        <p className="page-description mt-4">Thiết kế theo luồng làm việc thực tế của Ban Tổ chức, dễ truy cập khi đang vận hành Đại hội.</p>
      </div>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {features.map(({icon:Icon,title,text},index)=><article className="card flex min-h-[235px] flex-col p-6 transition-colors hover:border-[#a6ded9]" key={title}>
          <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f7f2] text-[#0c8782]"><Icon size={24}/></span><span className="text-xs font-black text-[#c0cdd6]">0{index+1}</span></div>
          <h3 className="mt-6 text-lg font-extrabold leading-snug">{title}</h3>
          <p className="helper mt-3">{text}</p>
        </article>)}
      </div>
    </section>

    <section className="bg-[#eaf4f3]/70 py-18 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">Quy trình sử dụng</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Từ chuẩn bị đến tổng kết</h2></div><Link href="/login" className="btn btn-secondary">Bắt đầu điều hành <ArrowUpRight size={18}/></Link></div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(step=><div key={step.number} className="rounded-[20px] border border-[#d8e9e7] bg-white p-6"><span className="text-4xl font-black tracking-tight text-[#b5dad5]">{step.number}</span><h3 className="mt-5 text-lg font-extrabold">{step.title}</h3><p className="helper mt-3">{step.text}</p></div>)}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-18 sm:px-6 sm:py-20">
      <div className="flex flex-col items-center gap-5 rounded-[24px] bg-[#123c52] px-5 py-10 text-center text-white sm:px-10 sm:py-13">
        <span className="rounded-2xl bg-white/10 p-3 text-[#73dfd5]"><CalendarCheck2 size={25}/></span>
        <h2 className="max-w-2xl text-2xl font-black leading-tight sm:text-3xl">Sẵn sàng cho kỳ Đại hội tiếp theo?</h2>
        <p className="max-w-xl text-sm leading-[1.8] text-[#bbd5e0]">Đăng nhập bằng tài khoản BTC được cấp để truy cập không gian điều hành của đơn vị.</p>
        <Link href="/login" className="btn bg-[#69dfcd] px-6 text-[#093d47] hover:bg-[#96eddf]">Đăng nhập hệ thống <ArrowRight size={18}/></Link>
      </div>
    </section>
    <footer className="border-t border-[#dfe9ed] bg-white px-4 py-7 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 text-xs text-[#728697] sm:flex-row sm:items-center">
        <span className="flex items-center gap-2 font-extrabold text-[#245167]"><Layers3 size={18} className="text-[#0e8c89]"/> ĐẠI HỘI SỐ</span>
        <span>Nền tảng quản lý và điều hành Đại hội Đoàn – Hội</span>
      </div>
    </footer>
  </main>;
}
