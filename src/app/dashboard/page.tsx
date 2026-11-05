import {redirect} from "next/navigation";
import Link from "next/link";
import {CalendarDays,ChevronRight,Layers3,PlusCircle,Activity,Building2} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/app-shell";
import {CreateCongress} from "@/components/create-congress";
export const dynamic="force-dynamic";
export default async function Dashboard(){
 if(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  return <div className="p-10"><h1 className="text-2xl font-bold">Chưa kết nối Supabase</h1><p className="mt-3">Hãy cấu hình các biến trong .env.example và khởi tạo schema.sql.</p></div>;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const [{data:profile},{data:congresses,error}]=await Promise.all([
  supabase.from("profiles").select("full_name,platform_role").eq("id",user.id).maybeSingle(),
  supabase.from("congresses").select("id,name,kind,term,status,slug,venue,created_at").order("created_at",{ascending:false})
 ]);
 const items=congresses??[];
 return <AppShell name={profile?.full_name||user.email||""}>
   <div className="flex justify-between items-center gap-5 flex-wrap mb-8"><div><p className="text-sm font-bold text-[#1a9aa2] tracking-widest">TRUNG TÂM ĐIỀU HÀNH</p><h1 className="text-3xl font-extrabold mt-2">Danh sách Đại hội</h1><p className="helper mt-2">Chọn một đại hội để quản lý đại biểu và phiên điểm danh.</p></div>{profile?.platform_role==="super_admin"&&<a href="#create" className="btn btn-primary"><PlusCircle size={18}/> Tạo Đại hội</a>}</div>
   {error&&<p className="card p-4 text-red-600 mb-5">Không tải được danh sách: {error.message}. Hãy kiểm tra schema và quyền truy cập.</p>}
   <div className="stats mb-7">
     {[[Layers3,"Tổng Đại hội",items.length],[Activity,"Đang diễn ra",items.filter(x=>x.status==="live").length],[CalendarDays,"Đang chuẩn bị",items.filter(x=>x.status==="preparing").length],[Building2,"Đã kết thúc",items.filter(x=>x.status==="completed").length]].map(([Icon,title,value])=>{const I=Icon as typeof Layers3;return <div className="card p-5" key={String(title)}><div className="flex justify-between items-center"><span className="text-[#798da0] text-xs font-bold">{String(title)}</span><span className="text-[#228aaa] bg-[#eff9fb] p-2 rounded-xl"><I size={20}/></span></div><div className="text-3xl font-extrabold mt-3">{String(value)}</div></div>})}
   </div>
   <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
     {items.map(c=><Link key={c.id} href={`/congresses/${c.id}`} className="card p-6 hover:border-[#69c5cc] hover:shadow-xl transition-shadow group">
      <div className="flex justify-between items-start gap-3"><div className="rounded-xl bg-[#e9f9f8] text-[#168c9d] p-3"><Layers3 size={25}/></div><span className={`badge ${c.status==="live"?"badge-green":c.status==="preparing"?"badge-yellow":"badge-gray"}`}>{c.status==="live"?"Đang diễn ra":c.status==="preparing"?"Chuẩn bị":"Kết thúc"}</span></div>
      <div className="text-[11px] uppercase tracking-wider text-[#7094a8] font-bold mt-5">{c.kind==="doan"?"ĐOÀN TNCS HỒ CHÍ MINH":"HỘI SINH VIÊN VIỆT NAM"}</div>
      <h2 className="text-lg font-extrabold leading-snug mt-2 min-h-14">{c.name}</h2>
      <div className="text-sm text-[#7b90a3] mt-4">Nhiệm kỳ: <span className="text-[#385a72] font-semibold">{c.term||"Chưa cập nhật"}</span></div>
      <div className="flex justify-between items-center border-t border-[#e9f0f5] mt-6 pt-4 text-sm font-bold text-[#167aa2]">Quản lý đại hội <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18}/></div>
     </Link>)}
     {!items.length&&<div className="card p-9 col-span-full text-center"><Layers3 size={32} className="mx-auto text-[#7daabc]"/><p className="font-bold mt-4">Chưa có Đại hội nào</p><p className="helper mt-2">Liên hệ quản trị hệ thống để được cấp quyền hoặc tạo Đại hội mới.</p></div>}
   </div>
   {profile?.platform_role==="super_admin"&&<div id="create" className="mt-12"><CreateCongress/></div>}
 </AppShell>;
}
