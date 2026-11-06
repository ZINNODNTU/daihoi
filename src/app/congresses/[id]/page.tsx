import Link from "next/link";
import {notFound} from "next/navigation";
import {
  ArrowRight,ArrowUpRight,BarChart3,CalendarDays,CheckCircle2,
  Armchair,ChevronRight,ClipboardList,FileText,Layers3,MapPin,QrCode,Users,UserRoundCheck
} from "lucide-react";
import {createClient} from "@/lib/supabase/server";

const areas=[
  {href:"delegates",icon:Users,number:"01",title:"Quản lý đại biểu",description:"Danh sách, phân loại, nhập Excel và cấp thẻ định danh QR/Barcode.",color:"text-[#0d827f]",background:"bg-[#e5f7f3]"},
  {href:"attendance",icon:QrCode,number:"02",title:"Điểm danh đại hội",description:"Quét mã bằng camera, điểm danh thủ công và điều hành từng phiên.",color:"text-[#246faf]",background:"bg-[#eaf3fb]"},
  {href:"seating",icon:Armchair,number:"03",title:"Sơ đồ chỗ ngồi",description:"Tạo hàng ghế, chọn đại biểu cho từng vị trí và phân ghế hàng loạt qua Excel.",color:"text-[#0a857e]",background:"bg-[#e5f7f3]"},
  {href:"reports",icon:ClipboardList,number:"03",title:"Báo cáo & thống kê",description:"Theo dõi tỷ lệ tham dự, lọc đại biểu và xuất báo cáo chi tiết.",color:"text-[#a56e20]",background:"bg-[#fff4e2]"},
  {href:"documents",icon:FileText,number:"04",title:"Thư viện tài liệu",description:"Truy cập văn kiện, hình ảnh và các tài liệu đã được phân quyền.",color:"text-[#7960b0]",background:"bg-[#f2edfc]"}
];

