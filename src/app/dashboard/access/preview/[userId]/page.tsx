import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,Eye,LockKeyhole,ShieldCheck,Users,IdCard,BookOpen,Armchair,ClipboardList,Activity} from "lucide-react";
import {getAuth,getCongressEffectiveAbilities,getCongressRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getPortalAbilities} from "@/lib/rbac-server";
import {loadDelegatePortal} from "@/lib/delegate-portal";
import {RBAC_ABILITY_LABELS,RBAC_LABELS,type ManagedRole} from "@/lib/access-rbac";
import {writeSystemLog} from "@/lib/system-log";
import {setVerifiedPortalPreview} from "@/lib/portal-preview-context";
import {getPortalCongressContext} from "@/lib/active-congress";
import {DelegateShell} from "@/components/delegate-shell";
import {PortalPreviewNavigation} from "@/components/portal-preview-navigation";
import MyCardPage from "@/app/my-card/page";
import DelegateCheckinPage from "@/app/my-card/checkin/page";
import DelegateSeatsPage from "@/app/my-card/seats/page";
import DelegateDocumentsPage from "@/app/my-card/documents/page";
import DelegateBchPage from "@/app/my-card/bch/page";
import DelegateHistoryPage from "@/app/my-card/history/page";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sections=[
 {id:"overview",name:"Tổng quan / thẻ",ability:"workspace.view",portal:"portal.card",icon:IdCard},
 {id:"attendance",name:"Điểm danh",ability:"attendance.read",portal:"portal.checkin",icon:Activity},
 {id:"delegates",name:"Đại biểu",ability:"delegates.read",portal:null,icon:Users},
 {id:"seating",name:"Chỗ ngồi",ability:"seating.read",portal:"portal.seating",icon:Armchair},
 {id:"bch",name:"Nhân sự BCH",ability:"bch.read",portal:"portal.bch",icon:ClipboardList},
 {id:"ballots",name:"Kiểm phiếu BCH",ability:"ballots.read",portal:null,icon:ClipboardList},
 {id:"documents",name:"Tài liệu",ability:"documents.read",portal:"portal.documents",icon:BookOpen},
 {id:"history",name:"Lịch sử",ability:"reports.read",portal:"portal.history",icon:Activity}
] as const;
function card(title:string,body:string){
 return <div className="rounded-xl border border-[#dbe7ee] bg-white p-5">
  <p className="text-[12px] font-bold text-[#2f607c]">{title}</p>
  <p className="mt-2 text-[13px] leading-6 text-[#56748a]">{body}</p>
 </div>;
}
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
  const guestOnly=!portalContext.delegateCongressIds.length&&Boolean(portalContext.guestCongressIds.length);
  await writeSystemLog({level:"info",source:"auth",event:"rbac.readonly_preview_opened",
   message:"Quản trị xem giao diện cổng đại biểu thực tế ở chế độ chỉ đọc.",
   actorId:user.id,congressId,context:{operation:"rbac.preview",targetId:userId,view:selectedView}}).catch(()=>{});
  return <PortalPreviewNavigation basePath={basePath} congressId={congressId}>
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
  </PortalPreviewNavigation>;
 }
 const rights:string[]=isStaff?
  [...await getCongressEffectiveAbilities(db,userId,congressId)]:
  [...await getPortalAbilities(userId,congressId,role)];
 // Staff effective abilities are verified against the actual target account and tenant.
 const verifiedRole=isStaff?await getCongressRole(db,userId,congressId):null;
 if(isStaff&&verifiedRole!==role)notFound();
 const allowed=sections.filter(s=>rights.includes(isStaff?s.ability:(s.portal||"__never__") as never));
 const section=allowed.find(s=>s.id===view)||allowed[0]||null;
 const portalData=!isStaff&&rights.includes("portal.card" as never)?
  await loadDelegatePortal(userId).catch(()=>[]):[];
 const portal=portalData.find(d=>d.congressId===congressId);
 const selectColumns=section?.id==="delegates"?"full_name,unit,delegate_type":
  section?.id==="bch"?"full_name,current_position":
  section?.id==="documents"?"file_name,delegate_visible":
  section?.id==="attendance"?"name,status,starts_at":
  section?.id==="ballots"?"full_name,votes_received":
  section?.id==="seating"?"title":"id";
 const table=section?.id==="delegates"?"delegates":
  section?.id==="bch"||section?.id==="ballots"?"bch_candidates":
  section?.id==="documents"?"documents":
  section?.id==="attendance"?"attendance_sessions":
  section?.id==="seating"?"seating_layouts":null;
 const previewRows:Record<string,unknown>[]=[];
 if(table){
  const result=await db.from(table).select(selectColumns).eq("congress_id",congressId).limit(12);
  if(!result.error)previewRows.push(...(result.data||[]) as unknown as Record<string,unknown>[]);
 }
 // Viewing never creates a Supabase Auth session and never changes cookies.
 await writeSystemLog({level:"info",source:"auth",event:"rbac.readonly_preview_opened",
  message:"Quản trị mở bản xem thử tài khoản (không chuyển phiên đăng nhập).",
  actorId:user.id,congressId,context:{operation:"rbac.preview",targetId:userId,view:section?.id||"none"}}).catch(()=>{});
 return <main className={"min-h-dvh bg-[#f2f6fa] "+(isStaff?"text-[#253a50]":"text-[#244c60]")}>
  <div className="sticky top-0 z-40 border-b border-amber-200 bg-[#fff5de] px-4 py-3">
   <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-3">
    <p className="flex items-center gap-2 text-[12px] font-bold text-[#8a5b20]">
     <Eye size={17}/> CHẾ ĐỘ XEM THỬ · CHỈ ĐỌC · KHÔNG ĐĂNG NHẬP THAY
    </p>
    <Link href={"/dashboard/access?congressId="+congressId} className="inline-flex items-center gap-2 rounded-lg bg-[#7b5728] px-4 py-2 text-[12px] font-bold text-white">
     <ArrowLeft size={16}/> Thoát xem thử</Link>
   </div>
  </div>
  <div className="mx-auto max-w-[1450px] px-4 py-6 sm:px-7">
   <header className="rounded-2xl border border-[#d6e3eb] bg-white px-6 py-6">
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#3b819c]"><ShieldCheck size={16}/>
     {isStaff?"GIAO DIỆN ĐIỀU HÀNH":"CỔNG ĐẠI BIỂU / KHÁCH MỜI"} · PREVIEW</p>
    <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-[#1c4058]">{name}</h1>
    <p className="mt-1 text-[12px] text-[#71899b]">{RBAC_LABELS[role]} · {congressResult.data.name}</p>
    <p className="mt-3 text-[11px] leading-5 text-[#8b99a4]">
     Quyền và thông tin được đọc từ dữ liệu tài khoản đích. Mọi nút thao tác, camera, cập nhật hồ sơ và ghi điểm danh đều bị vô hiệu hóa.
     Địa chỉ trình duyệt vẫn giữ phiên quản trị viên.
    </p>
   </header>
   <div className="mt-5 grid items-start gap-5 lg:grid-cols-[265px_minmax(0,1fr)]">
    <aside className="rounded-xl border border-[#dbe6ed] bg-white p-4 lg:sticky lg:top-20">
     <h2 className="mb-3 text-[12px] font-extrabold text-[#2b5570]">Điều hướng được cấp quyền</h2>
     <nav className="grid gap-1.5" aria-label="Điều hướng giao diện mô phỏng">
      {allowed.map(s=><Link key={s.id}
       href={"/dashboard/access/preview/"+userId+"?congressId="+congressId+"&view="+s.id}
       className={"flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-[12px] font-bold "+
        (section?.id===s.id?"bg-[#e8f3f9] text-[#176e94]":"text-[#547b90] hover:bg-[#f6f9fb]")}>
       <s.icon size={17}/>{s.name}</Link>)}
      {!allowed.length&&<p className="p-3 text-[12px] text-[#a26e3d]">Không có phân hệ nào được cấp.</p>}
     </nav>
     <div className="mt-4 border-t border-[#e5edf1] pt-3">
      <p className="text-[11px] font-bold text-[#5d7b8c]">{rights.length} quyền hiệu lực</p>
      <div className="mt-2 space-y-1">{rights.map(r=><p key={r} className="text-[10px] text-[#8398a4]">· {RBAC_ABILITY_LABELS[r]||r}</p>)}</div>
     </div>
    </aside>
    <section className="min-w-0 space-y-4">
     <div className="rounded-xl border border-[#dae6ed] bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#598397]">BẢN DỰNG GIAO DIỆN THEO QUYỀN THỰC TẾ</p>
      <h2 className="mt-2 text-[21px] font-extrabold text-[#2b536a]">{section?.name||"Không có quyền truy cập"}</h2>
      <p className="mt-2 text-[12px] leading-6 text-[#758e9f]">Giao diện mô phỏng chỉ đọc dựa trên dữ liệu thuộc {congressResult.data.name}.</p>
     </div>
     {!section?card("Truy cập đã bị hạn chế","Tài khoản không có phân hệ hợp lệ trong Đại hội này."):
      section.id==="overview"&&isStaff?card("Bảng điều hành",congressResult.data.name+" · Trạng thái: "+congressResult.data.status):
      section.id==="overview"&&portal?<>
       {card("Thẻ đại biểu",portal.fullName+" · "+portal.unit+" · "+portal.position)}
       {card("Thông tin ghế",portal.sessions.map(s=>s.name+": "+(s.seat?.code||"Chưa phân ghế")).join(" · ")||"Chưa có phiên điểm danh")}
       {card("Mã định danh (chỉ đọc)",portal.barcodeCode||"Chưa cấp mã")}
      </>:
      section.id==="overview"?card("Quyền thẻ đại biểu","Chưa có thẻ hoặc quyền xem thẻ đã được thu hồi."):
      section.id==="history"&&portal?card("Lịch sử tham dự",
       portal.history.map(h=>h.sessionName+" · "+new Date(h.checkedInAt).toLocaleString("vi-VN")).join(" | ")||"Chưa điểm danh."):
      section.id==="history"?card("Lịch sử","Tài khoản không có dữ liệu lịch sử trong bản xem thử."):
      <div className="space-y-2">
       {section.id==="attendance"&&<p className="rounded-lg border border-[#d5e5ec] bg-[#eaf4f8] p-3 text-[12px] text-[#4c748a]">
        Chỉ xem danh sách phiên; chức năng quét QR và xác nhận điểm danh bị khóa.</p>}
       {previewRows.map((row,index)=><div key={index}
        className="flex items-center justify-between gap-3 rounded-xl border border-[#dce8ee] bg-white p-4">
        <div>
         <p className="text-[13px] font-bold text-[#315872]">{String(row.full_name||row.file_name||row.name||row.title||"Mục "+(index+1))}</p>
         <p className="mt-1 text-[11px] text-[#8096a5]">{String(row.unit||row.current_position||row.status||"Dữ liệu Đại hội")}</p>
        </div>
        <span className="rounded-md bg-[#edf4f8] px-2 py-1 text-[10px] font-semibold text-[#537a90]">Chỉ xem</span>
       </div>)}
       {!previewRows.length&&card("Chưa có dữ liệu","Không có bản ghi cho phân hệ đang xem, hoặc tài khoản chưa được cấp hồ sơ tương ứng.")}
      </div>}
     <p className="flex items-center gap-2 text-[11px] text-[#79909f]"><LockKeyhole size={14}/> Không thực thi quyền người dùng, không ghi/chỉnh sửa bất kỳ dữ liệu nào.</p>
    </section>
   </div>
  </div>
 </main>;
}
