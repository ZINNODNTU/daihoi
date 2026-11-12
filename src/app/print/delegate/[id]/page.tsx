import {notFound,redirect} from "next/navigation";
import {getPortalViewerAuth} from "@/lib/auth";
import {getMyDelegateData} from "@/lib/delegate-page";
import {PrintDelegatePass} from "@/components/print-delegate-pass";

export const dynamic="force-dynamic";
const isUuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export default async function DelegatePrintPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!isUuid(id))notFound();
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login?next="+encodeURIComponent("/print/delegate/"+id));
 // Only server-verified delegate profiles linked to this authenticated account.
 const {items,error}=await getMyDelegateData();
 if(error)throw new Error("Không tải được hồ sơ thẻ đại biểu để in.");
 const item=items.find(delegate=>delegate.id===id);
 if(!item)notFound();
 return <>
  <style media="print">{`
   @page { size: A4 portrait; margin: 10mm; }
  `}</style>
  <PrintDelegatePass item={item}/>
 </>;
}
