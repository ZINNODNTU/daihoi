"use client";

import {ChangeEvent,useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {CloudUpload,ExternalLink,FileImage,FileSpreadsheet,FileText,FolderOpen,Search,ShieldCheck,RefreshCw,Cloud,AlertCircle,CheckCircle2,Presentation,ArrowUp,ArrowDown,GripVertical,Trash2} from "lucide-react";
import type {DocRow} from "@/lib/types";
import {GoogleDrivePdfViewer} from "@/components/google-drive-pdf-viewer";

const MAX_FILE_BYTES=4*1024*1024;
type DriveStatus={ready:boolean;rootName?:string;reason?:string;missing?:string[];message:string};
function iconFor(type:string){
 return type.startsWith("image/")?FileImage:
  type.includes("sheet")||type==="application/vnd.ms-excel"?FileSpreadsheet:
  type.includes("presentation")||type==="application/vnd.ms-powerpoint"?Presentation:FileText;
}
export function DocumentsClient({congressId,docs,canManage}:{congressId:string;docs:DocRow[];canManage:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<{type:"error"|"success";message:string}|null>(null);
  const [query,setQuery]=useState("");
  const [previewDoc,setPreviewDoc]=useState<DocRow|null>(null);
  const closeViewer=useCallback(()=>setPreviewDoc(null),[]);
  const [sharing,setSharing]=useState<string|null>(null);
  const [publishOnUpload,setPublishOnUpload]=useState(false);
  const [visibilityOverrides,setVisibilityOverrides]=useState<Record<string,boolean>>({});
  const [driveStatus,setDriveStatus]=useState<DriveStatus|null>(null);
  const [checkingDrive,setCheckingDrive]=useState(false);
  const [uploadProgress,setUploadProgress]=useState("");
  const [orderOverride,setOrderOverride]=useState<string[]|null>(null);
  const [removedIds,setRemovedIds]=useState<string[]>([]);
  const [ordering,setOrdering]=useState(false);
  const [removingId,setRemovingId]=useState<string|null>(null);
  const [dragId,setDragId]=useState<string|null>(null);
  const checkDrive=useCallback(async()=>{
    setCheckingDrive(true);
    try{
      const result=await fetch("/api/documents/status?"+
       new URLSearchParams({congressId}),{cache:"no-store",credentials:"same-origin"});
      const value=await result.json();
      if(!result.ok)throw new Error(value.error||"Không kiểm tra được Google Drive.");
      setDriveStatus(value as DriveStatus);
    }catch(e){setDriveStatus({ready:false,message:e instanceof Error?e.message:"Không thể kiểm tra kết nối."});}
    finally{setCheckingDrive(false);}
  },[congressId]);
  useEffect(()=>{if(canManage)queueMicrotask(()=>void checkDrive());},[canManage,checkDrive]);
  const visibleDocs=useMemo(()=>{
    const active=docs.filter(doc=>!removedIds.includes(doc.id));
    const positions=new Map(orderOverride?.map((id,index)=>[id,index])||[]);
    return active.sort((a,b)=>
      (positions.get(a.id)??(orderOverride?900000+(a.display_order??1000000):(a.display_order??1000000)))-
      (positions.get(b.id)??(orderOverride?900000+(b.display_order??1000000):(b.display_order??1000000)))||
      b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
  },[docs,orderOverride,removedIds]);
  const isPublished=(doc:DocRow)=>visibilityOverrides[doc.id]??(doc.delegate_visible===true);
  const publishedCount=visibleDocs.filter(doc=>isPublished(doc)).length;
  const unpublished=visibleDocs.filter(doc=>!isPublished(doc));
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("vi");
    return visibleDocs.filter(doc=>doc.file_name.toLocaleLowerCase("vi").includes(q));
  },[visibleDocs,query]);
  const canReorder=canManage&&!ordering&&!removingId&&!busy&&!sharing&&!query.trim()&&visibleDocs.length>1;

  async function reorderDocument(id:string,target:string){
    if(!canReorder||id===target)return;
    const before=visibleDocs.map(item=>item.id);
    const next=before.filter(item=>item!==id);
    const targetIndex=next.indexOf(target);
    if(targetIndex<0)return;
    const position=targetIndex+(before.indexOf(id)<before.indexOf(target)?1:0);
    next.splice(position,0,id);
    setDragId(null);
    setOrderOverride(next);setOrdering(true);setNotice(null);
    try{
      const response=await fetch("/api/documents/reorder",{
        method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({congressId,orderedIds:next})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Không lưu được thứ tự tài liệu.");
      setNotice({type:"success",message:"Đã lưu thứ tự tài liệu; trang đại biểu sẽ hiển thị theo thứ tự này."});
      router.refresh();
    }catch(error){
      setOrderOverride(before);
      setNotice({type:"error",message:error instanceof Error?error.message:"Không thể sắp xếp tài liệu."});
    }finally{setOrdering(false);}
  }

  function moveDocument(id:string,delta:number){
    if(!canReorder)return;
    const position=visibleDocs.findIndex(item=>item.id===id);
    const target=visibleDocs[position+delta];
    if(target)void reorderDocument(id,target.id);
  }

  async function removeDocument(doc:DocRow){
    if(!canManage||busy||ordering||sharing||removingId)return;
    if(!window.confirm("Gỡ tài liệu “"+doc.file_name+"” khỏi Đại hội? Đại biểu sẽ không còn thấy tài liệu này. Tệp gốc trên Google Drive vẫn được giữ lại."))return;
    setRemovingId(doc.id);setNotice(null);
    try{
      const response=await fetch("/api/documents/"+doc.id,{
        method:"DELETE",headers:{"Content-Type":"application/json"},
        credentials:"same-origin",body:JSON.stringify({congressId})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Không thể gỡ tài liệu.");
      setRemovedIds(items=>[...items,doc.id]);
      setOrderOverride(null);
      if(previewDoc?.id===doc.id)setPreviewDoc(null);
      setNotice({type:"success",message:"Đã gỡ tài liệu khỏi Đại hội. Tệp gốc trên Google Drive vẫn được giữ lại."});
      router.refresh();
    }catch(error){
      setNotice({type:"error",message:error instanceof Error?error.message:"Không thể gỡ tài liệu."});
    }finally{setRemovingId(null);}
  }

  async function toggleShare(doc:DocRow){
    if(sharing)return;
    setSharing(doc.id);setNotice(null);
    try{
      const res=await fetch("/api/documents/visibility",{
       method:"PATCH",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({congressId,documentId:doc.id,visible:!isPublished(doc)})
      });
      const payload=await res.json();
      if(!res.ok)throw new Error(payload.error||"Không cập nhật được quyền xem tài liệu.");
      setVisibilityOverrides(previous=>({...previous,[doc.id]:payload.visible===true}));
      setNotice({type:"success",message:payload.visible?"Đã công bố tài liệu cho đại biểu, liên kết Google Drive có thể truy cập.":"Đã chuyển tài liệu về nội bộ."});
      router.refresh();
    }catch(error){setNotice({type:"error",message:error instanceof Error?error.message:"Không cập nhật được."});}
    finally{setSharing(null);}
  }
  async function publishAll(){
     if(sharing||busy||!unpublished.length)return;
     if(!window.confirm("Công bố "+unpublished.length+" tài liệu cho đại biểu? Người nhận liên kết Google Drive có thể mở và chuyển tiếp tài liệu này."))return;
     setSharing("bulk");setNotice(null);
     let completed=0;const failures:string[]=[];
     for(const doc of unpublished){
       try{
         const response=await fetch("/api/documents/visibility",{
           method:"PATCH",headers:{"Content-Type":"application/json"},
           body:JSON.stringify({congressId,documentId:doc.id,visible:true})
         });
         const result=await response.json();
         if(!response.ok||!result.visible)throw new Error(result.error||"Không cấp được quyền trên Drive");
         completed++;
      setVisibilityOverrides(previous=>({...previous,[doc.id]:true}));
       }catch(e){failures.push(doc.file_name+": "+(e instanceof Error?e.message:"Lỗi chia sẻ"));}
     }
     setSharing(null);
     setNotice({type:failures.length?"error":"success",message:
       "Đã công bố "+completed+"/"+unpublished.length+" tài liệu."+
       (failures.length?" Không công bố được: "+failures.slice(0,3).join(" · "):" Đại biểu có thể xem trong cổng tài liệu.")});
     if(completed)router.refresh();
   }
  async function upload(e:ChangeEvent<HTMLInputElement>){
    const files=Array.from(e.target.files||[]);
    e.target.value="";
    if(!files.length)return;
    setBusy(true);setNotice(null);
    const success:string[]=[];
    const published:string[]=[];
    const warnings:string[]=[];
    const failed:string[]=[];
    for(let i=0;i<files.length;i++){
      const file=files[i];
      setUploadProgress("Đang tải "+(i+1)+"/"+files.length+": "+file.name);
      try{
        if(!/\.pdf$/i.test(file.name))throw new Error("Thư viện chỉ nhận tài liệu PDF.");
        if(file.size>MAX_FILE_BYTES)throw new Error("Tệp vượt quá 4 MB");
        if(!file.size)throw new Error("Tệp trống");
        const form=new FormData();
        form.append("congressId",congressId);
        form.append("file",file);
        form.append("publish",publishOnUpload?"true":"false");
        const response=await fetch("/api/documents",{method:"POST",body:form,credentials:"same-origin"});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Không thể tải tệp.");
        success.push(file.name);
        if(data.published)published.push(file.name);
        if(data.warning)warnings.push(file.name+": "+data.warning);
      }catch(error){failed.push(file.name+": "+(error instanceof Error?error.message:"Lỗi tải tệp."));}
    }
    setUploadProgress("");setBusy(false);
         if(failed.length||warnings.length)setNotice({type:"error",message:
       (success.length?"Đã tải "+success.length+" tệp, công bố "+published.length+" tệp. ":"")+
       (warnings.length?"Lưu ý: "+warnings.slice(0,3).join(" · ")+". ":"")+
       (failed.length?"Không tải được: "+failed.slice(0,3).join(" · "):"")});
     else setNotice({type:"success",message:"Đã tải "+success.length+" tài liệu, công bố "+
       published.length+" tài liệu cho đại biểu."+
       (success.length!==published.length?" "+(success.length-published.length)+" tài liệu còn nội bộ; bật Công bố bên dưới để đại biểu xem.":"")});
    if(success.length)router.refresh();
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="eyebrow">Hồ sơ và văn kiện</p><h1 className="page-title mt-2">Tài liệu Đại hội</h1><p className="page-description">BTC tải PDF lên Google Drive; đại biểu đọc trực tiếp trên website, không cần tải tệp về.</p></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#e6f6f2] px-3 py-2 text-xs font-bold text-[#0b8079]"><ShieldCheck size={16}/> Tài liệu phân quyền</span>
    </div>

    {notice&&<p role={notice.type==="error"?"alert":"status"}
      className={`rounded-xl border p-4 text-sm font-semibold ${notice.type==="success"?"border-[#b8e8d4] bg-[#eafaf1] text-[#0b7758]":"border-red-200 bg-red-50 text-red-700"}`}>{notice.message}</p>}

    {canManage&&<section className="rounded-[14px] border border-[#d9e6ee] bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
       <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#edf5fa] text-[#167eac]"><Cloud size={21}/></span>
        <div className="min-w-0">
         <p className="text-[13px] font-extrabold text-[#254966]">Kho lưu trữ Google Drive</p>
         <p className="mt-0.5 text-[11px] leading-5 text-[#738da0]">
          {driveStatus?.ready?"Đã kết nối · "+(driveStatus.rootName||"Thư mục lưu trữ"):
           checkingDrive?"Đang kiểm tra kết nối...":
           driveStatus?.message||"Đang xác minh cấu hình lưu trữ"}
         </p>
        </div>
       </div>
       <div className="flex items-center gap-2">
        {driveStatus?.ready?<span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f8ec] px-2.5 py-1.5 text-[11px] font-bold text-[#207755]"><CheckCircle2 size={15}/> Sẵn sàng</span>:
         driveStatus&&!checkingDrive?<span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1e7] px-2.5 py-1.5 text-[11px] font-bold text-[#a65d37]"><AlertCircle size={15}/> Chưa kết nối</span>:null}
        <button type="button" disabled={checkingDrive} onClick={()=>void checkDrive()}
         className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d2e4eb] bg-[#f7fbfd] px-3 text-[11px] font-bold text-[#366d85] hover:bg-[#ebf5fa] disabled:opacity-40">
         <RefreshCw size={15} className={checkingDrive?"animate-spin":""}/> Kiểm tra lại
        </button>
       </div>
      </div>
      {driveStatus&&!driveStatus.ready&&<p role="alert" className="mt-3 rounded-lg bg-[#fff8ef] px-3 py-2.5 text-[11px] leading-5 text-[#8d6238]">
       {driveStatus.missing?.length?"Cần bổ sung: "+driveStatus.missing.join(", ")+". ":null}
       Chỉ cấu hình những biến này trên máy chủ/Vercel, không nhập khóa vào trình duyệt.
      </p>}
     </section>}
    {canManage&&<div className="rounded-xl border border-[#d9e8ee] bg-[#f7fbfd] px-4 py-3">
       <label className="flex cursor-pointer items-start gap-3">
         <input type="checkbox" checked={publishOnUpload} disabled={busy||sharing!==null}
           onChange={event=>setPublishOnUpload(event.target.checked)}
           className="mt-0.5 h-5 w-5 shrink-0 accent-[#087da9]"/>
         <span>
           <strong className="block text-[13px] text-[#22516c]">Công bố ngay cho đại biểu sau khi tải lên</strong>
           <span className="mt-1 block text-[11px] leading-5 text-[#728c9b]">Mặc định tài liệu là nội bộ. Khi chọn công bố, hệ thống cấp quyền <strong>người có liên kết được xem</strong> trên Google Drive; chỉ bật đối với tệp được phép chia sẻ.</span>
         </span>
       </label>
     </div>}
     {canManage&&<label className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed border-[#c4e5df] bg-gradient-to-br from-[#f1fbf8] to-[#f8fbfc] px-5 py-8 text-center transition-colors hover:border-[#66bdb4] hover:bg-[#e9f8f2] sm:py-10 ${busy?"pointer-events-none opacity-60":""}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#108e8c] shadow-sm"><CloudUpload size={27}/></span>
      <span className="text-base font-semibold text-[#193e4d]">{uploadProgress||"Chạm để chọn một hoặc nhiều tài liệu"}</span>
      <span className="max-w-lg text-xs leading-relaxed text-[#738a98]">Chọn một hoặc nhiều tệp PDF (tối đa 4 MB/tệp). Tệp gốc vẫn lưu trên Google Drive; website chỉ lưu thông tin tệp.</span>
      <input aria-label="Chọn tài liệu để tải lên" type="file" multiple disabled={busy||driveStatus?.ready===false} className="sr-only" accept=".pdf,application/pdf" onChange={e=>void upload(e)}/>
    </label>}

    {canManage&&visibleDocs.length>0&&<section className="rounded-2xl border border-[#cbdfe9] bg-white p-4 sm:p-5">
             <div className="flex flex-wrap items-center justify-between gap-3">
         <div>
           <h2 className="text-[15px] font-extrabold text-[#234e65]">Công bố tài liệu cho đại biểu</h2>
           <p className="mt-1 text-[12px] font-bold text-[#507e90]">{publishedCount}/{visibleDocs.length} tệp đã công bố · {unpublished.length} tệp nội bộ</p>
         </div>
         {unpublished.length>0&&<button type="button" disabled={sharing!==null||busy}
           onClick={()=>void publishAll()}
           className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#087ca8] px-4 text-[12px] font-bold text-white hover:bg-[#06618a] disabled:opacity-50">
           <ShieldCheck size={15}/>{sharing==="bulk"?"Đang công bố...":"Công bố "+unpublished.length+" tệp nội bộ"}
         </button>}
       </div>
      <p className="mt-2 text-[12px] leading-6 text-[#7894a2]">Khi bật công bố, hệ thống đồng thời cấp quyền “Người có đường liên kết được xem” trên Google Drive. Liên kết có thể được chuyển tiếp; chỉ công bố tài liệu được phép chia sẻ.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
       {visibleDocs.map(doc=><label key={doc.id} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[#e2ebee] bg-[#f9fbfc] px-3 py-3">
        <input type="checkbox" checked={isPublished(doc)} disabled={sharing!==null}
         onChange={()=>void toggleShare(doc)} aria-label={"Cho đại biểu xem "+doc.file_name}
         className="h-4 w-4 shrink-0 accent-[#087da9]"/>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#416b7e]">{doc.file_name}</span>
        <span className={"shrink-0 text-[10px] font-bold "+(isPublished(doc)?"text-[#177e61]":"text-[#8596a5]")}>
         {isPublished(doc)?"Đã công bố":"Nội bộ"}
        </span>
       </label>)}
      </div>
    </section>}
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[#eaf0f2] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-[#e7f5f1] p-2.5 text-[#0a8680]"><FolderOpen size={22}/></span><div><h2 className="section-title">Thư viện tài liệu</h2><p className="helper mt-1">{visibleDocs.length} tệp trong Đại hội</p></div></div>
        <label className="relative block w-full sm:max-w-[300px]"><span className="sr-only">Tìm kiếm tài liệu</span><Search size={18} className="absolute left-3.5 top-3.5 text-[#8da1af]"/><input type="search" className="field pl-11!" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên tài liệu..."/></label>
      </div>

      {canManage&&visibleDocs.length>1&&<p className="border-b border-[#eaf0f4] bg-[#f6fafc] px-5 py-2 text-[11px] font-semibold text-[#50788f]">
        {query?"Xóa bộ lọc tìm kiếm để sắp xếp tài liệu.":ordering?"Đang lưu thứ tự tài liệu...":"Kéo thả tài liệu để thay đổi thứ tự, hoặc sử dụng các nút Lên / Xuống. File Google Drive gốc vẫn được giữ khi gỡ tài liệu."}
       </p>}
       {filtered.length?
      <>
        <div className="divide-y divide-[#eaf0f4]">
         {filtered.map(doc=>{
          const Icon=iconFor(doc.mime_type);
          const label=<>
           <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#e9f3f9] text-[#187fac]"><Icon size={22}/></span>
           <span className="min-w-0 flex-1 break-words text-left text-[13px] font-bold leading-5 text-[#294c65]">{doc.file_name}</span>
           <span className={"hidden shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold sm:inline-flex "+(isPublished(doc)?"bg-[#e6f6ec] text-[#247756]":"bg-[#edf1f4] text-[#758a97]")}>
            {isPublished(doc)?"Đã công bố":"Nội bộ"}
           </span>
           {doc.mime_type==="application/pdf"?<FileText size={18} className="shrink-0 text-[#7c9bab] group-hover:text-[#1480aa]"/>:
            <ExternalLink size={18} className="shrink-0 text-[#7c9bab] group-hover:text-[#1480aa]"/>}
          </>;
          const className="group flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-[#f3f9fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147aa5] sm:px-6";
          const position=visibleDocs.findIndex(item=>item.id===doc.id);
          return <div key={doc.id} draggable={canReorder}
           onDragStart={event=>{if(!canReorder)return;setDragId(doc.id);event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",doc.id);}}
           onDragOver={event=>{if(dragId&&canReorder)event.preventDefault();}}
           onDrop={event=>{event.preventDefault();if(dragId&&canReorder)void reorderDocument(dragId,doc.id);}}
           onDragEnd={()=>setDragId(null)}
           className={"flex min-w-0 flex-col transition sm:flex-row sm:items-center "+(dragId===doc.id?"bg-[#e7f3f8] opacity-70":dragId?"hover:bg-[#f1f8fc]":"")}>
           {canManage&&<span className="inline-flex shrink-0 items-center gap-1.5 px-4 pt-3 text-[11px] font-extrabold tabular-nums text-[#64839a] sm:py-3 sm:pl-5 sm:pr-0">
            <GripVertical size={16} aria-label={"Kéo để sắp xếp "+doc.file_name} className={canReorder?"cursor-grab":"opacity-40"}/>
            {String(position+1).padStart(2,"0")}
           </span>}
           {doc.mime_type==="application/pdf"?
            <button type="button" onClick={()=>setPreviewDoc(doc)}
             aria-label={"Xem PDF "+doc.file_name+" ngay trên website"} className={className}>{label}</button>:
            <a href={"/api/documents/"+doc.id} target="_blank" rel="noopener noreferrer"
             aria-label={"Mở tài liệu "+doc.file_name+" trên Google Drive"} className={className}>{label}</a>}
           {canManage&&<div className="flex shrink-0 items-center justify-end gap-1.5 px-4 pb-3 sm:py-3 sm:pl-0 sm:pr-5">
            <button type="button" aria-label={"Chuyển "+doc.file_name+" lên"} title="Đưa lên một vị trí"
             disabled={!canReorder||position===0} onClick={()=>moveDocument(doc.id,-1)}
             className="btn btn-secondary !min-h-9 !px-2 disabled:opacity-35"><ArrowUp size={15}/></button>
            <button type="button" aria-label={"Chuyển "+doc.file_name+" xuống"} title="Đưa xuống một vị trí"
             disabled={!canReorder||position===visibleDocs.length-1} onClick={()=>moveDocument(doc.id,1)}
             className="btn btn-secondary !min-h-9 !px-2 disabled:opacity-35"><ArrowDown size={15}/></button>
            <button type="button" aria-label={"Gỡ tài liệu "+doc.file_name} title="Gỡ khỏi Đại hội (giữ file trên Google Drive)"
             disabled={busy||ordering||sharing!==null||removingId!==null}
             onClick={()=>void removeDocument(doc)}
             className="btn !min-h-9 !border-red-200 !bg-red-50 !px-3 !text-red-700 hover:!bg-red-100 disabled:opacity-35">
             <Trash2 size={15}/><span className="text-[11px] font-bold">Xóa</span>
            </button>
           </div>}
          </div>;
         })}
        </div>
      </>:
      <div className="empty-state">
        <FolderOpen size={34} className="mx-auto text-[#91b6ba]"/>
        <p className="mt-4 font-semibold">{visibleDocs.length?"Không tìm thấy tài liệu":"Chưa có tài liệu nào"}</p>
        <p className="helper mx-auto mt-2 max-w-md">{visibleDocs.length?"Thử tìm bằng tên khác.":"Tài liệu sẽ hiển thị khi Ban Tổ chức tải lên và cấu hình kết nối lưu trữ."}</p>
      </div>}
    </section>

    <p className="helper">Website chỉ lưu thông tin tài liệu trên Supabase. Tệp PDF được xem qua Google Drive Preview, không truyền dữ liệu PDF qua máy chủ Vercel.</p>
    {previewDoc&&<GoogleDrivePdfViewer documentId={previewDoc.id} fileName={previewDoc.file_name}
     congressName="Quản trị tài liệu Đại hội" onClose={closeViewer}/>}
  </div>;
}