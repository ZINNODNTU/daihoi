import {GuestAccessEntry,type GuestCongress} from "@/components/guest-access-entry";
import {loadAvailableGuestCongresses} from "@/lib/guest-congress-list";

export const dynamic="force-dynamic";
export default async function GuestPage(){
 let options:GuestCongress[];
 try{options=await loadAvailableGuestCongresses();}
 catch{
  return <main role="alert" className="mx-auto max-w-xl p-8 text-center text-sm text-red-700">Không tải được danh sách Đại hội. Vui lòng thử lại sau.</main>;
 }
 return <GuestAccessEntry options={options}/>;
}
