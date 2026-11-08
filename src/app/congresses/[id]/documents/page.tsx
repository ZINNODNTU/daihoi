import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {DocumentsClient} from "@/components/documents-client";
import type {DocRow} from "@/lib/types";

export const dynamic="force-dynamic";

export default async function DocumentsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user||!(await hasRole(supabase,user.id,id,"viewer")))
  return <section role="alert" className="card p-6 text-sm text-red-700">
   Bạn không có quyền truy cập thư viện tài liệu của Đại hội này.
  </section>;
 const canManage=await hasRole(supabase,user.id,id,"admin");
 const {data,error}=await createAdminClient().from("documents").select("*")
  .eq("congress_id",id).order("created_at",{ascending:false}).limit(800);
 if(error)return <section role="alert" className="card p-6 text-sm text-red-700">
  Không thể tải thư viện tài liệu. Hãy kiểm tra bảng documents và nâng cấp Supabase v14.
 </section>;
 return <DocumentsClient congressId={id} docs={(data||[]) as DocRow[]} canManage={canManage}/>;
}
