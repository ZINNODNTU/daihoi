"use client";
import {useState} from "react";
import {ArrowLeft,ShieldAlert,LoaderCircle} from "lucide-react";

export function ActingBanner({name}:{name:string}){
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 async function stop(){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/admin/impersonation/stop",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"X-Daihoi-Acting":"stop"}
   });
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Không khôi phục được tài khoản Admin.");
   window.location.replace(data.destination||"/dashboard");
  }catch(e){setError(e instanceof Error?e.message:"Không thể thoát đóng vai.");setBusy(false);}
 }

 return <div role="status" className="sticky top-0 z-[90] border-b border-[#e5b765] bg-[#fff1cf] px-3 py-2.5 shadow-sm sm:px-6">
  <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
   <div className="flex min-w-0 items-center gap-3 text-[#6b461a]">
    <ShieldAlert size={20} className="shrink-0"/>
    <div className="min-w-0">
     <p className="text-[12px] font-extrabold">ĐANG ĐÓNG VAI TÀI KHOẢN: {name}</p>
     <p className="mt-0.5 text-[11px]">Các thao tác sẽ được lưu theo tài khoản này và ghi nhật ký Admin thực hiện · Phiên được giới hạn tối đa 30 phút.</p>
    </div>
   </div>
   <div className="flex flex-wrap items-center gap-2">
    {error&&<span role="alert" className="text-[11px] font-medium text-red-700">{error}</span>}
    <button type="button" onClick={()=>void stop()} disabled={busy}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#795025] px-4 text-[12px] font-bold text-white disabled:opacity-60">
     {busy?<LoaderCircle size={16} className="animate-spin"/>:<ArrowLeft size={16}/>}
     {busy?"Đang khôi phục...":"Thoát đóng vai"}
    </button>
   </div>
  </div>
 </div>;
}
