"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Activity,CalendarClock,Download,FileSpreadsheet,Printer,RefreshCw,Search,ShieldCheck,Users,UserCheck,UserMinus} from "lucide-react";
import type {AttendanceSession} from "@/lib/types";
import {calculateAttendance,csvCell,delegateLabels,displayTime,makeAttendanceCsv,percentage,type ReportCheckin,type ReportDelegate} from "@/lib/attendance-report";
type Props={
 congressId:string;congressName:string;congressKind:string;term:string;
 delegates:ReportDelegate[];sessions:AttendanceSession[];
};
type Status="all"|"present"|"absent";
type Kind="all"|"official"|"alternate"|"guest";
function downloadCsv(name:string,content:string){
 const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
export function AttendanceReportClient({congressId,congressName,congressKind,term,delegates,sessions}:Props){
 const [sessionId,setSessionId]=useState(sessions[0]?.id||"");
 const [checkins,setCheckins]=useState<ReportCheckin[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [syncedAt,setSyncedAt]=useState("");
 const [loadedSessionId,setLoadedSessionId]=useState("");
 const [status,setStatus]=useState<Status>("all");
 const [kind,setKind]=useState<Kind>("all");
 const [search,setSearch]=useState("");
 const session=sessions.find(s=>s.id===sessionId);
 const ready=!!sessionId && loadedSessionId===sessionId && !error;
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(!sessionId){setCheckins([]);return;}
  setLoading(true);setError("");
  try{
   const params=new URLSearchParams({congressId,sessionId});
   const res=await fetch("/api/reports/attendance?"+params.toString(),{cache:"no-store",signal});
   const body=await res.json();
   if(!res.ok)throw new Error(body.error||"Lỗi tải dữ liệu.");
   if(signal?.aborted)return;
   setCheckins(body.checkins||[]);
   setLoadedSessionId(sessionId);
   setSyncedAt(new Date().toLocaleTimeString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}));
  }catch(e){
   if(signal?.aborted)return;
   setError(e instanceof Error?e.message:"Không tải được dữ liệu.");
  }finally{if(!signal?.aborted)setLoading(false);}
 },[congressId,sessionId]);
 useEffect(()=>{
  const controller=new AbortController();
  // Hẹn tải dữ liệu sau effect để tránh thay đổi state đồng bộ trong effect.
  queueMicrotask(()=>{if(!controller.signal.aborted)void refresh(controller.signal);});
  return()=>controller.abort();
 },[refresh]);
 const report=useMemo(()=>calculateAttendance(delegates,checkins),[delegates,checkins]);
 const filtered=useMemo(()=>(!ready?[]:report.rows).filter(r=>
  (kind==="all"||r.delegate_type===kind) &&
  (status==="all"||(status==="present"&&r.present)||(status==="absent"&&!r.present)) &&
  [r.full_name,r.code,r.unit].join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
 ),[report,kind,status,search,ready]);
 function exportRows(){
  if(!session)return;
  const csv=makeAttendanceCsv(congressName,session.name,filtered);
  downloadCsv("diem-danh-"+sessionId.slice(0,8)+".csv",csv);
 }
 function exportUnitStats(){
  const header=["Đơn vị","Tổng đại biểu","Đã điểm danh","Chưa điểm danh","ĐB chính thức","Chính thức có mặt"];
  const lines=[header,...report.units.map(u=>[u.unit,String(u.total),String(u.present),String(u.total-u.present),String(u.officialTotal),String(u.officialPresent)])];
  downloadCsv("thong-ke-don-vi-"+sessionId.slice(0,8)+".csv","\ufeff"+lines.map(line=>line.map(csvCell).join(",")).join("\r\n"));
 }
 const statCards=[
   {label:"Tổng hồ sơ đang hoạt động",value:ready?report.total:"—",icon:Users},
   {label:"Có lượt check-in",value:ready?report.present:"—",icon:UserCheck},
   {label:"Chưa check-in",value:ready?report.absent:"—",icon:UserMinus},
   {label:"Tỷ lệ check-in",value:ready?percentage(report.present,report.total):"—",icon:Activity}
 ];
 return <div className="space-y-7">
  <div className="flex flex-wrap justify-between items-start gap-4 print:hidden">
   <div><div className="text-xs tracking-widest text-[#149c9c] font-semibold">BÁO CÁO PHỤC VỤ BAN THƯ KÝ</div><h1 className="page-title mt-2">Thống kê điểm danh</h1><p className="helper mt-2">Phân loại đại biểu và tổng hợp lượt tham dự theo phiên.</p></div>
   <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
    <button onClick={()=>void refresh()} disabled={loading||!sessionId} className="btn btn-secondary"><RefreshCw size={17}/>{loading?"Đang cập nhật":"Cập nhật"}</button>
    <button onClick={()=>window.print()} disabled={!ready} className="btn btn-secondary"><Printer size={17}/>In báo cáo</button>
    <button onClick={exportRows} disabled={!ready||loading} className="btn btn-primary col-span-2 sm:col-span-1"><Download size={17}/>Xuất CSV</button>
   </div>
  </div>
  <div className="card p-4 sm:p-6">
   <div className="flex flex-wrap justify-between items-end gap-4">
    <label className="w-full min-w-0 flex-1 sm:min-w-[250px]"><span className="label">Chọn phiên làm việc</span><select className="field" value={sessionId} onChange={e=>{setSessionId(e.target.value);setCheckins([]);setLoadedSessionId("");setSyncedAt("");}}>{sessions.length===0&&<option value="">Chưa có phiên điểm danh</option>}{sessions.map(s=><option key={s.id} value={s.id}>{s.name} · {s.status==="open"?"Đang mở":"Đã đóng"}</option>)}</select></label>
    <div className="text-sm text-[#627d92] flex items-center gap-2"><CalendarClock size={17}/><span>{session?.starts_at?displayTime(session.starts_at):"Chưa đặt giờ bắt đầu"}</span></div>
   </div>
   <div className="mt-4 flex flex-wrap gap-2 items-center">
    <span className={`badge ${session?.status==="open"?"badge-green":"badge-gray"}`}>{session?.status==="open"?"Phiên đang mở":"Phiên đã đóng hoặc chưa tạo"}</span>
    {syncedAt&&<span className="helper">Cập nhật lần cuối: {syncedAt} (GMT+7)</span>}
   </div>
   {error&&<div role="alert" className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm mt-4">{error}</div>}
   {session&&!ready&&!error&&<div role="status" className="rounded-lg bg-blue-50 text-[#1c6989] px-4 py-3 text-sm mt-4">Đang đồng bộ dữ liệu phiên điểm danh. Không sử dụng số liệu cho đến khi tải xong.</div>}
   {!session&&<div className="mt-4 rounded-xl p-4 bg-[#f1f6fa] text-sm">Hãy tạo phiên điểm danh trong mục <strong>Điểm danh</strong> để xem báo cáo.</div>}
  </div>
  <div className="space-y-2">
   <h2 className="font-semibold text-lg">{congressName}</h2>
   <p className="helper">{congressKind} {term?(" • Nhiệm kỳ "+term):""} • {session?.name||"Chưa có phiên"}</p>
  </div>
  <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-4">
   {statCards.map(({label,value,icon:Icon})=><div key={label} className="card stat-card min-w-0 p-3.5 sm:p-5"><div className="flex items-start justify-between gap-2"><span className="helper font-semibold">{label}</span><Icon size={19} className="text-[#159aa0]"/></div><p className="text-3xl font-semibold mt-4">{value}</p></div>)}
  </div>
  <div className="grid gap-5 lg:grid-cols-3">
   {(["official","alternate","guest"] as const).map(type=>{
    const p=report.byType[type];
    return <div key={type} className="card p-5">
     <div className="font-semibold">{delegateLabels[type]}</div>
     <p className="text-3xl font-semibold mt-3">{ready?p.present:"—"}<span className="text-[#8fa3b3] font-semibold text-xl">/{ready?p.total:"—"}</span></p>
     <div className="mt-3 h-2 bg-[#e9f2f4] rounded-full overflow-hidden"><div className="h-full bg-[#21aba4]" style={{width:ready&&p.total?100*p.present/p.total+"%":"0%"}}/></div>
     <div className="helper mt-3">Đã điểm danh: {ready?percentage(p.present,p.total):"—"}</div>
    </div>;
   })}
  </div>
  <div className="rounded-xl bg-[#fff8e7] text-[#815e20] p-5 text-sm leading-relaxed border border-[#f5dfaa]">
   <strong>Phân biệt dữ liệu:</strong> Đây là số liệu điểm danh từ hệ thống, không xác nhận đại biểu còn hiện diện trong hội trường, không tự công nhận tư cách đại biểu và không quyết định danh sách đủ quyền biểu quyết. Mẫu số biểu quyết phải được Ban Thư ký/BTC xác nhận theo thể lệ áp dụng.
  </div>
  {ready&&report.unmatchedCheckins>0&&<p className="text-red-700 text-sm">Có {report.unmatchedCheckins} lượt điểm danh không đối chiếu được với hồ sơ đại biểu đang hoạt động; cần Ban Thư ký kiểm tra.</p>}
  <section className="card overflow-hidden">
   <div className="p-5 flex flex-wrap justify-between gap-4 items-center"><div><h2 className="section-title">Thống kê theo đơn vị</h2><p className="helper mt-2">Hữu ích cho Ban Thư ký khi kiểm tra số đại biểu có mặt từ từng đơn vị.</p></div><button className="btn btn-secondary print:hidden" disabled={!ready||loading} onClick={exportUnitStats}><FileSpreadsheet size={17}/> Xuất đơn vị</button></div>
   <div className="table-wrap"><table className="data mobile-list-table"><thead><tr><th>Đơn vị</th><th>Hồ sơ</th><th>Có check-in</th><th>Chưa check-in</th><th>Chính thức có mặt</th></tr></thead><tbody>{(ready?report.units:[]).map(u=><tr key={u.unit}><td data-label="Đơn vị" className="font-bold">{u.unit}</td><td data-label="Hồ sơ">{u.total}</td><td data-label="Đã điểm danh" className="text-[#178b78] font-bold">{u.present}</td><td data-label="Chưa điểm danh">{u.total-u.present}</td><td data-label="Chính thức có mặt">{u.officialPresent}/{u.officialTotal}</td></tr>)}{ready&&!report.units.length&&<tr><td colSpan={5} className="py-8! text-center helper">Chưa có hồ sơ đại biểu.</td></tr>}</tbody></table></div>
  </section>
  <section className="card overflow-hidden">
    <div className="p-5 flex flex-wrap justify-between items-center gap-4"><div><h2 className="section-title">Danh sách đối chiếu ({filtered.length})</h2><p className="helper mt-2">Có thể lọc người vắng mặt để BTC liên hệ trực tiếp.</p></div></div>
    <div className="px-5 pb-5 flex flex-wrap gap-3 print:hidden">
      <label className="relative w-full sm:min-w-[220px] sm:flex-1"><Search size={17} className="absolute top-3 left-3 text-[#809bad]"/><input className="field pl-10!" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm đại biểu, mã, đơn vị..."/></label>
      <select aria-label="Lọc trạng thái điểm danh" className="field w-full sm:w-auto!" value={status} onChange={e=>setStatus(e.target.value as Status)}><option value="all">Tất cả trạng thái</option><option value="present">Đã check-in</option><option value="absent">Chưa check-in</option></select>
      <select aria-label="Lọc loại đại biểu" className="field w-full sm:w-auto!" value={kind} onChange={e=>setKind(e.target.value as Kind)}><option value="all">Mọi loại đại biểu</option><option value="official">Chính thức</option><option value="alternate">Dự khuyết</option><option value="guest">Khách mời</option></select>
    </div>
    <div className="table-wrap"><table className="data mobile-list-table"><thead><tr><th>Mã</th><th>Họ tên</th><th>Đơn vị</th><th>Loại</th><th>Điểm danh</th><th>Thời gian</th></tr></thead><tbody>{filtered.map(d=><tr key={d.id}><td data-label="Mã" className="font-bold">{d.code}</td><td data-label="Họ tên">{d.full_name}</td><td data-label="Đơn vị">{d.unit||"—"}</td><td data-label="Loại">{delegateLabels[d.delegate_type]}</td><td data-label="Điểm danh"><span className={`badge ${d.present?"badge-green":"badge-yellow"}`}>{d.present?"Có lượt check-in":"Chưa có"}</span></td><td data-label="Thời gian">{displayTime(d.checkin?.checked_in_at)}</td></tr>)}{!filtered.length&&<tr><td colSpan={6} className="helper text-center py-8!">Không có dữ liệu phù hợp.</td></tr>}</tbody></table></div>
  </section>
  <div className="helper flex gap-2 items-center"><ShieldCheck size={17}/>Báo cáo hỗ trợ điều hành, phải được người có thẩm quyền rà soát và xác nhận trước khi công bố chính thức.</div>
 </div>;
}
