"use client";
import {useMemo,useState} from "react";
import {BookOpen,ExternalLink,FileImage,FileSpreadsheet,FileText,FolderOpen,Presentation,Search,X} from "lucide-react";
import type {DocRow} from "@/lib/types";

type CongressOption={id:string;name:string};
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .replace(/đ/g,"d").replace(/Đ/g,"D").toLocaleLowerCase("vi").trim();
function fileIcon(mime:string){
 return mime.startsWith("image/")?FileImage:
  mime.includes("spreadsheet")||mime==="application/vnd.ms-excel"?FileSpreadsheet:
  mime.includes("presentation")||mime==="application/vnd.ms-powerpoint"?Presentation:FileText;
}
export function DelegateDocumentsList({docs,congresses,initialCongressId=""}:{
 docs:DocRow[];congresses:CongressOption[];initialCongressId?:string
}){
 const [query,setQuery]=useState("");
 const [congressId,setCongressId]=useState(initialCongressId);
 const [limit,setLimit]=useState(24);
 const names=useMemo(()=>new Map(congresses.map(item=>[item.id,item.name])),[congresses]);
 const visible=useMemo(()=>{
  const q=normalize(query);
  return docs.filter(doc=>(!congressId||doc.congress_id===congressId)&&
   (!q||normalize(doc.file_name+" "+(names.get(doc.congress_id)||"")).includes(q)));
 },[docs,congressId,names,query]);
 function changeCongress(value:string){setCongressId(value);setLimit(24);}
 return <section aria-label="Thư viện tài liệu được công bố" className="overflow-hidden rounded-[18px] border border-[#dbe6ee] bg-white shadow-sm">
  <div className="border-b border-[#e5eef2] p-3.5 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <h2 className="text-[15px] font-extrabold text-[#274b62]">Tài liệu được công bố</h2>
    <span className="rounded-full bg-[#e9f4fa] px-3 py-1.5 text-[12px] font-bold text-[#257ca2]" aria-live="polite">
     {visible.length} / {docs.length} tệp
    </span>
   </div>
   <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
    <label className="relative block">
     <span className="mb-1.5 block text-[12px] font-bold text-[#486b7e]">Tìm nhanh tài liệu</span>
     <Search size={18} className="pointer-events-none absolute bottom-[15px] left-3.5 text-[#7e9ba9]"/>
     <input type="search" className="field !min-h-12 !rounded-xl !pl-11 !text-[14px]"
      placeholder="Nhập tên văn kiện, báo cáo..." value={query}
      onChange={e=>{setQuery(e.target.value);setLimit(24);}}/>
    </label>
    {congresses.length>1&&<label className="block">
     <span className="mb-1.5 block text-[12px] font-bold text-[#486b7e]">Đại hội</span>
     <select className="field !min-h-12 !rounded-xl !text-[14px]" value={congressId}
      onChange={e=>changeCongress(e.target.value)}>
      <option value="">Tất cả Đại hội</option>
      {congresses.map(congress=><option key={congress.id} value={congress.id}>{congress.name}</option>)}
     </select>
    </label>}
   </div>
  </div>
  {visible.length?<div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-5">
   {visible.slice(0,limit).map(doc=>{
    const Icon=fileIcon(doc.mime_type);
    return <a key={doc.id} href={"/api/documents/"+doc.id} target="_blank"
     rel="noopener noreferrer" aria-label={"Mở "+doc.file_name+" trên Google Drive"}
     className="group flex min-h-[76px] min-w-0 items-center gap-3 rounded-xl border border-[#e1eaf0] bg-[#fbfdfe] px-3.5 py-3.5 transition-colors hover:border-[#a8cadc] hover:bg-[#eef7fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147aa5]">
     <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f2f9] text-[#237eaa]"><Icon size={23}/></span>
     <span className="min-w-0 flex-1">
      <span className="block break-words text-[13px] font-bold leading-[1.5] text-[#284660]">{doc.file_name}</span>
      <span className="mt-1 block break-words text-[11px] leading-4 text-[#708da0]">{names.get(doc.congress_id)||"Đại hội"}</span>
     </span>
     <ExternalLink size={18} className="shrink-0 text-[#7a9aab] group-hover:text-[#177ca7]"/>
    </a>;
   })}
  </div>:<div className="flex flex-col items-center px-5 py-12 text-center">
   {docs.length>0?<Search size={32} className="text-[#a0b6c5]"/>:<FolderOpen size={36} className="text-[#a0b6c5]"/>}
   <h3 className="mt-3 text-[15px] font-bold text-[#3d5877]">{docs.length===0?"Chưa có tài liệu được công bố":"Không tìm thấy tài liệu phù hợp"}</h3>
   <p className="mt-2 text-[12px] leading-6 text-[#8299aa]">{docs.length===0?"Ban Tổ chức chưa công bố tài liệu cho đại biểu tại Đại hội này.":"Thử đổi từ khóa hoặc chọn Đại hội khác."}</p>
   {docs.length>0&&(query||congressId)&&<button type="button" onClick={()=>{setQuery("");changeCongress("");}}
    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#c9dce7] px-4 text-xs font-bold text-[#177ca7]">
    <X size={16}/> Xóa bộ lọc
   </button>}
  </div>}
  {visible.length>limit&&<div className="border-t border-[#e6edf2] p-3 text-center">
   <button type="button" onClick={()=>setLimit(n=>n+24)}
    className="min-h-11 rounded-xl border border-[#c4dce8] bg-white px-5 text-[13px] font-bold text-[#176e96]">
    Xem thêm tài liệu ({visible.length-limit} còn lại)
   </button>
  </div>}
  <p className="flex items-center justify-center gap-2 border-t border-[#e8eef2] bg-[#f8fbfd] px-4 py-3 text-center text-[11px] text-[#718e9f]">
   <BookOpen size={15}/> Chọn một tệp để xem trên Google Drive
  </p>
 </section>;
}
