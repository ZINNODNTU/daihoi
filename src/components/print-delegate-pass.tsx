"use client";

import {useState} from "react";
import Link from "next/link";
import {ArrowLeft,Printer} from "lucide-react";
import {DelegatePass} from "@/components/my-delegate-cards";
import type {PortalDelegate} from "@/lib/delegate-portal";

/** Print only one authenticated delegate pass; no portal shell or dashboard UI. */
export function PrintDelegatePass({item}:{item:PortalDelegate}){
 const [preparing,setPreparing]=useState(false);
 async function printOnePass(){
  if(preparing)return;
  setPreparing(true);
  try{
   // Fonts, authenticated portrait and JS-generated Code128 barcode must settle
   // before print preview captures the page.
   await Promise.race([document.fonts.ready,new Promise<void>(resolve=>setTimeout(resolve,3500))]);
   const card=document.getElementById("print-delegate-card");
   const images=[...(card?.querySelectorAll("img")||[])];
   await Promise.all(images.map(img=>img.complete?Promise.resolve():
    new Promise<void>(resolve=>{
     const done=()=>resolve();
     img.addEventListener("load",done,{once:true});
     img.addEventListener("error",done,{once:true});
     setTimeout(done,3500);
    })));
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   window.print();
  }finally{setPreparing(false);}
 }
 return <main className="delegate-pass-print-page min-h-dvh bg-[#eef3f6] px-3 py-6 sm:px-6 sm:py-10">
  <div className="mx-auto max-w-[550px]">
   <div className="mb-6 rounded-xl border border-[#d3e0e7] bg-white px-4 py-4 shadow-sm print:hidden sm:px-5">
    <p className="text-[11px] font-bold uppercase tracking-[.09em] text-[#557b90]">BẢN IN THẺ ĐẠI BIỂU</p>
    <h1 className="mt-1 text-[19px] font-bold leading-6 text-[#193e55]">In một thẻ đại biểu</h1>
    <p className="mt-1 text-[12px] leading-5 text-[#6d8595]">Trang in chỉ gồm thẻ của {item.fullName}. Không in menu, bảng điều khiển hay nội dung khác.</p>
    <div className="mt-4 flex flex-wrap gap-2.5">
     <button type="button" onClick={()=>void printOnePass()} disabled={preparing}
      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#166c97] px-4 text-[12px] font-bold text-white hover:bg-[#0e597f] disabled:opacity-60">
      <Printer size={17}/>{preparing?"Đang chuẩn bị thẻ...":"In thẻ này"}
     </button>
     <Link href="/my-card" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#cddce4] bg-white px-4 text-[12px] font-bold text-[#37627b]">
      <ArrowLeft size={16}/> Về trang thẻ
     </Link>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-[#718697]">Khổ A4 dọc, một thẻ mỗi trang. Hãy bật “In nền” trong hộp thoại trình duyệt để giữ màu nhận diện Đoàn – Hội.</p>
   </div>
   <div id="print-delegate-card" className="mx-auto w-full max-w-[386px]">
    <DelegatePass item={item} priority/>
   </div>
  </div>
 </main>;
}
