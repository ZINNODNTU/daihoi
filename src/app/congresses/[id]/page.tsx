import Link from "next/link";
import {notFound} from "next/navigation";
import {BarChart3,CalendarDays,ChevronRight,FileText,QrCode,Users,MapPin,ClipboardList} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
export default async function CongressHome({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();
 const [{data:congress},{data:delegates},{data:sessions},{data:checkins}]=await Promise.all([
  supabase.from("congresses").select("*").eq("id",id).maybeSingle(),
  supabase.from("delegates").select("id").eq("congress_id",id).eq("is_active",true),
  supabase.from("attendance_sessions").select("id,name,status,created_at").eq("congress_id",id).order("created_at",{ascending:false}),
  supabase.from("checkins").select("id,session_id").eq("congress_id",id)
 ]);
 if(!congress)notFound();
 const current=sessions?.[0];const count=checkins?.filter(x=>x.session_id===current?.id).length||0;const total=delegates?.length||0;
 return <div>
  <div className="mb-8"><span className="text-xs tracking-widest text-[#15979e] font-extrabold">TỔNG QUAN ĐẠI HỘI</span><h1 className="text-3xl font-extrabold mt-2 max-w-3xl leading-tight">{congress.name}</h1><div className="flex flex-wrap gap-5 text-sm text-[#7890a4] mt-4"><span className="flex items-center gap-2"><CalendarDays size={16}/> {congress.term||"Chưa có nhiệm kỳ"}</span><span className="flex items-center gap-2"><MapPin size={16}/> {congress.venue||"Chưa cập nhật địa điểm"}</span></div></div>
  <div className="stats mb-8">
   {[[total,"Đại biểu",Users],[count,"Có mặt phiên gần nhất",QrCode],[Math.max(total-count,0),"Chưa điểm danh",CalendarDays],[sessions?.length||0,"Phiên điểm danh",BarChart3]].map(([n,title,Icon])=>{const I=Icon as typeof Users;return <div className="card p-5" key={String(title)}><div className="flex justify-between"><div className="text-sm text-[#8395a6] font-semibold">{String(title)}</div><I size={20} className="text-[#13969f]"/></div><div className="text-3xl font-extrabold mt-4">{Number(n).toLocaleString("vi-VN")}</div></div>})}
  </div>
  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
    {[{href:"delegates",icon:Users,title:"Quản lý đại biểu",description:"Danh sách, cấp mã QR, nhập dữ liệu đại biểu."},{href:"attendance",icon:QrCode,title:"Điều hành điểm danh",description:"Quét QR, điểm danh thủ công, thống kê theo phiên."},{href:"reports",icon:ClipboardList,title:"Báo cáo Đại hội",description:"Số liệu từng phiên, phân loại đại biểu, xuất CSV và in báo cáo."},{href:"documents",icon:FileText,title:"Tài liệu đại hội",description:"Tải lên và quản lý tài liệu qua Google Drive."}].map(x=><Link href={`/congresses/${id}/${x.href}`} key={x.href} className="card p-6 hover:border-[#3eb4b6] transition"><div className="flex justify-between items-center"><span className="p-3 bg-[#e6f7f8] rounded-xl text-[#129aa5]"><x.icon size={24}/></span><ChevronRight size={18} className="text-[#8ba2b4]"/></div><h3 className="text-lg font-extrabold mt-6">{x.title}</h3><p className="helper mt-2 leading-relaxed">{x.description}</p></Link>)}
  </div>
  <div className="card p-7 mt-7"><h2 className="section-title">Các phiên điểm danh</h2><div className="mt-5 space-y-3">{!sessions?.length?<p className="helper">Chưa có phiên điểm danh. Vào mục Điểm danh để tạo phiên mới.</p>:sessions.map(s=><div key={s.id} className="flex justify-between border-b border-[#edf2f6] pb-3 items-center gap-3"><div><b>{s.name}</b><div className="helper mt-1">{s.status==="open"?"Đang mở":"Đã đóng"}</div></div><span className="text-sm font-bold text-[#177ea4]">{checkins?.filter(c=>c.session_id===s.id).length||0} lượt</span></div>)}</div></div>
 </div>;
}
