import Link from "next/link";
import {BookOpen,ExternalLink,FileImage,FileSpreadsheet,FileText,FolderOpen,Presentation,ShieldCheck} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {createAdminClient} from "@/lib/supabase/admin";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import type {DocRow} from "@/lib/types";

export const dynamic="force-dynamic";
function fileIcon(mime:string){
 return mime.startsWith("image/")?FileImage:
  mime.includes("spreadsheet")||mime==="application/vnd.ms-excel"?FileSpreadsheet:
  mime.includes("presentation")||mime==="application/vnd.ms-powerpoint"?Presentation:FileText;
}
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
  if(readError)loadError="Chưa tải được danh sách. Ban Tổ chức cần hoàn tất cấu hình tài liệu.";
  else docs=(data||[]) as DocRow[];
 }
 const congressNames=new Map(items.map(item=>[item.congressId,item.congressName]));
 return <div className="mx-auto max-w-[950px]">
  <DelegatePageHeading eyebrow="THƯ VIỆN ĐẠI HỘI" title="Tài liệu Đại hội"
   description="Chọn tên tài liệu để mở và xem trực tiếp trên Google Drive. Website chỉ hiển thị danh sách, không tải nội dung file."
   icon={BookOpen}/>
  {error||loadError?<DelegateUnavailable message={error||loadError}/>:
   !items.length?<DelegateUnavailable/>:
   !docs.length?<section className="rounded-2xl border border-[#dbe6ed] bg-white px-6 py-14 text-center shadow-sm">
    <FolderOpen size={39} className="mx-auto text-[#a3b6c8]"/>
    <h2 className="mt-4 text-[17px] font-bold text-[#3d5877]">Chưa có tài liệu được công bố</h2>
    <p className="mt-2 text-[12px] leading-6 text-[#8a9bad]">Khi BTC chia sẻ tài liệu, danh sách sẽ tự xuất hiện tại đây.</p>
   </section>:
   <section className="rounded-[18px] border border-[#dbe6ee] bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5eef2] pb-4">
     <h2 className="text-[15px] font-extrabold text-[#274b62]">Danh sách tài liệu</h2>
     <span className="rounded-full bg-[#e9f4fa] px-3 py-1.5 text-[12px] font-bold text-[#257ca2]">{docs.length} tệp</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
     {docs.map(doc=>{
      const Icon=fileIcon(doc.mime_type);
      return <a key={doc.id} href={"/api/documents/"+doc.id} target="_blank"
       rel="noopener noreferrer" aria-label={"Mở "+doc.file_name+" trên Google Drive"}
       className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#e1eaf0] bg-[#fbfdfe] px-3.5 py-3.5 transition-colors hover:border-[#a8cadc] hover:bg-[#eef7fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147aa5]">
       <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-[#e8f2f9] text-[#237eaa]">
        <Icon size={22}/></span>
       <span className="min-w-0 flex-1">
        <span className="block break-words text-[13px] font-extrabold leading-5 text-[#284660]">{doc.file_name}</span>
        <span className="mt-1 block text-[10px] leading-4 text-[#8ba0af]">{congressNames.get(doc.congress_id)||"Đại hội"}</span>
       </span>
       <ExternalLink size={17} className="shrink-0 text-[#7a9aab] group-hover:text-[#177ca7]"/>
      </a>;
     })}
    </div>
   </section>}
  <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[#869ba9]">
   <ShieldCheck size={15}/> Google Drive mở trong tab mới. Tài liệu đã công bố có quyền xem bằng đường liên kết.
  </p>
  <div className="mt-4 text-center"><Link href="/my-card" className="text-[12px] font-bold text-[#187da5]">Về thẻ đại biểu</Link></div>
 </div>;
}
