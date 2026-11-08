import {redirect} from "next/navigation";
import Link from "next/link";
import {ArrowRight,IdCard} from "lucide-react";
import {getAuth} from "@/lib/auth";
import {AppShell} from "@/components/app-shell";
import {MyDelegateCards} from "@/components/my-delegate-cards";

export const dynamic="force-dynamic";

export default async function MyCardPage(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 text-center"><IdCard className="text-[#007eb8]" size={42}/><h1 className="page-title mt-5">Chưa cấu hình đăng nhập đại biểu</h1><p className="page-description mt-4">Quản trị viên cần bổ sung Supabase Publishable Key trong .env.local để sử dụng thẻ đại biểu và đăng nhập.</p><Link className="btn btn-secondary mt-6" href="/login">Về trang đăng nhập <ArrowRight size={16}/></Link></main>;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const [{data:profile},{data:delegates,error}]=await Promise.all([
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
  supabase.from("delegates")
   .select("id,code,full_name,unit,position,student_id,login_email,congress_id")
   .eq("auth_user_id",user.id).eq("is_active",true).order("created_at",{ascending:false})
 ]);
 return <AppShell name={profile?.full_name||user.email||"Đại biểu"}>
  <div className="mb-7 flex items-start gap-4">
   <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#dff4fc] text-[#007eb8]"><IdCard size={25}/></span>
   <div><p className="page-kicker">CỔNG DÀNH CHO ĐẠI BIỂU</p>
    <h1 className="page-title mt-3">Thẻ đại biểu của tôi</h1>
    <p className="page-description">Mã QR định danh và barcode dự phòng của riêng bạn theo từng Đại hội.</p>
   </div>
  </div>
  {error?<div role="alert" className="card p-5 text-red-700">Không thể tải thẻ. Quản trị viên cần cập nhật dữ liệu Đại hội lên phiên bản v5.</div>:
   delegates?.length?<MyDelegateCards items={delegates}/>:
   <div className="card p-8 text-center"><IdCard className="mx-auto text-[#0089c5]" size={32}/>
    <h2 className="section-title mt-4">Chưa có thẻ đại biểu</h2>
    <p className="helper mt-2">Tài khoản chưa liên kết với hồ sơ đại biểu. Liên hệ Ban Tổ chức để được cấp quyền.</p>
    <Link className="btn btn-secondary mt-6" href="/dashboard">Về bảng điều khiển <ArrowRight size={16}/></Link>
   </div>}
 </AppShell>;
}
