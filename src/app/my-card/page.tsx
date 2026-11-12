import Link from "next/link";
import {BookOpen,IdCard,Users} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {getPortalViewerAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import {MyDelegateCards} from "@/components/my-delegate-cards";
import {PortalCongressPicker} from "@/components/portal-congress-picker";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {redirect} from "next/navigation";
import {hasPortalAbility} from "@/lib/rbac-server";

export const dynamic="force-dynamic";

export default async function MyCardPage(){
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 let context:Awaited<ReturnType<typeof getPortalCongressContext>>;
 try{context=await getPortalCongressContext(user.id);}
 catch{return <DelegateUnavailable message="Không tải được danh sách Đại hội. Vui lòng tải lại trang."/>;}
 if(!context.options.length)return <DelegateUnavailable message="Tài khoản chưa được cấp quyền vào Đại hội nào. Hãy liên hệ Ban Tổ chức."/>;
 if(!context.activeCongressId)return <PortalCongressPicker variant="welcome" options={context.options} activeId={null}/>;

 const selected=context.options.find(c=>c.id===context.activeCongressId)!;
 // Guest access never creates a delegate identity, barcode or seat.
 if(!context.delegateCongressIds.includes(selected.id)){
   const [canBch,canDocuments]=await Promise.all([
    hasPortalAbility(user.id,selected.id,"portal.bch"),
    hasPortalAbility(user.id,selected.id,"portal.documents")
   ]);
  const selectedQuery="?congressId="+encodeURIComponent(selected.id);
  return <div className="mx-auto max-w-[850px]">
   <DelegatePageHeading eyebrow="CỔNG KHÁCH MỜI" title={selected.name}
    description="Bạn đang xem nội dung Đại hội với quyền khách mời. Chỉ tài liệu đã công bố và danh sách ứng viên BCH được phép xem."
    icon={Users}/>
   <div className="grid gap-3 sm:grid-cols-2">
    {canBch&&<Link href={"/my-card/bch"+selectedQuery} className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#d8e6ed] bg-white p-5 font-bold text-[#24516d] shadow-sm">
     <Users size={25} className="text-[#167ca5]"/> Danh sách ứng viên BCH
    </Link>}
    {canDocuments&&<Link href={"/my-card/documents"+selectedQuery} className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#d8e6ed] bg-white p-5 font-bold text-[#24516d] shadow-sm">
     <BookOpen size={25} className="text-[#167ca5]"/> Tài liệu Đại hội
    </Link>}
   </div>
  </div>;
 }
 if(!(await hasPortalAbility(user.id,selected.id,"portal.card")))
   return <DelegateUnavailable message="Tài khoản không có quyền xem thẻ tại Đại hội này."/>;
  const {items,error}=await getMyDelegateData();
 const visible=items.filter(item=>item.congressId===selected.id);
 return <div>
  <DelegatePageHeading eyebrow="CỔNG ĐẠI BIỂU / THẺ ĐIỆN TỬ"
   title="Thẻ đại biểu" description={"Đại hội: "+selected.name+". Mã đại biểu, mã vạch và vị trí ghế dành riêng cho Đại hội này."} icon={IdCard}/>
  {error?<DelegateUnavailable message={error}/>:
   visible.length?<MyDelegateCards items={visible}/>:
   <DelegateUnavailable message="Chưa tìm thấy thẻ đại biểu của bạn tại Đại hội này."/>}
 </div>;
}
