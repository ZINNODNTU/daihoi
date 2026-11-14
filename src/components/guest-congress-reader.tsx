"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {ArrowLeft,BookOpen,KeyRound,LogOut,Users} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {DelegateDocumentsList} from "@/components/delegate-documents-list";
import {DelegateBchCarousel} from "@/components/delegate-bch-carousel";
import type {DocRow} from "@/lib/types";
import type {BchCandidate} from "@/lib/bch-candidates";

export function GuestCongressReader({congress,docs,candidates}:{congress:{
 id:string;name:string;kind:"doan"|"hoi_sinh_vien";term:string
};docs:DocRow[];candidates:(BchCandidate&{congressName:string})[]}){
 const router=useRouter();
 const [tab,setTab]=useState<"documents"|"bch">("documents"),[busy,setBusy]=useState(false);
 async function leave(){
  setBusy(true);
  try{await fetch("/api/guest/access",{method:"DELETE",credentials:"same-origin"});}
  finally{router.replace("/guest");router.refresh();}
 }
 return <main className="min-h-dvh bg-[#f2f6fa] text-[#18354c]">
  <header className="border-b border-[#dbe7ed] bg-white">
   <div className="mx-auto flex min-h-[76px] max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7">
    <Link href="/guest" className="flex items-center gap-3"><BrandMark kind={congress.kind} className="!h-11 !w-11"/>
     <span><strong className="block text-base tracking-tight">ĐẠI HỘI SỐ</strong>
      <span className="mt-1 block text-[10px] font-bold uppercase tracking-[.13em] text-[#718ca1]">CHẾ ĐỘ KHÁCH / CHỈ XEM</span></span></Link>
    <div className="flex items-center gap-2">
     <Link href="/guest" className="btn btn-secondary !min-h-10"><ArrowLeft size={15}/> Chọn Đại hội</Link>
     <button onClick={()=>void leave()} disabled={busy} className="btn btn-secondary !min-h-10"><LogOut size={15}/> Thoát khách</button>
    </div>
   </div>
  </header>
  <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-7 sm:px-7">
   <section className="rounded-2xl bg-[#173a56] px-5 py-7 text-white sm:px-8">
    <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#afd9ec]">THƯ VIỆN / NHÂN SỰ ĐẠI HỘI</p>
    <h1 className="mt-3 text-[clamp(23px,4vw,33px)] font-extrabold leading-[1.2]">{congress.name}</h1>
    {congress.term&&<p className="mt-2 text-sm text-[#bed6e5]">Nhiệm kỳ {congress.term}</p>}
    <p className="mt-3 text-xs leading-6 text-[#d3e4ed]">Quyền khách chỉ xem tài liệu đã công bố và hồ sơ ứng viên BCH. Để điểm danh hoặc xem ghế của mình, hãy đăng nhập bằng tài khoản đại biểu khách mời được BTC cấp.</p>
   </section>
   <nav aria-label="Nội dung dành cho khách" className="my-6 grid grid-cols-2 gap-2 rounded-xl border border-[#d7e5ed] bg-white p-1.5">
    <button onClick={()=>setTab("documents")} aria-current={tab==="documents"?"page":undefined}
     className={"flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold sm:text-sm "+
      (tab==="documents"?"bg-[#e4f3f9] text-[#116d97]":"text-[#577b91] hover:bg-[#f3f7fa]")}>
     <BookOpen size={18}/> Tài liệu ({docs.length})</button>
    <button onClick={()=>setTab("bch")} aria-current={tab==="bch"?"page":undefined}
     className={"flex min-h-12 items-center justify-center gap-2 rounded-lg px-2 text-xs font-bold sm:text-sm "+
      (tab==="bch"?"bg-[#e4f3f9] text-[#116d97]":"text-[#577b91] hover:bg-[#f3f7fa]")}>
     <Users size={18}/> Ứng viên BCH ({candidates.length})</button>
   </nav>
   {tab==="documents"?<DelegateDocumentsList docs={docs}
    congresses={[{id:congress.id,name:congress.name}]} initialCongressId={congress.id}/>:
    candidates.length?<DelegateBchCarousel items={candidates} initialCongressId={congress.id}/>:
    <div className="rounded-xl border border-[#d7e5ed] bg-white p-10 text-center text-sm text-[#637f91]">Ban Tổ chức chưa công bố danh sách nhân sự BCH.</div>}
   <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-[#7891a2]"><KeyRound size={14}/> Mã khách chỉ cấp quyền xem và có thể bị BTC thu hồi bất kỳ lúc nào.</p>
  </div>
 </main>;
}
