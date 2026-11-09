import "server-only";
import {cookies} from "next/headers";
import {cache} from "react";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPortalCongressAccess} from "@/lib/portal-congress-access";

export const ACTIVE_CONGRESS_COOKIE="daihoi_active_congress";

export type PortalCongressChoice={
 id:string;name:string;term:string;status:string;kind:"doan"|"hoi_sinh_vien";asDelegate:boolean;asGuest:boolean;
};
export type PortalCongressContext={
 options:PortalCongressChoice[];activeCongressId:string|null;
 delegateCongressIds:string[];guestCongressIds:string[];
};

/** Read the persisted selection only after verifying membership by the current Auth user. */
export const getPortalCongressContext=cache(async (userId:string):Promise<PortalCongressContext>=>{
 const access=await getPortalCongressAccess(userId);
 const ids=access.congressIds;
 if(!ids.length)return {options:[],activeCongressId:null,
  delegateCongressIds:[],guestCongressIds:[]};
 const db=createAdminClient();
 const {data,error}=await db.from("congresses")
  .select("id,name,term,status,kind").in("id",ids).limit(100);
 if(error)throw new Error("Không tải được danh sách Đại hội.");
 const delegated=new Set(access.delegateCongressIds);
 const guests=new Set(access.guestCongressIds);
 const options=(data||[]).map(c=>({
  id:c.id,name:c.name,term:c.term||"",status:c.status||"",kind:c.kind||"doan",
  asDelegate:delegated.has(c.id),asGuest:guests.has(c.id)
 })).sort((a,b)=>a.name.localeCompare(b.name,"vi"));
 const value=(await cookies()).get(ACTIVE_CONGRESS_COOKIE)?.value||"";
 return {options,activeCongressId:options.some(c=>c.id===value)?value:null,
  delegateCongressIds:access.delegateCongressIds,
  guestCongressIds:access.guestCongressIds};
});

export async function getSelectedCongressId(userId:string){
 const context=await getPortalCongressContext(userId);
 return context.activeCongressId;
}
