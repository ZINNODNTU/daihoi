import {notFound,redirect} from "next/navigation";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {DelegateAccountsClient} from "@/components/delegate-accounts-client";
import type {Delegate} from "@/lib/types";

export const dynamic="force-dynamic";
export default async function DelegateAccountsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 if(!(await hasRole(supabase,user.id,id,"admin")))notFound();
 const db=createAdminClient();
 const [records,congress]=await Promise.all([
  db.from("delegates").select("id,congress_id,code,full_name,unit,student_id,position,login_email,auth_user_id,delegate_type,gender,birth_date,qr_version,barcode_code,is_active,photo_path")
   .eq("congress_id",id).order("full_name").limit(700),
  db.from("congresses").select("slug").eq("id",id).maybeSingle()
 ]);
 if(records.error)throw new Error("Không tải được danh sách tài khoản đại biểu.");
 return <DelegateAccountsClient congressId={id} congressCode={congress.data?.slug||id}
  delegates={(records.data||[]) as Delegate[]}/>;
}
