"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,BookOpen,KeyRound,LockKeyhole,ShieldCheck,Users} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

export type GuestCongress={id:string;slug:string;name:string;term:string;kind:"doan"|"hoi_sinh_vien"};
export function GuestAccessEntry({options,initialSlug=""}:{options:GuestCongress[];initialSlug?:string}){
 const [slug,setSlug]=useState(initialSlug||options[0]?.slug||"");
 const [code,setCode]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  const fragment=new URLSearchParams(window.location.hash.replace(/^#/,""));
  const token=fragment.get("access");
  if(!token)return;
  // Remove the credential from browser history before contacting our server.
  window.history.replaceState(null,"",window.location.pathname+window.location.search);
  if(!initialSlug)return;
  const accessToken=token;
  async function accessLink(){await Promise.resolve();setCode(accessToken);await submitCode(initialSlug,accessToken);}
  void accessLink();
 // A share link is processed only once per mount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function submitCode(congressSlug:string,accessCode:string){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/guest/access",{method:"POST",credentials:"same-origin",
    cache:"no-store",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({slug:congressSlug,code:accessCode.trim()})});
   const result=await res.json().catch(()=>null);
   if(!res.ok)throw new Error(result?.error||"Không thể xác minh mã truy cập.");
   window.location.replace(result.destination);
  }catch(e){setError(e instanceof Error?e.message:"Không thể xác minh mã truy cập.");setBusy(false);}
 }
 return <main className="min-h-dvh bg-[#f3f7fa] px-4 py-8 text-[#18354c] sm:py-14">
  <div className="mx-auto max-w-[920px]">
   <header className="mb-10 flex flex-wrap items-center justify-between gap-3">
    <Link href="/" className="flex items-center gap-3"><BrandMark className="!h-11 !w-11"/>
     <span className="text-lg font-extrabold tracking-tight">Đại hội số <span className="text-[#1484b1]">/ Khách</span></span></Link>
    <Link href="/login" className="text-xs font-semibold text-[#44768d] underline">Đăng nhập tài khoản đại biểu / BTC</Link>
   </header>
   <section className="overflow-hidden rounded-[22px] border border-[#d9e6ee] bg-white shadow-[0_18px_65px_rgba(16,55,78,.075)]">
    <div className="border-b border-[#e1ebf1] bg-[#16334b] px-6 py-9 text-white sm:px-10">
     <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#9ed8ee]">CHẾ ĐỘ KHÁCH · CHỈ ĐỌC</p>
     <h1 className="mt-3 text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.2]">Truy cập Đại hội bằng mã</h1>
     <p className="mt-3 max-w-xl text-[13px] leading-7 text-[#d2e4ee]">Chọn Đại hội và nhập mã truy cập do Ban Tổ chức cung cấp để xem tài liệu đã công bố và hồ sơ nhân sự giới thiệu BCH, không cần tài khoản.</p>
    </div>
    <form onSubmit={e=>{e.preventDefault();void submitCode(slug,code);}} className="space-y-5 p-6 sm:p-10">
     {options.length?<label className="block">
      <span className="label">Chọn Đại hội</span>
      <select className="field !min-h-12" value={slug} onChange={e=>setSlug(e.target.value)}>
       {options.map(c=><option key={c.id} value={c.slug}>{c.name}{c.term?" · "+c.term:""}</option>)}
      </select>
     </label>:<p className="rounded-xl border border-[#dce8ed] bg-[#f6fafb] px-4 py-5 text-sm text-[#577a8c]">Hiện chưa có Đại hội mở chế độ khách. Vui lòng liên hệ Ban Tổ chức để được cấp mã.</p>}
     <label className="block">
      <span className="label">Mã đường dẫn / mã truy cập Đại hội</span>
      <div className="relative"><KeyRound size={18} className="pointer-events-none absolute left-3.5 top-4 text-[#7695a7]"/>
       <input className="field !min-h-12 !pl-11" value={code} required autoComplete="off" spellCheck={false}
        maxLength={80} onChange={e=>setCode(e.target.value)} placeholder="Dán mã gv_... của Đại hội"/>
      </div>
     </label>
     {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
     <button type="submit" className="btn btn-primary !min-h-12 w-full justify-center" disabled={!options.length||!slug||!code.trim()||busy}>
      <LockKeyhole size={17}/>{busy?"Đang xác minh...":"Vào Đại hội"}<ArrowRight size={17}/>
     </button>
    </form>
   </section>
   <div className="mt-6 grid gap-3 sm:grid-cols-3">
    {[
     {icon:BookOpen,title:"Tài liệu",detail:"Chỉ đọc tài liệu BTC đã công bố"},
     {icon:Users,title:"Ứng viên BCH",detail:"Hồ sơ trích ngang nhân sự giới thiệu"},
     {icon:ShieldCheck,title:"Giới hạn quyền",detail:"Không có quyền quản trị, điểm danh, xem ghế"}
    ].map(item=><div key={item.title} className="rounded-xl border border-[#dce8ed] bg-white p-4">
      <item.icon size={19} className="text-[#137da7]"/>
      <p className="mt-3 text-sm font-bold">{item.title}</p>
      <p className="mt-1 text-xs leading-5 text-[#708b9c]">{item.detail}</p>
     </div>)}
   </div>
  </div>
 </main>;
}
