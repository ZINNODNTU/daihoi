import Link from "next/link";
import {BookOpen,ShieldCheck} from "lucide-react";
import {getPortalViewerAuth} from "@/lib/auth";
import {redirect} from "next/navigation";
import {getPortalCongressContext} from "@/lib/active-congress";
import {createAdminClient} from "@/lib/supabase/admin";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateDocumentsList} from "@/components/delegate-documents-list";
import type {DocRow} from "@/lib/types";

export const dynamic="force-dynamic";
export default async function DelegateDocumentsPage(){
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 let context:Awaited<ReturnType<typeof getPortalCongressContext>>;
 try{context=await getPortalCongressContext(user.id);}
 catch{return <DelegateUnavailable message="Không xác minh được quyền xem tài liệu. Vui lòng thử lại."/>;}
 const congressId=context.activeCongressId;
 if(!congressId)redirect("/my-card");
 // A cookie is never authorization: getPortalCongressContext validates it
 // against current delegate / guest membership every time.
 const congress=context.options.find(item=>item.id===congressId);
 if(!congress)return <DelegateUnavailable message="Không có quyền xem tài liệu Đại hội này."/>;
 const db=createAdminClient();
 const result=await db.from("documents")
  .select("id,congress_id,file_name,mime_type,byte_size,drive_file_id,created_at,delegate_visible,display_order")
  .eq("congress_id",congressId).eq("delegate_visible",true)
  .order("display_order",{ascending:true}).order("created_at",{ascending:false}).limit(500);
 const docs=(result.data||[]) as DocRow[];
 return <div className="mx-auto max-w-[950px]">
  <DelegatePageHeading eyebrow="THƯ VIỆN ĐẠI HỘI" title="Tài liệu Đại hội"
   description={"Tài liệu được công bố tại "+congress.name+". Điểm danh và lịch sử vẫn dùng chung tài khoản."}
   icon={BookOpen}/>
  {result.error?<DelegateUnavailable message="Chưa thể tải danh sách tài liệu của Đại hội này."/>:
   <DelegateDocumentsList docs={docs} congresses={[{id:congress.id,name:congress.name}]} initialCongressId={congressId}/>}
  <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] leading-5 text-[#869ba9]">
   <ShieldCheck size={15}/> Chỉ tài liệu BTC đã công bố trong Đại hội này mới xuất hiện.
  </p>
  <div className="mt-4 text-center"><Link href="/my-card" className="text-[12px] font-bold text-[#187da5]">Về thẻ đại biểu</Link></div>
 </div>;
}
