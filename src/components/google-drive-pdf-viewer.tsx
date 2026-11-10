"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {ExternalLink,FileText,LoaderCircle,X} from "lucide-react";

/**
 * Uses Google Drive's hosted preview: PDF bytes never pass through Vercel.
 * The existing documents endpoint checks congress membership and publication
 * before redirecting the iframe to Google Drive.
 */
export function GoogleDrivePdfViewer({documentId,fileName,congressName,onClose}:{
 documentId:string;fileName:string;congressName?:string;onClose:()=>void;
}){
 const [loading,setLoading]=useState(true);
 const closeRef=useRef<HTMLButtonElement>(null);
 const previewUrl="/api/documents/"+encodeURIComponent(documentId)+"?preview=1";
 const driveUrl="/api/documents/"+encodeURIComponent(documentId);

 useEffect(()=>{
  const oldOverflow=document.body.style.overflow;
  const previousFocus=document.activeElement;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  const handleKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();onClose();}
  };
  document.addEventListener("keydown",handleKey);
  return ()=>{
   document.removeEventListener("keydown",handleKey);
   document.body.style.overflow=oldOverflow;
   if(previousFocus instanceof HTMLElement)previousFocus.focus();
  };
 },[onClose]);

 return createPortal(
  <div role="dialog" aria-modal="true" aria-labelledby="google-pdf-title"
   className="fixed inset-0 z-[200] flex h-[100dvh] flex-col bg-[#f0f4f7]">
   <header className="flex min-h-[68px] shrink-0 items-center gap-3 border-b border-[#d9e5ec] bg-white px-3 py-3 shadow-sm sm:px-6">
    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf3f9] text-[#17799f]">
     <FileText size={22}/>
    </div>
    <div className="min-w-0 flex-1">
     <p className="truncate text-[14px] font-extrabold leading-5 text-[#24475e]" id="google-pdf-title">
      {fileName}
     </p>
     <p className="mt-0.5 truncate text-[11px] text-[#78909f]">
      {congressName||"Tài liệu Đại hội"} · Xem PDF bằng Google Drive
     </p>
    </div>
    <a href={driveUrl} target="_blank" rel="noopener noreferrer"
     className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cddfe9] bg-[#f8fbfd] px-3 text-[12px] font-bold text-[#247393] hover:bg-[#e8f4fa]">
     <ExternalLink size={16}/>
     <span className="hidden sm:inline">Mở trên Google Drive</span>
     <span className="sm:hidden">Drive</span>
    </a>
    <button type="button" ref={closeRef} onClick={onClose}
     aria-label="Đóng trình xem tài liệu"
     className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#d9e5ec] bg-white text-[#456277] hover:bg-[#edf4f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147aa5]">
     <X size={20}/>
    </button>
   </header>
   <div className="relative min-h-0 flex-1 overflow-hidden bg-[#e7ecf0]">
    {loading&&<div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-6 z-10 mx-auto flex w-fit items-center gap-2 rounded-full border border-[#dce8ee] bg-white/95 px-4 py-2 text-[12px] font-semibold text-[#587285] shadow-sm">
     <LoaderCircle size={17} className="animate-spin"/> Đang mở tài liệu từ Google Drive...
    </div>}
    <iframe key={documentId} src={previewUrl}
     title={"Nội dung PDF: "+fileName} loading="eager"
     referrerPolicy="no-referrer" allowFullScreen
     onLoad={()=>setLoading(false)}
     className="h-full w-full border-0 bg-white"/>
   </div>
   <footer className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-t border-[#d9e5ec] bg-white px-4 py-2 text-[11px] text-[#71899a] sm:px-6">
    <span>PDF lưu trữ trên Google Drive · Không lưu bản sao tại website</span>
    <a href={driveUrl} target="_blank" rel="noopener noreferrer"
     className="font-bold text-[#16799e] underline-offset-2 hover:underline">
     Không xem được? Mở trên Drive
    </a>
   </footer>
  </div>,document.body
 );
}
