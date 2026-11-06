import Link from "next/link";
import {notFound} from "next/navigation";
import {
  ArrowRight,ArrowUpRight,Armchair,BarChart3,CalendarDays,
  ChevronRight,ClipboardList,FileText,MapPin,QrCode,Users,UserRoundCheck
} from "lucide-react";
import {createClient} from "@/lib/supabase/server";

const areas=[
  {href:"delegates",icon:Users,title:"Quản lý đại biểu",description:"Danh sách, nhập Excel và thẻ định danh QR / Barcode."},
  {href:"attendance",icon:QrCode,title:"Điểm danh Đại hội",description:"Quét camera, điểm danh thủ công và quản lý phiên."},
  {href:"seating",icon:Armchair,title:"Sơ đồ chỗ ngồi",description:"Bố trí hội trường và phân công đại biểu theo ghế."},
  {href:"reports",icon:ClipboardList,title:"Báo cáo & thống kê",description:"Theo dõi tham dự theo phiên, đơn vị và xuất báo cáo."},
  {href:"documents",icon:FileText,title:"Thư viện tài liệu",description:"Lưu trữ và truy cập tài liệu theo quyền được cấp."}
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
    {label:"Đại biểu",value:total,icon:Users,foot:"Hồ sơ đang hoạt động"},
    {label:"Đã điểm danh",value:arrived,icon:UserRoundCheck,foot:"Theo phiên gần nhất"},
    {label:"Chưa điểm danh",value:Math.max(total-arrived,0),icon:CalendarDays,foot:"Theo phiên gần nhất"},
    {label:"Phiên làm việc",value:sessions?.length||0,icon:BarChart3,foot:"Tổng số phiên"}
  ];
  const state=congress.status==="live"
    ?{text:"Đang diễn ra",className:"badge-green"}
    :congress.status==="completed"
      ?{text:"Đã kết thúc",className:"badge-gray"}
      :{text:"Đang chuẩn bị",className:"badge-yellow"};

  return <div className="space-y-8">
    <section className="page-heading">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <p className="page-kicker">BẢNG ĐIỀU HÀNH ĐẠI HỘI</p>
          <span className={"badge "+state.className}>{state.text}</span>
        </div>
        <h1 className="page-title mt-3 max-w-4xl">{congress.name}</h1>
        <p className="mt-3 text-[12px] font-medium text-[#8a96a5]">
          {congress.kind==="hoi_sinh_vien"?"Hội Sinh viên Việt Nam":"Đoàn TNCS Hồ Chí Minh"}
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-[#6d7b8e]">
          <span className="inline-flex items-center gap-1.5"><CalendarDays size={15}/>{congress.term||"Chưa có nhiệm kỳ"}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin size={15}/>{congress.venue||"Chưa cập nhật địa điểm"}</span>
        </div>
      </div>
      <Link className="btn btn-primary shrink-0" href={"/congresses/"+id+"/attendance"}>
        <QrCode size={17}/> Mở điểm danh <ArrowRight size={16}/>
      </Link>
    </section>

    <section aria-label="Số liệu Đại hội" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(({label,value,icon:Icon,foot})=><div key={label} className="metric-card">
        <div className="flex items-start justify-between gap-2">
          <span className="metric-label">{label}</span>
          <span className="metric-icon"><Icon size={17}/></span>
        </div>
        <p className="metric-value">{value.toLocaleString("vi-VN")}</p>
        <p className="metric-foot">{foot}</p>
      </div>)}
    </section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_335px]">
      <section className="min-w-0">
        <div className="section-header">
          <div><p className="page-kicker">CÁC PHÂN HỆ</p><h2 className="section-title mt-2">Truy cập nhanh</h2></div>
          <p className="helper">Công cụ điều hành dành cho BTC</p>
        </div>
        <div className="workspace-panel overflow-hidden">
          {areas.map(area=><Link key={area.href} href={"/congresses/"+id+"/"+area.href} className="action-row group">
            <span className="action-icon"><area.icon size={19} strokeWidth={1.8}/></span>
            <div className="min-w-0 flex-1">
              <p className="action-title group-hover:text-[#2456c9]">{area.title}</p>
              <p className="action-desc mt-1">{area.description}</p>
            </div>
            <ArrowUpRight size={17} className="shrink-0 text-[#a1adbb] group-hover:text-[#2456c9]"/>
          </Link>)}
        </div>
      </section>

      <section aria-label="Tiến độ phiên gần nhất" className="min-w-0">
        <div className="section-header">
          <div><p className="page-kicker">TÌNH HÌNH THAM DỰ</p><h2 className="section-title mt-2">Điểm danh gần nhất</h2></div>
        </div>
        <div className="workspace-panel p-5 sm:p-6">
          <p className="text-[12px] font-semibold text-[#607085]">{current?.name||"Chưa có phiên làm việc"}</p>
          <div className="mt-8 flex items-baseline gap-2">
            <span className="text-[47px] font-bold leading-none tracking-[-.065em] text-[#23354f]">{percent}%</span>
            <span className="text-[12px] text-[#8994a3]">đã điểm danh</span>
          </div>
          <div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
            aria-label="Tỷ lệ điểm danh phiên gần nhất" className="progress-track mt-5">
            <div className="progress-fill" style={{width:percent+"%"}}/>
          </div>
          <div className="mt-8 flex items-center justify-between border-y border-[#e9edf2] py-4">
            <span className="text-[12px] text-[#738095]">Đại biểu ghi nhận</span>
            <span className="text-[19px] font-bold tabular-nums text-[#28374b]">{arrived}<span className="ml-1 text-[12px] font-medium text-[#a1adbb]">/ {total}</span></span>
          </div>
          <p className="mt-4 text-[11px] leading-6 text-[#919dac]">Số liệu theo phiên gần nhất, không thay thế xác minh tư cách đại biểu.</p>
          <Link href={"/congresses/"+id+"/attendance"} className="btn btn-secondary mt-6 w-full">
            Xem chi tiết <ChevronRight size={16}/>
          </Link>
        </div>
      </section>
    </div>

    <section className="workspace-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8ecf1] px-5 py-4 sm:px-6">
        <div><h2 className="section-title">Các phiên điểm danh</h2><p className="helper mt-1">Danh sách phiên làm việc đã tạo trong Đại hội.</p></div>
        <Link href={"/congresses/"+id+"/attendance"} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2456c9] hover:underline">Quản lý phiên <ArrowRight size={16}/></Link>
      </div>
      {!sessions?.length?<div className="empty-state">
        <QrCode size={25} className="mx-auto text-[#8798b0]"/>
        <p className="mt-3 text-[13px] font-bold text-[#344154]">Chưa có phiên điểm danh</p>
        <p className="helper mt-1">Vào mục Điểm danh để tạo phiên làm việc đầu tiên.</p>
      </div>:<div className="divide-y divide-[#edf0f4]">
        {sessions.slice(0,8).map(session=><div key={session.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#303f54]">{session.name}</p>
            <span className={"badge mt-2 "+(session.status==="open"?"badge-green":"badge-gray")}>
              {session.status==="open"?"Cho phép điểm danh":"Đã đóng"}
            </span>
          </div>
          <span className="text-[14px] font-bold tabular-nums text-[#273e62]">{checkins?.filter(record=>record.session_id===session.id).length||0}
            <span className="ml-1 text-[11px] font-medium text-[#8d9bab]">lượt</span>
          </span>
        </div>)}
      </div>}
    </section>
  </div>;
}
