"use client";
import {useState} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {BarChart3,ClipboardList,FileText,Layers3,LogOut,Menu,QrCode,Users,Settings2,UserRoundCog,X} from "lucide-react";
import {createClient} from "@/lib/supabase/browser";
export function AppShell({children,name,congressId,congressName,canManage=false}:{children:React.ReactNode;name:string;congressId?:string;congressName?:string;canManage?:boolean}){
 const [mobile,setMobile]=useState(false);const path=usePathname();const router=useRouter();
 const items=[{name:"Tổng quan",href:"/dashboard",icon:Layers3},
  ...(congressId?[{name:"Bảng điều hành",href:`/congresses/${congressId}`,icon:BarChart3},
   {name:"Đại biểu",href:`/congresses/${congressId}/delegates`,icon:Users},
   {name:"Điểm danh",href:`/congresses/${congressId}/attendance`,icon:QrCode},
   {name:"Báo cáo",href:`/congresses/${congressId}/reports`,icon:ClipboardList},
   {name:"Tài liệu",href:`/congresses/${congressId}/documents`,icon:FileText},
    ...(canManage?[{name:"Nhân sự BTC",href:`/congresses/${congressId}/team`,icon:UserRoundCog},
     {name:"Cấu hình",href:`/congresses/${congressId}/settings`,icon:Settings2}]:[])]:[])
 ];
 async function logout(){await createClient().auth.signOut();router.push("/login");router.refresh();}
 return <div className="min-h-screen lg:flex">
   {mobile&&<button onClick={()=>setMobile(false)} className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Đóng menu"/>}
   <aside className={`z-40 fixed inset-y-0 left-0 w-[265px] shrink-0 bg-[#0d2d48] text-white flex flex-col transition-transform lg:sticky lg:top-0 lg:h-screen ${mobile?"translate-x-0":"-translate-x-full lg:translate-x-0"}`}>
    <div className="p-6 border-b border-white/10 flex justify-between items-center">
      <Link href="/dashboard" className="font-extrabold text-lg flex items-center gap-2"><span className="p-2 bg-[#1c6888] rounded-lg"><Layers3 size={20}/></span>ĐẠI HỘI <span className="text-[#4fe0d3]">SỐ</span></Link>
      <button aria-label="Đóng" className="lg:hidden" onClick={()=>setMobile(false)}><X size={18}/></button>
    </div>
    {congressName&&<div className="px-6 pt-6 pb-4"><div className="uppercase text-[10px] tracking-[.2em] text-[#79a3bc] font-bold">Đại hội đang chọn</div><div className="text-sm font-bold mt-2 line-clamp-3">{congressName}</div></div>}
    <div className="px-4 pt-5 text-xs font-bold text-[#7da6bf] tracking-widest">ĐIỀU HƯỚNG</div>
    <nav className="p-3 space-y-1 flex-1">{items.map(({name,href,icon:Icon})=><Link key={href} href={href} onClick={()=>setMobile(false)} className={`flex gap-3 items-center rounded-xl px-4 py-3 text-sm font-semibold ${path===href?"bg-[#1c779b] text-white":"text-[#c2d5e1] hover:bg-white/10"}`}><Icon size={18}/>{name}</Link>)}</nav>
    <div className="p-5 border-t border-white/10"><div className="text-sm font-semibold truncate">{name||"Thành viên"}</div><div className="text-xs text-[#89aabf] mb-4">Tài khoản đã xác thực</div><button onClick={logout} className="flex items-center gap-2 text-sm text-[#c2d5e1] hover:text-white"><LogOut size={16}/> Đăng xuất</button></div>
   </aside>
   <div className="flex-1 min-w-0">
    <header className="h-[74px] bg-white border-b border-[#dfebf2] px-5 md:px-9 flex items-center justify-between sticky top-0 z-20">
      <div className="flex gap-3 items-center"><button aria-label="Mở menu" className="lg:hidden text-[#205874]" onClick={()=>setMobile(true)}><Menu/></button><div className="text-sm text-[#7990a4]"><span className="hidden sm:inline">Nền tảng điều hành / </span><b className="text-[#23455f]">{congressName??"Quản lý Đại hội"}</b></div></div>
      <div className="flex gap-2 items-center"><span className="h-2 w-2 bg-[#36bd8e] rounded-full"/><span className="text-xs text-[#6e8494]">Kết nối bảo mật</span></div>
    </header>
    <main className="px-5 md:px-9 py-8 max-w-[1500px] mx-auto">{children}</main>
   </div>
 </div>
}
