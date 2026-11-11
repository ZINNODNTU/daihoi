"use client";
import {useEffect} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {AlertTriangle,ArrowLeft,RefreshCcw} from "lucide-react";

export function AdminErrorBoundary({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 const path=usePathname();
 useEffect(()=>{
  // React boundaries capture render exceptions that window.onerror may miss.
  // Only send an allowlisted diagnostic name and route, never the raw message.
  if(!path.startsWith("/dashboard")&&!path.startsWith("/congresses/"))return;
  void fetch("/api/system-logs/report",{
   method:"POST",credentials:"same-origin",keepalive:true,
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    event:"frontend.react_boundary",route:path,
    errorName:/^[A-Za-z]{1,40}$/.test(error.name)?error.name:"Error"
   })
  }).catch(()=>{});
 },[error,path]);
 return <div className="mx-auto flex min-h-[55vh] max-w-2xl flex-col items-center justify-center px-5 py-12 text-center">
  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
   <AlertTriangle size={28}/>
  </div>
  <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#233e55]">Không thể hiển thị nội dung</h1>
  <p className="mt-3 max-w-lg text-[13px] leading-7 text-[#60758a]">
   Một phần giao diện quản trị gặp sự cố. Hệ thống đã gửi thông tin lỗi kỹ thuật đã ẩn dữ liệu nhạy cảm để phục vụ kiểm tra.
   Nếu lỗi vẫn xảy ra, hãy liên hệ quản trị viên.
  </p>
  <div className="mt-6 flex flex-wrap justify-center gap-3">
   <button type="button" onClick={reset} className="btn btn-primary min-h-11">
    <RefreshCcw size={16}/> Thử lại
   </button>
   <Link href="/dashboard" className="btn btn-secondary min-h-11">
    <ArrowLeft size={16}/> Bảng điều hành
   </Link>
  </div>
 </div>;
}
