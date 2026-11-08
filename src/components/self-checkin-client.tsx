"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {CheckCircle2,Clock3,IdCard,LoaderCircle,ShieldCheck,UserRound} from "lucide-react";

type Result={ok:true;already?:boolean;sessionName:string;
 delegate:{id:string;code:string;full_name:string;unit:string};checkin?:{checked_in_at:string}};
type Props={sessionId:string;token:string;sessionName:string;congressName:string;
 delegate:{id:string;code:string;full_name:string;unit:string;photo_path:string|null}};
type State="processing"|"done"|"failed";
export function SelfCheckinClient({sessionId,token,sessionName,congressName,delegate}:Props){
 const [state,setState]=useState<State>("processing");
 const [data,setData]=useState<Result|null>(null);
 const [error,setError]=useState("");
 const inFlight=useRef(false);
 async function submit(){
  if(inFlight.current)return;
  inFlight.current=true;setState("processing");setError("");
  try{
   const response=await fetch("/api/attendance/self-checkin",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({sessionId,token})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Điểm danh chưa thành công.");
   setData(result as Result);setState("done");
  }catch(e){
   setError(e instanceof Error?e.message:"Không thể điểm danh.");
   setState("failed");
  }finally{inFlight.current=false;}
 }
 useEffect(()=>{
  // Only a signed-in, verified delegate ever reaches this component.
  // Ref also guards React Strict Mode from duplicate requests in development.
  queueMicrotask(()=>void submit());
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[sessionId,token]);
 return <main className="min-h-dvh bg-[#eef4f7] px-4 py-8 sm:py-14">
  <div className="mx-auto max-w-[485px] overflow-hidden rounded-2xl border border-[#dbe7ed] bg-white shadow-[0_25px_70px_rgba(15,53,78,.1)]">
   <div className="bg-[#0c405b] px-6 py-6 text-white sm:px-8">
    <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#b5e3e9]">ĐẠI HỘI SỐ · ĐIỂM DANH ĐẠI BIỂU</p>
    <h1 className="mt-3 text-[22px] font-extrabold tracking-[-.035em]">{sessionName}</h1>
    <p className="mt-1 text-[12px] leading-5 text-[#c7dce8]">{congressName}</p>
   </div>
   <div className="p-5 sm:p-8">
    <div className="flex items-center gap-4 rounded-xl bg-[#f2f7fa] p-3.5">
     {delegate.photo_path?<Image unoptimized
      src={"/api/delegates/"+delegate.id+"/photo?w=96"} width={72} height={96}
      alt={"Ảnh "+delegate.full_name} className="h-24 w-[72px] rounded-lg object-cover"/>:
      <div className="flex h-24 w-[72px] shrink-0 items-center justify-center rounded-lg bg-white text-[#96abba]"><UserRound size={34}/></div>}
     <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#64899c]">Xác thực bằng tài khoản đại biểu</p>
      <h2 className="mt-1 text-lg font-extrabold text-[#203f52]">{delegate.full_name}</h2>
      <p className="mt-1 break-words text-xs leading-5 text-[#5d7a8f]">{delegate.unit||"Chưa cập nhật đơn vị"}</p>

     </div>
    </div>
    <div aria-live="polite" className="mt-7 text-center">
     {state==="processing"?<>
      <LoaderCircle size={48} className="mx-auto animate-spin text-[#008cbb]"/>
      <h3 className="mt-4 text-lg font-extrabold text-[#24485c]">Đang xác nhận điểm danh</h3>
      <p className="mt-2 text-sm text-[#708b9b]">Hệ thống đang kiểm tra phiên, danh tính và ghi nhận lượt tham dự.</p>
     </>:state==="done"?<>
      <CheckCircle2 size={58} className="mx-auto text-[#15a372]"/>
      <h3 className="mt-3 text-[22px] font-extrabold text-[#167b55]">
       {data?.already?"Bạn đã điểm danh trước đó":"Điểm danh thành công"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#627f8e]">
       {data?.already?"Lượt điểm danh của bạn đã được ghi nhận trong phiên này.":
        "Ban Tổ chức đã nhận được lượt điểm danh của bạn."}
      </p>
      {data?.checkin?.checked_in_at&&<p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[#65899a]">
       <Clock3 size={14}/>{new Date(data.checkin.checked_in_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}
      </p>}
     </>:<>
      <IdCard size={46} className="mx-auto text-[#c58a43]"/>
      <h3 className="mt-3 text-[19px] font-extrabold text-[#8e5d25]">Chưa ghi nhận được điểm danh</h3>
      <p role="alert" className="mt-3 rounded-xl border border-[#f0dfcd] bg-[#fff8f1] p-3 text-[13px] leading-6 text-[#8d5424]">{error}</p>
      <p className="mt-3 text-xs text-[#7890a0]">Mã QR cố định theo phiên, nhưng chỉ có thể điểm danh trong thời gian phiên được mở.</p>
      <button className="btn btn-secondary mt-4" type="button" onClick={()=>void submit()}>Thử lại</button>
     </>}
    </div>
    <Link href="/my-card" className="btn btn-secondary mt-7 flex w-full items-center justify-center gap-2">
     <ShieldCheck size={17}/> Thẻ đại biểu của tôi
    </Link>
   </div>
  </div>
  <p className="mx-auto mt-5 max-w-[480px] text-center text-xs leading-6 text-[#8294a1]">
   QR chỉ có hiệu lực trong khung giờ của phiên. Mỗi đại biểu chỉ được ghi nhận một lượt điểm danh trong mỗi phiên.
  </p>
 </main>;
}
