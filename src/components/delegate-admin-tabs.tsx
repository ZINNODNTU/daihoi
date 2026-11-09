import Link from "next/link";
import {IdCard,KeyRound} from "lucide-react";

export function DelegateAdminTabs({congressId,active,canManage}:{
 congressId:string;active:"delegates"|"accounts";canManage:boolean
}){
 const tabs=[
  {id:"delegates",label:"Quản lý đại biểu",icon:IdCard,href:"/congresses/"+congressId+"/delegates"},

  ...(canManage?[{id:"accounts",label:"Quản lý tài khoản đại biểu",icon:KeyRound,href:"/congresses/"+congressId+"/delegates/accounts"}]:[])
 ];
 return <nav aria-label="Phân hệ quản lý đại biểu" className="mb-5 flex flex-wrap gap-2 rounded-[15px] border border-[#dce8ee] bg-white p-2 shadow-sm">
  {tabs.map(({id,label,icon:Icon,href})=><Link key={id} href={href} aria-current={active===id?"page":undefined}
   className={"inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-center text-[12px] font-extrabold transition sm:flex-none sm:px-5 "+
    (active===id?"bg-[#15617a] text-white shadow-[0_5px_15px_rgba(20,82,109,.18)]":"text-[#517488] hover:bg-[#eaf3f6]")}>
   <Icon size={18}/>{label}
  </Link>)}
 </nav>;
}