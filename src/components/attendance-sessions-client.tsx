 "use client";
 import {useEffect,useState} from "react";
 import Link from "next/link";
 import {
  ArrowRight,CalendarClock,CheckCircle2,Clock3,DoorClosed,DoorOpen,
  Monitor,Plus,Settings2,ShieldCheck,Users,X
 } from "lucide-react";
 import {
  getWindowStatus,getWindowLabel,getQrPolicyLabel,
  validateWindowDetailed,vietnamTimeToUtc,utcToVietnamInput,type QrPolicy
 } from "@/lib/attendance-window";
 import {displayTime} from "@/lib/attendance-report";
 import type {AttendanceSession} from "@/lib/types";

 type Props={
  congressId:string;initialSessions:AttendanceSession[];canManage:boolean;
  layouts:{id:string;title:string;grid_rows:number;grid_columns:number}[];
 };
 const statusClass:Record<string,string>={
  open:"bg-[#e0f5ec] text-[#13704d]",
  upcoming:"bg-[#fff4db] text-[#8b6519]",
  expired:"bg-[#f3f0ed] text-[#816b5d]",
  closed:"bg-[#f3f0ed] text-[#786779]",
  "not-configured":"bg-[#f1f5f8] text-[#72818a]"
 };
 function formatInput(iso:string|null){
  return utcToVietnamInput(iso);
 }
 export function AttendanceSessionsClient({congressId,initialSessions,canManage,layouts}:Props){
  const [sessions,setSessions]=useState(initialSessions);
 const [selectedSessionId,setSelectedSessionId]=useState(initialSessions[0]?.id||"");
  const [mode,setMode]=useState<"create"|"edit"|null>(null);
  const [editingId,setEditingId]=useState("");
  const [name,setName]=useState("");
  const [starts,setStarts]=useState("");
  const [ends,setEnds]=useState("");
  const [policy,setPolicy]=useState<QrPolicy>("both");
  const [layoutId,setLayoutId]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [clock,setClock]=useState(Date.now);
  useEffect(()=>{const t=setInterval(()=>setClock(Date.now()),15000);return()=>clearInterval(t);},[]);
  const base="/congresses/"+congressId+"/attendance";
  const sorted=[...sessions].sort((a,b)=>{
   const av=Date.parse(a.starts_at||"")||0,bv=Date.parse(b.starts_at||"")||0;
   return bv-av||a.name.localeCompare(b.name,"vi");
  });
  const selectedSession=sessions.find(s=>s.id===selectedSessionId)||sorted[0];
  const selectedStatus=selectedSession?getWindowStatus(selectedSession,new Date(clock)):"not-configured";
  const selectedQuery=selectedSession?"?sessionId="+encodeURIComponent(selectedSession.id):"";
  function openCreate(){
   const now=Date.now(),start=now+10*60*1000,end=start+60*60*1000;
   setMode("create");setEditingId("");setName("");
   setStarts(formatInput(new Date(start).toISOString()));
   setEnds(formatInput(new Date(end).toISOString()));
   setPolicy("both");setLayoutId(layouts[0]?.id||"");setNotice("");setError("");
  }
  function openEdit(session:AttendanceSession){
   setMode("edit");setEditingId(session.id);setName(session.name);
   setStarts(formatInput(session.starts_at));setEnds(formatInput(session.ends_at));
   setPolicy(session.qr_policy);setLayoutId(session.seating_layout_id||"");setNotice("");setError("");
  }
  async function save(){
   if(busy||!mode)return;
   setError("");setNotice("");
   const start=vietnamTimeToUtc(starts),end=vietnamTimeToUtc(ends);
   const checked=validateWindowDetailed(start,end);
   if(mode==="create"&&name.trim().length<3)return setError("Tên phiên phải có ít nhất 3 ký tự.");
   if(!checked.window)return setError(checked.error||"Giờ mở/đóng không hợp lệ.");
   setBusy(true);
   try{
    const response=await fetch("/api/attendance-sessions",{
     method:mode==="create"?"POST":"PATCH",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
      congressId,startsAt:start,endsAt:end,qrPolicy:policy,seatingLayoutId:layoutId||null,
      ...(mode==="create"?{name:name.trim()}:{sessionId:editingId})
     })
    });
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||"Không lưu được phiên.");
    const session=body.session as AttendanceSession;
    setSessions(previous=>[session,...previous.filter(s=>s.id!==session.id)]);
    setSelectedSessionId(session.id);
    setMode(null);setNotice("Đã lưu cấu hình phiên. QR của phiên, đại biểu vừa đến và sơ đồ ghế hiển thị cùng nhau trong Màn hình điểm danh.");
   }catch(e){setError(e instanceof Error?e.message:"Lưu phiên thất bại.");}
   finally{setBusy(false);}
  }
  async function toggle(session:AttendanceSession){
   const status=session.status==="open"?"closed":"open";
   if(status==="closed"&&!window.confirm("Đóng phiên điểm danh này? Đại biểu không thể điểm danh sau khi đóng."))return;
   setBusy(true);setError("");setNotice("");
   try{
    const response=await fetch("/api/attendance-sessions",{
     method:"PATCH",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({congressId,sessionId:session.id,status})
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Không thể thay đổi trạng thái.");
    const updated=result.session as AttendanceSession;
    setSessions(previous=>previous.map(x=>x.id===updated.id?updated:x));
    setNotice(status==="closed"?"Đã đóng điểm danh; mã QR của phiên giữ nguyên.":"Đã mở điểm danh (chỉ ghi nhận trong khung giờ đã cài).");
   }catch(e){setError(e instanceof Error?e.message:"Không thể thay đổi trạng thái.");}
   finally{setBusy(false);}
  }
  return <div className="mx-auto max-w-[1430px] space-y-6">
   <header className="flex flex-wrap items-start justify-between gap-4">
    <div>
     <p className="page-kicker">ĐIỀU HÀNH ĐẠI HỘI · ĐIỂM DANH</p>
     <h1 className="page-title mt-2">Trung tâm điểm danh</h1>
     <p className="page-description mt-2">Tạo phiên, mở hoặc đóng điểm danh, điều hành màn hình hội trường và bàn quét từ một nơi.</p>
    </div>
    {canManage&&<button type="button" className="btn btn-primary" onClick={openCreate}>
     <Plus size={17}/> Tạo phiên điểm danh
    </button>}
   </header>
   <section className="overflow-hidden rounded-[22px] border border-[#cfdee4] bg-white shadow-[0_14px_38px_rgba(19,63,79,.065)]" aria-label="Điều khiển phiên điểm danh">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3ebee] bg-[#f6fafb] px-5 py-4 sm:px-6">
    <div>
     <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#358099]">TRUNG TÂM VẬN HÀNH</p>
     <h2 className="mt-1 text-[18px] font-extrabold text-[#203e50]">Điều khiển điểm danh</h2>
     <p className="mt-1 text-xs text-[#748d9c]">Chọn phiên và thực hiện tất cả thao tác tại đây.</p>
    </div>
    {selectedSession&&<span className={"inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold "+statusClass[selectedStatus]}>
     <span className={"h-2 w-2 rounded-full "+(selectedStatus==="open"?"bg-[#18ad7b]":"bg-current opacity-45")}/>
     {getWindowLabel(selectedStatus)}
    </span>}
   </div>
   <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)] xl:items-end">
    <div className="min-w-0">
     <label htmlFor="session-control-select" className="label">Phiên đang điều hành</label>
     <select id="session-control-select" value={selectedSession?.id||""}
      onChange={e=>{setSelectedSessionId(e.target.value);setError("");setNotice("");}}
      className="field mt-2 w-full" disabled={!sessions.length}>
      {!sessions.length&&<option value="">Chưa có phiên điểm danh</option>}
      {sorted.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
     {selectedSession?<p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-[#7c91a0]">
      <span><Clock3 size={13} className="mr-1 inline"/>Mở: {displayTime(selectedSession.starts_at)}</span>
      <span>Đóng: {displayTime(selectedSession.ends_at)}</span>
     </p>:<p className="mt-2 text-xs text-[#8297a4]">Tạo phiên đầu tiên để sử dụng công cụ điểm danh.</p>}
    </div>
    <div className="min-w-0">
     <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.09em] text-[#738b99]">Thao tác của phiên</p>
     <div className="flex flex-wrap gap-2">
      {selectedSession&&canManage&&<button type="button" disabled={busy}
       className={selectedSession.status==="closed"?"btn btn-primary !min-h-11":"btn btn-secondary !min-h-11"}
       onClick={()=>void toggle(selectedSession)}>
       {selectedSession.status==="open"?<DoorClosed size={17}/>:<DoorOpen size={17}/>}
       {selectedSession.status==="open"?"Đóng điểm danh":"Mở điểm danh"}
      </button>}
      <Link aria-disabled={!selectedSession} tabIndex={selectedSession?0:-1}
       className={"btn btn-primary !min-h-11 "+(!selectedSession?"pointer-events-none opacity-50":"")}
       href={selectedSession?base+"/live"+selectedQuery:base}>
       <Monitor size={17}/> Màn hình điểm danh <ArrowRight size={15}/>
      </Link>
      <Link aria-disabled={!selectedSession} tabIndex={selectedSession?0:-1}
       className={"btn btn-secondary !min-h-11 "+(!selectedSession?"pointer-events-none opacity-50":"")}
       href={selectedSession?base+"/desk"+selectedQuery:base}>
       <Users size={17}/> Quét tại bàn BTC
      </Link>
      {selectedSession&&canManage&&<button type="button" className="btn btn-secondary !min-h-11"
       onClick={()=>openEdit(selectedSession)}><Settings2 size={16}/> Cấu hình phiên</button>}
     </div>
    </div>
   </div>
   <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#e6edf0] bg-[#fbfdfd] px-5 py-3 text-[11px] leading-5 text-[#678495] sm:px-6">
    <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-[#13876c]"/> Một mã QR cố định cho mỗi phiên</span>
    <span>·</span>
    <span>QR, thẻ chào mừng và sơ đồ ghế đều nằm trên Màn hình điểm danh.</span>
   </div>
  </section>
  {notice&&<p role="status" className="rounded-xl border border-[#cbe8dd] bg-[#f0faf4] px-4 py-3 text-[13px] font-semibold text-[#16724d]">{notice}</p>}
   {error&&!mode&&<p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
   {mode&&canManage&&<section className="overflow-hidden rounded-2xl border border-[#d6e7ee] bg-white shadow-sm">
    <div className="flex items-center justify-between gap-2 border-b border-[#e3ecf0] bg-[#f5f9fb] px-5 py-4">
     <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-[#244c65]">
      <CalendarClock size={18}/>{mode==="create"?"Tạo phiên điểm danh":"Điều chỉnh cấu hình phiên"}
     </h2>
     <button type="button" onClick={()=>setMode(null)} aria-label="Đóng form" className="rounded-lg p-2 text-[#66899b] hover:bg-white"><X size={18}/></button>
    </div>
    <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
     {mode==="create"&&<label className="sm:col-span-2"><span className="label">Tên phiên *</span>
      <input className="field mt-2" value={name} onChange={e=>{setName(e.target.value);setError("");}}
       placeholder="Ví dụ: Phiên trù bị, Phiên chính thức" autoFocus/>
     </label>}
     <label><span className="label">Giờ mở điểm danh (GMT+7)</span>
      <input type="datetime-local" className="field mt-2" value={starts} onChange={e=>{setStarts(e.target.value);setError("");}}/>
     </label>
     <label><span className="label">Giờ đóng điểm danh (GMT+7)</span>
      <input type="datetime-local" className="field mt-2" value={ends} onChange={e=>{setEnds(e.target.value);setError("");}}/>
     </label>
     <label className="sm:col-span-2"><span className="label">Chính sách QR của phiên</span>
      <select className="field mt-2" value={policy} onChange={e=>setPolicy(e.target.value as QrPolicy)}>
       <option value="both">Cả QR trên màn hình và QR cá nhân</option>
       <option value="session">Chỉ QR theo phiên (màn hình và thẻ theo phiên)</option>
       <option value="fixed">Chỉ QR cố định trên thẻ cá nhân (không có QR tự quét trên màn hình)</option>
      </select>
      <span className="mt-2 block text-[11px] text-[#738d9d]">Chọn “Cả QR trên màn hình và QR cá nhân” nếu muốn đại biểu tự quét QR của phiên.</span>
     </label>
     <label className="sm:col-span-2"><span className="label">Sơ đồ ghế sử dụng trong phiên này</span>
      <select className="field mt-2" value={layoutId} onChange={e=>setLayoutId(e.target.value)}>
       <option value="">Chưa gắn sơ đồ cho phiên</option>
       {layouts.map(layout=><option value={layout.id} key={layout.id}>
        {layout.title} · {layout.grid_rows} hàng × {layout.grid_columns} cột
       </option>)}
      </select>
      <span className="mt-2 block text-[11px] leading-5 text-[#738d9d]">
       Mỗi phiên có thể chọn một hội trường riêng, cùng một Đại hội có thể có nhiều sơ đồ khác nhau.
       {layouts.length===0&&<Link className="ml-1 font-bold text-[#087da7] underline"
        href={"/congresses/"+congressId+"/seating"}>Tạo sơ đồ hội trường trước →</Link>}
      </span>
     </label>
     {error&&<p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-[13px] font-semibold text-red-700">{error}</p>}
     <div className="flex flex-wrap gap-2 sm:col-span-2">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={()=>void save()}>
       <CheckCircle2 size={17}/>{busy?"Đang lưu...":"Lưu phiên"}
      </button>
      <button type="button" className="btn btn-secondary" onClick={()=>setMode(null)}>Hủy</button>
     </div>
     <p className="text-[11px] leading-5 text-[#8197a5] sm:col-span-2">Thời gian tính theo giờ Việt Nam, tối đa 7 ngày mỗi phiên. Khi đã có check-in, không thể sửa giờ hoặc chính sách QR.</p>
    </div>
   </section>}
   <section className="overflow-hidden rounded-2xl border border-[#dce8ee] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9eff3] p-5">
     <div><h2 className="text-[16px] font-extrabold text-[#284d63]">Danh sách phiên</h2>
      <p className="mt-1 text-xs text-[#8196a3]">{sessions.length} phiên · Chọn phiên và sử dụng cụm điều khiển phía trên</p>
     </div>
     <span className="rounded-full bg-[#f1f6f8] px-3 py-1.5 text-xs font-bold text-[#5d8196]">{sessions.length} phiên</span>
    </div>
    {!sorted.length?<div className="flex flex-col items-center justify-center p-12 text-center">
     <CalendarClock size={36} className="text-[#95b2c0]"/>
     <h3 className="mt-4 text-[17px] font-bold text-[#496b80]">Chưa có phiên điểm danh</h3>
     <p className="mt-2 text-sm text-[#849aa8]">Tạo một phiên để có thể phát QR và bắt đầu theo dõi đại biểu tham dự.</p>
     {canManage&&<button className="btn btn-primary mt-5" onClick={openCreate}><Plus size={15}/>Tạo phiên đầu tiên</button>}
    </div>:<div className="divide-y divide-[#e8eff2]">
     {sorted.map((session,index)=>{
      const status=getWindowStatus(session,new Date(clock));

      return <article key={session.id} className="p-4 sm:p-5">
       <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
         <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8b9eab]">PHIÊN {String(index+1).padStart(2,"0")}</p>
         <h3 className="mt-1.5 text-[17px] font-extrabold text-[#24516a]">{session.name}</h3>
         <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#678397]">
          <span className="inline-flex items-center gap-1"><Clock3 size={14}/> Mở: {displayTime(session.starts_at)}</span>
          <span>Đóng: {displayTime(session.ends_at)}</span>
         </div>
         <p className="mt-1 text-[11px] text-[#8a9dab]">{getQrPolicyLabel(session.qr_policy)}</p>
         <p className="mt-1 text-[11px] font-semibold text-[#5d8399]">
          Sơ đồ ghế: {layouts.find(l=>l.id===session.seating_layout_id)?.title||"Chưa gắn sơ đồ cho phiên"}
         </p>
        </div>
        <span className={"inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-[11px] font-bold "+(statusClass[status]||statusClass.closed)}>{getWindowLabel(status)}</span>
       </div>
       <div className="mt-4 flex items-center justify-between gap-3">
       <p className="text-[11px] leading-5 text-[#7c96a4]">{selectedSession?.id===session.id?"Đang điều hành phiên này":"Chọn phiên để quản lý ở cụm điều khiển phía trên"}</p>
       <button type="button" onClick={()=>setSelectedSessionId(session.id)}
        className={selectedSession?.id===session.id?
         "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-[#b9ddd4] bg-[#e5f7ef] px-3 text-xs font-extrabold text-[#167557]":
         "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-[#cbdde4] bg-white px-3 text-xs font-bold text-[#32667c] hover:bg-[#eff7f9]"}>
        {selectedSession?.id===session.id?<CheckCircle2 size={15}/>:<ArrowRight size={15}/>}
        {selectedSession?.id===session.id?"Đang chọn":"Chọn phiên"}
       </button>
      </div>
      </article>;
     })}
    </div>}
   </section>
  </div>;
 }