import {redirect} from "next/navigation";
import {CircleUserRound,ShieldCheck,LockKeyhole,UserRound,Layers3} from "lucide-react";
import {AppShell} from "@/components/app-shell";
import {DelegateShell} from "@/components/delegate-shell";
import {getAuth,isStaffUser} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import {createAdminClient} from "@/lib/supabase/admin";
import {AccountSecurity} from "@/components/account-security";
import {DelegateProfileEditor,type EditableDelegate} from "@/components/delegate-profile-editor";

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
 const loginEmail=user.email||"";
 const loginName=loginEmail.endsWith(internalDomain)
  ?loginEmail.slice(0,-internalDomain.length)+"@dntu.edu.vn"
  :loginEmail;
 const alias=typeof user.user_metadata?.login_alias==="string"
  ?user.user_metadata.login_alias:loginName;
 const name=profile?.full_name||user.user_metadata?.full_name||"Thành viên Đại hội";
 if(staff){
  const superAdmin=profile?.platform_role==="super_admin";
  const role=superAdmin?"Quản trị hệ thống":"Ban Tổ chức Đại hội";
  return <AppShell name={name} canViewSystemLogs={superAdmin}>
   <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-start gap-4">
     <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#dce7ef] bg-[#eef5f9] text-[#0a6f9f]"><ShieldCheck size={24}/></span>
     <div><p className="page-kicker">DANH TÍNH NHÂN SỰ / QUẢN TRỊ</p>
      <h1 className="page-title mt-2">Tài khoản & bảo mật</h1>
      <p className="page-description mt-2">Quản lý thông tin đăng nhập, bảo mật tài khoản và quyền truy cập không gian điều hành.</p>
     </div>
    </header>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
     <section aria-label="Danh tính nhân sự" className="rounded-xl border border-[#dce6ee] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2"><UserRound size={18} className="text-[#187a9f]"/>
       <h2 className="text-[16px] font-bold text-[#20364a]">Danh tính nhân sự</h2>
      </div>
      <dl className="mt-5 divide-y divide-[#edf1f4]">
       <div className="py-3"><dt className="text-xs text-[#8091a0]">Họ và tên</dt><dd className="mt-1 font-semibold text-[#223e55]">{name}</dd></div>
       <div className="py-3"><dt className="text-xs text-[#8091a0]">Tài khoản đăng nhập</dt><dd className="mt-1 break-all text-[13px] font-semibold text-[#223e55]">{alias}</dd></div>
       <div className="py-3"><dt className="text-xs text-[#8091a0]">Vai trò</dt><dd className="mt-1 inline-flex items-center gap-2 rounded-md bg-[#edf4f8] px-2.5 py-1.5 text-[12px] font-bold text-[#215b78]"><ShieldCheck size={14}/>{role}</dd></div>
      </dl>
      <div className="mt-5 flex gap-2 rounded-lg border border-[#e0eaf0] bg-[#f7fafc] p-3 text-[12px] leading-6 text-[#567083]">
       <Layers3 size={18} className="mt-1 shrink-0"/>
       Quyền quản lý được kiểm tra riêng cho từng Đại hội. Nhân sự BTC không tự động có quyền ở Đại hội khác.
      </div>
     </section>
     <AccountSecurity/>
    </div>
   </div>
  </AppShell>;
 }
 // Only delegate/guest accounts may load and edit their personal delegate identity.
 const db=createAdminClient();
 const [owned,guestMemberships,context]=await Promise.all([
  db.from("delegates").select("id,congress_id,full_name,unit,position,gender,birth_date,photo_path")
   .eq("auth_user_id",user.id).eq("is_active",true).order("created_at",{ascending:true}).limit(100),
  db.from("congress_members").select("congress_id").eq("user_id",user.id).eq("role","guest").limit(100),
  getPortalCongressContext(user.id).catch(()=>null)
 ]);
 const first=owned.data?.[0];
 const guestOnly=!owned.data?.length&&Boolean(guestMemberships.data?.length);
 const personal:EditableDelegate[]=first?[{
  ...first,congressName:"Tất cả Đại hội",
  gender:(first.gender||null) as EditableDelegate["gender"]
 }]:[];
 return <DelegateShell name={first?.full_name||name} guestOnly={guestOnly}
  congresses={context?.options||[]} activeCongressId={context?.activeCongressId||null}>
  <div className="mx-auto max-w-5xl space-y-6">
   <header className="flex flex-wrap items-start gap-3">
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf4f9] text-[#126d91]"><CircleUserRound size={23}/></span>
    <div><p className="page-kicker">CỔNG ĐẠI BIỂU</p>
     <h1 className="page-title mt-2">Thông tin cá nhân</h1>
     <p className="page-description mt-2">Thông tin cá nhân dùng chung cho các kỳ Đại hội liên kết cùng tài khoản.</p>
    </div>
   </header>
   <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
    <section className="rounded-xl border border-[#dfe7ef] bg-white p-5 sm:p-6">
     <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#20324d]"><UserRound size={18}/> Danh tính</h2>
     <dl className="mt-5 space-y-4 text-[13px]">
      <div><dt className="text-[#8493a1]">Họ và tên</dt><dd className="mt-1 font-semibold text-[#20324d]">{first?.full_name||name}</dd></div>
      <div><dt className="text-[#8493a1]">Đăng nhập</dt><dd className="mt-1 break-all font-semibold text-[#20324d]">{alias}</dd></div>
      <div><dt className="text-[#8493a1]">Vai trò</dt><dd className="mt-1 font-semibold text-[#20324d]">{guestOnly?"Khách mời":"Đại biểu"}</dd></div>
     </dl>
     <div className="mt-6 flex gap-2 rounded-lg bg-[#f2f7fa] p-3 text-xs leading-6 text-[#53768a]"><LockKeyhole size={17} className="mt-1 shrink-0"/>Thông tin QR, barcode và ghế được quản lý riêng cho từng Đại hội.</div>
    </section>
    <AccountSecurity/>
   </div>
   {owned.error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tải được thông tin cá nhân. Vui lòng thử lại.</div>}
   {!owned.error&&personal.length>0&&<DelegateProfileEditor initial={personal}/>}
  </div>
 </DelegateShell>;
}
