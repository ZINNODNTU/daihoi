"use client";
import {useCallback,useEffect,useRef,useState,type ChangeEvent} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Camera,CameraOff,CheckCircle2,ClipboardPaste,ImagePlus,LoaderCircle,RefreshCw,ShieldCheck,ScanLine,AlertCircle} from "lucide-react";
import {parseSessionCheckinCode,type ParsedSessionCode} from "@/lib/delegate-session-scanner";
import {startTrackedScanner,trackedBoxStyle} from "@/lib/fast-qr-camera";
import type {CongressKind} from "@/components/brand-mark";
import {delegateTheme} from "@/lib/delegate-brand-theme";

type Result={ok:true;already?:boolean;sessionName:string;delegate:{full_name:string};checkin?:{checked_in_at:string}};
export function DelegateCheckinScanner({kind="doan"}:{kind?:CongressKind}){
 const theme=delegateTheme(kind);
 const router=useRouter();
 const [camera,setCamera]=useState(false);
 const [tracked,setTracked]=useState<ReturnType<typeof trackedBoxStyle>|null>(null);
 const [devices,setDevices]=useState<{deviceId:string;label:string}[]>([]);
 const [selectedCamera,setSelectedCamera]=useState("");
 const [listingCameras,setListingCameras]=useState(false);
 const [submitting,setSubmitting]=useState(false);
 const [link,setLink]=useState("");
 const [result,setResult]=useState<Result|null>(null);
 const [error,setError]=useState("");
 const [cameraError,setCameraError]=useState("");
 const [decodingPhoto,setDecodingPhoto]=useState(false);
 const videoRef=useRef<HTMLVideoElement>(null);
 const controlsRef=useRef<{stop():void}|null>(null);
 const locked=useRef(false);
 const busyRef=useRef(false);
 const captureRef=useRef<HTMLInputElement>(null);

 function stopCamera(){
  controlsRef.current?.stop();
  controlsRef.current=null;
  setCamera(false);setTracked(null);
 }
 async function checkin(scanned:ParsedSessionCode){
  if(busyRef.current)return;
  busyRef.current=true;locked.current=true;
  stopCamera();setSubmitting(true);setResult(null);setError("");setCameraError("");
  try{
   const response=await fetch("/api/attendance/self-checkin",{
    method:"POST",headers:{"Content-Type":"application/json"},
    credentials:"same-origin",cache:"no-store",
    body:JSON.stringify({sessionId:scanned.sessionId,token:scanned.token})
   });
   const json=await response.json();
   if(!response.ok)throw new Error(json.error||"Không ghi nhận được lượt điểm danh.");
   setResult(json as Result);
   setLink("");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Không thể điểm danh.");}
  finally{busyRef.current=false;setSubmitting(false);locked.current=false;}
 }
 function receive(value:string){
  const code=parseSessionCheckinCode(value);
  if(!code){setError("Đây không phải mã QR điểm danh của phiên. Hãy quét QR do Ban Tổ chức chiếu tại hội trường.");return;}
  void checkin(code);
 }
 async function scanCapturedPhoto(event:ChangeEvent<HTMLInputElement>){
  const file=event.currentTarget.files?.[0];
  if(!file)return;
  stopCamera();setError("");setCameraError("");
  if(!file.type.startsWith("image/")||file.size>10*1024*1024){
   setCameraError("Ảnh không hợp lệ hoặc lớn hơn 10 MB.");event.currentTarget.value="";return;
  }
  setDecodingPhoto(true);
  const photoUrl=URL.createObjectURL(file);
  try{
   const {BrowserQRCodeReader}=await import("@zxing/browser");
   const reader=new BrowserQRCodeReader();
   const decoded=await reader.decodeFromImageUrl(photoUrl);
   receive(decoded.getText());
  }catch{setCameraError("Không đọc được mã QR trong ảnh. Hãy chụp lại để mã rõ nét và đủ sáng.");}
  finally{URL.revokeObjectURL(photoUrl);setDecodingPhoto(false);
   if(captureRef.current)captureRef.current.value="";}
 }
 const refreshCameras=useCallback(async()=>{
  if(!navigator.mediaDevices?.enumerateDevices)return;
  setListingCameras(true);
  try{
   const {BrowserQRCodeReader}=await import("@zxing/browser");
   const inputs=await BrowserQRCodeReader.listVideoInputDevices();
   setDevices(inputs.filter(d=>d.deviceId).map((d,i)=>({
    deviceId:d.deviceId,label:d.label||"Camera "+(i+1)
   })));
  }catch{setCameraError("Trình duyệt chưa cho phép liệt kê camera. Kiểm tra quyền camera.");}
  finally{setListingCameras(false);}
 },[]);
 const openCamera=useCallback(()=>{
  setError("");setCameraError("");setResult(null);
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){
   setCameraError("Trình duyệt chỉ cho phép quét camera qua HTTPS (hoặc localhost trên cùng thiết bị). Nếu đang dùng HTTP qua Wi-Fi nội bộ, hãy mở bản HTTPS hoặc quét bằng ứng dụng Camera của điện thoại.");
   return;
  }
  locked.current=false;
  setTracked(null);setCamera(true);
  void refreshCameras();
 },[refreshCameras]);
 useEffect(()=>{
  const request=()=>openCamera();
  window.addEventListener("delegate:scan-now",request);
  return()=>window.removeEventListener("delegate:scan-now",request);
 },[openCamera]);
 useEffect(()=>{
  if(!camera)return;
  let cancelled=false;
  async function run(){
   try{
    const video=videoRef.current;
    if(!video)throw new Error("Không tìm thấy vùng xem camera.");
    const controls=await startTrackedScanner({
     video,deviceId:selectedCamera,onTrack:box=>setTracked(box?trackedBoxStyle(box,videoRef.current):null),
     onResult:value=>{
      if(locked.current)return;
      const code=parseSessionCheckinCode(value);
      if(!code){setError("QR không hợp lệ. Hướng camera vào mã điểm danh của phiên.");return;}
      locked.current=true;
      void checkin(code);
     }
    });
    if(cancelled){controls.stop();return;}
    controlsRef.current=controls;
    // Labels are populated by browsers only after camera permission is granted.
    void refreshCameras();
   }catch(e){
    if(cancelled)return;
    setCamera(false);
    setCameraError("Không mở được camera. Hãy kiểm tra quyền truy cập camera, chọn camera sau hoặc sử dụng HTTPS.");
    console.info("delegate camera unavailable",e instanceof Error?e.name:"camera-error");
   }
  }
  void run();
  return()=>{cancelled=true;controlsRef.current?.stop();controlsRef.current=null;};
 // checkin is intentionally invoked after one decoded result; scan lock prevents duplicates.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[camera,selectedCamera,refreshCameras]);
 return <section id="diem-danh" className="scroll-mt-28 overflow-hidden rounded-[23px] border border-[#d9e7ed] bg-white shadow-[0_12px_40px_rgba(26,64,91,.075)] print:hidden">
  <div className={"relative overflow-hidden border-b px-5 pb-5 pt-6 sm:px-7 sm:pb-6 "+theme.header+" "+theme.border}>
   <span aria-hidden="true" className={"absolute inset-x-0 top-0 h-[4px] "+theme.stripe}/>
   <div className="flex items-start gap-3.5">
    <span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-white/90 shadow-sm "+theme.soft+" "+theme.accent}><ScanLine size={25}/></span>
    <div className="min-w-0">
     <p className={"text-[10px] font-extrabold uppercase tracking-[.14em] "+theme.eyebrow}>QUÉT MÃ QR CỦA PHIÊN</p>
     <h2 className="mt-1 text-[clamp(19px,4.3vw,25px)] font-extrabold leading-[1.3] tracking-[-.025em] text-[#203e53]">Sẵn sàng điểm danh</h2>
     <p className="mt-1.5 max-w-[450px] text-[12px] leading-5 text-[#667e91]">Hướng camera về mã QR được Ban Tổ chức chiếu tại hội trường. Hệ thống tự xác nhận bằng tài khoản của bạn.</p>
    </div>
   </div>
  </div>
  <div className="space-y-4 p-4 sm:p-6">
   {result&&<div role="status" aria-live="polite" className="rounded-2xl border border-[#bee5cd] bg-[#eaf8ef] px-4 py-5 text-[#196749]">
    <div className="flex items-start gap-3">
     <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#249361]"><CheckCircle2 size={25}/></span>
     <div className="min-w-0">
      <p className="text-[16px] font-extrabold leading-6">{result.already?"Bạn đã điểm danh phiên này":"Điểm danh thành công!"}</p>
      <p className="mt-1 text-[12px] font-semibold leading-5">{result.delegate.full_name}</p>
      <p className="mt-0.5 text-[12px] leading-5">{result.sessionName}</p>
      <p className="mt-1 text-[11px] leading-5">Lượt tham dự đã được ghi nhận.</p>
     </div>
    </div>
    <Link href="/my-card/history" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#a9dcc0] bg-white px-4 text-[12px] font-extrabold text-[#19714e] sm:w-auto">Xem lịch sử điểm danh <CheckCircle2 size={16}/></Link>
   </div>}
   {error&&<p role="alert" className="flex items-start gap-2 rounded-xl border border-[#f0d8bc] bg-[#fff8ed] px-4 py-3 text-[12px] leading-6 text-[#945c26]"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</p>}
   {cameraError&&<p role="alert" className="flex items-start gap-2 rounded-xl border border-[#f0d8bc] bg-[#fff8ed] px-4 py-3 text-[12px] leading-6 text-[#945c26]"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{cameraError}</p>}
   {camera?<div className="relative mx-auto overflow-hidden rounded-[18px] border-[5px] border-[#ecf3f6] bg-[#0d2534] shadow-[0_12px_32px_rgba(10,43,62,.18)]">
    <video ref={videoRef} autoPlay muted playsInline aria-label="Camera quét mã QR điểm danh" className="aspect-[4/3] w-full max-h-[54dvh] bg-[#0d2534] object-cover sm:max-h-[59dvh]"/>
    <div aria-hidden="true" className="pointer-events-none absolute inset-[15%] rounded-[20px] border-[3px] border-white/85 shadow-[0_0_0_100px_rgba(7,24,35,.32)]"/>
    {tracked&&<div aria-hidden="true" className="pointer-events-none absolute rounded-lg border-[3px] border-[#63f4a4] bg-[#63f4a4]/10 shadow-[0_0_22px_#63f4a455]" style={tracked}/>}
    <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#092a3b] to-transparent px-3 pb-4 pt-12 text-center text-[12px] font-bold text-white">Căn mã QR vào giữa khung hình</p>
   </div>:!result&&<div className={"relative flex min-h-[128px] flex-col items-center justify-center gap-2 overflow-hidden rounded-[16px] border border-dashed px-4 py-5 "+theme.border+" "+theme.tint}>
    <span className={"flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm "+theme.accent}><ScanLine size={26}/></span>
    <p className="text-[12px] font-extrabold text-[#4b6c80]">Đưa mã QR của phiên vào vùng quét</p>
    <p className="text-center text-[11px] leading-5 text-[#8198a7]">Đảm bảo đủ sáng, giữ điện thoại ổn định.</p>
   </div>}
   <button type="button" disabled={submitting||decodingPhoto} onClick={()=>camera?stopCamera():openCamera()}
    className={"inline-flex min-h-[58px] w-full items-center justify-center gap-3 rounded-[14px] px-4 text-[14px] font-extrabold shadow-[0_8px_18px_rgba(29,64,86,.1)] transition-transform active:scale-[.99] focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-55 "+(camera?"border border-[#d6e5ed] bg-[#f4f8fa] text-[#345a70]":theme.cta)}>
    {submitting?<LoaderCircle size={21} className="animate-spin"/>:camera?<CameraOff size={22}/>:<Camera size={22}/>}
    {submitting?"Đang xác nhận điểm danh...":camera?"Dừng quét camera":"Mở camera quét QR"}
   </button>
   <div className="grid gap-2.5 sm:grid-cols-2">
    <div>
     <input ref={captureRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Chụp ảnh hoặc chọn ảnh QR điểm danh" onChange={e=>void scanCapturedPhoto(e)}/>
     <button type="button" disabled={decodingPhoto||submitting} onClick={()=>captureRef.current?.click()}
      className={"inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-3 text-[12px] font-bold transition disabled:opacity-55 "+theme.secondary}>
      {decodingPhoto?<LoaderCircle size={17} className="animate-spin"/>:<ImagePlus size={18}/>}
      {decodingPhoto?"Đang đọc QR...":"Quét từ ảnh đã chụp"}
     </button>
    </div>
    <Link href="/my-card/history" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dce6eb] bg-[#f8fbfc] px-3 text-[12px] font-bold text-[#516e83] hover:bg-[#eef5f9]"><CheckCircle2 size={18}/> Lịch sử tham dự</Link>
   </div>
   <details className="mb-4 rounded-xl border border-[#dfeaf0] bg-[#fbfcfe]">
    <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-[12px] font-bold text-[#476b80]"><Camera size={17}/> Tùy chọn camera (nếu cần)</summary>
    <div className="flex flex-wrap items-end gap-2 border-t border-[#e3edf1] p-3 sm:p-4">
     <div className="min-w-0 flex-1">
      <label htmlFor="delegate-camera-select" className="flex items-center gap-2 text-[12px] font-extrabold text-[#335d6e]"><Camera size={16}/> Chọn camera điểm danh</label>
      <select id="delegate-camera-select" value={selectedCamera} disabled={submitting||listingCameras} onChange={e=>{setError("");setSelectedCamera(e.target.value);}} className="field mt-2 !min-h-[46px] w-full !rounded-lg">
       <option value="">Camera sau (tự động)</option>
       {devices.map((device,index)=><option key={device.deviceId} value={device.deviceId}>{device.label||"Camera "+(index+1)}</option>)}
      </select>
     </div>
     <button type="button" onClick={()=>void refreshCameras()} disabled={listingCameras} aria-label="Làm mới danh sách camera" title="Làm mới danh sách camera" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg border border-[#cbdfe4] bg-white text-[#397383] disabled:opacity-50">
      <RefreshCw size={18} className={listingCameras?"animate-spin":""}/>
     </button>
     {!devices.length&&<p className="w-full text-[11px] leading-5 text-[#839dab]">Mở camera và cấp quyền truy cập để hiển thị các camera khả dụng.</p>}
    </div>
   </details>
   <div className="border-t border-[#e6eef2] pt-4">
    <label htmlFor="delegate-qr-link" className="flex items-center gap-2 text-[12px] font-bold text-[#496a7d]"><ClipboardPaste size={16}/> Hoặc dán liên kết QR của phiên</label>
    <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();receive(link);}}>
     <input id="delegate-qr-link" value={link} onChange={e=>setLink(e.target.value)} type="url" inputMode="url" autoComplete="off" className="field min-h-[48px] min-w-0 flex-1" placeholder="https://.../checkin/s/..."/>
     <button type="submit" disabled={submitting||!link.trim()} className={"inline-flex min-h-12 items-center justify-center rounded-xl border px-5 text-[12px] font-bold disabled:opacity-55 "+theme.secondary}>Xác nhận</button>
    </form>
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-[#7590a1]"><ShieldCheck size={16} className="mt-0.5 shrink-0"/> Camera chỉ nhận dạng QR trên thiết bị. Barcode trên thẻ dành cho BTC hỗ trợ, không dùng để tự điểm danh.</p>
   </div>
  </div>
 </section>;
}