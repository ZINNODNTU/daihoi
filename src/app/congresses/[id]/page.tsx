import Link from "next/link";
import {notFound} from "next/navigation";
import {
  Armchair,ArrowRight,ArrowUpRight,BarChart3,CalendarDays,ChartColumnIncreasing,ChevronRight,
  ClipboardList,FileText,MapPin,QrCode,Users,UserRoundCheck
} from "lucide-react";
import {createClient} from "@/lib/supabase/server";

const areas=[
  {href:"delegates",icon:Users,title:"Quản lý đại biểu",description:"Hồ sơ đại biểu, danh sách Excel và thẻ QR / Barcode."},
  {href:"quality",icon:ChartColumnIncreasing,title:"Phân tích chất lượng",description:"Cơ cấu giới tính, độ tuổi và thống kê đại biểu đã tham dự theo từng phiên."},
  {href:"attendance",icon:QrCode,title:"Điểm danh Đại hội",description:"Quét QR, barcode, thủ công và vận hành từng phiên."},
  {href:"seating",icon:Armchair,title:"Sơ đồ chỗ ngồi",description:"Tạo sơ đồ hội trường và phân ghế theo đại biểu."},
  {href:"reports",icon:ClipboardList,title:"Báo cáo & thống kê",description:"Tỷ lệ tham dự và tổng hợp kết quả theo phiên."},
  {href:"documents",icon:FileText,title:"Thư viện tài liệu",description:"Lưu trữ văn kiện và tài liệu theo quyền truy cập."}
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
    {label:"Hồ sơ đại biểu",value:total,icon:Users,foot:"Đại biểu hoạt động"},
    {label:"Đã điểm danh",value:arrived,icon:UserRoundCheck,foot:"Phiên gần nhất"},
    {label:"Chưa điểm danh",value:Math.max(total-arrived,0),icon:CalendarDays,foot:"Phiên gần nhất"},
    {label:"Phiên làm việc",value:sessions?.length||0,icon:BarChart3,foot:"Tất cả phiên"}
  ];
  const state=congress.status==="live"
    ?{text:"Đang diễn ra",className:"badge-green"}
    :congress.status==="completed"
      ?{text:"Đã kết thúc",className:"badge-gray"}
      :{text:"Đang chuẩn bị",className:"badge-yellow"};

  return <div className="space-y-8">
    <section className="command-hero px-6 py-7 sm:px-9 sm:py-9 lg:px-10 lg:py-10" aria-label="Thông tin kỳ Đại hội">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="command-label">KHÔNG GIAN ĐIỀU HÀNH / ĐẠI HỘI</p>
        <span className={"badge gap-2 "+state.className}><span className="h-1.5 w-1.5 rounded-full bg-current"/>{state.text}</span>
      </div>
      <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <h1 className="max-w-4xl text-[clamp(27px,3.2vw,40px)] font-semibold leading-[1.23] tracking-[-.045em] text-white">{congress.name}</h1>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.13em] text-[#aebfda]">
            {congress.kind==="hoi_sinh_vien"?"HỘI SINH VIÊN VIỆT NAM":"ĐOÀN TNCS HỒ CHÍ MINH"}
          </p>
          <div className="command-meta mt-6">
            <span className="command-meta-item"><CalendarDays size={16}/>{congress.term||"Chưa có nhiệm kỳ"}</span>
            <span className="command-meta-item"><MapPin size={16}/>{congress.venue||"Chưa cập nhật địa điểm"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn command-action" href={"/congresses/"+id+"/attendance"}><QrCode size={17}/> Mở điểm danh <ArrowRight size={16}/></Link>
          <Link className="btn command-outline" href={"/congresses/"+id+"/seating"}><Armchair size={16}/> Sơ đồ ghế</Link>
        </div>
      </div>
    </section>

    <section aria-label="Số liệu Đại hội" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(({label,value,icon:Icon,foot})=><div key={label} className="metric-card">
        <div className="flex items-start justify-between gap-2">
          <span className="metric-label">{label}</span>
          <span className="metric-icon"><Icon size={18} strokeWidth={1.7}/></span>
        </div>
        <p className="metric-value">{value.toLocaleString("vi-VN")}</p>
        <p className="metric-foot">{foot}</p>
      </div>)}
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <div className="section-header">
          <div><p className="page-kicker">CÔNG CỤ ĐIỀU HÀNH</p><h2 className="section-title mt-2">Truy cập nhanh</h2></div>
          <span className="text-[11px] text-[#8593a6]">Các phân hệ theo quyền truy cập</span>
        </div>
        <div className="workspace-panel overflow-hidden">
          {areas.map((area,index)=><Link href={"/congresses/"+id+"/"+area.href} key={area.href} className="action-row group">
            <span className="action-icon"><area.icon size={19} strokeWidth={1.8}/></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <p className="action-title group-hover:text-[#0084bd]">{area.title}</p>
                <span className="hidden text-[10px] font-bold text-[#bac5d5] sm:inline">{String(index+1).padStart(2,"0")}</span>
              </div>
              <p className="action-desc mt-1">{area.description}</p>
            </div>
            <ArrowUpRight size={17} className="shrink-0 text-[#a0afc2] group-hover:text-[#0084bd]"/>
          </Link>)}
        </div>
      </section>

      <section aria-label="Tiến độ điểm danh phiên gần nhất" className="min-w-0">
        <div className="section-header"><div><p className="page-kicker">THỐNG KÊ PHIÊN</p><h2 className="section-title mt-2">Tình hình tham dự</h2></div></div>
        <div className="workspace-panel overflow-hidden">
          <div className="border-b border-[#e8edf3] px-5 py-4">
            <p className="text-[12px] font-semibold text-[#475c7b]">{current?.name||"Chưa có phiên làm việc"}</p>
            <p className="mt-1 text-[10px] text-[#92a0b2]">Phiên gần nhất · Số liệu ghi nhận</p>
          </div>
          <div className="flex flex-col items-center px-5 pb-6 pt-7 text-center">
            <div className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full"
              style={{background:"conic-gradient(#0084bd "+percent+"%,#e9edf5 "+percent+"% 100%)"}}>
              <div className="flex h-[121px] w-[121px] flex-col items-center justify-center rounded-full bg-white">
                <span className="text-[37px] font-bold leading-none tracking-[-.06em] text-[#263957]">{percent}%</span>
                <span className="mt-2 text-[10px] text-[#8998a9]">ĐÃ ĐIỂM DANH</span>
              </div>
            </div>
            <div className="mt-6 flex w-full items-center justify-between rounded-[8px] bg-[#f5f7fb] px-4 py-3">
              <span className="text-[12px] text-[#697c96]">Đại biểu có mặt</span>
              <span className="text-[18px] font-bold tabular-nums text-[#293f62]">{arrived}<span className="ml-1 text-[11px] font-normal text-[#91a0b2]">/ {total}</span></span>
            </div>
            <p className="mt-4 text-[11px] leading-6 text-[#91a0b0]">Trạng thái điểm danh không đồng nghĩa với việc đại biểu đã ngồi đúng ghế.</p>
            <Link href={"/congresses/"+id+"/attendance"} className="btn btn-secondary mt-5 w-full">Xem chi tiết phiên <ChevronRight size={16}/></Link>
          </div>
        </div>
      </section>
    </div>

    <section className="workspace-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ebf2] px-5 py-4 sm:px-6">
        <div><p className="page-kicker">DANH SÁCH PHIÊN</p><h2 className="section-title mt-1">Các phiên điểm danh</h2></div>
        <Link href={"/congresses/"+id+"/attendance"} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0084bd] hover:underline">Quản lý phiên <ArrowRight size={16}/></Link>
      </div>
      {!sessions?.length?<div className="empty-state">
        <QrCode size={25} className="mx-auto text-[#8798b0]"/>
        <p className="mt-3 text-[13px] font-bold text-[#344154]">Chưa có phiên điểm danh</p>
        <p className="helper mt-1">Vào mục Điểm danh để tạo phiên làm việc đầu tiên.</p>
      </div>:<div className="divide-y divide-[#edf0f4]">
        {sessions.slice(0,8).map((session,index)=><div key={session.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] bg-[#f1f4f9] text-[11px] font-bold text-[#6880a1]">{String(index+1).padStart(2,"0")}</span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[#303f54]">{session.name}</p>
              <span className={"badge mt-1.5 "+(session.status==="open"?"badge-green":"badge-gray")}>
                {session.status==="open"?"Cho phép điểm danh":"Đã đóng"}
              </span>
            </div>
          </div>
          <span className="text-[14px] font-bold tabular-nums text-[#273e62]">{checkins?.filter(record=>record.session_id===session.id).length||0}
            <span className="ml-1 text-[11px] font-medium text-[#8d9bab]">lượt</span>
          </span>
        </div>)}
      </div>}
    </section>
  </div>;
}
