import {IdCard} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {getPortalViewerAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import {MyDelegateCards} from "@/components/my-delegate-cards";
import {PortalCongressPicker} from "@/components/portal-congress-picker";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {redirect} from "next/navigation";
import {getPortalAbilities,hasPortalAbility} from "@/lib/rbac-server";
import {currentPortalPreview} from "@/lib/portal-preview-context";

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
 const guestView=!selected.asDelegate;
  const allowedAbilities=await getPortalAbilities(user.id,selected.id,guestView?"guest":"delegate");
  if(!(await hasPortalAbility(user.id,selected.id,"portal.card")))
   return <DelegateUnavailable message="Tài khoản không có quyền xem thẻ tại Đại hội này."/>;
  const {items,error}=await getMyDelegateData();
 const visible=items.filter(item=>item.congressId===selected.id);
 return <div>
  <DelegatePageHeading eyebrow={guestView?"CỔNG KHÁCH MỜI / THẺ ĐIỆN TỬ":"CỔNG ĐẠI BIỂU / THẺ ĐIỆN TỬ"}
   title="Thẻ đại biểu" description={"Đại hội: "+selected.name+". "+(guestView?"Thẻ dành cho khách mời, có thông tin định danh và vị trí ghế nếu đã được bố trí.":"Mã đại biểu, mã vạch và vị trí ghế dành riêng cho Đại hội này.")} icon={IdCard}/>
  {error?<DelegateUnavailable message={error}/>:
   visible.length?<MyDelegateCards items={visible} readOnly={Boolean(currentPortalPreview())} allowedAbilities={allowedAbilities}/>:
   <DelegateUnavailable message={guestView?"Chưa có hồ sơ thẻ khách mời liên kết tài khoản này. Hãy liên hệ Ban Tổ chức để cấp thẻ.":"Chưa tìm thấy thẻ đại biểu của bạn tại Đại hội này."}/>}
 </div>;
}
