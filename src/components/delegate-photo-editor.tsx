"use client";

import {ChangeEvent,PointerEvent,useCallback,useEffect,useRef,useState} from "react";
import {ImagePlus,Move,ScanFace,SlidersHorizontal,UserRound,X} from "lucide-react";

type Props={
 name:string;
 title?:string;
 initialPhotoUrl?:string|null;
 onClose:()=>void;
 onSave:(photo:Blob)=>Promise<void>|void;
};
type State="idle"|"processing"|"ready"|"failed";
const OUTPUT_WIDTH=600;
const OUTPUT_HEIGHT=800;
const MODEL_PATH="/models/selfie_segmenter.tflite";
const WASM_CDN="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";

let segmenterPromise:Promise<import("@mediapipe/tasks-vision").ImageSegmenter>|null=null;
async function getSegmenter(){
 if(!segmenterPromise){
  segmenterPromise=(async()=>{
   const {FilesetResolver,ImageSegmenter}=await import("@mediapipe/tasks-vision");
   const vision=await FilesetResolver.forVisionTasks(WASM_CDN);
   return ImageSegmenter.createFromOptions(vision,{
    baseOptions:{modelAssetPath:location.origin+MODEL_PATH,delegate:"CPU"},
    runningMode:"IMAGE",outputCategoryMask:false,outputConfidenceMasks:true
   });
  })().catch(error=>{segmenterPromise=null;throw error;});
 }
 return segmenterPromise;
}
async function processPortrait(file:File,removeBackground:boolean){
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1100/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  if(!ctx)throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");
  ctx.drawImage(bitmap,0,0,width,height);
  if(!removeBackground)return canvas;
  const segmenter=await getSegmenter();
  const result=segmenter.segment(canvas);
  try{
   const masks=result.confidenceMasks;
   const mask=masks?.[1]??masks?.[0];
   if(!mask)throw new Error("Không nhận được mặt nạ tách nền.");
   const values=mask.getAsFloat32Array();
   const maskCanvas=document.createElement("canvas");
   maskCanvas.width=mask.width;maskCanvas.height=mask.height;
   const maskCtx=maskCanvas.getContext("2d");
   if(!maskCtx)throw new Error("Không thể vẽ mặt nạ ảnh.");
   const pixels=maskCtx.createImageData(mask.width,mask.height);
   for(let i=0;i<mask.width*mask.height;i++){
    const confidence=Math.max(0,Math.min(1,(values[i]-.2)/.55));
    const smooth=confidence*confidence*(3-2*confidence);
    const idx=i*4;
    pixels.data[idx]=pixels.data[idx+1]=pixels.data[idx+2]=255;
    pixels.data[idx+3]=Math.round(smooth*255);
   }
   maskCtx.putImageData(pixels,0,0);
   ctx.globalCompositeOperation="destination-in";
   ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
   ctx.drawImage(maskCanvas,0,0,width,height);
   ctx.globalCompositeOperation="destination-over";
   ctx.fillStyle="#ffffff";ctx.fillRect(0,0,width,height);
   ctx.globalCompositeOperation="source-over";
   return canvas;
  }finally{
   result.confidenceMasks?.forEach(mask=>mask.close());
   result.categoryMask?.close();
  }
 }finally{bitmap.close();}
}
function drawPortrait(
 output:HTMLCanvasElement,source:HTMLCanvasElement,
 zoom:number,panX:number,panY:number
){
 output.width=OUTPUT_WIDTH;output.height=OUTPUT_HEIGHT;
 const ctx=output.getContext("2d");
 if(!ctx)return;
 ctx.fillStyle="#ffffff";ctx.fillRect(0,0,OUTPUT_WIDTH,OUTPUT_HEIGHT);
 const scale=Math.max(OUTPUT_WIDTH/source.width,OUTPUT_HEIGHT/source.height)*zoom;
 const w=source.width*scale,h=source.height*scale;
 const x=(OUTPUT_WIDTH-w)/2+((w-OUTPUT_WIDTH)/2)*(panX/100);
 const y=(OUTPUT_HEIGHT-h)/2+((h-OUTPUT_HEIGHT)/2)*(panY/100);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
 ctx.drawImage(source,x,y,w,h);
}
export function DelegatePhotoEditor({name,title="Ảnh hồ sơ đại biểu",initialPhotoUrl,onClose,onSave}:Props){
 const [state,setState]=useState<State>("idle");
 const [processed,setProcessed]=useState<HTMLCanvasElement|null>(null);
 const [file,setFile]=useState<File|null>(null);
 const [error,setError]=useState("");
 const [zoom,setZoom]=useState(1.15);
 const [panX,setPanX]=useState(0);
 const [panY,setPanY]=useState(0);
 const [saving,setSaving]=useState(false);
 const preview=useRef<HTMLCanvasElement>(null);
 const drag=useRef<{x:number;y:number;panX:number;panY:number}|null>(null);
 useEffect(()=>{
  if(processed&&preview.current)drawPortrait(preview.current,processed,zoom,panX,panY);
 },[processed,zoom,panX,panY]);
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!saving)onClose();};
  window.addEventListener("keydown",escape);
  const old=document.body.style.overflow;document.body.style.overflow="hidden";
  return()=>{window.removeEventListener("keydown",escape);document.body.style.overflow=old;};
 },[onClose,saving]);

 const runProcessing=useCallback(async(input:File,remove:boolean)=>{
  setError("");setState("processing");setProcessed(null);
  try{
   const canvas=await processPortrait(input,remove);
   setProcessed(canvas);setZoom(1.15);setPanX(0);setPanY(0);setState("ready");
  }catch(e){
   setState("failed");
   setError(remove?"Không thể xóa nền tự động. Kiểm tra kết nối tải bộ máy AI, rồi thử lại.":(
    e instanceof Error?e.message:"Không đọc được ảnh."));
  }
 },[]);
 useEffect(()=>{
  if(!initialPhotoUrl)return;
  let canceled=false;
  (async()=>{
   try{
    const response=await fetch(initialPhotoUrl,{cache:"no-store"});
    if(!response.ok)throw new Error("Không tải được ảnh hiện có.");
    const blob=await response.blob();
    if(canceled)return;
    const loaded=new File([blob],"portrait.jpg",{type:"image/jpeg"});
    setFile(loaded);await runProcessing(loaded,false);
   }catch{
    if(!canceled)setError("Không mở được ảnh hiện tại. Bạn vẫn có thể chọn ảnh khác.");
   }
  })();
  return()=>{canceled=true;};
 },[initialPhotoUrl,runProcessing]);
 async function choose(event:ChangeEvent<HTMLInputElement>){
  const input=event.target.files?.[0];
  event.target.value="";
  if(!input)return;
  if(!["image/jpeg","image/png","image/webp"].includes(input.type)||input.size>8*1024*1024){
   setError("Chỉ hỗ trợ JPG, PNG, WebP tối đa 8 MB.");return;
  }
  setFile(input);
  await runProcessing(input,true);
 }
 async function save(){
  if(!processed||!preview.current||saving)return;
  setSaving(true);setError("");
  try{
   const output=document.createElement("canvas");
   drawPortrait(output,processed,zoom,panX,panY);
   const blob=await new Promise<Blob>((resolve,reject)=>
    output.toBlob(b=>b?resolve(b):reject(new Error("Không tạo được ảnh JPEG.")),"image/jpeg",.88)
   );
   await onSave(blob);
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được ảnh.");}
  finally{setSaving(false);}
 }
 function pointerDown(event:PointerEvent<HTMLCanvasElement>){
  if(!processed)return;
  drag.current={x:event.clientX,y:event.clientY,panX,panY};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function pointerMove(event:PointerEvent<HTMLCanvasElement>){
  if(!drag.current)return;
  const box=event.currentTarget.getBoundingClientRect();
  setPanX(Math.max(-100,Math.min(100,drag.current.panX+(event.clientX-drag.current.x)/box.width*200)));
  setPanY(Math.max(-100,Math.min(100,drag.current.panY+(event.clientY-drag.current.y)/box.height*200)));
 }
 return <div className="modal-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#102c3e]/75 p-3 sm:p-6" onClick={()=>{if(!saving)onClose();}}>
  <div className="mx-auto my-2 max-w-[790px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(7,24,40,.28)] sm:my-6"
   role="dialog" aria-modal="true" aria-label={"Chỉnh ảnh "+name} onClick={e=>e.stopPropagation()}>
   <div className="flex items-center justify-between gap-3 border-b border-[#e0eaf0] px-5 py-4">
    <div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#0a7cac]">{title}</p>
     <h2 className="mt-1 text-lg font-bold text-[#193b53]">{name}</h2>
     <p className="mt-1 text-xs text-[#708799]">Ảnh chân dung 3:4 · 600 × 800 px · nền trắng</p>
    </div>
    <button type="button" aria-label="Đóng chỉnh sửa ảnh" onClick={onClose} disabled={saving}
     className="rounded-lg bg-[#f0f5f8] p-2 text-[#426379]"><X size={20}/></button>
   </div>
   <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
    <div>
     <div className="relative mx-auto aspect-[3/4] max-w-[300px] overflow-hidden rounded-xl border-[3px] border-white bg-white shadow-[0_8px_26px_rgba(18,50,70,.15)]">
      {processed?<canvas ref={preview} className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
       onPointerDown={pointerDown} onPointerMove={pointerMove}
       onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>:
       <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f1f5f7] px-5 text-center text-[#7b90a0]">
        {state==="processing"?<ScanFace className="animate-pulse" size={43}/>:<UserRound size={48}/>}
        <p className="text-sm font-semibold">{state==="processing"?"Đang tự động tách người khỏi nền...":"Chọn ảnh chân dung để bắt đầu"}</p>
       </div>}
      {processed&&<div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-[13%] bottom-[13%] rounded-full border border-dashed border-white/70 opacity-60"/>}
     </div>
     <p className="mt-3 text-center text-xs text-[#8194a3]">Kéo ảnh trong khung để đặt khuôn mặt đúng vị trí.</p>
    </div>
    <div className="space-y-5">
     <label className="block">
      <span className="label mb-2 block">Tải ảnh từ thiết bị</span>
      <span className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#75aecd] bg-[#f1f9fc] px-3 py-3 text-[13px] font-bold text-[#0f729f] hover:bg-[#e5f4fb]">
       <ImagePlus size={18}/>{file?"Chọn ảnh khác":"Chọn JPG, PNG hoặc WebP"}
      </span>
      <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void choose(e)}/>
     </label>
     <div className="rounded-xl border border-[#d6eadf] bg-[#f4fbf6] p-3 text-xs leading-6 text-[#42735a]">
      <strong>Xóa phông tự động:</strong> Bộ máy MediaPipe chạy trên thiết bị; ảnh gốc không tải lên dịch vụ AI.
      Bạn có thể kiểm tra viền tóc và vai trước khi lưu.
     </div>
     {state==="failed"&&file&&<div className="flex flex-wrap gap-2">
      <button type="button" className="btn btn-secondary !text-xs" onClick={()=>void runProcessing(file,true)}>Thử xóa phông lại</button>
      <button type="button" className="btn btn-secondary !text-xs" onClick={()=>void runProcessing(file,false)}>
       Dùng ảnh gốc (không xóa phông)</button>
     </div>}
     {processed&&<div className="space-y-4">
      <div className="flex items-center gap-2 text-[13px] font-bold text-[#36576c]"><SlidersHorizontal size={17}/> Căn chỉnh ảnh</div>
      {[{label:"Phóng to / thu nhỏ",value:zoom,min:1,max:2.5,step:.01,set:setZoom},
        {label:"Dịch trái / phải",value:panX,min:-100,max:100,step:1,set:setPanX},
        {label:"Dịch lên / xuống",value:panY,min:-100,max:100,step:1,set:setPanY}
      ].map(control=><label key={control.label} className="block">
       <span className="flex items-center justify-between text-[12px] font-semibold text-[#577287]">
        {control.label}<span className="tabular-nums">{control.label.startsWith("Phóng")?Math.round(control.value*100)+"%":Math.round(control.value)}</span>
       </span>
       <input className="mt-2 w-full accent-[#087dad]" type="range"
        min={control.min} max={control.max} step={control.step}
        value={control.value} onChange={e=>control.set(Number(e.target.value))}/>
      </label>)}
      <p className="flex items-center gap-2 text-[11px] leading-5 text-[#73899a]"><Move size={15}/> Kéo hoặc dùng thanh điều chỉnh để căn mặt và vai.</p>
     </div>}
     {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
     <div className="flex flex-wrap gap-2 border-t border-[#e1ebf1] pt-4">
      <button type="button" className="btn btn-primary flex-1 justify-center" disabled={!processed||saving}
       onClick={()=>void save()}>{saving?"Đang lưu ảnh...":"Dùng ảnh này"}</button>
      <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>Hủy</button>
     </div>
    </div>
   </div>
  </div>
 </div>;
}
