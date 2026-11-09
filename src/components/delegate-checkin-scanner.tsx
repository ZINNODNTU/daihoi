"use client";
import {useCallback,useEffect,useRef,useState,type ChangeEvent} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Camera,CameraOff,CheckCircle2,ClipboardPaste,ImagePlus,LoaderCircle,RefreshCw,ShieldCheck,ScanLine,AlertCircle} from "lucide-react";
import {parseSessionCheckinCode,type ParsedSessionCode} from "@/lib/delegate-session-scanner";

type Result={ok:true;already?:boolean;sessionName:string;delegate:{full_name:string};checkin?:{checked_in_at:string}};
export function DelegateCheckinScanner(){
 const router=useRouter();
 const [camera,setCamera]=useState(false);
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
  setCamera(false);
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
  setCamera(true);
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
    const {BrowserQRCodeReader}=await import("@zxing/browser");
   const reader=new BrowserQRCodeReader();
    const onDecode=(value:{getText():string}|undefined|null)=>{
     if(!value||locked.current)return;
     const code=parseSessionCheckinCode(value.getText());
     if(!code){
      setError("QR không hợp lệ. Hướng camera vào mã điểm danh của phiên.");
      return;
     }
     locked.current=true;
     void checkin(code);
    };
    const controls=selectedCamera?
     await reader.decodeFromVideoDevice(selectedCamera,video,onDecode):
     await reader.decodeFromConstraints({video:{facingMode:{ideal:"environment"}},audio:false},video,onDecode);
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
 return <section id="diem-danh" className="scroll-mt-28 overflow-hidden rounded-[20px] border border-[#c9e0e5] bg-white shadow-[0_12px_32px_rgba(20,67,83,.055)] print:hidden">
  <div className="border-b border-[#e4edef] bg-[#f5faf9] px-5 py-5 sm:px-7">
   <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.15em] text-[#2e82a7]">
    <ScanLine size={16}/> Điểm danh phiên Đại hội
   </div>
   <h2 className="mt-2 text-[21px] font-extrabold tracking-tight text-[#193f51]">Quét mã để xác nhận tham dự</h2>
   <p className="mt-2 text-[13px] leading-6 text-[#657e8e]">Dùng camera điện thoại quét QR cố định của phiên tại hội trường. Hệ thống tự nhận diện đúng đại biểu từ tài khoản đã đăng nhập.</p>
  </div>
  <div className="p-4 sm:p-6">
   <details className="mb-4 rounded-xl border border-[#d8e8ea] bg-[#f6fafb]">
     <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[12px] font-bold text-[#496e80]">Tùy chọn camera (nếu cần)</summary>
     <div className="flex flex-wrap items-end gap-2 border-t border-[#d8e8ea] p-3 sm:p-4">
    <div className="min-w-0 flex-1">
     <label htmlFor="delegate-camera-select" className="flex items-center gap-2 text-[12px] font-extrabold text-[#335d6e]">
      <Camera size={16}/> Chọn camera điểm danh
     </label>
     <select id="delegate-camera-select" value={selectedCamera} disabled={submitting||listingCameras}
      onChange={e=>{setError("");setSelectedCamera(e.target.value);}}
      className="field mt-2 !min-h-[46px] w-full !rounded-lg">
      <option value="">Camera sau (tự động)</option>
      {devices.map((device,index)=><option key={device.deviceId} value={device.deviceId}>
       {device.label||"Camera "+(index+1)}
      </option>)}
     </select>
    </div>
    <button type="button" onClick={()=>void refreshCameras()} disabled={listingCameras}
     aria-label="Làm mới danh sách camera" title="Làm mới danh sách camera"
     className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-lg border border-[#cbdfe4] bg-white text-[#397383] disabled:opacity-50">
     <RefreshCw size={18} className={listingCameras?"animate-spin":""}/>
    </button>
    {!devices.length&&<p className="w-full text-[11px] leading-5 text-[#839dab]">
     Mở camera và cấp quyền truy cập để hiển thị các camera khả dụng của điện thoại hoặc máy tính.
    </p>}
   </div>
   </details>
    {camera&&<div className="relative mx-auto mb-4 max-w-[560px] overflow-hidden rounded-2xl border border-[#254d60] bg-[#102b3b]">
    <video ref={videoRef} autoPlay muted playsInline aria-label="Camera quét mã QR điểm danh"
     className="aspect-[4/3] w-full max-h-[48dvh] sm:max-h-[60dvh] bg-[#102b3b] object-cover"/>
    <div aria-hidden="true" className="pointer-events-none absolute inset-[13%] rounded-2xl border-2 border-[#e1bf7b]/75 shadow-[0_0_0_100px_rgba(5,27,40,.15)]"/>
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#09293c] to-transparent px-4 pb-4 pt-10 text-center text-xs font-semibold text-white">
     Đưa mã QR của phiên vào khung hình
    </div>
   </div>}
   {result&&<div role="status" className="mb-4 rounded-xl border border-[#c4dfe9] bg-[#edf6fa] px-4 py-4 text-[#176f9a]">
    <p className="flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 size={19}/>{result.already?"Bạn đã điểm danh phiên này":"Điểm danh thành công!"}</p>
    <p className="mt-2 text-xs leading-6">{result.sessionName} · {result.delegate.full_name}</p>
    <p className="mt-1 text-[12px] leading-5">Lượt tham dự đã được lưu.</p>
     <Link href="/my-card/history" className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-[#a5d0e4] bg-white px-4 text-[12px] font-bold text-[#176f9a]">Xem lịch sử điểm danh</Link>
   </div>}
   {error&&<p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#f0ddc8] bg-[#fff8ef] px-4 py-3 text-xs leading-6 text-[#925b25]"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{error}</p>}
   {cameraError&&<p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-[#f0ddc8] bg-[#fff8ef] px-4 py-3 text-xs leading-6 text-[#925b25]"><AlertCircle size={17} className="mt-0.5 shrink-0"/>{cameraError}</p>}
   <button type="button" disabled={submitting}
    onClick={()=>camera?stopCamera():openCamera()}
    className={"inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-xl px-5 text-[14px] font-extrabold transition active:scale-[.99] "+
     (camera?"border border-[#cbdce2] bg-[#f3f7f9] text-[#27566b]":"bg-[#087fae] text-white hover:bg-[#066b93]")}>
    {submitting?<LoaderCircle size={20} className="animate-spin"/>:camera?<CameraOff size={20}/>:<Camera size={20}/>}
    {submitting?"Đang xác nhận điểm danh...":camera?"Dừng camera":"Mở camera quét điểm danh"}
   </button>
   <div className="mt-3">
    <input ref={captureRef} type="file" accept="image/*" capture="environment"
     className="sr-only" aria-label="Chụp ảnh hoặc chọn ảnh QR điểm danh"
     onChange={e=>void scanCapturedPhoto(e)}/>
    <button type="button" disabled={decodingPhoto||submitting}
     onClick={()=>captureRef.current?.click()}
     className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#cde0e5] bg-[#f4f9fa] px-4 text-xs font-bold text-[#386c7d] hover:bg-[#edf6f8]">
     {decodingPhoto?<LoaderCircle size={17} className="animate-spin"/>:<ImagePlus size={17}/>}
     {decodingPhoto?"Đang đọc mã từ ảnh...":"Dùng camera mặc định / Ảnh đã chụp"}
    </button>
    <p className="mt-2 text-center text-[10px] leading-5 text-[#8ba0ac]">Phương án dành cho thiết bị không hỗ trợ quét trực tiếp, kể cả khi truy cập qua HTTP nội bộ.</p>
   </div>
   <div className="mt-5 border-t border-[#ebf0f2] pt-4">
    <label htmlFor="delegate-qr-link" className="flex items-center gap-2 text-[12px] font-bold text-[#496a7d]"><ClipboardPaste size={16}/> Hoặc dán liên kết QR phiên</label>
    <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={e=>{e.preventDefault();receive(link);}}>
     <input id="delegate-qr-link" value={link} onChange={e=>setLink(e.target.value)}
      type="url" inputMode="url" autoComplete="off"
      className="field min-h-[48px] flex-1" placeholder="https://.../checkin/s/..."/>
     <button type="submit" disabled={submitting||!link.trim()}
      className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#b6d2d8] bg-[#eff7f8] px-5 text-xs font-bold text-[#176376]">Xác nhận</button>
    </form>
    <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-[#7693a0]"><ShieldCheck size={15} className="mt-0.5 shrink-0"/>
     Camera chỉ xử lý hình ảnh trên thiết bị. Barcode trên thẻ dành cho BTC đối chiếu, không dùng để tự điểm danh.
    </p>
   </div>
  </div>
 </section>;
}