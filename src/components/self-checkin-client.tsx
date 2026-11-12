"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {BrandMark,type CongressKind} from "@/components/brand-mark";
import {delegateTheme} from "@/lib/delegate-brand-theme";
import {CheckCircle2,Clock3,IdCard,LoaderCircle,ShieldCheck,UserRound} from "lucide-react";

type Result={ok:true;already?:boolean;sessionName:string;
 delegate:{id:string;code:string;full_name:string;unit:string};checkin?:{checked_in_at:string}};
type Props={sessionId:string;token:string;sessionName:string;congressName:string;kind:CongressKind;
 delegate:{id:string;code:string;full_name:string;unit:string;photo_path:string|null}};
type State="processing"|"done"|"failed";
export function SelfCheckinClient({sessionId,token,sessionName,congressName,kind,delegate}:Props){
 const theme=delegateTheme(kind);
 const [photoFailed,setPhotoFailed]=useState(false);
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
 return <main className="min-h-dvh bg-[#f5f8fb] px-3 pb-[max(30px,env(safe-area-inset-bottom))] pt-7 sm:px-5 sm:py-14">
  <div className="mx-auto w-full max-w-[535px]">
   <div className={"overflow-hidden rounded-[26px] border bg-white shadow-[0_22px_65px_rgba(28,62,87,.1)] "+theme.border}>
    <div className={"relative border-b px-5 pb-6 pt-7 sm:px-8 "+theme.header+" "+theme.border}>
     <div aria-hidden="true" className={"absolute inset-x-0 top-0 h-[5px] "+theme.stripe}/>
     <div className="flex items-center gap-3">
      <BrandMark kind={kind} className="!h-[58px] !w-[58px] !shrink-0 !rounded-[16px] !border-white !bg-white !p-2 !shadow-md"/>
      <div className="min-w-0">
       <p className={"text-[10px] font-extrabold uppercase tracking-[.13em] "+theme.eyebrow}>CỔNG ĐẠI BIỂU · ĐIỂM DANH</p>
       <h1 className="mt-1 break-words text-[19px] font-extrabold leading-[1.3] tracking-[-.02em] text-[#223e52]">{sessionName}</h1>
      </div>
     </div>
     <p className="mt-4 text-[12px] font-semibold leading-5 text-[#637d90]">{congressName}</p>
    </div>
    <div className="p-5 sm:p-8">
     <div className={"flex items-center gap-4 rounded-[17px] border p-3.5 "+theme.border+" "+theme.tint}>
      {delegate.photo_path&&!photoFailed?<Image unoptimized
       src={"/api/delegates/"+delegate.id+"/photo?w=96"} width={72} height={96}
       onError={()=>setPhotoFailed(true)}
       alt={"Ảnh "+delegate.full_name} className="h-24 w-[72px] shrink-0 rounded-[10px] border border-white object-cover"/>:
       <div className="flex h-24 w-[72px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[#91a9b7]"><UserRound size={34}/></div>}
      <div className="min-w-0">
       <p className={"text-[10px] font-extrabold uppercase tracking-[.08em] "+theme.eyebrow}>TÀI KHOẢN ĐẠI BIỂU</p>
       <h2 className="mt-1 break-words text-[17px] font-extrabold leading-6 text-[#243e52]">{delegate.full_name}</h2>
       <p className="mt-1 break-words text-[12px] leading-5 text-[#617f92]">{delegate.unit||"Chưa cập nhật đơn vị"}</p>
      </div>
     </div>
     <div aria-live="polite" className="mt-7 text-center">
      {state==="processing"?<>
       <div className={"mx-auto flex h-[86px] w-[86px] items-center justify-center rounded-full "+theme.soft+" "+theme.accent}>
        <LoaderCircle size={38} className="animate-spin"/>
       </div>
       <h3 className="mt-5 text-[20px] font-extrabold text-[#294558]">Đang xác nhận điểm danh</h3>
       <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-6 text-[#718998]">Hệ thống đang kiểm tra phiên, xác thực danh tính và lưu lượt tham dự.</p>
      </>:state==="done"?<>
       <div className="mx-auto flex h-[90px] w-[90px] items-center justify-center rounded-full border-[6px] border-[#e7f6ed] bg-[#d8f4e4] text-[#148254]">
        <CheckCircle2 size={46} strokeWidth={1.8}/>
       </div>
       <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#479471]">XÁC NHẬN HOÀN TẤT</p>
       <h3 className="mt-2 text-[clamp(21px,5vw,25px)] font-extrabold text-[#136b4d]">
        {data?.already?"Bạn đã điểm danh trước đó":"Điểm danh thành công!"}
       </h3>
       <p className="mx-auto mt-2 max-w-[340px] text-[13px] leading-6 text-[#668292]">
        {data?.already?"Lượt điểm danh của bạn đã được ghi nhận trong phiên này.":"Ban Tổ chức đã nhận được lượt điểm danh của bạn."}
       </p>
       {data?.checkin?.checked_in_at&&<p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#f1f8f5] px-3 py-2 text-[12px] font-semibold text-[#38755b]">
        <Clock3 size={16}/>{new Date(data.checkin.checked_in_at).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}
       </p>}
      </>:<>
       <div className="mx-auto flex h-[80px] w-[80px] items-center justify-center rounded-full bg-[#fff3e1] text-[#ad742c]"><IdCard size={37}/></div>
       <h3 className="mt-4 text-[20px] font-extrabold text-[#8c5b2a]">Chưa ghi nhận điểm danh</h3>
       <p role="alert" className="mt-4 rounded-xl border border-[#f1ddc5] bg-[#fff9f1] p-3.5 text-[13px] leading-6 text-[#8e5728]">{error}</p>
       <p className="mt-3 text-[12px] leading-5 text-[#778fa0]">QR của phiên chỉ có hiệu lực trong thời gian Ban Tổ chức mở điểm danh.</p>
       <button type="button" onClick={()=>void submit()} className={"mt-4 inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-[13px] font-extrabold "+theme.cta}>Thử lại</button>
      </>}
     </div>
     <Link href="/my-card" className={"mt-8 flex min-h-[51px] w-full items-center justify-center gap-2 rounded-xl border px-5 text-[13px] font-extrabold "+theme.secondary}>
      <ShieldCheck size={18}/> Trở về thẻ đại biểu
     </Link>
    </div>
   </div>
   <p className="mx-auto mt-5 max-w-[440px] text-center text-[11px] leading-6 text-[#7d94a2]">Mã QR chỉ có hiệu lực trong khung giờ của phiên. Mỗi đại biểu được ghi nhận một lượt cho mỗi phiên.</p>
  </div>
 </main>;
}