"use client";
import {useState} from "react";
import {ShieldAlert,ArrowLeft} from "lucide-react";

export default function ActingExpired(){
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 async function recover(){
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/admin/impersonation/stop",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"X-Daihoi-Acting":"stop"}
   });
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Không thể khôi phục phiên Admin.");
   window.location.replace(data.destination||"/dashboard");
  }catch(e){setError(e instanceof Error?e.message:"Có lỗi xác thực.");setBusy(false);}
 }
 return <main className="flex min-h-dvh items-center justify-center bg-[#edf3f6] p-6">
  <section className="w-full max-w-lg rounded-2xl border border-[#d8e3e9] bg-white p-8 text-center shadow-sm">
   <ShieldAlert size={38} className="mx-auto text-[#b3823c]"/>
   <h1 className="mt-5 text-2xl font-extrabold text-[#24485d]">Phiên đóng vai đã kết thúc</h1>
   <p className="mt-3 text-[13px] leading-7 text-[#728996]">
    Giới hạn phiên đã hết hoặc thông tin bảo vệ không còn hợp lệ.
    Các thao tác ghi đã tạm khóa. Hãy quay lại tài khoản Admin để tiếp tục.
   </p>
   {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
   <button onClick={()=>void recover()} disabled={busy}
    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#176f92] px-5 text-sm font-bold text-white disabled:opacity-50">
    <ArrowLeft size={17}/>{busy?"Đang khôi phục...":"Trở về Admin"}
   </button>
   <a href="/login" className="mt-4 block text-[12px] font-semibold text-[#527d91]">Đăng nhập lại nếu phiên Admin không còn hiệu lực</a>
  </section>
 </main>;
}
