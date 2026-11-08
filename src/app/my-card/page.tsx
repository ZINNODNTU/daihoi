import {IdCard} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {MyDelegateCards} from "@/components/my-delegate-cards";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";

export const dynamic="force-dynamic";
export default async function MyCardPage(){
 const {items,error}=await getMyDelegateData();
 return <div>
  <DelegatePageHeading eyebrow="CỔNG ĐẠI BIỂU / THẺ ĐIỆN TỬ"
   title="Thẻ đại biểu"
   description="Thẻ định danh chính thức của bạn. Xuất trình barcode khi Ban Tổ chức yêu cầu."
   icon={IdCard}/>
  {error?<DelegateUnavailable message={error}/>:
   items.length?<MyDelegateCards items={items}/>:<DelegateUnavailable/>}
 </div>;
}
