import Link from "next/link";
import {ArrowRight,BookOpen,CalendarDays,MapPin,ShieldCheck,Users} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

export type GuestCongress={
 id:string;slug:string;name:string;term:string|null;
 kind:"doan"|"hoi_sinh_vien";venue:string|null;
 starts_at:string|null;ends_at:string|null
};

export function GuestAccessEntry({options}:{options:GuestCongress[]}){
 return <main className="min-h-dvh bg-[#f3f7fa] px-4 py-8 text-[#18354c] sm:py-14">
  <div className="mx-auto max-w-[1040px]">
   <header className="mb-9 flex flex-wrap items-center justify-between gap-3">
    <Link href="/" className="flex items-center gap-3">
     <BrandMark className="!h-11 !w-11"/>
     <span className="text-lg font-extrabold tracking-tight">Đại hội số <span className="text-[#1484b1]">/ Khách</span></span>
    </Link>
    <Link href="/login" className="text-xs font-semibold text-[#44768d] underline">Đăng nhập đại biểu / BTC</Link>
   </header>
   <section className="overflow-hidden rounded-[22px] border border-[#d9e6ee] bg-white shadow-[0_18px_65px_rgba(16,55,78,.075)]">
    <div className="bg-[#16334b] px-6 py-9 text-white sm:px-10">
     <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#9ed8ee]">CHẾ ĐỘ KHÁCH · KHÔNG CẦN ĐĂNG NHẬP</p>
     <h1 className="mt-3 text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.2]">Khám phá các Đại hội đang diễn ra</h1>
     <p className="mt-3 max-w-2xl text-[13px] leading-7 text-[#d2e4ee]">
      Chọn Đại hội để xem thông tin chương trình, tài liệu được công bố và nhân sự giới thiệu BCH.
      Không cần tài khoản, mật khẩu hay mã truy cập.
     </p>
    </div>
    <div className="space-y-4 p-5 sm:p-9">
     <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-[17px] font-extrabold text-[#203f53]">Đại hội đang diễn ra</h2>
      <span className="rounded-full bg-[#e4f4ee] px-3 py-1.5 text-[11px] font-bold text-[#207958]">{options.length} Đại hội</span>
     </div>
     {options.length===0?
      <div role="status" className="rounded-xl border border-[#dce8ed] bg-[#f6fafb] px-5 py-8 text-center">
       <p className="text-sm font-bold text-[#2e6076]">Hiện chưa có Đại hội nào đang diễn ra.</p>
       <p className="mt-2 text-xs leading-6 text-[#6f8a99]">Danh sách sẽ tự xuất hiện khi Ban Tổ chức chuyển trạng thái Đại hội sang “Đang diễn ra”. Bạn không cần nhập mã.</p>
      </div>:
      <div className="grid gap-4 sm:grid-cols-2">
       {options.map(c=><Link href={"/guest/"+encodeURIComponent(c.slug)} key={c.id}
        className="group flex min-h-[200px] flex-col rounded-xl border border-[#dce7ee] bg-[#fbfdfe] p-5 transition-colors hover:border-[#8cc1d8] hover:bg-[#f1f9fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1679a7]">
        <div className="flex items-start justify-between gap-3">
         <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f4e9] px-3 py-1 text-[10px] font-extrabold text-[#207c55]">
          <span className="size-1.5 rounded-full bg-[#2c9a61]"/> ĐANG DIỄN RA
         </span>
         <BrandMark kind={c.kind} className="!h-9 !w-9 shrink-0"/>
        </div>
        <h3 className="mt-4 text-[16px] font-extrabold leading-6 text-[#17384f] group-hover:text-[#0875a7]">{c.name}</h3>
        {c.term&&<p className="mt-1 text-[12px] text-[#6e8798]">Nhiệm kỳ {c.term}</p>}
        {c.venue&&<p className="mt-3 flex items-start gap-1.5 text-[12px] text-[#6b8394]"><MapPin size={14} className="mt-0.5 shrink-0"/>{c.venue}</p>}
        {c.starts_at&&<p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#6b8394]"><CalendarDays size={14}/>{new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeZone:"Asia/Ho_Chi_Minh"}).format(new Date(c.starts_at))}</p>}
        <span className="mt-auto flex items-center gap-2 pt-5 text-[12px] font-extrabold text-[#117fa9]">Xem thông tin Đại hội <ArrowRight size={16} className="transition-transform group-hover:translate-x-1"/></span>
       </Link>)}
      </div>}
    </div>
   </section>
   <div className="mt-6 grid gap-3 sm:grid-cols-3">
    {[
     {icon:BookOpen,title:"Tài liệu Đại hội",detail:"Chỉ xem tài liệu Ban Tổ chức đã công bố."},
     {icon:Users,title:"Nhân sự BCH",detail:"Hồ sơ ứng viên giới thiệu Ban Chấp hành."},
     {icon:ShieldCheck,title:"Truy cập công khai",detail:"Không có quyền điểm danh, xem ghế cá nhân hay quản trị."}
    ].map(item=><div key={item.title} className="rounded-xl border border-[#dce8ed] bg-white p-4">
     <item.icon size={19} className="text-[#137da7]"/>
     <p className="mt-3 text-sm font-bold">{item.title}</p>
     <p className="mt-1 text-xs leading-5 text-[#708b9c]">{item.detail}</p>
    </div>)}
   </div>
  </div>
 </main>;
}
