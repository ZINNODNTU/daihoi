import {redirect} from "next/navigation";
import Link from "next/link";
import {
  Activity,ArrowRight,Building2,CalendarDays,
  ChevronRight,LayoutGrid,Plus,ShieldCheck
} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/app-shell";
import {CreateCongress} from "@/components/create-congress";
import {CongressDirectory,type CongressSummary} from "@/components/congress-directory";

export const dynamic="force-dynamic";

export default async function Dashboard(){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    return <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-5 text-center">
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-[11px] border border-[#e1e7ee] bg-white text-[#45608a]"><ShieldCheck size={26}/></span>
      <h1 className="page-title">Chưa kết nối cơ sở dữ liệu</h1>
      <p className="page-description mt-4 max-w-xl">Quản trị viên cần cấu hình Supabase trước khi sử dụng bảng điều hành. Xem hướng dẫn trong README.md và .env.example.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2"><Link href="/" className="btn btn-secondary">Về trang chủ <ArrowRight size={16}/></Link>
        <Link href="/preview" className="btn btn-primary">Xem giao diện mẫu <ArrowRight size={16}/></Link></div>
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
  const live=items.filter(c=>c.status==="live").length;
  const preparing=items.filter(c=>c.status==="preparing").length;
  const completed=items.filter(c=>c.status==="completed").length;
  const metrics=[
    {label:"Tổng Đại hội",value:items.length,icon:LayoutGrid,foot:"Các Đại hội được quản lý"},
    {label:"Đang diễn ra",value:live,icon:Activity,foot:"Đang trong thời gian tổ chức"},
    {label:"Đang chuẩn bị",value:preparing,icon:CalendarDays,foot:"Sắp triển khai"},
    {label:"Đã kết thúc",value:completed,icon:Building2,foot:"Đã hoàn tất"}
  ];

  return <AppShell name={profile?.full_name||user.email||""}>
    <section className="command-hero mb-7 px-6 py-7 sm:px-9 sm:py-9 xl:px-10 xl:py-10" aria-label="Trung tâm điều hành">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="command-label">HỆ THỐNG ĐIỀU HÀNH / TỔNG QUAN</p>
          <h1 className="mt-4 text-[clamp(29px,3vw,39px)] font-semibold leading-[1.16] tracking-[-.052em] text-white">Một không gian.<br/>
            <span className="font-[Georgia] font-normal italic text-[#e7c88f]">Mọi kỳ Đại hội.</span></h1>
          <p className="mt-4 max-w-[630px] text-[13px] leading-[1.8] text-[#b6c6dc]">Quản lý thông tin và tình trạng các Đại hội trong cùng một hệ thống, thuận tiện cho việc phối hợp công tác.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="hidden border-l border-white/20 pl-4 text-[11px] text-[#bdcce0] xl:block">
            <span className="block text-[10px] uppercase tracking-[.12em] text-[#d9bd88]">ĐẠI HỘI TRONG HỆ THỐNG</span>
            <strong className="mt-2 block text-[33px] font-semibold leading-none tabular-nums text-white">{items.length.toLocaleString("vi-VN")}</strong>
          </div>
          {canCreate&&<a href="#tao-dai-hoi" className="btn command-action shrink-0"><Plus size={17}/> Tạo Đại hội mới</a>}
        </div>
      </div>
    </section>

    {error&&<div className="mb-5 rounded-[9px] border border-red-200 bg-red-50 p-4 text-[13px] leading-6 text-red-700" role="alert">
      Không tải được danh sách Đại hội: {error.message}. Vui lòng kiểm tra cơ sở dữ liệu và quyền truy cập.
    </div>}

    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div><p className="page-kicker">CHỈ SỐ HỆ THỐNG</p><h2 className="section-title mt-2">Tổng quan trạng thái</h2></div>
      <span className="text-[11px] text-[#8d9aac]">Tính từ các Đại hội bạn có quyền xem</span>
    </div>
    <section aria-label="Tổng quan trạng thái" className="mb-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(({label,value,icon:Icon,foot},index)=><div className="metric-card" key={label}>
        <div className="flex items-start justify-between gap-2">
          <span className="metric-label">{label}</span>
          <span className="metric-icon"><Icon size={18} strokeWidth={1.8}/></span>
        </div>
        <p className="metric-value">{value.toLocaleString("vi-VN")}</p>
        <div className="mt-4 flex items-center gap-2">
          <span className={"h-1 w-5 rounded-full "+(index===1?"bg-[#2f9c77]":index===2?"bg-[#d9b16b]":index===3?"bg-[#a4b1c5]":"bg-[#426ad0]")}/>
          <p className="text-[11px] text-[#98a3b0]">{foot}</p>
        </div>
      </div>)}
    </section>

    <CongressDirectory items={items}/>

    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[11px] border border-[#dfe6f0] bg-[#eef3fb] px-5 py-4">
      <div><p className="text-[12px] font-bold text-[#344967]">Làm việc theo từng Đại hội</p>
        <p className="mt-1 text-[11px] leading-6 text-[#7184a0]">Chọn một Đại hội trong danh sách để truy cập hồ sơ đại biểu, sơ đồ chỗ ngồi, điểm danh và báo cáo.</p>
      </div>
      {items.length>0&&<Link href={"/congresses/"+items[0].id} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#345bc2] hover:underline">Mở Đại hội gần nhất <ChevronRight size={15}/></Link>}
    </div>

    {canCreate&&<section id="tao-dai-hoi" className="mt-10 scroll-mt-24"><CreateCongress/></section>}
  </AppShell>;
}
