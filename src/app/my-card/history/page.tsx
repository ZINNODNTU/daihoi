import {History} from "lucide-react";
import {redirect} from "next/navigation";
import {getAuth} from "@/lib/auth";
import {loadDelegateHistory} from "@/lib/delegate-history";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateHistoryList} from "@/components/delegate-history-list";

export const dynamic="force-dynamic";
export default async function DelegateHistoryPage(){
 const {user}=await getAuth();
 if(!user)redirect("/login");
 let data:Awaited<ReturnType<typeof loadDelegateHistory>>;
 try{data=await loadDelegateHistory(user.id);}
 catch{return <DelegateUnavailable message="Không tải được đầy đủ lịch sử điểm danh. Vui lòng thử lại hoặc liên hệ Ban Tổ chức."/>;}
 return <div className="mx-auto max-w-[850px]">
  <DelegatePageHeading eyebrow="HỒ SƠ / LỊCH SỬ" title="Lịch sử điểm danh"
   description="Toàn bộ lượt điểm danh của tài khoản trên tất cả Đại hội, kể cả những hồ sơ đã ngừng hoạt động."
   icon={History}/>
  <DelegateHistoryList history={data.history} congresses={data.congresses} initialCongressId=""/>
 </div>;
}
