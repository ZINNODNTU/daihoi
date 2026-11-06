import {redirect} from "next/navigation";
import Link from "next/link";
import {Activity,ArrowRight,Building2,CalendarDays,LayoutGrid,Plus,ShieldCheck} from "lucide-react";
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
      <Link href="/" className="btn btn-primary mt-6">Về trang chủ <ArrowRight size={16}/></Link>
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
    {label:"Tổng Đại hội",value:items.length,icon:LayoutGrid,foot:"Tất cả kỳ Đại hội"},
    {label:"Đang diễn ra",value:items.filter(c=>c.status==="live").length,icon:Activity,foot:"Đại hội đang hoạt động"},
    {label:"Đang chuẩn bị",value:items.filter(c=>c.status==="preparing").length,icon:CalendarDays,foot:"Chưa bắt đầu"},
    {label:"Đã kết thúc",value:items.filter(c=>c.status==="completed").length,icon:Building2,foot:"Đã hoàn tất"}
  ];

  return <AppShell name={profile?.full_name||user.email||""}>
    <div className="page-heading">
      <div>
        <p className="page-kicker">KHÔNG GIAN ĐIỀU HÀNH</p>
        <h1 className="page-title">Tổng quan hệ thống</h1>
        <p className="page-description">Theo dõi và quản lý các kỳ Đại hội trong cùng một không gian làm việc.</p>
      </div>
      {canCreate&&<a href="#tao-dai-hoi" className="btn btn-primary"><Plus size={17}/> Tạo Đại hội mới</a>}
    </div>

    {error&&<div className="mb-5 rounded-[9px] border border-red-200 bg-red-50 p-4 text-[13px] leading-6 text-red-700" role="alert">
      Không tải được danh sách Đại hội: {error.message}. Vui lòng kiểm tra cơ sở dữ liệu và quyền truy cập.
    </div>}

    <section aria-label="Tổng quan trạng thái" className="mb-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {metrics.map(({label,value,icon:Icon,foot})=><div className="metric-card" key={label}>
        <div className="flex items-start justify-between gap-2">
          <span className="metric-label">{label}</span>
          <span className="metric-icon"><Icon size={17} strokeWidth={1.9}/></span>
        </div>
        <p className="metric-value">{value.toLocaleString("vi-VN")}</p>
        <p className="metric-foot">{foot}</p>
      </div>)}
    </section>

    <CongressDirectory items={items}/>

    {canCreate&&<section id="tao-dai-hoi" className="mt-10 scroll-mt-24"><CreateCongress/></section>}
  </AppShell>;
}
