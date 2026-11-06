"use client";

import {ChangeEvent,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {CloudUpload,Download,FileImage,FileSpreadsheet,FileText,FolderOpen,Search,ShieldCheck} from "lucide-react";
import type {DocRow} from "@/lib/types";

const MAX_FILE_BYTES=4*1024*1024;
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
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("vi");
    return docs.filter(doc=>doc.file_name.toLocaleLowerCase("vi").includes(q));
  },[docs,query]);

  async function sendFile(file:File){
    if(file.size>MAX_FILE_BYTES){setNotice({type:"error",message:"Tệp vượt quá 4 MB. Hãy chọn tệp nhỏ hơn."});return;}
    if(file.size===0){setNotice({type:"error",message:"Tệp trống không thể tải lên."});return;}
    setBusy(true);setNotice(null);
    try{
      const form=new FormData();
      form.append("congressId",congressId);
      form.append("file",file);
      const response=await fetch("/api/documents",{method:"POST",body:form});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Không thể tải tệp.");
      setNotice({type:"success",message:"Đã tải lên thành công: "+file.name});
      router.refresh();
    }catch(error){
      setNotice({type:"error",message:error instanceof Error?error.message:"Lỗi tải tệp."});
    }finally{setBusy(false);}
  }
  async function upload(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    e.target.value="";
    if(file)await sendFile(file);
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="eyebrow">Hồ sơ và văn kiện</p><h1 className="page-title mt-2">Tài liệu Đại hội</h1><p className="page-description">Lưu trữ, tra cứu và tải tài liệu theo quyền truy cập của Đại hội.</p></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#e6f6f2] px-3 py-2 text-xs font-bold text-[#0b8079]"><ShieldCheck size={16}/> Tài liệu phân quyền</span>
    </div>

    {notice&&<p role={notice.type==="error"?"alert":"status"}
      className={`rounded-xl border p-4 text-sm font-semibold ${notice.type==="success"?"border-[#b8e8d4] bg-[#eafaf1] text-[#0b7758]":"border-red-200 bg-red-50 text-red-700"}`}>{notice.message}</p>}

    {canManage&&<label className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border-2 border-dashed border-[#c4e5df] bg-gradient-to-br from-[#f1fbf8] to-[#f8fbfc] px-5 py-8 text-center transition-colors hover:border-[#66bdb4] hover:bg-[#e9f8f2] sm:py-10 ${busy?"pointer-events-none opacity-60":""}`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-[#108e8c] shadow-sm"><CloudUpload size={27}/></span>
      <span className="text-base font-semibold text-[#193e4d]">{busy?"Đang tải tài liệu...":"Chạm để chọn và tải tài liệu"}</span>
      <span className="max-w-lg text-xs leading-relaxed text-[#738a98]">Hỗ trợ JPG, PNG, WebP, PDF, Word và Excel. Tối đa 4 MB mỗi tệp. Tài liệu được lưu qua kết nối Google Drive của hệ thống.</span>
      <input aria-label="Chọn tài liệu để tải lên" type="file" disabled={busy} className="sr-only" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx" onChange={e=>void upload(e)}/>
    </label>}

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
              <td><div className="flex max-w-[420px] items-center gap-3"><span className="shrink-0 rounded-xl bg-[#edf3ff] p-2 text-[#2456c9]"><Icon size={19}/></span><span className="min-w-0 break-words font-bold">{doc.file_name}</span></div></td>
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
              <div className="flex items-start gap-3"><span className="rounded-xl bg-[#edf3ff] p-2.5 text-[#2456c9]"><Icon size={21}/></span><div className="min-w-0 flex-1"><h3 className="mobile-record-title">{doc.file_name}</h3><p className="mobile-record-meta mt-1">{kind(doc.mime_type)} · {fileSize(doc.byte_size)} · {new Date(doc.created_at).toLocaleDateString("vi-VN")}</p></div></div>
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

    <p className="helper">Lưu ý: tải tệp tối đa 4 MB qua Vercel Function. Chức năng lưu trữ chỉ hoạt động khi Google Drive OAuth đã được cấu hình.</p>
  </div>;
}
