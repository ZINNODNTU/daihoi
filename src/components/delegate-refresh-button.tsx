"use client";
import {useRouter} from "next/navigation";
import {RefreshCw} from "lucide-react";
export function DelegateRefreshButton(){
 const router=useRouter();
 return <button type="button" onClick={()=>router.refresh()} aria-label="Cập nhật lịch sử"
  className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border border-[#d5e5e9] bg-white px-3 text-[11px] font-bold text-[#416b7b] hover:bg-[#f4f9fa]">
  <RefreshCw size={15}/> Cập nhật
 </button>;
}
