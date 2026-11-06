import {redirect} from "next/navigation";
import Link from "next/link";
import {Activity,ArrowRight,Building2,CalendarDays,Layers3,PlusCircle,ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/app-shell";
import {CreateCongress} from "@/components/create-congress";
import {CongressDirectory,type CongressSummary} from "@/components/congress-directory";

export const dynamic="force-dynamic";

export default async function Dashboard(){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    return <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-5 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e0f4ef] text-[#0c8584]"><ShieldCheck size={30}/></div>
      <h1 className="page-title">Chưa kết nối cơ sở dữ liệu</h1>
      <p className="page-description mt-4 max-w-xl">Quản trị viên cần cấu hình Supabase trước khi sử dụng bảng điều hành. Hãy xem tệp README.md và .env.example trong mã nguồn.</p>
      <Link href="/" className="btn btn-primary mt-6">Về trang chủ <ArrowRight size={17}/></Link>
    </main>;
  }

  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const [{data:profile},{data:congresses,error}]=await Promise.all([
    supabase.from("profiles").select("full_name,platform_role").eq("id",user.id).maybeSingle(),
    supabase.from("congresses").select("id,name,kind,term,status,slug,venue,created_at").order("created_at",{ascending:false})
  ]);
  const items=(congresses??[]) as CongressSummary[];
  const canCreate=profile?.platform_role==="super_admin";
  const metrics=[
    {label:"Tổng Đại hội",value:items.length,icon:Layers3,accent:"#0e8989"},
    {label:"Đang diễn ra",value:items.filter(c=>c.status==="live").length,icon:Activity,accent:"#128a69"},
    {label:"Đang chuẩn bị",value:items.filter(c=>c.status==="preparing").length,icon:CalendarDays,accent:"#c68a30"},
    {label:"Đã kết thúc",value:items.filter(c=>c.status==="completed").length,icon:Building2,accent:"#647e9a"}
  ];

  return <AppShell name={profile?.full_name||user.email||""}>
    <div className="relative mb-6 overflow-hidden rounded-[24px] bg-[#0d344a] px-5 py-7 text-white shadow-[0_15px_40px_rgba(14,54,75,.12)] sm:px-8 sm:py-9 xl:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-[340px] w-[340px] rounded-full bg-[#168e90]/30 blur-[35px]"/>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-140px] right-[20%] h-[260px] w-[260px] rounded-full bg-[#30bdaf]/10 blur-[55px]"/>
      <div className="relative flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-[#73e4da]">Trung tâm điều hành</p>
          <h1 className="mt-3 text-[28px] font-black leading-tight tracking-[-.04em] sm:text-[35px]">Chào mừng đến Đại hội số</h1>
          <p className="mt-3 max-w-[650px] text-sm leading-[1.8] text-[#bed8e2]">Quản lý các kỳ Đại hội, nhân sự, điểm danh và báo cáo từ một không gian làm việc thống nhất.</p>
        </div>
        {canCreate&&<a href="#tao-dai-hoi" className="btn shrink-0 border border-[#92e6d9]/25 bg-[#51cfc0] text-[#113a45] hover:bg-[#8be8da]"><PlusCircle size={18}/> Tạo Đại hội mới</a>}
      </div>
    </div>

    {error&&<p className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">Không tải được danh sách: {error.message}. Vui lòng kiểm tra cơ sở dữ liệu và quyền truy cập.</p>}

    <section aria-label="Tổng quan trạng thái" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {metrics.map(({label,value,icon:Icon,accent})=><div className="card stat-card min-w-0 p-4 sm:p-5" key={label}>
        <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold leading-[1.6] text-[#637f91] sm:text-sm">{label}</p><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf7f6]" style={{color:accent}}><Icon size={19}/></span></div>
        <p className="stat-value relative mt-4 text-[30px] font-black leading-none tracking-[-.04em] text-[#12354a] sm:text-4xl">{value.toLocaleString("vi-VN")}</p>
      </div>)}
    </section>

    <CongressDirectory items={items}/>

    {canCreate&&<section id="tao-dai-hoi" className="mt-10 scroll-mt-24"><CreateCongress/></section>}
  </AppShell>;
}
