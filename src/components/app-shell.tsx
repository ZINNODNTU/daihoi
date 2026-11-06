"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {
  Armchair,BarChart3,ChevronDown,ClipboardList,FileText,
  LayoutGrid,LogOut,Menu,QrCode,Settings2,UserRoundCog,Users,X
} from "lucide-react";
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
  const items=[overview,...congressItems,...adminItems];
  const active=items.find(x=>x.href===path)||overview;
  const avatar=(name.trim().charAt(0)||"Đ").toLocaleUpperCase("vi");
  const displayName=name.trim()||"Thành viên BTC";

  useEffect(()=>{
    if(!mobile)return;
    const old=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setMobile(false);};
    window.addEventListener("keydown",onKey);
    return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",onKey);};
  },[mobile]);

  async function logout(){
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLink=(item:NavItem)=>{
    const current=path===item.href;
    const Icon=item.icon;
    return <Link key={item.href} href={item.href} onClick={()=>setMobile(false)}
      aria-current={current?"page":undefined}
      className={"nav-item "+(current?"nav-item-active":"")}>
      <Icon size={18} strokeWidth={current?2:1.75}/>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {current&&<span className="nav-active-mark" aria-hidden="true"/>}
    </Link>;
  };

  return <div className="app-layout min-h-dvh lg:flex">
    <a href="#noi-dung-chinh" className="skip-link">Bỏ qua điều hướng đến nội dung</a>

    {mobile&&<button type="button" aria-label="Đóng bảng điều hướng" onClick={()=>setMobile(false)}
      className="fixed inset-0 z-40 bg-[#111827]/40 backdrop-blur-[1px] lg:hidden"/>}

    <aside id="main-sidebar" aria-label="Điều hướng chính"
      className={"app-sidebar fixed inset-y-0 left-0 z-50 flex w-[258px] max-w-[87vw] shrink-0 flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 "+(mobile?"translate-x-0":"-translate-x-full")}>
      <div className="flex h-[77px] items-center justify-between border-b border-[#e9edf2] px-5">
        <Link href="/dashboard" aria-label="Đại hội số - Tổng quan" onClick={()=>setMobile(false)}
          className="flex min-w-0 items-center gap-3">
          <span className="brand-icon">ĐH</span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[15px] font-bold tracking-[-.025em] text-[#172338]">Đại hội số</span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[.11em] text-[#8792a3]">Không gian điều hành</span>
          </span>
        </Link>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f2f4f8] lg:hidden"
          aria-label="Đóng menu" onClick={()=>setMobile(false)}><X size={19}/></button>
      </div>

      <div className="app-sidebar-scroll flex-1 overflow-y-auto px-3 pb-5">
        <div className="px-2 pt-5">
          <p className="sidebar-group-label">Không gian làm việc</p>
          <nav aria-label="Hệ thống">{navLink(overview)}</nav>
        </div>

        {congressId&&<>
          <div className="sidebar-congress-switch mx-2 mt-6">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[.08em] text-[#7c899b]">Đại hội đang quản lý</span>
            <p className="line-clamp-2 text-[13px] font-bold leading-[1.5] text-[#263348]">{congressName||"Đại hội"}</p>
            <Link href="/dashboard" onClick={()=>setMobile(false)}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#285ac7] hover:underline">
              Chuyển Đại hội <ChevronDown size={13}/>
            </Link>
          </div>
          <nav aria-label="Các chức năng Đại hội" className="mt-6 px-2">
            <p className="sidebar-group-label">Điều hành Đại hội</p>
            <div className="space-y-0.5">{congressItems.map(navLink)}</div>
          </nav>
        </>}

        {adminItems.length>0&&<nav aria-label="Quản trị Đại hội" className="mt-6 px-2">
          <p className="sidebar-group-label">Quản trị</p>
          <div className="space-y-0.5">{adminItems.map(navLink)}</div>
        </nav>}
      </div>

      <div className="sidebar-footer border-t border-[#e9edf2] px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#edf1f7] text-[12px] font-bold text-[#2b405f]">{avatar}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[#263348]">{displayName}</p>
            <p className="mt-0.5 text-[11px] text-[#8893a1]">Tài khoản quản trị</p>
          </div>
          <button onClick={logout} type="button" aria-label="Đăng xuất" title="Đăng xuất"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-[#8290a1] hover:bg-[#f1f3f6] hover:text-[#b42318]">
            <LogOut size={17}/>
          </button>
        </div>
      </div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col">
      <header className="app-topbar sticky top-0 z-30 flex h-[65px] shrink-0 items-center justify-between gap-4 px-4 sm:px-7 lg:h-[77px] xl:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" aria-label="Mở menu điều hướng" aria-expanded={mobile} aria-controls="main-sidebar"
            onClick={()=>setMobile(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] border border-[#e0e5ec] bg-white text-[#344054] lg:hidden">
            <Menu size={20}/>
          </button>
          <div className="min-w-0">
            <div className="hidden items-center gap-2 text-[11px] text-[#8490a0] sm:flex">
              <Link href="/dashboard" className="hover:text-[#2458cf]">Không gian làm việc</Link>
              <span className="text-[#c0c7d1]">/</span>
              {congressName&&<><span className="max-w-48 truncate">{congressName}</span><span className="text-[#c0c7d1]">/</span></>}
            </div>
            <p className="truncate text-[14px] font-bold tracking-[-.015em] text-[#202d40] sm:mt-1 sm:text-[15px]">{active.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-[#7e8999] md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#26a276]"/> Hệ thống điều hành
          </span>
          <span className="hidden h-7 w-px bg-[#e5e9ef] md:block"/>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8edf6] text-[12px] font-bold text-[#354c70]" title={displayName}>{avatar}</div>
        </div>
      </header>
      <main id="noi-dung-chinh" className="mx-auto w-full max-w-[1560px] min-w-0 flex-1 px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pt-8 lg:px-8 lg:pb-14 xl:px-9">
        {children}
      </main>
      <footer className="hidden items-center justify-between border-t border-[#e7eaef] bg-[#f8f9fb] px-9 py-3 text-[11px] text-[#919baa] lg:flex">
        <span>Đại hội số · Không gian quản lý nội bộ</span>
        <span>Dữ liệu theo từng Đại hội</span>
      </footer>
    </div>

    {congressId&&<nav aria-label="Điều hướng nhanh trên điện thoại"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#e5e9ef] bg-white px-1 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
      {[congressItems[0],congressItems[1],congressItems[2],congressItems[3],congressItems[4]].filter(Boolean).map(({name,href,icon:Icon})=>{
        const current=path===href;
        return <Link href={href} key={href} aria-current={current?"page":undefined}
          className={"flex min-h-[57px] flex-col items-center justify-center gap-1 rounded-[9px] px-0.5 text-[10px] font-semibold "+(current?"text-[#2255bf]":"text-[#8995a6]")}>
          <Icon size={20} strokeWidth={current?2.25:1.7}/>
          <span className="max-w-full truncate">{name==="Bảng điều hành"?"Tổng quan":name==="Sơ đồ ghế"?"Sơ đồ":name}</span>
        </Link>;
      })}
    </nav>}
  </div>;
}
