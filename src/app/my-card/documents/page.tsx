import Link from "next/link";
import {BookOpen,Download,ExternalLink,FileImage,FileSpreadsheet,FileText,FolderOpen,ShieldCheck} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {createAdminClient} from "@/lib/supabase/admin";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import type {DocRow} from "@/lib/types";

export const dynamic="force-dynamic";
function fileIcon(mime:string){return mime.startsWith("image/")?FileImage:
 mime.includes("spreadsheet")?FileSpreadsheet:FileText;}
function fileSize(bytes:number){return bytes<1024*1024?Math.max(1,Math.round(bytes/1024))+" KB":(bytes/1024/1024).toFixed(1)+" MB";}
export default async function DelegateDocumentsPage(){
 const {items,error}=await getMyDelegateData();
 const congressIds=[...new Set(items.map(x=>x.congressId))];
 let docs:DocRow[]=[];
 let loadError="";
 if(!error&&congressIds.length){
  const {data,error:readError}=await createAdminClient().from("documents")
   .select("id,congress_id,file_name,mime_type,byte_size,drive_file_id,created_at,delegate_visible")
   .in("congress_id",congressIds).eq("delegate_visible",true)
   .order("created_at",{ascending:false}).limit(500);
  if(readError)loadError="Chưa thể tải tài liệu. Ban Tổ chức cần hoàn tất cấu hình công bố tài liệu.";
  else docs=(data||[]) as DocRow[];
 }
 const names=new Map(items.map(item=>[item.congressId,item.congressName]));
 return <div className="mx-auto max-w-[950px]">
  <DelegatePageHeading eyebrow="THƯ VIỆN ĐẠI HỘI" title="Tài liệu Đại hội"
   description="Tài liệu được Ban Tổ chức công bố riêng cho đại biểu; xem PDF/hình ảnh hoặc tải tài liệu về thiết bị."
   icon={BookOpen}/>
  {error||loadError?<DelegateUnavailable message={error||loadError}/>:
   !items.length?<DelegateUnavailable/>:
   !docs.length?<section className="rounded-2xl border border-[#dbe6ed] bg-white px-6 py-14 text-center shadow-sm">
    <FolderOpen size={39} className="mx-auto text-[#a3b6c8]"/>
    <h2 className="mt-4 text-[17px] font-bold text-[#3d5877]">Chưa có tài liệu được công bố</h2>
    <p className="mt-2 text-[12px] leading-6 text-[#8a9bad]">Khi BTC chia sẻ tài liệu, danh sách sẽ tự xuất hiện tại đây.</p>
   </section>:
   <div className="grid gap-3 sm:grid-cols-2">
    {docs.map(doc=>{
     const Icon=fileIcon(doc.mime_type);
     const preview=doc.mime_type.startsWith("image/")||doc.mime_type==="application/pdf";
     return <article key={doc.id} className="group flex min-w-0 flex-col rounded-[17px] border border-[#dce7ee] bg-white p-5 shadow-[0_8px_24px_rgba(29,57,87,.045)] transition hover:border-[#bad4e0] hover:shadow-md">
      <div className="flex items-start gap-3">
       <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#eaf2f9] text-[#197da9]"><Icon size={23}/></span>
       <div className="min-w-0 flex-1">
        <h2 className="break-words text-[14px] font-extrabold leading-6 text-[#263f5f]">{doc.file_name}</h2>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-[#8295a8]">{names.get(doc.congress_id)||"Đại hội"}</p>
       </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8a9bad]">
       <span>{fileSize(doc.byte_size)}</span>
       <span>{new Date(doc.created_at).toLocaleDateString("vi-VN")}</span>
      </div>
      <div className="mt-5 flex gap-2 border-t border-[#edf2f5] pt-4">
       {preview&&<a href={"/api/documents/"+doc.id+"?inline=1"} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#0f779f] px-3 text-[12px] font-bold text-white"><ExternalLink size={16}/> Xem tài liệu</a>}
       <a href={"/api/documents/"+doc.id}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#d7e4eb] bg-[#f7fafc] px-3 text-[12px] font-bold text-[#46667e]"><Download size={16}/> Tải về</a>
      </div>
     </article>;
    })}
   </div>}
  <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] text-[#8fa0ae]">
   <ShieldCheck size={15}/> Chỉ hiển thị các tài liệu đã được Ban Tổ chức chia sẻ.
  </p>
  <div className="mt-4 text-center"><Link href="/my-card" className="text-[12px] font-bold text-[#187da5]">Về thẻ đại biểu</Link></div>
 </div>;
}
