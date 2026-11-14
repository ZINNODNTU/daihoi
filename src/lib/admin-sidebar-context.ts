import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";

export type AdminSidebarCongress={
 id:string;name:string;kind:"doan"|"hoi_sinh_vien";
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Global Admin routes must retain a congress navigation context to render
 * the SAME complete Admin sidebar as the Congress workspace.
 * All callers must have already verified Super Admin. Never use this helper
 * to grant congress permissions or expose cross-congress data.
 */
export async function resolveAdminSidebarCongress(
 db:SupabaseClient,requestedId?:string
):Promise<AdminSidebarCongress|null>{
 const select="id,name,kind,status";
 if(requestedId){
  if(!UUID.test(requestedId))return null;
  const {data,error}=await db.from("congresses").select(select)
   .eq("id",requestedId).maybeSingle();
  if(error||!data)return null;
  return {id:data.id,name:data.name,kind:data.kind};
 }
 // Prefer a live congress so the Admin immediately sees useful navigation.
 // Neither this choice nor the sidebar is an authorization decision.
 const {data,error}=await db.from("congresses").select(select)
  .order("created_at",{ascending:false}).limit(100);
 if(error||!data?.length)return null;
 const item=data.find(value=>value.status==="live")||data[0];
 return {id:item.id,name:item.name,kind:item.kind};
}
