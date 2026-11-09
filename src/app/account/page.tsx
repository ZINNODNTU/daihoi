import {redirect} from "next/navigation";
import {CircleUserRound,ShieldCheck} from "lucide-react";
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
 const db=createAdminClient();
 const [profileResult,staff,owned,guestMemberships,context]=await Promise.all([
  supabase.from("profiles").select("full_name,platform_role").eq("id",user.id).maybeSingle(),
  isStaffUser(supabase,user.id),
  db.from("delegates").select("id,congress_id,full_name,unit,position,gender,birth_date,photo_path")
   .eq("auth_user_id",user.id).eq("is_active",true).order("created_at",{ascending:true}).limit(100),
  db.from("congress_members").select("congress_id").eq("user_id",user.id)
   .eq("role","guest").limit(100),
  getPortalCongressContext(user.id).catch(()=>null)
 ]);
 const profile=profileResult.data;
 const internalDomain="@accounts.daihoi.invalid";
 const loginName=user.email?.endsWith(internalDomain)
  ?user.email.slice(0,-internalDomain.length)+"@dntu.edu.vn"
  :user.email||"Tài khoản";
 const alias=typeof user.user_metadata?.login_alias==="string"
  ?user.user_metadata.login_alias:loginName;
 const first=owned.data?.[0];
 const name=first?.full_name||profile?.full_name||"Thành viên Đại hội";
 const guestOnly=!staff&&!owned.data?.length&&Boolean(guestMemberships.data?.length);
 const role=profile?.platform_role==="super_admin"?"Quản trị hệ thống":
  staff?"Nhân sự Ban Tổ chức":guestOnly?"Khách mời":"Đại biểu";
 // Every verified Auth user has only ONE personal editing form.
 // All linked delegate records are updated by the server using auth_user_id.
 const personal:EditableDelegate[]=first?[{
  ...first,congressName:"Tất cả Đại hội",
  gender:(first.gender||null) as EditableDelegate["gender"]
 }]:[];
 const content=<>
  <div className="mb-6 flex flex-wrap items-start gap-4">
   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e6f2fa] text-[#007fae]">
    <CircleUserRound size={25}/>
   </div>
   <div>
    <p className="page-kicker">DANH TÍNH DÙNG CHUNG</p>
    <h1 className="page-title mt-2">Tài khoản của tôi</h1>
    <p className="page-description">Thông tin cá nhân và ảnh chỉ có một bản dùng cho mọi Đại hội của bạn. Mật khẩu cũng dùng chung.</p>
   </div>
  </div>
  <div className="grid max-w-[1040px] gap-5 lg:grid-cols-[.9fr_1.1fr]">
   <section className="rounded-xl border border-[#dfe7ef] bg-white p-5 shadow-sm sm:p-6">
    <h2 className="text-[16px] font-bold text-[#20324d]">Danh tính của bạn</h2>
    <dl className="mt-5 space-y-4">
     <div><dt className="text-[11px] font-semibold text-[#8692a4]">Họ và tên</dt><dd className="mt-1 text-[14px] font-semibold text-[#20324d]">{name}</dd></div>
     <div><dt className="text-[11px] font-semibold text-[#8692a4]">Tên đăng nhập</dt><dd className="mt-1 break-all text-[14px] font-semibold text-[#20324d]">{alias}</dd></div>
     <div><dt className="text-[11px] font-semibold text-[#8692a4]">Vai trò tài khoản</dt><dd className="mt-1 text-[14px] font-semibold text-[#20324d]">{role}</dd></div>
    </dl>
    <div className="mt-6 flex items-start gap-2 rounded-lg border border-[#d5eee8] bg-[#f0faf5] p-3 text-[12px] leading-6 text-[#2b6b56]">
     <ShieldCheck size={18} className="mt-1 shrink-0"/>
     Họ tên, ảnh, đơn vị, chức vụ, giới tính và ngày sinh được đồng bộ cho các hồ sơ liên kết cùng tài khoản.
     Mã đại biểu, barcode và ghế vẫn tách riêng cho từng Đại hội.
    </div>
   </section>
   <AccountSecurity/>
  </div>
  {owned.error&&<div role="alert" className="mt-6 max-w-[1040px] rounded-xl border border-[#edc7c4] bg-[#fff5f3] p-4 text-[13px] text-[#9f3228]">Không tải được thông tin cá nhân. Vui lòng tải lại trang hoặc liên hệ Ban Tổ chức.</div>}
  {!owned.error&&personal.length>0&&<DelegateProfileEditor initial={personal}/>}
 </>;
 return staff?<AppShell name={name}>{content}</AppShell>:
  <DelegateShell name={name} guestOnly={guestOnly}
   congresses={context?.options||[]} activeCongressId={context?.activeCongressId||null}>{content}</DelegateShell>;
}
