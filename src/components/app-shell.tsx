"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {
  Armchair,ArrowRight,BarChart3,ChevronDown,ChevronRight,ClipboardList,FileText,
  LayoutGrid,LogOut,Menu,QrCode,Settings2,UserRoundCog,Users,X,IdCard
} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {createClient} from "@/lib/supabase/browser";

type NavItem={name:string;href:string;icon:typeof LayoutGrid};
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
  const overview:NavItem={name:"Tổng quan hệ thống",href:"/dashboard",icon:LayoutGrid};
  const myCard:NavItem={name:"Thẻ đại biểu của tôi",href:"/my-card",icon:IdCard};
  const congressItems:NavItem[]=congressId?[
    {name:"Bảng điều hành",href:"/congresses/"+congressId,icon:BarChart3},
    {name:"Đại biểu",href:"/congresses/"+congressId+"/delegates",icon:Users},
    {name:"Sơ đồ ghế",href:"/congresses/"+congressId+"/seating",icon:Armchair},
    {name:"Điểm danh",href:"/congresses/"+congressId+"/attendance",icon:QrCode},
    {name:"Báo cáo",href:"/congresses/"+congressId+"/reports",icon:ClipboardList},
    {name:"Tài liệu",href:"/congresses/"+congressId+"/documents",icon:FileText}
  ]:[];
  const adminItems:NavItem[]=canManage&&congressId?[
    {name:"Nhân sự BTC",href:"/congresses/"+congressId+"/team",icon:UserRoundCog},
    {name:"Cấu hình",href:"/congresses/"+congressId+"/settings",icon:Settings2}
  ]:[];
  const items=[overview,myCard,...congressItems,...adminItems];
  const active=items.find(x=>x.href===path)||overview;
  const displayName=name.trim()||"Thành viên BTC";
  const avatar=displayName.charAt(0).toLocaleUpperCase("vi");

  useEffect(()=>{
    if(!mobile)return;
    const old=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setMobile(false);};
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",onKey);};
  },[mobile]);

  async function logout(){
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function navLink(item:NavItem){
    const current=path===item.href;
    const Icon=item.icon;
    return <Link key={item.href} href={item.href} onClick={()=>setMobile(false)}
      aria-current={current?"page":undefined}
      className={"nav-item "+(current?"nav-item-active":"")}>
      <Icon size={18} strokeWidth={current?2.05:1.7}/>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {current&&<span className="nav-active-mark" aria-hidden="true"/>}
    </Link>;
  }

  return <div className="app-layout min-h-dvh lg:flex">
    <a href="#noi-dung-chinh" className="skip-link">Bỏ qua điều hướng đến nội dung</a>
    {mobile&&<button type="button" aria-label="Đóng bảng điều hướng" onClick={()=>setMobile(false)}
      className="fixed inset-0 z-40 bg-[#0c1526]/65 backdrop-blur-[2px] lg:hidden"/>}

    <aside id="main-sidebar" aria-label="Điều hướng chính"
      className={"app-sidebar fixed inset-y-0 left-0 z-50 flex w-[266px] max-w-[87vw] shrink-0 flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 "+(mobile?"translate-x-0":"-translate-x-full")}>
      <div className="flex h-[83px] items-center justify-between border-b border-white/10 px-5">
        <Link href="/dashboard" onClick={()=>setMobile(false)}
          aria-label="Đại hội số — Tổng quan" className="flex min-w-0 items-center gap-3">
          <BrandMark/>
          <span className="min-w-0 leading-tight">
            <span className="block text-[16px] font-bold tracking-[-.035em] text-white">Đại hội số<span className="ml-1.5 text-[#ffd052]">.</span></span>
            <span className="mt-1 block text-[9px] font-medium uppercase tracking-[.17em] text-[#91a0ba]">NỀN TẢNG ĐẠI HỘI</span>
          </span>
        </Link>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#c0ccdb] hover:bg-white/10 lg:hidden"
          aria-label="Đóng menu" onClick={()=>setMobile(false)}><X size={19}/></button>
      </div>
      <div className="app-sidebar-scroll flex-1 overflow-y-auto px-3.5 pb-4">
        <div className="pt-7">
          <p className="sidebar-group-label">Hệ thống</p>
          <nav aria-label="Hệ thống">{navLink(overview)}{navLink(myCard)}</nav>
        </div>

        {congressId&&<>
          <div className="sidebar-congress-switch mt-7">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[.13em] text-[#acbad1]">ĐẠI HỘI ĐANG CHỌN</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#e2b969]"/>
            </div>
            <p className="mt-3 line-clamp-2 text-[13px] font-semibold leading-[1.55] text-white">{congressName||"Đại hội"}</p>
            <Link href="/dashboard" onClick={()=>setMobile(false)}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#c4d4ed] hover:text-white">
              Chuyển Đại hội <ChevronDown size={13}/>
            </Link>
          </div>
          <nav aria-label="Các chức năng Đại hội" className="mt-7">
            <p className="sidebar-group-label">Nghiệp vụ</p>
            <div className="space-y-1">{congressItems.map(navLink)}</div>
          </nav>
        </>}

        {adminItems.length>0&&<nav aria-label="Quản trị Đại hội" className="mt-7">
          <p className="sidebar-group-label">Quản trị</p>
          <div className="space-y-1">{adminItems.map(navLink)}</div>
        </nav>}

        <div className="mx-2 mt-10 border-t border-white/10 pt-5">
          <div className="flex items-center gap-2.5 text-[11px] text-[#9aaac3]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d6b376]"/>
            Không gian điều hành nội bộ
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-white/10 text-[12px] font-bold text-white">{avatar}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-white">{displayName}</p>
            <p className="mt-1 text-[10px] text-[#9aaac3]">Tài khoản Đại hội</p>
          </div>
          <button type="button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[#b4c2d6] hover:bg-white/10 hover:text-white">
            <LogOut size={17}/>
          </button>
        </div>
      </div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="app-topbar sticky top-0 z-30 flex h-[65px] shrink-0 items-center justify-between gap-4 px-4 sm:px-7 lg:h-[83px] xl:px-10">
        <div className="flex min-w-0 items-center gap-3.5">
          <button type="button" aria-label="Mở menu điều hướng" aria-expanded={mobile} aria-controls="main-sidebar"
            onClick={()=>setMobile(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#e1e6ee] bg-white text-[#36455e] lg:hidden">
            <Menu size={20}/>
          </button>
          <div className="min-w-0">
            <div className="hidden items-center gap-2 text-[11px] text-[#8996a8] sm:flex">
              <Link href="/dashboard" className="hover:text-[#007eaf]">Workspace</Link>
              <ChevronRight size={12} className="text-[#c0cad6]"/>
              {congressName&&<><span className="max-w-[220px] truncate">{congressName}</span><ChevronRight size={12} className="text-[#c0cad6]"/></>}
              <span>{active.name}</span>
            </div>
            <p className="truncate text-[14px] font-bold tracking-[-.025em] text-[#202c40] sm:mt-1.5 sm:text-[15px]">{active.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {congressId&&<Link href={"/congresses/"+congressId+"/attendance"} className="btn btn-secondary !min-h-9 hidden !text-[11px] md:inline-flex">
            <QrCode size={15}/> Điểm danh nhanh <ArrowRight size={13}/>
          </Link>}
          <span className="hidden h-7 w-px bg-[#e6eaf1] md:block"/>
          <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#dfe5ee] bg-[#edf1f8] text-[12px] font-bold text-[#32476a]" title={displayName}>{avatar}</div>
        </div>
      </header>

      <main id="noi-dung-chinh" className="mx-auto w-full max-w-[1570px] min-w-0 flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pt-8 lg:px-8 lg:pb-14 xl:px-10 xl:pt-9">
        {children}
      </main>
      <footer className="hidden items-center justify-between border-t border-[#e5e9ef] px-10 py-3 text-[10px] text-[#929eae] lg:flex">
        <span>ĐẠI HỘI SỐ / Hệ thống điều hành</span>
        <span>Không gian dành cho Ban Tổ chức</span>
      </footer>
    </div>

    {congressId&&<nav aria-label="Điều hướng nhanh trên điện thoại"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e4e8ef] bg-white px-1 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
      {[congressItems[0],congressItems[1],congressItems[2],congressItems[3],congressItems[4]].map(({name,href,icon:Icon})=>{
        const current=path===href;
        return <Link key={href} href={href} aria-current={current?"page":undefined}
          className={"flex min-h-[57px] flex-col items-center justify-center gap-1 rounded-[8px] px-0.5 text-[10px] font-semibold "+(current?"text-[#2858ca]":"text-[#8894a7]")}>
          <Icon size={20} strokeWidth={current?2.2:1.7}/>
          <span className="max-w-full truncate">{name==="Bảng điều hành"?"Tổng quan":name==="Sơ đồ ghế"?"Sơ đồ":name}</span>
        </Link>;
      })}
    </nav>}
  </div>;
}
