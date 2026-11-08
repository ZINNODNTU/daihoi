"use client";

import {ChangeEvent,useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {CloudUpload,Download,FileImage,FileSpreadsheet,FileText,FolderOpen,Search,ShieldCheck,RefreshCw,Cloud,AlertCircle,CheckCircle2} from "lucide-react";
import type {DocRow} from "@/lib/types";

const MAX_FILE_BYTES=4*1024*1024;
type DriveStatus={ready:boolean;rootName?:string;reason?:string;missing?:string[];message:string};
function fileSize(bytes:number){
  return bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+" KB":(bytes/1024/1024).toFixed(1)+" MB";
}
function iconFor(type:string){
  return type.startsWith("image/")?FileImage:type.includes("sheet")?FileSpreadsheet:FileText;
}
function kind(type:string){
  if(type.startsWith("image/"))return "Hình ảnh";
  if(type.includes("pdf"))return "PDF";
  if(type.includes("spreadsheet"))return "Excel";
  if(type.includes("wordprocessing"))return "Word";
  return "Tài liệu";
}
export function DocumentsClient({congressId,docs,canManage}:{congressId:string;docs:DocRow[];canManage:boolean}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<{type:"error"|"success";message:string}|null>(null);
  const [query,setQuery]=useState("");
  const [sharing,setSharing]=useState<string|null>(null);
  const [driveStatus,setDriveStatus]=useState<DriveStatus|null>(null);
  const [checkingDrive,setCheckingDrive]=useState(false);
  const [uploadProgress,setUploadProgress]=useState("");
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
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("vi");
    return docs.filter(doc=>doc.file_name.toLocaleLowerCase("vi").includes(q));
  },[docs,query]);

  async function toggleShare(doc:DocRow){
    if(sharing)return;
    setSharing(doc.id);setNotice(null);
    try{
      const res=await fetch("/api/documents/visibility",{
       method:"PATCH",headers:{"Content-Type":"application/json"},
       body:JSON.stringify({congressId,documentId:doc.id,visible:!doc.delegate_visible})
      });
      const payload=await res.json();
      if(!res.ok)throw new Error(payload.error||"Không cập nhật được quyền xem tài liệu.");
      setNotice({type:"success",message:payload.visible?"Đã công bố tài liệu cho đại biểu.":"Đã thu hồi quyền xem của đại biểu."});
      router.refresh();
    }catch(error){setNotice({type:"error",message:error instanceof Error?error.message:"Không cập nhật được."});}
    finally{setSharing(null);}
  }
  async function upload(e:ChangeEvent<HTMLInputElement>){
    const files=Array.from(e.target.files||[]);
    e.target.value="";
    if(!files.length)return;
    setBusy(true);setNotice(null);
    const success:string[]=[];
    const failed:string[]=[];
    for(let i=0;i<files.length;i++){
      const file=files[i];
      setUploadProgress("Đang tải "+(i+1)+"/"+files.length+": "+file.name);
      try{
        if(file.size>MAX_FILE_BYTES)throw new Error("Tệp vượt quá 4 MB");
        if(!file.size)throw new Error("Tệp trống");
        const form=new FormData();
        form.append("congressId",congressId);
        form.append("file",file);
        const response=await fetch("/api/documents",{method:"POST",body:form,credentials:"same-origin"});
        const data=await response.json();
        if(!response.ok)throw new Error(data.error||"Không thể tải tệp.");
        success.push(file.name);
      }catch(error){failed.push(file.name+": "+(error instanceof Error?error.message:"Lỗi tải tệp."));}
    }
    setUploadProgress("");setBusy(false);
    if(failed.length)setNotice({type:"error",message:
      (success.length?"Đã lưu "+success.length+" tệp. ":"")+"Không tải được: "+failed.slice(0,3).join(" · ")});
    else setNotice({type:"success",message:"Đã lưu "+success.length+" tài liệu lên Google Drive thành công."});
    if(success.length)router.refresh();
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="eyebrow">Hồ sơ và văn kiện</p><h1 className="page-title mt-2">Tài liệu Đại hội</h1><p className="page-description">Lưu trữ, tra cứu và tải tài liệu theo quyền truy cập của Đại hội.</p></div>
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
    {canManage&&<label className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed border-[#c4e5df] bg-gradient-to-br from-[#f1fbf8] to-[#f8fbfc] px-5 py-8 text-center transition-colors hover:border-[#66bdb4] hover:bg-[#e9f8f2] sm:py-10 ${busy?"pointer-events-none opacity-60":""}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#108e8c] shadow-sm"><CloudUpload size={27}/></span>
      <span className="text-base font-semibold text-[#193e4d]">{uploadProgress||"Chạm để chọn một hoặc nhiều tài liệu"}</span>
      <span className="max-w-lg text-xs leading-relaxed text-[#738a98]">Hỗ trợ ảnh, PDF, Word, Excel và PowerPoint (.docx/.xlsx/.pptx, cả định dạng cũ). Tối đa 4 MB mỗi tệp. Tệp được lưu riêng tư trên Google Drive.</span>
      <input aria-label="Chọn tài liệu để tải lên" type="file" multiple disabled={busy||driveStatus?.ready===false} className="sr-only" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={e=>void upload(e)}/>
    </label>}

    {canManage&&docs.length>0&&<section className="rounded-2xl border border-[#cbdfe9] bg-white p-4 sm:p-5">
      <h2 className="text-[15px] font-extrabold text-[#234e65]">Công bố tài liệu cho đại biểu</h2>
      <p className="mt-2 text-[12px] leading-6 text-[#7894a2]">Tài liệu nội bộ mặc định không công khai. Bật chia sẻ cho từng tệp để đại biểu thấy trong cổng của mình.</p>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
       {docs.map(doc=><label key={doc.id} className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-[#e2ebee] bg-[#f9fbfc] px-3 py-3">
        <input type="checkbox" checked={doc.delegate_visible===true} disabled={sharing!==null}
         onChange={()=>void toggleShare(doc)} aria-label={"Cho đại biểu xem "+doc.file_name}
         className="h-4 w-4 shrink-0 accent-[#087da9]"/>
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#416b7e]">{doc.file_name}</span>
        <span className={"shrink-0 text-[10px] font-bold "+(doc.delegate_visible?"text-[#177e61]":"text-[#8596a5]")}>
         {doc.delegate_visible?"Đã công bố":"Nội bộ"}
        </span>
       </label>)}
      </div>
    </section>}
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[#eaf0f2] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-[#e7f5f1] p-2.5 text-[#0a8680]"><FolderOpen size={22}/></span><div><h2 className="section-title">Thư viện tài liệu</h2><p className="helper mt-1">{docs.length} tệp trong Đại hội</p></div></div>
        <label className="relative block w-full sm:max-w-[300px]"><span className="sr-only">Tìm kiếm tài liệu</span><Search size={18} className="absolute left-3.5 top-3.5 text-[#8da1af]"/><input type="search" className="field pl-11!" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm tên tài liệu..."/></label>
      </div>

      {filtered.length?
      <>
        <div className="table-wrap desktop-table"><table className="data">
          <thead><tr><th>Tên tài liệu</th><th>Định dạng</th><th>Dung lượng</th><th>Ngày tải</th><th>Thao tác</th></tr></thead>
          <tbody>{filtered.map(doc=>{
            const Icon=iconFor(doc.mime_type);
            return <tr key={doc.id}>
              <td><div className="flex max-w-[420px] items-center gap-3"><span className="shrink-0 rounded-xl bg-[#edf3ff] p-2 text-[#007eb8]"><Icon size={19}/></span><span className="min-w-0 break-words font-bold">{doc.file_name}</span></div></td>
              <td>{kind(doc.mime_type)}</td><td>{fileSize(doc.byte_size)}</td>
              <td>{new Date(doc.created_at).toLocaleDateString("vi-VN")}</td>
              <td><a className="btn btn-secondary" href={`/api/documents/${doc.id}`}><Download size={17}/> Tải về</a></td>
            </tr>;
          })}</tbody>
        </table></div>
        <div className="mobile-cards px-3 py-3">
          {filtered.map(doc=>{
            const Icon=iconFor(doc.mime_type);
            return <article key={doc.id} className="mobile-record">
              <div className="flex items-start gap-3"><span className="rounded-xl bg-[#edf3ff] p-2.5 text-[#007eb8]"><Icon size={21}/></span><div className="min-w-0 flex-1"><h3 className="mobile-record-title">{doc.file_name}</h3><p className="mobile-record-meta mt-1">{kind(doc.mime_type)} · {fileSize(doc.byte_size)} · {new Date(doc.created_at).toLocaleDateString("vi-VN")}</p></div></div>
              <div className="mobile-record-actions"><a className="btn btn-secondary" href={`/api/documents/${doc.id}`}><Download size={17}/> Tải tài liệu</a></div>
            </article>;
          })}
        </div>
      </>:
      <div className="empty-state">
        <FolderOpen size={34} className="mx-auto text-[#91b6ba]"/>
        <p className="mt-4 font-semibold">{docs.length?"Không tìm thấy tài liệu":"Chưa có tài liệu nào"}</p>
        <p className="helper mx-auto mt-2 max-w-md">{docs.length?"Thử tìm bằng tên khác.":"Tài liệu sẽ hiển thị khi Ban Tổ chức tải lên và cấu hình kết nối lưu trữ."}</p>
      </div>}
    </section>

    <p className="helper">Giới hạn 4 MB/tệp áp dụng cho Vercel Function. Nếu Drive chưa được kết nối, BTC cần cấu hình OAuth trên máy chủ/Vercel; không có quyền công khai tệp trên Google Drive.</p>
  </div>;
}