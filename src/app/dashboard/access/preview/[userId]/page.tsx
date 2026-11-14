import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,Eye,LockKeyhole,Users,BookOpen,Armchair,ClipboardList,Activity,BarChart3,UserRoundCog,Settings2,ChartColumnIncreasing} from "lucide-react";
import {getAuth,getCongressEffectiveAbilities,getCongressRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPortalAbilities} from "@/lib/rbac-server";

import {RBAC_LABELS,type ManagedRole} from "@/lib/access-rbac";
import type {CongressAbility} from "@/lib/congress-permissions";
import {writeSystemLog} from "@/lib/system-log";
import {setVerifiedPortalPreview} from "@/lib/portal-preview-context";
import {getPortalCongressContext} from "@/lib/active-congress";
import {DelegateShell} from "@/components/delegate-shell";
import {PortalPreviewNavigation} from "@/components/portal-preview-navigation";
import {AppShell} from "@/components/app-shell";
import {CongressOverviewForUser} from "@/components/congress-overview";
import {StaffPreviewNavigation} from "@/components/staff-preview-navigation";
import MyCardPage from "@/app/my-card/page";
import DelegateCheckinPage from "@/app/my-card/checkin/page";
import DelegateSeatsPage from "@/app/my-card/seats/page";
import DelegateDocumentsPage from "@/app/my-card/documents/page";
import DelegateBchPage from "@/app/my-card/bch/page";
import DelegateHistoryPage from "@/app/my-card/history/page";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const staffSections=[
 {id:"overview",name:"Bảng điều hành",ability:"workspace.view",icon:BarChart3},
 {id:"attendance",name:"Trung tâm điểm danh",ability:"attendance.read",icon:Activity},
 {id:"delegates",name:"Quản lý đại biểu",ability:"delegates.read",icon:Users},
 {id:"quality",name:"Phân tích chất lượng",ability:"quality.read",icon:ChartColumnIncreasing},
 {id:"seating",name:"Sơ đồ ghế",ability:"seating.read",icon:Armchair},
 {id:"bch-candidates",name:"Nhân sự BCH",ability:"bch.read",icon:ClipboardList},
 {id:"ballots",name:"Kiểm phiếu BCH",ability:"ballots.read",icon:ClipboardList},
 {id:"documents",name:"Tài liệu",ability:"documents.read",icon:BookOpen},
 {id:"reports",name:"Báo cáo",ability:"reports.read",icon:Activity},
 {id:"team",name:"Tài khoản BTC",ability:"team.manage",icon:UserRoundCog},
 {id:"permissions",name:"Phân quyền Đại hội",ability:"team.manage",icon:LockKeyhole},
 {id:"settings",name:"Cấu hình Đại hội",ability:"settings.manage",icon:Settings2}
] as const;

