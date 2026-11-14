import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

export function GuestSiteHeader(){
 return <header className="guest-topbar">
  <div className="guest-container guest-topbar-inner">
   <Link href="/" className="guest-wordmark" aria-label="Đại hội số - Trang chủ">
    <BrandMark className="guest-wordmark-symbol"/>
    <span className="guest-wordmark-copy">
     <strong>ĐẠI HỘI SỐ<span className="guest-wordmark-period">.</span></strong>
     <small>CỔNG THÔNG TIN ĐOÀN – HỘI</small>
    </span>
   </Link>
   <nav className="guest-topnav" aria-label="Điều hướng chế độ khách">
    <Link href="/guest" className="guest-nav-explore">Các Đại hội</Link>
    <Link href="/login" className="guest-nav-login">Đăng nhập <ArrowUpRight size={16} aria-hidden="true"/></Link>
   </nav>
  </div>
 </header>;
}
