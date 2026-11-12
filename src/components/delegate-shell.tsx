"use client";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {Armchair,BookOpen,Camera,History,IdCard,LogOut,ShieldCheck,UserRound,Users,Ellipsis} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {PortalCongressPicker,type CongressChoice} from "@/components/portal-congress-picker";

type NavItem={href:string;label:string;mobile:string;icon:typeof IdCard};
const links:NavItem[]=[
 {href:"/my-card",label:"Thẻ đại biểu",mobile:"Thẻ",icon:IdCard},
 {href:"/my-card/checkin",label:"Điểm danh",mobile:"Quét QR",icon:Camera},
 {href:"/my-card/seats",label:"Chỗ ngồi",mobile:"Ghế",icon:Armchair},
 {href:"/my-card/documents",label:"Tài liệu Đại hội",mobile:"Tài liệu",icon:BookOpen},
 {href:"/my-card/bch",label:"Nhân sự BCH",mobile:"BCH",icon:Users},
 {href:"/my-card/history",label:"Lịch sử",mobile:"Lịch sử",icon:History},
 {href:"/account",label:"Tài khoản",mobile:"Cá nhân",icon:UserRound}
];
export function DelegateShell({children,name,guestOnly=false,congresses=[],activeCongressId=null,allowedAbilities=null}:{children:React.ReactNode;name:string;guestOnly?:boolean;congresses?:CongressChoice[];activeCongressId?:string|null;allowedAbilities?:string[]|null}){
 const path=usePathname();
  const bySection:Record<string,string>={
    "/my-card":"portal.card","/my-card/checkin":"portal.checkin",
    "/my-card/seats":"portal.seating","/my-card/documents":"portal.documents",
    "/my-card/bch":"portal.bch","/my-card/history":"portal.history"
   };
   const visibleLinks=(guestOnly?links.filter(link=>["/my-card/documents","/my-card/bch","/account"].includes(link.href)):links)
    .filter(link=>!allowedAbilities||!bySection[link.href]||allowedAbilities.includes(bySection[link.href]));
 const primaryLinks=guestOnly?visibleLinks.filter(link=>link.href!=="/account"):
   visibleLinks.filter(link=>["/my-card","/my-card/checkin","/my-card/seats","/my-card/documents"].includes(link.href));
  const moreLinks=guestOnly?[]:visibleLinks.filter(link=>!primaryLinks.some(primary=>primary.href===link.href));
  const [moreOpen,setMoreOpen]=useState(false);
  const moreButton=useRef<HTMLButtonElement>(null);
  const firstMoreLink=useRef<HTMLAnchorElement>(null);
  useEffect(()=>{
   if(!moreOpen)return;
   firstMoreLink.current?.focus();
   const onEscape=(event:KeyboardEvent)=>{
    if(event.key==="Escape"){setMoreOpen(false);moreButton.current?.focus();}
   };
   document.addEventListener("keydown",onEscape);
   return()=>document.removeEventListener("keydown",onEscape);
  },[moreOpen]);
  const [logoutError,setLogoutError]=useState("");
 const [loggingOut,setLoggingOut]=useState(false);
 async function logout(){
  setLoggingOut(true);setLogoutError("");
  try{
   const response=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
   window.location.replace("/login");
  }catch(err){
   setLogoutError(err instanceof Error?err.message:"Không thể đăng xuất.");
   setLoggingOut(false);
  }
 }
 return <div className="delegate-portal min-h-dvh bg-[#f4f7fb] text-[#20324d]">
  <a href="#noi-dung-dai-bieu" className="skip-link">Đến nội dung</a>
  <header className="sticky top-0 z-30 border-b border-[#dce5ee] bg-white/95 backdrop-blur-xl print:hidden">
   <div className="mx-auto flex h-[67px] max-w-[1220px] items-center justify-between gap-3 px-4 sm:h-[78px] sm:px-7">
    <Link href="/my-card" aria-label="Về trang thẻ đại biểu" className="flex min-w-0 shrink-0 items-center gap-3">
     <BrandMark kind={congresses.find(item=>item.id===activeCongressId)?.kind||"doan"} className="brand-symbol-light !h-10 !w-10 !flex-[0_0_40px] !rounded-[10px]"/>
     <span className="leading-tight">
      <span className="block text-[15px] font-extrabold tracking-[-.025em] text-[#172b48]">ĐẠI HỘI SỐ</span>
      <span className="mt-1 block text-[9px] font-bold uppercase tracking-[.16em] text-[#7192ab]">{guestOnly?"CỔNG KHÁCH MỜI":"CỔNG ĐẠI BIỂU"}</span>
     </span>
    </Link>
    <nav aria-label="Chức năng đại biểu" className="hidden items-center gap-0.5 lg:flex">
     {visibleLinks.map(({href,label,icon:Icon})=>{
      const active=path===href;
      return <Link key={href} href={href} prefetch={false} aria-current={active?"page":undefined}
       className={"inline-flex min-h-11 items-center gap-1.5 rounded-[10px] px-2.5 text-[11px] font-bold transition "+
        (active?"bg-[#e6f2f9] text-[#007fae]":"text-[#5c7891] hover:bg-[#f1f5f9]")}>
       <Icon size={16} strokeWidth={active?2.2:1.75}/>{label}
      </Link>;
     })}
    </nav>
    <div className="flex shrink-0 items-center gap-1.5">
     <span className="hidden max-w-[110px] truncate text-[11px] font-bold text-[#668098] xl:block" title={name}>{name}</span>
     <Link href="/account" aria-label="Tài khoản của tôi" title="Tài khoản"
      className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dce6ed] bg-[#f8fafc] text-[#416b87] lg:hidden"><UserRound size={18}/></Link>
     <button type="button" onClick={()=>void logout()} disabled={loggingOut}
      aria-label="Đăng xuất" title="Đăng xuất"
      className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#dce6ed] bg-[#f8fafc] text-[#416b87] transition hover:bg-[#eaf3f9]">
      <LogOut size={18}/>
     </button>
    </div>
   </div>
   {logoutError&&<p role="alert" className="mx-auto max-w-[1200px] px-5 pb-2 text-xs font-semibold text-[#b34c3c]">{logoutError}</p>}
  </header>
  {congresses.length>0&&(activeCongressId||path!=="/my-card")&&<div className="mx-auto w-full max-w-[1220px] px-3 pt-3 sm:px-6 lg:px-8 lg:pt-5 print:hidden">
   <PortalCongressPicker options={congresses} activeId={activeCongressId}/>
  </div>}
  <main id="noi-dung-dai-bieu"
   className="mx-auto w-full max-w-[1220px] min-w-0 px-3 pb-[calc(7.4rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-8 lg:pb-16 lg:px-8">
   {children}
  </main>
  <footer className="hidden border-t border-[#dce5ee] bg-white py-5 text-center text-[11px] text-[#8198ab] lg:block print:hidden">
   <span className="inline-flex items-center gap-2"><ShieldCheck size={15}/> Nền tảng Đại hội số · {guestOnly?"Cổng dành cho khách mời":"Cổng dành riêng cho đại biểu"}</span>
  </footer>
  {moreOpen&&<>
   <button type="button" className="fixed inset-0 z-30 bg-[#101e32]/40 lg:hidden print:hidden"
    aria-label="Đóng menu chức năng khác" onClick={()=>setMoreOpen(false)}/>
   <section id="delegate-more-menu" aria-label="Chức năng khác"
    className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-[#d6e4ec] bg-white p-3 shadow-[0_14px_50px_rgba(22,48,71,.18)] lg:hidden print:hidden">
    <p className="px-3 pb-2 pt-1 text-[11px] font-extrabold uppercase tracking-wider text-[#70899b]">Chức năng khác</p>
    <div className="grid gap-1">{moreLinks.map(({href,label,icon:Icon},index)=><Link
     ref={index===0?firstMoreLink:undefined} key={href} href={href} prefetch={false}
     aria-current={path===href?"page":undefined} onClick={()=>setMoreOpen(false)}
     className={"flex min-h-12 items-center gap-3 rounded-xl px-3 text-[13px] font-bold "+
      (path===href?"bg-[#e6f2f9] text-[#007fae]":"text-[#365872] hover:bg-[#f2f7fa]")}>
     <Icon size={18}/>{label}
    </Link>)}</div>
   </section>
  </>}
  <nav aria-label="Điều hướng trên điện thoại"
   className="delegate-tabbar fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 border-t border-[#dce5ee] bg-white/98 px-1.5 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-7px_26px_rgba(18,45,76,.075)] lg:hidden print:hidden">
   {primaryLinks.map(({href,mobile,icon:Icon})=>{
    const active=path===href;
    return <Link key={href} href={href} prefetch={false} aria-current={active?"page":undefined}
     className={"flex min-h-[59px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[9px] px-0.5 text-center text-[9px] font-bold transition "+
      (active?"bg-[#e6f2f9] text-[#007fae]":"text-[#6f879e] hover:bg-[#f1f6fa]")}>
     <Icon size={19} strokeWidth={active?2.1:1.7}/>
     <span className="block max-w-full truncate">{mobile}</span>
    </Link>;
   })}
   {moreLinks.length>0&&<button ref={moreButton} type="button"
    aria-controls="delegate-more-menu" aria-expanded={moreOpen}
    onClick={()=>setMoreOpen(open=>!open)}
    className={"flex min-h-[59px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[9px] px-0.5 text-center text-[10px] font-bold transition "+
     (moreOpen||moreLinks.some(link=>link.href===path)?"bg-[#e6f2f9] text-[#007fae]":"text-[#6f879e] hover:bg-[#f1f6fa]")}>
    <Ellipsis size={20} strokeWidth={2.2}/><span>Thêm</span>
   </button>}
  </nav>
 </div>;
}
