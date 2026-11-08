import {redirect} from "next/navigation";
import {CircleUserRound,ShieldCheck} from "lucide-react";
import {AppShell} from "@/components/app-shell";
import {DelegateShell} from "@/components/delegate-shell";
import {getAuth,isStaffUser} from "@/lib/auth";
import {AccountSecurity} from "@/components/account-security";

export const dynamic="force-dynamic";
export default async function AccountPage(){
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const [profileResult,staff]=await Promise.all([
  supabase.from("profiles").select("full_name,platform_role").eq("id",user.id).maybeSingle(),
  isStaffUser(supabase,user.id)
 ]);
 const profile=profileResult.data;
 const internalDomain="@accounts.daihoi.invalid";
 const loginName=user.email?.endsWith(internalDomain)
  ? user.email.slice(0,-internalDomain.length)+"@dntu.edu.vn"
  : user.email||"Tài khoản";
 const alias=typeof user.user_metadata?.login_alias==="string"
  ? user.user_metadata.login_alias:loginName;
 const name=profile?.full_name||"Thành viên Đại hội";
 const role=profile?.platform_role==="super_admin"?"Quản trị hệ thống":
  staff?"Nhân sự Ban Tổ chức":"Đại biểu";
 const content=<>
  <div className="mb-8 flex flex-wrap items-start gap-4">
   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e6f2fa] text-[#007fae]">
    <CircleUserRound size={25}/>
   </div>
   <div>
    <p className="page-kicker">HỒ SƠ VÀ BẢO MẬT</p>
    <h1 className="page-title mt-2">Tài khoản của tôi</h1>
    <p className="page-description">Thông tin truy cập và bảo vệ tài khoản Đại hội.</p>
   </div>
  </div>
  <div className="grid max-w-[1040px] gap-6 lg:grid-cols-[.9fr_1.1fr]">
   <section className="rounded-xl border border-[#dfe7ef] bg-white p-6 shadow-[0_10px_28px_rgba(20,37,63,.035)]">
    <h2 className="text-[16px] font-bold text-[#20324d]">Thông tin tài khoản</h2>
    <dl className="mt-5 space-y-4">
     <div><dt className="text-[11px] font-semibold text-[#8692a4]">Họ tên</dt><dd className="mt-1 text-[14px] font-semibold text-[#20324d]">{name}</dd></div>
     <div><dt className="text-[11px] font-semibold text-[#8692a4]">Tên đăng nhập</dt><dd className="mt-1 break-all text-[14px] font-semibold text-[#20324d]">{alias}</dd></div>
     <div><dt className="text-[11px] font-semibold text-[#8692a4]">Phân quyền</dt><dd className="mt-1 text-[14px] font-semibold text-[#20324d]">{role}</dd></div>
    </dl>
    <div className="mt-6 flex items-start gap-2 rounded-lg border border-[#d5eee8] bg-[#f0faf5] p-3 text-[12px] leading-6 text-[#2b6b56]">
     <ShieldCheck size={18} className="mt-1 shrink-0"/>
     Tài khoản được kiểm soát truy cập theo phân quyền hệ thống và từng Đại hội.
    </div>
   </section>
   <AccountSecurity/>
  </div>
 </>;
 return staff?<AppShell name={name}>{content}</AppShell>:
  <DelegateShell name={name}>{content}</DelegateShell>;
}