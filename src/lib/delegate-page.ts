import "server-only";
import {redirect} from "next/navigation";
import {getPortalViewerAuth} from "@/lib/auth";
import {loadDelegatePortal,type PortalDelegate} from "@/lib/delegate-portal";
import {cache} from "react";

export type DelegateData={items:PortalDelegate[];error:string|null};
export const getMyDelegateData=cache(async ():Promise<DelegateData>=>{
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 try{return {items:await loadDelegatePortal(user.id),error:null};}
 catch{return {items:[],error:"Không thể tải hồ sơ từ máy chủ. Vui lòng thử lại hoặc liên hệ Ban Tổ chức."};}
});
