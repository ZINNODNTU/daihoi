import {History} from "lucide-react";
import {redirect} from "next/navigation";
import {getPortalViewerAuth} from "@/lib/auth";
import {loadDelegateHistory} from "@/lib/delegate-history";
import {getPortalAbilities} from "@/lib/rbac-server";
import {getPortalCongressAccess} from "@/lib/portal-congress-access";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateHistoryList} from "@/components/delegate-history-list";

export const dynamic="force-dynamic";
export default async function DelegateHistoryPage(){
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 let data:Awaited<ReturnType<typeof loadDelegateHistory>>;
 try{data=await loadDelegateHistory(user.id);}
 catch{return <DelegateUnavailable message="Không tải được đầy đủ lịch sử điểm danh. Vui lòng thử lại hoặc liên hệ Ban Tổ chức."/>;}
 const access=await getPortalCongressAccess(user.id);
  const rights=await Promise.all(data.congresses.map(c=>
   getPortalAbilities(user.id,c.id,access.delegateCongressIds.includes(c.id)?"delegate":"guest")));
  const allowedIds=new Set(data.congresses.filter((c,i)=>rights[i].includes("portal.history")).map(c=>c.id));
  if(!allowedIds.size)return <DelegateUnavailable message="Tài khoản không có quyền xem lịch sử điểm danh."/>;
  return <div className="mx-auto max-w-[850px]">
  <DelegatePageHeading eyebrow="HỒ SƠ / LỊCH SỬ" title="Lịch sử điểm danh"
   description="Toàn bộ lượt điểm danh của tài khoản trên tất cả Đại hội, kể cả những hồ sơ đã ngừng hoạt động."
   icon={History}/>
  <DelegateHistoryList history={data.history.filter(h=>allowedIds.has(h.congressId))} congresses={data.congresses.filter(c=>allowedIds.has(c.id))} initialCongressId=""/>
 </div>;
}