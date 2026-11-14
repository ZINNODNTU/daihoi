"use client";
import {useState} from "react";
import {LogIn,LoaderCircle} from "lucide-react";

export function ImpersonateAccountButton({userId,congressId,name}:{
 userId:string;congressId:string;name:string
}){
 const [working,setWorking]=useState(false);
 const [error,setError]=useState("");
 async function enter(){
  if(working)return;
  if(!window.confirm("Đóng vai tài khoản "+name+"?\n\nBạn sẽ ĐĂNG NHẬP vào phiên của tài khoản này để thao tác thực tế: thêm, sửa, xóa và điểm danh đều có hiệu lực theo quyền của tài khoản đích. Hệ thống ghi lại Admin khởi tạo phiên. Bạn có thể thoát đóng vai bằng thanh thông báo phía trên."))return;
  setWorking(true);setError("");
  try{
   const res=await fetch("/api/admin/impersonation/start",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","X-Daihoi-Acting":"start"},
    body:JSON.stringify({userId,congressId})
   });
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Không thể đóng vai tài khoản.");
   window.location.assign(body.destination);
  }catch(e){
   setError(e instanceof Error?e.message:"Không thể khởi tạo phiên.");
   setWorking(false);
  }
 }
 return <div className="flex flex-col items-end gap-2">
  <button type="button" onClick={()=>void enter()} disabled={working}
   className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#166b8f] px-4 text-[12px] font-bold text-white hover:bg-[#145b7c] disabled:cursor-wait disabled:opacity-60">
   {working?<LoaderCircle size={16} className="animate-spin"/>:<LogIn size={16}/>}
   {working?"Đang chuyển tài khoản...":"Đóng vai tài khoản"}
  </button>
  {error&&<p role="alert" className="max-w-72 text-right text-[11px] leading-5 text-red-700">{error}</p>}
 </div>;
}
