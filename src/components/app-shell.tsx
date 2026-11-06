"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {
  ArrowUpRight,BarChart3,ChevronDown,ClipboardList,FileText,Home,
  Armchair,Layers3,LogOut,Menu,QrCode,Settings2,UserRoundCog,Users,X
} from "lucide-react";
import {createClient} from "@/lib/supabase/browser";

type NavItem={name:string;href:string;icon:typeof Home};
type Props={
  children:React.ReactNode;
  name:string;
  congressId?:string;
  congressName?:string;
  canManage?:boolean;
};

export function AppShell({children,name,congressId,congressName,canManage=false}:Props){
  const [mobile,setMobile]=useState(false);
  const path=usePathname();
  const router=useRouter();
  const home:NavItem={name:"Tổng quan hệ thống",href:"/dashboard",icon:Layers3};
  const congressItems:NavItem[]=congressId?[
    {name:"Bảng điều hành",href:`/congresses/${congressId}`,icon:BarChart3},
    {name:"Đại biểu",href:`/congresses/${congressId}/delegates`,icon:Users},
    {name:"Sơ đồ ghế",href:`/congresses/${congressId}/seating`,icon:Armchair},
    {name:"Điểm danh",href:`/congresses/${congressId}/attendance`,icon:QrCode},
    {name:"Báo cáo",href:`/congresses/${congressId}/reports`,icon:ClipboardList},
    {name:"Tài liệu",href:`/congresses/${congressId}/documents`,icon:FileText},
    ...(canManage?[
      {name:"Nhân sự BTC",href:`/congresses/${congressId}/team`,icon:UserRoundCog},
      {name:"Cấu hình",href:`/congresses/${congressId}/settings`,icon:Settings2}
    ]:[])
  ]:[];
  const items=[home,...congressItems];
  const active=items.find(x=>x.href===path)||home;
  const avatar=(name.trim().charAt(0)||"Đ").toLocaleUpperCase("vi");

  useEffect(()=>{
    if(!mobile)return;
    const original=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setMobile(false);};
    window.addEventListener("keydown",onKey);
    return()=>{
      document.body.style.overflow=original;
      window.removeEventListener("keydown",onKey);
    };
  },[mobile]);

  async function logout(){
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <div className="app-layout min-h-dvh lg:flex">
    <a href="#noi-dung-chinh" className="skip-link">Bỏ qua điều hướng đến nội dung</a>

    {mobile&&<button
      type="button"
      aria-label="Đóng bảng điều hướng"
      className="fixed inset-0 z-40 bg-[#07192b]/70 backdrop-blur-[2px] lg:hidden"
      onClick={()=>setMobile(false)}
    />}

    <aside
      id="main-sidebar"
      aria-label="Điều hướng chính"
      className={`app-sidebar fixed inset-y-0 left-0 z-50 flex w-[282px] max-w-[86vw] shrink-0 flex-col text-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 ${mobile?"translate-x-0":"-translate-x-full"}`}
    >
      <div className="flex min-h-[88px] items-center justify-between border-b border-white/10 px-6">
        <Link href="/dashboard" onClick={()=>setMobile(false)} className="flex items-center gap-3" aria-label="ĐẠI HỘI SỐ - trang tổng quan">
          <span className="brand-icon"><Layers3 size={22} strokeWidth={2.2}/></span>
          <span className="leading-tight"><span className="block text-[17px] font-black tracking-[.075em]">ĐẠI HỘI <span className="text-[#70eee3]">SỐ</span></span><span className="block text-[10px] font-semibold tracking-[.20em] text-[#a9c4d5]">HỆ THỐNG ĐIỀU HÀNH</span></span>
        </Link>
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#d6e7ef] hover:bg-white/10 lg:hidden" aria-label="Đóng menu" onClick={()=>setMobile(false)}><X size={21}/></button>
      </div>

      <div className="app-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {congressName&&<div className="mx-2 mt-6 rounded-[18px] border border-white/10 bg-white/[.065] p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#93c4cf]"><span className="h-2 w-2 rounded-full bg-[#56dfc8]"/> Đại hội đang chọn</div>
          <p className="line-clamp-3 text-sm font-bold leading-relaxed text-white">{congressName}</p>
          <Link href="/dashboard" onClick={()=>setMobile(false)} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#96e8e3] hover:text-white">Đổi Đại hội <ChevronDown size={14}/></Link>
        </div>}

        <p className="px-5 pb-2 pt-7 text-[10px] font-extrabold tracking-[.18em] text-[#88aabf]">ĐIỀU HƯỚNG</p>
        <nav className="space-y-1" aria-label="Danh mục chức năng">
          {items.map(({name,href,icon:Icon})=>{
            const isActive=path===href;
            return <Link key={href} href={href} onClick={()=>setMobile(false)}
              aria-current={isActive?"page":undefined}
              className={`nav-item group ${isActive?"nav-item-active":""}`}>
              <Icon size={19} strokeWidth={isActive?2.3:1.9}/>
              <span className="min-w-0 flex-1">{name}</span>
              {isActive&&<span className="h-1.5 w-1.5 rounded-full bg-[#65e3d6]"/>}
            </Link>;
          })}
        </nav>

        <div className="mx-2 mt-7 rounded-2xl border border-white/10 bg-[#193c54] p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><QrCode size={17} className="text-[#68e5db]"/> Sẵn sàng điều hành</div>
          <p className="mt-2 text-xs leading-relaxed text-[#b3cad6]">Điểm danh theo phiên, tra cứu đại biểu và theo dõi báo cáo tại một nơi.</p>
          {congressId&&<Link href={`/congresses/${congressId}/attendance`} onClick={()=>setMobile(false)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#7bede2]">Mở điểm danh <ArrowUpRight size={15}/></Link>}
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3 rounded-xl p-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2e7186] text-sm font-extrabold">{avatar}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name||"Thành viên"}</p><p className="text-xs text-[#9fb7c9]">Tài khoản BTC</p></div>
          <button type="button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#d0e1ea] hover:bg-white/10 hover:text-white"><LogOut size={18}/></button>
        </div>
      </div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="app-topbar sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between gap-3 px-4 sm:px-6 lg:h-[80px] xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button"
            aria-label="Mở menu điều hướng"
            aria-expanded={mobile}
            aria-controls="main-sidebar"
            onClick={()=>setMobile(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#dce9ed] bg-white text-[#234a5f] shadow-sm lg:hidden">
            <Menu size={22}/>
          </button>
          <div className="min-w-0">
            <div className="hidden items-center gap-1.5 text-xs font-semibold text-[#7a90a1] sm:flex">
              <Link href="/dashboard" className="hover:text-[#0c777e]">Đại hội số</Link><span>/</span><span className="max-w-56 truncate">{congressName||"Hệ thống"}</span>
            </div>
            <p className="truncate text-sm font-extrabold text-[#173047] sm:mt-1 sm:text-base">{active.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-[#dce9e8] bg-[#f5faf9] px-3 py-1.5 text-xs font-semibold text-[#3c6d71] sm:inline-flex">Không gian quản trị</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4f4f1] text-sm font-extrabold text-[#0e7f79] lg:hidden">{avatar}</span>
          <span className="hidden h-10 w-10 items-center justify-center rounded-xl bg-[#e4f4f1] text-sm font-extrabold text-[#0e7f79] lg:flex">{avatar}</span>
        </div>
      </header>

      <main id="noi-dung-chinh" className="mx-auto w-full max-w-[1660px] min-w-0 flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-14 xl:px-10">
        {children}
      </main>
    </div>

    {congressId&&<nav aria-label="Điều hướng nhanh trên điện thoại" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e1eaeb] bg-white/95 px-2 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_35px_rgba(13,42,64,.08)] backdrop-blur-xl lg:hidden">
      {[congressItems[0],congressItems[1],congressItems[2],congressItems[3],congressItems[4]].filter(Boolean).map(({name,href,icon:Icon})=>{
        const isActive=path===href;
        return <Link key={href} href={href} aria-current={isActive?"page":undefined}
          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold ${isActive?"bg-[#e7f8f4] text-[#087e7c]":"text-[#6c8392]"}`}>
          <Icon size={21} strokeWidth={isActive?2.4:2}/>
          <span>{name==="Bảng điều hành"?"Tổng quan":name}</span>
        </Link>;
      })}
    </nav>}
  </div>;
}
