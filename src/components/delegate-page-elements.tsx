import Link from "next/link";
import {ArrowRight,IdCard,ShieldAlert,type LucideIcon} from "lucide-react";

export function DelegatePageHeading({eyebrow,title,description,icon:Icon}:{
 eyebrow:string;title:string;description:string;icon:LucideIcon
}){
 return <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
  <div className="min-w-0">
   <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#357eaa]">{eyebrow}</p>
   <h1 className="mt-2 text-[clamp(27px,4vw,35px)] font-extrabold leading-tight tracking-[-.045em] text-[#193c50]">{title}</h1>
   <p className="mt-2 max-w-[650px] text-[13px] leading-6 text-[#78919f]">{description}</p>
  </div>
  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[13px] border border-[#d0e4e5] bg-[#e9f2f9] text-[#0b80aa] sm:flex">
   <Icon size={23}/>
  </div>
 </div>;
}
export function DelegateUnavailable({message}:{message?:string}){
 return <section role={message?"alert":"status"}
  className="rounded-[17px] border border-[#dbe8eb] bg-white px-6 py-11 text-center shadow-sm">
  {message?<ShieldAlert className="mx-auto text-[#b16a40]" size={35}/>:<IdCard className="mx-auto text-[#86a8b5]" size={35}/>}
  <h2 className="mt-4 text-[17px] font-extrabold text-[#365a6d]">{message?"Không thể tải dữ liệu":"Chưa có thẻ đại biểu"}</h2>
  <p className="mx-auto mt-2 max-w-[370px] text-[12px] leading-6 text-[#8199a6]">
   {message||"Tài khoản chưa liên kết với hồ sơ đại biểu đang hoạt động. Vui lòng liên hệ Ban Tổ chức."}
  </p>
  <Link href="/account" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d4e6e9] bg-[#f3f9f9] px-5 text-xs font-bold text-[#26677a]">
   Tài khoản của tôi <ArrowRight size={16}/>
  </Link>
 </section>;
}