"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {
 Armchair,ArrowRight,BarChart3,ChartColumnIncreasing,ChevronDown,ChevronRight,
 CircleUserRound,ClipboardCheck,ClipboardList,FileText,LayoutGrid,LogOut,Menu,
 PanelLeftClose,PanelLeftOpen,QrCode,ScrollText,Search,Settings2,ShieldCheck,
 UserRoundCog,Users,X
} from "lucide-react";
import {BrandMark,type CongressKind} from "@/components/brand-mark";
import {AdminErrorMonitor} from "@/components/admin-error-monitor";
import {canCongress,CONGRESS_ROLE_LABELS,type CongressRole,type CongressAbility} from "@/lib/congress-permissions";
import {findAdminNavActive,searchAdminNavGroups} from "@/lib/admin-navigation";

type NavItem={name:string;href:string;icon:typeof LayoutGrid};
type NavGroup={id:string;title:string;items:NavItem[]};
type Props={
 children:React.ReactNode;name:string;congressId?:string;congressName?:string;
 congressKind?:CongressKind;canManage?:boolean;canViewBch?:boolean;
 canCheckin?:boolean;canViewSystemLogs?:boolean;accessRole?:CongressRole;
 effectiveAbilities?:CongressAbility[];
};

export function AppShell({children,name,congressId,congressName,
 congressKind="doan",canViewSystemLogs=false,accessRole=null,effectiveAbilities}:Props){
 const [mobile,setMobile]=useState(false);
 const [compact,setCompact]=useState(false);
 const [query,setQuery]=useState("");
 const [closedGroups,setClosedGroups]=useState<string[]>([]);
 const [logoutError,setLogoutError]=useState("");
 const [unresolvedLogs,setUnresolvedLogs]=useState(0);
 const path=usePathname();
 const searchRef=useRef<HTMLInputElement>(null);
 const sidebarScrollRef=useRef<HTMLDivElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);
 const triggerRef=useRef<HTMLButtonElement>(null);
 const overview:NavItem={name:congressId?"Tất cả Đại hội":"Tổng quan hệ thống",href:"/dashboard",icon:LayoutGrid};
 const logs:NavItem={name:"Nhật ký hệ thống",href:"/dashboard/system-logs",icon:ScrollText};
 const globalAccess:NavItem={name:"RBAC · Toàn bộ tài khoản",href:"/dashboard/access"+(congressId?"?congressId="+encodeURIComponent(congressId):""),icon:ShieldCheck};
 const myAccount:NavItem={name:"Tài khoản & bảo mật",href:"/account",icon:CircleUserRound};
 const base=congressId?"/congresses/"+congressId:"";
 const canUse=(ability:CongressAbility)=>effectiveAbilities?effectiveAbilities.includes(ability):canCongress(accessRole,ability);

 // All links are built only from capabilities resolved in the server layout.
 // Hiding a link is navigation UX, NOT a replacement for server-side RBAC.
 const congressItems:NavItem[]=congressId?[
  {name:"Bảng điều hành",href:base,icon:BarChart3},
  ...(canUse("attendance.read")?[
   {name:"Trung tâm điểm danh",href:base+"/attendance",icon:QrCode},
   {name:"Màn hình điểm danh",href:base+"/attendance/live",icon:BarChart3},
   {name:"Quét tại bàn BTC",href:base+"/attendance/desk",icon:QrCode}
  ]:[]),
  ...(canUse("delegates.read")?[{name:"Quản lý đại biểu",href:base+"/delegates",icon:Users}]:[]),
  ...(canUse("quality.read")?[{name:"Phân tích chất lượng",href:base+"/quality",icon:ChartColumnIncreasing}]:[]),
  ...(canUse("seating.read")?[{name:"Sơ đồ ghế",href:base+"/seating",icon:Armchair}]:[]),
  ...(canUse("bch.read")?[{name:"Nhân sự BCH",href:base+"/bch-candidates",icon:ClipboardList}]:[]),
  ...(congressKind==="doan"&&canUse("ballots.read")?[{name:"Kiểm phiếu BCH",href:base+"/ballots",icon:ClipboardCheck}]:[]),
  ...(canUse("documents.read")?[{name:"Tài liệu",href:base+"/documents",icon:FileText}]:[]),
  ...(canUse("reports.read")?[{name:"Báo cáo",href:base+"/reports",icon:ClipboardList}]:[])
 ]:[];
 const adminItems:NavItem[]=congressId?[
  ...(canUse("team.manage")?[
   {name:"Tài khoản BTC",href:base+"/team",icon:UserRoundCog},
   {name:"Phân quyền Đại hội",href:base+"/permissions",icon:ShieldCheck}
  ]:[]),
  ...(canUse("settings.manage")?[{name:"Cấu hình Đại hội",href:base+"/settings",icon:Settings2}]:[])
 ]:[];

 const byHref=(href:string)=>congressItems.find(item=>item.href===base+href);
 const groups:NavGroup[]=[
  {id:"workspace",title:"Không gian làm việc",items:[overview]},
  ...(congressId?[
   {id:"operations",title:"Điều hành & điểm danh",items:[
    byHref(""),byHref("/attendance"),byHref("/attendance/live"),
    byHref("/attendance/desk"),byHref("/seating")
   ].filter((item):item is NavItem=>Boolean(item))},
   {id:"personnel",title:"Đại biểu & nhân sự",items:[
    byHref("/delegates"),byHref("/quality"),byHref("/bch-candidates"),byHref("/ballots")
   ].filter((item):item is NavItem=>Boolean(item))},
   {id:"materials",title:"Văn kiện & báo cáo",items:[
    byHref("/documents"),byHref("/reports")
   ].filter((item):item is NavItem=>Boolean(item))},
   {id:"congress-admin",title:"Quản trị Đại hội",items:adminItems}
  ]:[]),
  ...(canViewSystemLogs?[{id:"system-admin",title:"Quản trị hệ thống",items:[globalAccess,logs]}]:[])
 ].filter(group=>group.items.length>0);
 const items=[overview,...congressItems,...adminItems,...(canViewSystemLogs?[globalAccess,logs]:[]),myAccount];
 const active=findAdminNavActive(path,items,overview);
 const mobileItems=congressId?congressItems.filter(item=>[
  base,base+"/attendance",base+"/delegates",base+"/ballots",base+"/bch-candidates",
  base+"/documents",base+"/reports"
 ].includes(item.href)).slice(0,5):[];
 const roleTitle=accessRole?CONGRESS_ROLE_LABELS[accessRole]:
  canViewSystemLogs?"Quản trị hệ thống":"Nhân sự BTC Đại hội";
 const displayName=name.trim()||"Thành viên BTC";
 const avatar=displayName.charAt(0).toLocaleUpperCase("vi");
 const normalizedQuery=query.trim();
 const shownGroups=searchAdminNavGroups(groups,normalizedQuery);
 const condensed=compact&&!mobile;

 useEffect(()=>{
  if(!mobile)return;
  const old=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){
    setMobile(false);triggerRef.current?.focus();
    return;
   }
   if(event.key==="Tab"){
    // Keep keyboard focus within the navigation drawer until it closes.
    const root=document.getElementById("main-sidebar");
    const focusable=Array.from(root?.querySelectorAll<HTMLElement>(
     'a[href],button:not([disabled]),input:not([disabled])')||[])
     .filter(node=>node.getClientRects().length>0);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  window.addEventListener("keydown",onKey);
  return()=>{document.body.style.overflow=old;window.removeEventListener("keydown",onKey);};
 },[mobile]);

 useEffect(()=>{
  if(!canViewSystemLogs)return;
  let mounted=true;
  async function refresh(){
   try{
    const response=await fetch("/api/system-logs/summary",{credentials:"same-origin",cache:"no-store"});
    if(!response.ok)return;
    const data=await response.json();
    if(mounted&&Number.isInteger(data.unresolved24h))setUnresolvedLogs(data.unresolved24h);
   }catch{/* The incident indicator must not block navigation. */}
  }
  void refresh();
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh();},60000);
  return()=>{mounted=false;window.clearInterval(timer);};
 },[canViewSystemLogs,path]);

 // Keep the active section discoverable on long, permission-dependent menus.
 // Scroll only inside the sidebar; never move the main page scroll position.
 useEffect(()=>{
  const scroller=sidebarScrollRef.current;
  const activeLink=scroller?.querySelector<HTMLElement>('a[aria-current="page"]');
  if(!scroller||!activeLink||activeLink.getClientRects().length===0)return;
  const visible=scroller.getBoundingClientRect();
  const target=activeLink.getBoundingClientRect();
  if(target.bottom>visible.bottom-16)
   scroller.scrollTop+=target.bottom-visible.bottom+16;
  else if(target.top<visible.top+16)
   scroller.scrollTop-=visible.top+16-target.top;
 },[path,compact,mobile]);

 async function logout(){
  setLogoutError("");
  try{
   const res=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin",cache:"no-store"});
   if(!res.ok)throw Error("Không thể đăng xuất. Vui lòng thử lại.");
   window.location.replace("/login");
  }catch(error){setLogoutError(error instanceof Error?error.message:"Lỗi đăng xuất.");}
 }
 function toggleGroup(id:string){
  setClosedGroups(previous=>previous.includes(id)?
   previous.filter(group=>group!==id):[...previous,id]);
 }
 function closeDrawer(){
  setMobile(false);
  triggerRef.current?.focus();
 }
 function navLink(item:NavItem){
  const current=active.href===item.href;
  const Icon=item.icon;
  return <Link key={item.href} href={item.href} prefetch={false}
   onClick={()=>{setMobile(false);setQuery("");}}
   aria-current={current?"page":undefined} title={condensed?item.name:undefined}
   className={"nav-item admin-nav-link "+(current?"nav-item-active":"")}>
   <Icon size={18} strokeWidth={current?2.1:1.75} aria-hidden="true"/>
   <span className="admin-nav-text min-w-0 flex-1 truncate">{item.name}</span>
   {item.href==="/dashboard/system-logs"&&unresolvedLogs>0&&
    <span className="admin-nav-counter" title="Sự cố cần xử lý trong 24 giờ">
     {unresolvedLogs>99?"99+":unresolvedLogs}
    </span>}
   {current&&<span className="admin-nav-current" aria-hidden="true"/>}
  </Link>;
 }
 return <div className="app-layout admin-workspace min-h-dvh lg:flex">
  {canViewSystemLogs&&<AdminErrorMonitor/>}
  <a href="#noi-dung-chinh" className="skip-link">Bỏ qua điều hướng đến nội dung</a>
  {mobile&&<button type="button" aria-label="Đóng bảng điều hướng"
   onClick={closeDrawer}
   className="fixed inset-0 z-40 bg-[#071a2c]/65 backdrop-blur-[2px] lg:hidden"/>}

  <aside id="main-sidebar" aria-label="Điều hướng quản trị"
   role={mobile?"dialog":undefined} aria-modal={mobile?true:undefined}
   className={"app-sidebar admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[88vw] shrink-0 flex-col transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:max-w-none lg:translate-x-0 "+
    (compact?"lg:w-[76px] ":"lg:w-[280px] ")+(mobile?"translate-x-0":"-translate-x-full")+
    (condensed?" admin-sidebar-compact":"")}>
   <div className="admin-sidebar-brand flex h-[76px] shrink-0 items-center gap-3 border-b border-white/10 px-4">
    <Link href="/dashboard" aria-label="Đại hội số — Tổng quan"
     onClick={()=>setMobile(false)} title={condensed?"Đại hội số":undefined}
     className="flex min-w-0 flex-1 items-center gap-3">
     <BrandMark kind={congressKind}/>
     <span className="admin-sidebar-brand-text min-w-0 leading-tight">
      <span className="block text-[17px] font-extrabold tracking-[-.035em] text-white">
       Đại hội số<span className="ml-1 text-[#e5bb66]">.</span>
      </span>
      <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.13em] text-[#a6c5d6]">
       Trung tâm điều hành
      </span>
     </span>
    </Link>
    <button ref={closeRef} type="button" aria-label="Đóng menu"
     onClick={closeDrawer}
     className="admin-sidebar-icon-button flex h-9 w-9 items-center justify-center rounded-lg lg:hidden">
     <X size={18}/>
    </button>
    <button type="button" aria-label={compact?"Mở rộng thanh bên":"Thu gọn thanh bên"}
     title={compact?"Mở rộng thanh bên":"Thu gọn thanh bên"} aria-expanded={!compact}
     onClick={()=>setCompact(value=>!value)}
     className="admin-sidebar-collapse admin-sidebar-icon-button hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg lg:flex">
     {compact?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}
    </button>
   </div>

   <div ref={sidebarScrollRef} className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-5">
    {congressId&&<div className="admin-sidebar-congress mt-4">
     <div className="admin-sidebar-congress-header flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#a2c4d6]">ĐẠI HỘI ĐANG CHỌN</span>
      <span className="h-1.5 w-1.5 rounded-full bg-[#e7bb69]"/>
     </div>
     <p className="admin-sidebar-congress-title mt-2 line-clamp-2 text-[12px] font-bold leading-[1.5] text-white"
      title={congressName||"Đại hội"}>{congressName||"Đại hội"}</p>
     <Link href="/dashboard" onClick={()=>setMobile(false)}
      className="admin-sidebar-congress-change mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#a4d3e9] hover:text-white"
      title="Chuyển Đại hội" aria-label="Chuyển Đại hội">
      Chuyển Đại hội <ArrowRight size={13}/>
     </Link>
    </div>}
    <div className="admin-sidebar-search relative mt-4">
     <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#9dbfd0]"/>
     <input ref={searchRef} type="search" value={query}
      onChange={event=>setQuery(event.target.value)}
      aria-label="Tìm chức năng quản trị" placeholder="Tìm chức năng..."
      className="h-11 w-full rounded-[9px] border border-white/15 bg-white/[.07] py-2 pl-9 pr-9 text-[12px] font-medium text-white outline-none placeholder:text-[#9db7c7] focus:border-[#7fbeda] focus:bg-white/[.10]"/>
     {query&&<button type="button" aria-label="Xóa tìm kiếm"
      onClick={()=>{setQuery("");searchRef.current?.focus();}}
      className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center text-[#a9c7d7]">
      <X size={15}/>
     </button>}
    </div>

    <div className="admin-sidebar-menu mt-5 space-y-4">
     {shownGroups.map(group=>{
      const isClosed=closedGroups.includes(group.id)&&!normalizedQuery&&!condensed;
      const groupActive=group.items.some(item=>active.href===item.href);
      const groupLabelId="admin-nav-"+group.id;
      return <section key={group.id} aria-labelledby={groupLabelId}
       className={"admin-sidebar-group "+(groupActive?"admin-sidebar-group-active":"")}>
       <button type="button" id={groupLabelId}
        aria-expanded={!isClosed} aria-controls={groupLabelId+"-items"}
        onClick={()=>{if(!condensed&&!normalizedQuery)toggleGroup(group.id);}}
        title={condensed?group.title:undefined}
        className="admin-sidebar-group-heading flex min-h-8 w-full items-center justify-between gap-2 px-3 text-left">
        <span className="admin-sidebar-group-title truncate text-[10px] font-bold uppercase tracking-[.10em]">
         {group.title}
        </span>
        <ChevronDown size={13} className={"admin-sidebar-group-chevron shrink-0 transition-transform "+
         (isClosed?"-rotate-90":"")}/>
       </button>
       <nav id={groupLabelId+"-items"} aria-label={group.title}
        className={"admin-sidebar-group-links mt-1 space-y-0.5 "+(isClosed?"hidden":"")}>
        {group.items.map(navLink)}
       </nav>
      </section>;
     })}
     {shownGroups.length===0&&<p className="admin-sidebar-empty px-3 py-5 text-[12px] leading-5 text-[#b7d0dd]">
      Không tìm thấy chức năng được cấp quyền phù hợp.
     </p>}
    </div>
   </div>

   <div className="admin-sidebar-footer shrink-0 border-t border-white/10 px-3 py-3">
    {navLink(myAccount)}
    <div className="admin-sidebar-profile mt-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.055] px-2.5 py-3">
     <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-white/15 bg-white/10 text-[13px] font-extrabold text-white">{avatar}</span>
     <div className="admin-sidebar-profile-text min-w-0 flex-1">
      <p className="truncate text-[12px] font-bold text-white" title={displayName}>{displayName}</p>
      <p className="mt-1 truncate text-[10px] text-[#a9c4d5]">{roleTitle}</p>
     </div>
     <button type="button" onClick={()=>void logout()} aria-label="Đăng xuất" title="Đăng xuất"
      className="admin-sidebar-logout admin-sidebar-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
      <LogOut size={17}/>
     </button>
    </div>
    {logoutError&&<p role="alert" className="mt-2 text-[11px] leading-5 text-[#f3c3b3]">{logoutError}</p>}
   </div>
  </aside>

  <div className="flex min-w-0 flex-1 flex-col">
   <header className="app-topbar admin-topbar sticky top-0 z-30 flex h-[65px] shrink-0 items-center justify-between gap-4 px-4 sm:px-7 lg:h-[76px] xl:px-9">
    <div className="flex min-w-0 items-center gap-3">
     <button ref={triggerRef} type="button" aria-label="Mở menu điều hướng"
      aria-expanded={mobile} aria-controls="main-sidebar"
      onClick={()=>setMobile(true)}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dae4e9] bg-white text-[#34566a] lg:hidden">
      <Menu size={20}/>
     </button>
     <button type="button" aria-label={compact?"Mở rộng thanh bên":"Thu gọn thanh bên"}
      title={compact?"Mở rộng thanh bên":"Thu gọn thanh bên"} aria-expanded={!compact}
      onClick={()=>setCompact(value=>!value)}
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#dee8ed] bg-white text-[#54768a] hover:bg-[#f2f7fa] lg:flex">
      {compact?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}
     </button>
     <div className="min-w-0">
      <nav aria-label="Đường dẫn" className="hidden items-center gap-2 text-[11px] text-[#7f94a3] sm:flex">
       <Link href="/dashboard" className="hover:text-[#146e97]">Hệ thống</Link>
       <ChevronRight size={12}/>
       {congressId&&<><Link href={base} className="max-w-[175px] truncate hover:text-[#146e97]" title={congressName}>
        {congressName||"Đại hội đang chọn"}
       </Link><ChevronRight size={12}/></>}
       <span className="max-w-[220px] truncate font-semibold text-[#4b7086]">{active.name}</span>
      </nav>
      <h1 className="truncate text-[14px] font-extrabold tracking-[-.025em] text-[#233f53] sm:mt-1 sm:text-[16px]">
       {active.name}
      </h1>
     </div>
    </div>
    <div className="flex shrink-0 items-center gap-3">
     {congressId&&canUse("attendance.scan")&&
      <Link href={base+"/attendance"}
       className="hidden min-h-9 items-center gap-2 rounded-lg border border-[#cde2eb] bg-[#f4f9fb] px-3 text-[11px] font-bold text-[#2b718f] hover:bg-[#eaf5f9] md:inline-flex">
       <QrCode size={15}/> Điểm danh nhanh <ArrowRight size={13}/>
      </Link>}
     <div className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#dfe9ee] bg-[#edf5f8] text-[12px] font-extrabold text-[#376582]" title={displayName}>
      {avatar}
     </div>
    </div>
   </header>
   <main id="noi-dung-chinh" className="mx-auto w-full max-w-[1570px] min-w-0 flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pt-8 lg:px-8 lg:pb-14 xl:px-9 xl:pt-8">
    {children}
   </main>
   <footer className="hidden items-center justify-between border-t border-[#e5eaf0] px-9 py-3 text-[10px] text-[#8999a6] lg:flex">
    <span>ĐẠI HỘI SỐ / Trung tâm điều hành</span>
    <span>{roleTitle} · Quyền truy cập được kiểm soát bởi RBAC</span>
   </footer>
  </div>

  {congressId&&mobileItems.length>0&&
   <nav aria-label="Điều hướng nhanh trên điện thoại"
    className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid border-t border-[#dfe8ed] bg-white px-1 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
    style={{gridTemplateColumns:`repeat(${mobileItems.length},minmax(0,1fr))`}}>
    {mobileItems.map(({name,href,icon:Icon})=>{
     const current=active.href===href;
     const shortName=name==="Bảng điều hành"?"Tổng quan":
      name==="Trung tâm điểm danh"?"Điểm danh":
      name==="Quản lý đại biểu"?"Đại biểu":
      name==="Kiểm phiếu BCH"?"Kiểm phiếu":
      name==="Nhân sự BCH"?"Nhân sự":name;
     return <Link key={href} href={href} prefetch={false} aria-current={current?"page":undefined}
      className={"flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-[10px] font-bold "+
       (current?"text-[#0e7198]":"text-[#8598a7]")}>
      <Icon size={19} strokeWidth={current?2.1:1.7}/>
      <span className="max-w-full truncate">{shortName}</span>
     </Link>;
    })}
   </nav>}
 </div>;
}