export default async function AccessPreview({params,searchParams}:{
 params:Promise<{userId:string}>;searchParams:Promise<{congressId?:string;view?:string;sessionId?:string}>
}){
 const [{userId},{congressId,view,sessionId}]=await Promise.all([params,searchParams]);
 if(!UUID.test(userId)||!congressId||!UUID.test(congressId))notFound();
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:actor}=await supabase.from("profiles").select("platform_role")
  .eq("id",user.id).maybeSingle();
 if(actor?.platform_role!=="super_admin")redirect("/dashboard");
 if(user.id===userId)redirect("/dashboard/access?congressId="+congressId);
 const db=createAdminClient();
 const [authResult,profileResult,congressResult,memberResult,btcResult,delegateResult]=await Promise.all([
  db.auth.admin.getUserById(userId),
  db.from("profiles").select("full_name,platform_role").eq("id",userId).maybeSingle(),
  db.from("congresses").select("id,name,kind,status").eq("id",congressId).maybeSingle(),
  db.from("congress_members").select("role").eq("congress_id",congressId).eq("user_id",userId).maybeSingle(),
  db.from("btc_accounts").select("user_id").eq("congress_id",congressId).eq("user_id",userId).is("disabled_at",null).maybeSingle(),
  db.from("delegates").select("id,full_name").eq("congress_id",congressId)
   .eq("auth_user_id",userId).eq("is_active",true).limit(1)
 ]);
 if(authResult.error||!authResult.data.user||!congressResult.data||memberResult.error||profileResult.error)
  notFound();
 if(profileResult.data?.platform_role==="super_admin")notFound();
 const rawRole=memberResult.data?.role;
 const isStaff=rawRole==="admin"||rawRole==="checkin"||rawRole==="secretary";
 if(isStaff&&!btcResult.data||rawRole==="delegate"&&!delegateResult.data?.length||
  !isStaff&&rawRole!=="delegate"&&rawRole!=="guest")notFound();
 const role=rawRole as ManagedRole;
 const name=profileResult.data?.full_name||delegateResult.data?.[0]?.full_name||
  authResult.data.user.email||"Tài khoản";
 if(!isStaff){
  // Reuse the actual server-rendered delegate pages and client components.
  // This request-scoped target is set only AFTER super_admin + membership
  // verification above; the admin's Supabase Auth session is never exchanged.
  const portalRights=await getPortalAbilities(userId,congressId,role);
  if(!portalRights.includes("portal.access"))notFound();
  setVerifiedPortalPreview(userId,congressId);
  const portalContext=await getPortalCongressContext(userId);
  const active=portalContext.options.find(item=>item.id===congressId);
  if(!active)notFound();
  const views=[
   {id:"overview",ability:"portal.card"},
   {id:"checkin",ability:"portal.checkin"},
   {id:"seating",ability:"portal.seating"},
   {id:"documents",ability:"portal.documents"},
   {id:"bch",ability:"portal.bch"},
   {id:"history",ability:"portal.history"}
  ];
  const available=views.filter(item=>portalRights.includes(item.ability as never));
  const preferred=view==="attendance"?"checkin":view==="seats"?"seating":view;
  const selectedView=available.find(item=>item.id===preferred)?.id||available[0]?.id||"none";
  const basePath="/dashboard/access/preview/"+userId;
  const guestOnly=!active.asDelegate;
  await writeSystemLog({level:"info",source:"auth",event:"rbac.readonly_preview_opened",
   message:"Quản trị xem giao diện cổng đại biểu thực tế ở chế độ chỉ đọc.",
   actorId:user.id,congressId,context:{operation:"rbac.preview",targetId:userId,view:selectedView}}).catch(()=>{});
  return <>
   {/* Keep the escape control outside click interception so Admin can always exit. */}
   <div className="sticky top-0 z-[60] border-b border-amber-200 bg-[#fff5df] px-3 py-2.5 print:hidden sm:px-6">
    <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-2">
     <div className="min-w-0">
      <p className="flex items-center gap-2 text-[11px] font-extrabold text-[#805522]">
       <Eye size={16}/> ADMIN ĐANG XEM HỘ · CHỈ ĐỌC
      </p>
      <p className="mt-0.5 truncate text-[11px] text-[#846c4a]">
       {name} · {active.name} · Không chuyển tài khoản, không lưu hay điểm danh
      </p>
     </div>
     <Link href={"/dashboard/access?congressId="+congressId}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#765027] px-3 text-[12px] font-bold text-white">
      <ArrowLeft size={16}/> Thoát xem thử
     </Link>
    </div>
   </div>
   <PortalPreviewNavigation basePath={basePath} congressId={congressId}>
   <DelegateShell name={name} guestOnly={guestOnly} congresses={portalContext.options}
    activeCongressId={congressId} allowedAbilities={portalRights}
    previewBasePath={basePath} previewView={selectedView}>
    {selectedView==="overview"?<MyCardPage/>:
     selectedView==="checkin"?<DelegateCheckinPage/>:
     selectedView==="seating"?<DelegateSeatsPage searchParams={Promise.resolve({sessionId})}/>:
     selectedView==="documents"?<DelegateDocumentsPage/>:
     selectedView==="bch"?<DelegateBchPage/>:
     selectedView==="history"?<DelegateHistoryPage/>:
     <div className="rounded-xl border border-[#dce8ee] bg-white p-6 text-sm text-[#526d7f]">
      Tài khoản không được cấp quyền xem phân hệ nào tại Đại hội này.
     </div>}
   </DelegateShell>
  </PortalPreviewNavigation>
  </>;
 }

 // The staff view now reuses the SAME administration shell and congress
 // overview component as the actual BTC login. No mocked mini-sidebar.
 const verifiedRole=await getCongressRole(db,userId,congressId);
 if(verifiedRole!==role)notFound();
 const rights=[...await getCongressEffectiveAbilities(db,userId,congressId)];
 if(!rights.includes("workspace.view"))notFound();
 const congress=congressResult.data;
 const visibleSections=staffSections.filter(item=>rights.includes(item.ability)&&
  (item.id!=="ballots"||congress.kind==="doan"));
 const validView=view==="bch"?"bch-candidates":view==="history"?"reports":view;
 const active=visibleSections.find(item=>item.id===validView)||visibleSections[0];
 if(!active)notFound();
 const basePath="/dashboard/access/preview/"+userId;
 const previewRoute=active.id==="overview"?"/congresses/"+congressId:
  "/congresses/"+congressId+"/"+active.id;
 const fields=active.id==="delegates"?"full_name,unit,delegate_type":
  active.id==="bch-candidates"||active.id==="ballots"?"full_name,current_position":
  active.id==="documents"?"file_name,delegate_visible":
  active.id==="attendance"?"name,status,starts_at":
  active.id==="team"?"full_name,disabled_at":
  active.id==="seating"?"title":"id";
 const table=active.id==="delegates"?"delegates":
  active.id==="bch-candidates"||active.id==="ballots"?"bch_candidates":
  active.id==="documents"?"documents":
  active.id==="attendance"?"attendance_sessions":
  active.id==="team"?"btc_accounts":
  active.id==="seating"?"seating_layouts":null;
 const previewRows:Record<string,unknown>[]=[];
 if(table&&active.id!=="overview"){
  const result=await db.from(table).select(fields).eq("congress_id",congressId).limit(12);
  if(!result.error)previewRows.push(...(result.data||[]) as unknown as Record<string,unknown>[]);
 }
 await writeSystemLog({level:"info",source:"auth",event:"rbac.readonly_preview_opened",
  message:"Super Admin xem giao diện quản trị BTC thật trong chế độ chỉ đọc.",
  actorId:user.id,congressId,context:{
   operation:"rbac.preview",targetId:userId,view:active.id
  }}).catch(()=>{});
 return <>
  <div className="sticky top-0 z-[70] border-b border-[#e6c787] bg-[#fff4d9] px-3 py-2 print:hidden sm:px-6">
   <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
     <p className="flex items-center gap-2 text-[11px] font-extrabold text-[#86591f]">
      <Eye size={16}/> ĐANG XEM GIAO DIỆN BTC · CHỈ ĐỌC
     </p>
     <p className="mt-0.5 truncate text-[11px] text-[#7c6746]">
      {name} · {RBAC_LABELS[role]} · {congressResult.data.name} · Không chuyển phiên đăng nhập
     </p>
    </div>
    <Link href={"/dashboard/access?congressId="+congressId}
     className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[#78562b] px-4 text-[12px] font-bold text-white">
     <ArrowLeft size={16}/> Thoát xem thử
    </Link>
   </div>
  </div>
  <StaffPreviewNavigation basePath={basePath} congressId={congressId}>
   <AppShell name={name} accessRole={verifiedRole}
    congressId={congressId} congressName={congressResult.data.name}
    congressKind={congressResult.data.kind}
    effectiveAbilities={rights as CongressAbility[]}
    previewMode previewRoute={previewRoute}>
    {active.id==="overview"?
     <CongressOverviewForUser supabase={db} id={congressId}
      effectiveAbilities={rights as CongressAbility[]} previewBasePath={basePath}/>:
     <div className="space-y-6">
      <header className="command-hero px-6 py-7 sm:px-9 sm:py-9" aria-label={active.name}>
       <p className="command-label">KHÔNG GIAN ĐIỀU HÀNH / {active.name.toLocaleUpperCase("vi")}</p>
       <h1 className="mt-4 text-[clamp(24px,3vw,35px)] font-extrabold tracking-[-.04em] text-white">
        {active.name}
       </h1>
       <p className="mt-3 text-[12px] leading-6 text-[#c4d9e5]">
        {congressResult.data.name} · Xem dữ liệu theo quyền của {name}.
       </p>
      </header>
      <section className="workspace-panel overflow-hidden">
       <div className="flex items-center justify-between gap-3 border-b border-[#e4ebf1] px-5 py-4">
        <div>
         <p className="page-kicker">CHẾ ĐỘ XEM THỬ</p>
         <h2 className="section-title mt-1">{active.name}</h2>
        </div>
        <span className="badge badge-yellow"><LockKeyhole size={13}/> Chỉ đọc</span>
       </div>
       {previewRows.length?
        <div className="divide-y divide-[#edf0f4]">{previewRows.map((row,index)=>
         <div key={index} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
           <p className="truncate text-[13px] font-bold text-[#2a455b]">
            {String(row.full_name||row.file_name||row.name||row.title||"Mục "+(index+1))}
           </p>
           <p className="mt-1 text-[11px] text-[#8195a2]">
            {String(row.unit||row.current_position||row.status||"Thông tin Đại hội")}
           </p>
          </div>
          <span className="shrink-0 text-[10px] font-bold text-[#618296]">Chỉ xem</span>
         </div>)}</div>:
        <div className="empty-state">
         <active.icon size={27} className="mx-auto text-[#8499a8]"/>
         <h3 className="mt-3 text-[14px] font-bold text-[#3a5567]">
          {table?"Chưa có dữ liệu hiển thị":"Đã xác minh quyền truy cập phân hệ"}
         </h3>
         <p className="helper mt-2">Bản xem thử không mở biểu mẫu, không quét QR và không thay đổi thông tin Đại hội.</p>
        </div>}
      </section>
     </div>}
   </AppShell>
  </StaffPreviewNavigation>
 </>;
}
