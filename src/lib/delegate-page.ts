import "server-only";
import {redirect} from "next/navigation";
import {getAuth} from "@/lib/auth";
import {loadDelegatePortal,type PortalDelegate} from "@/lib/delegate-portal";

export type DelegateData={items:PortalDelegate[];error:string|null};
export async function getMyDelegateData():Promise<DelegateData>{
 const {user}=await getAuth();
 if(!user)redirect("/login");
 try{return {items:await loadDelegatePortal(user.id),error:null};}
 catch{return {items:[],error:"Không thể tải hồ sơ từ máy chủ. Vui lòng thử lại hoặc liên hệ Ban Tổ chức."};}
}