export default async function CongressHome({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const [{data:congress},{data:delegates},{data:sessions},{data:checkins}]=await Promise.all([
    supabase.from("congresses").select("id,name,term,venue,kind,status,slug").eq("id",id).maybeSingle(),
    supabase.from("delegates").select("id").eq("congress_id",id).eq("is_active",true),
    supabase.from("attendance_sessions").select("id,name,status,starts_at,ends_at,created_at").eq("congress_id",id).order("created_at",{ascending:false}),
    supabase.from("checkins").select("id,session_id").eq("congress_id",id)
  ]);
  if(!congress)notFound();

  const current=sessions?.[0];
  const arrived=checkins?.filter(row=>row.session_id===current?.id).length||0;
  const total=delegates?.length||0;
  const percent=total?Math.min(100,Math.round(arrived/total*100)):0;
  const stats=[
    {label:"Hồ sơ đại biểu",value:total,icon:Users},
    {label:"Đã điểm danh",value:arrived,icon:UserRoundCheck},
    {label:"Chưa điểm danh",value:Math.max(total-arrived,0),icon:CalendarDays},
    {label:"Phiên làm việc",value:sessions?.length||0,icon:BarChart3}
  ];
  const statusText=congress.status==="live"?"Đang diễn ra":congress.status==="completed"?"Đã kết thúc":"Đang chuẩn bị";

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-[24px] bg-[#103a4e] p-5 text-white shadow-[0_16px_40px_rgba(14,54,75,.12)] sm:p-8 lg:p-9">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#138e91]/30 blur-[36px]"/>
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#90efe1]"><Layers3 size={15}/> Bảng điều hành Đại hội</span>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold"><span className="h-2 w-2 rounded-full bg-[#65ddc3]"/>{statusText}</span>
        </div>
        <h1 className="mt-5 max-w-4xl text-[26px] font-black leading-[1.3] tracking-[-.035em] sm:text-[34px] lg:text-[38px]">{congress.name}</h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-[.1em] text-[#8bb4c5]">{congress.kind==="hoi_sinh_vien"?"Hội Sinh viên Việt Nam":"Đoàn TNCS Hồ Chí Minh"}</p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#c0d8e2]">
          <span className="inline-flex items-center gap-2"><CalendarDays size={17} className="text-[#8ee7dd]"/>{congress.term||"Chưa có nhiệm kỳ"}</span>
          <span className="inline-flex items-center gap-2"><MapPin size={17} className="text-[#8ee7dd]"/>{congress.venue||"Chưa cập nhật địa điểm"}</span>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link className="btn border border-[#91e3d9]/10 bg-[#6cdbcd] text-[#093f47] hover:bg-[#93ede1]" href={`/congresses/${id}/attendance`}><QrCode size={18}/> Vào điểm danh <ArrowRight size={17}/></Link>
          <Link className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20" href={`/congresses/${id}/reports`}><BarChart3 size={18}/> Xem báo cáo</Link>
        </div>
      </div>
    </section>

    <section aria-label="Số liệu Đại hội" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {stats.map(({label,value,icon:Icon})=><div key={label} className="card stat-card min-w-0 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2"><p className="text-xs font-bold leading-relaxed text-[#71889a] sm:text-sm">{label}</p><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f7f4] text-[#0e8987]"><Icon size={18}/></span></div>
        <p className="stat-value relative mt-4 text-3xl font-black tracking-[-.035em] sm:text-4xl">{value.toLocaleString("vi-VN")}</p>
      </div>)}
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><p className="eyebrow">Nghiệp vụ Đại hội</p><h2 className="section-title mt-1">Truy cập nhanh</h2></div>
          <p className="helper">Các công việc dành cho Ban Tổ chức</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {areas.map(area=><Link href={`/congresses/${id}/${area.href}`} key={area.href}
            className="card group flex min-h-[200px] min-w-0 flex-col p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#94d9d1] hover:shadow-[0_18px_38px_rgba(11,74,84,.08)] sm:p-6">
            <div className="flex items-center justify-between">
              <span className={`flex h-12 w-12 items-center justify-center rounded-[15px] ${area.background} ${area.color}`}><area.icon size={23}/></span>
              <span className="text-xs font-extrabold text-[#bbccd6]">{area.number}</span>
            </div>
            <h3 className="mt-5 text-[16px] font-extrabold">{area.title}</h3>
            <p className="helper mt-1 flex-1">{area.description}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#0a8884]">Mở chức năng <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-1"/></span>
          </Link>)}
        </div>
      </section>

      <section className="card flex min-w-0 flex-col p-5 sm:p-6" aria-label="Tiến độ phiên gần nhất">
        <div className="flex items-center justify-between gap-3"><h2 className="section-title">Tiến độ điểm danh</h2><span className="rounded-xl bg-[#e9f7f4] p-2 text-[#0c8781]"><CheckCircle2 size={19}/></span></div>
        <p className="helper mt-2">{current?.name||"Chưa có phiên làm việc"}</p>
        <div className="mt-6 flex items-end gap-2"><span className="text-5xl font-black tracking-tight text-[#0c787b]">{percent}%</span><span className="pb-1 text-sm text-[#7b91a1]">đã điểm danh</span></div>
        <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Tỷ lệ điểm danh phiên gần nhất" className="mt-4 h-3 overflow-hidden rounded-full bg-[#e8f0f1]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#118a99] to-[#2ec5a8]" style={{width:percent+"%"}}/>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-xl bg-[#f4f9f9] p-4"><div><p className="text-xs font-semibold text-[#78909a]">Đại biểu đã ghi nhận</p><p className="mt-1 text-xl font-black">{arrived} <span className="text-sm font-semibold text-[#8598a4]">/ {total}</span></p></div><UserRoundCheck size={25} className="text-[#0f8b89]"/></div>
        <p className="helper mt-4">Số liệu theo phiên gần nhất, không thay thế xác minh tư cách đại biểu.</p>
        <Link href={`/congresses/${id}/attendance`} className="btn btn-secondary mt-auto w-full gap-2 pt-3">Xem chi tiết phiên <ChevronRight size={17}/></Link>
      </section>
    </div>

    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebf1f2] p-5 sm:p-6"><div><h2 className="section-title">Các phiên điểm danh</h2><p className="helper mt-1">Theo dõi số lượt đã được ghi nhận ở từng phiên.</p></div><Link href={`/congresses/${id}/attendance`} className="text-sm font-bold text-[#0c8585] hover:underline">Quản lý phiên <ArrowRight size={16} className="inline"/></Link></div>
      {!sessions?.length?<div className="empty-state"><QrCode size={30} className="mx-auto text-[#91b6ba]"/><p className="mt-3 font-bold">Chưa có phiên điểm danh</p><p className="helper mt-1">Hãy vào mục Điểm danh để tạo phiên làm việc đầu tiên.</p></div>:
      <div className="divide-y divide-[#eaf0f2]">
        {sessions.slice(0,8).map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="min-w-0"><p className="font-extrabold text-sm">{s.name}</p><span className={`mt-1.5 badge ${s.status==="open"?"badge-green":"badge-gray"}`}>{s.status==="open"?"Được phép mở theo giờ":"Đã đóng"}</span></div>
          <p className="text-sm font-extrabold text-[#0c8388]">{checkins?.filter(c=>c.session_id===s.id).length||0} <span className="text-xs font-semibold text-[#758b9c]">lượt</span></p>
        </div>)}
      </div>}
    </section>
  </div>;
}
