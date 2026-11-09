"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {
 Activity,Armchair,ArrowLeft,CheckCircle2,Clock3,
 LayoutGrid,Maximize2,Minimize2,QrCode,RefreshCw,
 UserRound,Users,UserX,Wifi
} from "lucide-react";
import {displayTime} from "@/lib/attendance-report";
import {getWindowLabel,getWindowStatus} from "@/lib/attendance-window";
import {rowLabelAt} from "@/lib/seating";
import {projectAttendanceSeats} from "@/lib/attendance-seat-projection";
import {classifySeat,computeLiveSummary,
 type LiveDashboardData,type LiveSeatState
} from "@/lib/attendance-live";
import type {AttendanceSession} from "@/lib/types";

type Props={
 congressId:string;congressName:string;sessions:AttendanceSession[];initialSessionId:string;
};
const seatStyles:Record<LiveSeatState,string>={
 present:"border-[#5bbe9b] bg-[#d7f5e8] text-[#0f7654] hover:bg-[#c3eddb]",
 absent:"border-[#e8c489] bg-[#fff2d9] text-[#9a6d2d] hover:bg-[#ffe8bd]",
 unassigned:"border-[#cfdae2] bg-white text-[#8fa1b0] hover:bg-[#eef5f8]",
 blocked:"border-[#d3d9df] bg-[#dfe4e8] text-[#9aa6b0] hover:bg-[#d5dde3]"
};
const legend:{key:LiveSeatState;label:string}[]=[
 {key:"present",label:"Đã điểm danh"},
 {key:"absent",label:"Chưa điểm danh"},
 {key:"unassigned",label:"Ghế chưa phân"},
 {key:"blocked",label:"Ghế khóa"}
];
function Avatar({id,name,photo,size=46}:{
 id:string;name:string;photo:string|null;size?:number
}){
 return photo?<Image unoptimized src={"/api/delegates/"+id+"/photo?w="+(size>70?"160":"96")}
  width={size} height={Math.round(size*4/3)} alt={"Ảnh "+name}
  className="shrink-0 rounded-lg border border-[#dfebef] bg-white object-cover"
  style={{width:size,height:Math.round(size*4/3)}}/>:
  <span className="flex shrink-0 items-center justify-center rounded-lg bg-[#e9f2f6] text-[#92a8b6]"
   style={{width:size,height:Math.round(size*4/3)}}>
   <UserRound size={Math.round(size*.45)}/>
  </span>;
}
export function AttendanceLiveBoard({congressId,congressName,sessions,initialSessionId}:Props){
 const [sessionId,setSessionId]=useState(initialSessionId);
 const [data,setData]=useState<LiveDashboardData|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [clock,setClock]=useState(Date.now);
 const [selectedSeatId,setSelectedSeatId]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);
 const [fullscreen,setFullscreen]=useState(false);
 const frame=useRef<HTMLDivElement>(null);
 const base="/congresses/"+congressId+"/attendance";
 useEffect(()=>{
  const timer=setInterval(()=>setClock(Date.now()),1000);
  return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  let mounted=true,pending=false;
  async function refresh(){
   if(pending||!sessionId)return;
   pending=true;
   try{
    const q=new URLSearchParams({congressId,sessionId});
    const response=await fetch("/api/attendance/live?"+q,{cache:"no-store",credentials:"same-origin"});
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||"Không đồng bộ được bảng điểm danh.");
    if(mounted){setData(body as LiveDashboardData);setError("");setLoading(false);}
   }catch(e){
    if(mounted){setError(e instanceof Error?e.message:"Không thể tải dữ liệu.");setLoading(false);}
   }finally{pending=false;}
  }
  void refresh();
  const timer=setInterval(()=>void refresh(),3000);
  const visible=()=>{if(document.visibilityState==="visible")void refresh();};
  document.addEventListener("visibilitychange",visible);
  return()=>{mounted=false;clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
 },[congressId,sessionId,refreshKey]);
 useEffect(()=>{
  const changed=()=>setFullscreen(Boolean(document.fullscreenElement));
  document.addEventListener("fullscreenchange",changed);
  return()=>document.removeEventListener("fullscreenchange",changed);
 },[]);
 async function toggleFullscreen(){
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await frame.current?.requestFullscreen();
  }catch{setError("Không thể bật toàn màn hình trên trình duyệt này.");}
 }
 const session=sessions.find(s=>s.id===sessionId)||data?.session;
 const status=session?getWindowStatus(session,new Date(clock)):"not-configured";
 const summary=data?computeLiveSummary(data):null;
 const map=useMemo(()=>{
  const delegate=new Map((data?.delegates||[]).map(d=>[d.id,d]));
  const seatAssignment=new Map((data?.assignments||[]).map(a=>[a.seat_id,a.delegate_id]));
  const checked=new Set((data?.checkins||[]).map(c=>c.delegate_id));
  return {delegate,seatAssignment,checked};
 },[data]);
 const room=data?.layout;
 const projection=useMemo(()=>projectAttendanceSeats(room,data?.seats||[]),[room,data?.seats]);
 const {cells,outside,seatNumbers,size}=projection;
 const cols=size.columns,rows=size.rows;
 const selectedSeat=data?.seats.find(s=>s.id===selectedSeatId)||null;
 const selectedPerson=selectedSeat?map.delegate.get(map.seatAssignment.get(selectedSeat.id)||""):null;
 const selectedState=selectedSeat?classifySeat(selectedSeat,
  map.seatAssignment.get(selectedSeat.id),map.checked):null;
 const latest=data?.checkins[0];
 const latestDelegate=latest?map.delegate.get(latest.delegate_id):null;
 const sessionIsActive=status==="open";
 return <div ref={frame} className="mx-auto min-h-[500px] max-w-[1530px] space-y-5 bg-[#f3f7f9] pb-6 text-[#243d50] fullscreen:min-h-dvh fullscreen:max-w-none fullscreen:overflow-y-auto fullscreen:p-5">
  <header className="flex flex-wrap items-start justify-between gap-3">
   <div>
    <p className="page-kicker">TRỰC BAN ĐẠI HỘI · THEO DÕI TRỰC TIẾP</p>
    <h1 className="page-title mt-2">Bảng điều hành điểm danh</h1>
    <p className="page-description mt-1">{congressName}</p>
   </div>
   <div className="flex flex-wrap gap-2">
    <Link href={base} className="btn btn-secondary !text-xs"><ArrowLeft size={15}/>Các phiên</Link>
    <Link href={base+"/qr?sessionId="+sessionId} className="btn btn-secondary !text-xs"><QrCode size={15}/>Chiếu QR</Link>
    <Link href={base+"/desk?sessionId="+sessionId} className="btn btn-secondary !text-xs"><Users size={15}/>Bàn quét</Link>
    <button type="button" className="btn btn-secondary !text-xs" onClick={()=>setRefreshKey(x=>x+1)}><RefreshCw size={15}/>Làm mới</button>
    <button type="button" className="btn btn-primary !text-xs" onClick={()=>void toggleFullscreen()}>
     {fullscreen?<Minimize2 size={15}/>:<Maximize2 size={15}/>}
     {fullscreen?"Thoát toàn màn hình":"Toàn màn hình"}
    </button>
   </div>
  </header>
  <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#dbe8ef] bg-white p-4 sm:p-5">
   <label className="min-w-[210px] flex-1 text-[12px] font-bold text-[#52778b]">
    Phiên điểm danh đang theo dõi
    <select aria-label="Chọn phiên điểm danh" className="field mt-2" value={sessionId}
     onChange={e=>{setSessionId(e.target.value);setSelectedSeatId("");setData(null);setLoading(true);}}>
     {!sessions.length&&<option value="">Chưa có phiên</option>}
     {sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
   </label>
   <div className="flex flex-wrap items-center gap-3 pb-1">
    <span className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold "+
     (sessionIsActive?"bg-[#dff7e9] text-[#167451]":"bg-[#f3f3ed] text-[#846e5b]")}>
     <span className={"h-2 w-2 rounded-full "+(sessionIsActive?"animate-pulse bg-[#14a571]":"bg-[#b2a28f]")}/>
     {getWindowLabel(status)}
    </span>
    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#718b98]">
     <Wifi size={16}/>Tự đồng bộ mỗi 3 giây
    </span>
    <span className="flex items-center gap-1.5 text-xs text-[#8293a0]">
     <Clock3 size={14}/>
     {new Date(clock).toLocaleTimeString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",hour12:false})} GMT+7
    </span>
   </div>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-[#f1d8ce] bg-[#fff7f3] px-4 py-3 text-xs font-semibold leading-5 text-[#ad5a3d]">{error}</p>}
  {loading&&!data?<div className="card p-10 text-center text-sm text-[#7794a4]">Đang tải dữ liệu điểm danh, sơ đồ ghế và danh sách đại biểu...</div>:
   !data?<div className="card p-10 text-center text-sm text-[#7794a4]">Chưa có dữ liệu để hiển thị.</div>:<>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
    {[
     {label:"Tổng đại biểu",value:summary?.total||0,icon:Users,color:"text-[#276b8e]"},
     {label:"Đã tham dự",value:summary?.present||0,icon:CheckCircle2,color:"text-[#16966d]"},
     {label:"Chưa đến",value:summary?.absent||0,icon:UserX,color:"text-[#a37731]"},
     {label:"Tỷ lệ tham dự",value:(summary?.percentage||0)+"%",icon:Activity,color:"text-[#087daa]"},
     {label:"Bằng QR",value:summary?.qr||0,icon:QrCode,color:"text-[#397cab]"},
     {label:"Thủ công / Barcode",value:(summary?.manual||0)+(summary?.barcode||0),icon:Armchair,color:"text-[#6f72a7]"}
    ].map(({label,value,icon:Icon,color})=><div key={label} className="min-w-0 rounded-xl border border-[#e0e9ee] bg-white p-3.5 sm:p-5">
     <div className="flex items-start justify-between gap-1">
      <p className="text-[11px] font-bold leading-5 text-[#728d9c]">{label}</p><Icon size={17} className={color}/>
     </div>
     <p className={"mt-3 text-[clamp(25px,3vw,36px)] font-extrabold tabular-nums "+color}>{value}</p>
    </div>)}
   </div>
   <div className="overflow-hidden rounded-xl border border-[#dce9ee] bg-white px-4 py-4 sm:px-6">
    <div className="flex items-center justify-between text-xs font-extrabold text-[#315b71]">
     <span>Tiến độ điểm danh toàn Đại hội</span><span>{summary?.present||0} / {summary?.total||0} đại biểu</span>
    </div>
    <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e8eef2]">
     <div className="h-full rounded-full bg-[#13a77a] transition-[width] duration-700" style={{width:(summary?.percentage||0)+"%"}}/>
    </div>
    <p className="mt-2 text-[11px] text-[#8aa0ac]">Số liệu theo phiên đã chọn; không đồng nghĩa xác nhận tư cách đại biểu hoặc quyền biểu quyết.</p>
   </div>
   <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,.9fr)] xl:items-start">
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#dce8ed] bg-white">
     <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8f0f2] px-4 py-4 sm:px-5">
      <div>
       <h2 className="flex items-center gap-2 text-[16px] font-extrabold text-[#28536a]"><LayoutGrid size={18}/>Sơ đồ ghế hội trường</h2>
       <p className="mt-1 text-xs text-[#8194a0]">Ghế chuyển màu khi đại biểu được ghi nhận điểm danh</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
       <span className="rounded-lg bg-[#f1f6f8] px-3 py-2 text-xs font-bold text-[#527b90]">
        {room?"Sơ đồ phiên: "+room.title:"Phiên chưa gắn sơ đồ ghế"}
       </span>
       {!fullscreen&&<Link href={base} className="text-[11px] font-bold text-[#167ca1] underline">Cấu hình phiên</Link>}
      </div>
     </div>
     {room?<div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-b border-[#edf1f4] px-4 py-3">
       {legend.map(({key,label})=><span key={key} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#708a9c]">
        <span className={"h-3 w-3 rounded-[3px] border "+seatStyles[key]}/>{label}
       </span>)}
       <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7a8fa2]">
        <span className="h-3 w-3 rounded-[3px] border-2 border-[#9874c2] bg-[#f6f1fc]"/>Ghế khách mời
       </span>
      </div>
      <div className="overflow-x-auto bg-[#f5f8fa] p-4 sm:p-6" aria-label="Canvas sơ đồ ghế theo thời gian thực" tabIndex={0}>
       <div className="mx-auto rounded-2xl border border-[#e4eaee] bg-white p-4 shadow-sm"
        style={{minWidth:Math.max(380,cols*43+66),maxWidth:Math.max(800,cols*53+66)}}>
        <div className="mx-auto mb-5 max-w-[380px] rounded-b-2xl border-x border-b border-[#cbdbe4] bg-[#e8f2f7] px-6 py-2.5 text-center text-[12px] font-extrabold uppercase tracking-widest text-[#3f738a]">
         {room.stage_label||"SÂN KHẤU"}
        </div>
        <div className="grid gap-1.5" style={{gridTemplateColumns:"31px repeat("+cols+", minmax(34px, 1fr))"}}>
         <span/>
         {Array.from({length:cols},(_,c)=><span key={"h"+c} className="py-0.5 text-center text-[10px] font-bold text-[#a0adba]">{c+1}</span>)}
         {Array.from({length:rows},(_,row)=><div key={"row"+row} className="contents">
          <span className="self-center text-center text-xs font-bold text-[#8ea2ae]">{rowLabelAt("A",row)}</span>
          {Array.from({length:cols},(_,col)=>{
           const seat=cells.get(row*cols+col);
           if(!seat)return <div key={col} className="h-9 rounded-md bg-[#f0f4f6]" title="Lối đi / vị trí trống"/>;
           const person=map.delegate.get(map.seatAssignment.get(seat.id)||"");
           const state=classifySeat(seat,map.seatAssignment.get(seat.id),map.checked);
           const highlighted=selectedSeatId===seat.id;
           return <button key={col} type="button" onClick={()=>setSelectedSeatId(seat.id)}
            title={seat.code+" · "+(person?.full_name||"Chưa phân công")}
            aria-label={seat.code+" – "+(person?.full_name||"Chưa phân công")+" – "+legend.find(x=>x.key===state)?.label}
            className={"flex h-9 min-w-0 items-center justify-center rounded-[6px] border text-[11px] font-extrabold transition "+
             seatStyles[state]+(seat.seat_type==="guest"?" ring-1 ring-[#8b69b1] ring-inset":"")+
             (highlighted?" outline outline-2 outline-offset-1 outline-[#006e9c]":"")}>
            {seat.blocked?"×":seatNumbers.get(seat.id)}
           </button>;
          })}
         </div>)}
        </div>
       </div>
      </div>
      {outside.length>0&&<div className="border-t border-[#e6edf1] px-4 py-3">
       <p className="mb-2 text-[11px] font-bold text-[#637f90]">{outside.length} ghế bố trí ngoài lưới:</p>
       <div className="flex flex-wrap gap-2">{outside.map(seat=>{
        const person=map.delegate.get(map.seatAssignment.get(seat.id)||"");
        const state=classifySeat(seat,map.seatAssignment.get(seat.id),map.checked);
        return <button key={seat.id} type="button" onClick={()=>setSelectedSeatId(seat.id)}
         title={person?.full_name||"Chưa phân công"} className={"rounded-lg border px-3 py-2 text-xs font-bold "+seatStyles[state]}>{seat.code}</button>;
       })}</div>
      </div>}
      <div className="grid grid-cols-2 gap-3 border-t border-[#e7eef1] bg-[#fbfdfe] px-4 py-4">
       {[
        ["Đã đến",summary?.seats.present||0,"text-[#16956d]"],
        ["Chưa đến",summary?.seats.absent||0,"text-[#b48a45]"],


       ].map(([label,num,color])=><div key={String(label)} className="text-center">
        <p className={"text-[22px] font-extrabold "+color}>{num}</p><p className="text-[11px] font-semibold text-[#8197a3]">{label}</p>
       </div>)}
      </div>
     </div>:<div className="px-5 py-14 text-center">
      <Armchair size={36} className="mx-auto text-[#9db5be]"/>
      <h3 className="mt-3 text-[15px] font-extrabold text-[#547789]">Chưa có sơ đồ ghế</h3>
      <p className="mt-2 text-xs leading-6 text-[#8599a5]">Tạo sơ đồ trong mục Sơ đồ ghế và gắn sơ đồ đó vào phiên tại Quản lý phiên. Mỗi phiên có thể dùng một sơ đồ khác nhau.</p>
      <Link href={"/congresses/"+congressId+"/seating"} className="btn btn-secondary mt-4">Mở Sơ đồ ghế</Link>
     </div>}
    </section>
    <div className="min-w-0 space-y-4">
     <section className="overflow-hidden rounded-xl border border-[#dce9ec] bg-white">
      <div className="flex items-center justify-between bg-[#ecf7f3] px-4 py-3">
       <h2 className="text-[13px] font-extrabold text-[#196950]">Đại biểu điểm danh gần nhất</h2>
       <span className="inline-flex items-center gap-1.5 text-[11px] text-[#5d9a85]"><span className="h-2 w-2 rounded-full bg-[#18a278]"/>LIVE</span>
      </div>
      {latestDelegate&&latest?<div className="p-5">
       <div className="flex items-center gap-4">
        <Avatar id={latestDelegate.id} name={latestDelegate.full_name}
         photo={latestDelegate.photo_path} size={90}/>
        <div className="min-w-0">
         <p className="text-[10px] font-bold tracking-widest text-[#16916b]">ĐẠI BIỂU VỪA ĐẾN</p>
         <h3 className="mt-1 text-[19px] font-extrabold leading-tight text-[#244d64]">
          Chào mừng đại biểu {latestDelegate.full_name} đến dự Đại hội!
         </h3>
         <p className="mt-1 text-xs text-[#748e9d]">{latestDelegate.unit||"Chưa có đơn vị"}</p>

        </div>
       </div>
       <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#f4faf8] p-2.5 text-xs text-[#327f64]">
        <CheckCircle2 size={16}/> Điểm danh lúc {displayTime(latest.checked_in_at)}
       </p>
       <p className="mt-2 text-xs text-[#8296a3]">
        {(()=>{
         const seat=data.seats.find(s=>map.seatAssignment.get(s.id)===latestDelegate.id);
         return seat?"Vị trí ghế: "+seat.code+" · "+room?.title:"Vị trí ghế: Chưa phân ghế trong hội trường đang xem";
        })()}
       </p>
      </div>:<div className="px-5 py-12 text-center text-sm text-[#8199a4]">Đang chờ đại biểu điểm danh...</div>}
     </section>
     {selectedSeat&&<section className="overflow-hidden rounded-xl border border-[#d9e7ec] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
       <h3 className="text-[13px] font-extrabold text-[#345c70]">Chi tiết vị trí {selectedSeat.code}</h3>
       <button type="button" className="text-[11px] font-bold text-[#7a98a8]" onClick={()=>setSelectedSeatId("")}>Đóng</button>
      </div>
      <div className="mt-3 flex items-center gap-3">
       {selectedPerson?<Avatar id={selectedPerson.id} name={selectedPerson.full_name} photo={selectedPerson.photo_path} size={56}/>:
        <span className="flex h-[75px] w-14 items-center justify-center rounded-lg bg-[#f0f5f7] text-[#91a7b2]"><UserRound size={23}/></span>}
       <div className="min-w-0">
        <p className="text-sm font-extrabold text-[#294f65]">{selectedPerson?.full_name||"Chưa phân công"}</p>
        <p className="mt-1 text-xs text-[#758d9d]">{selectedPerson?.unit||"—"}</p>
        <p className="mt-1 text-xs font-bold text-[#477c93]">{legend.find(x=>x.key===selectedState)?.label}</p>
       </div>
      </div>
     </section>}
     <section className="overflow-hidden rounded-xl border border-[#dfe9ee] bg-white">
      <div className="border-b border-[#e7eef3] px-4 py-3">
       <h3 className="text-[13px] font-extrabold text-[#355b71]">Các đại biểu vừa đến</h3>
       <p className="mt-1 text-[11px] text-[#8a9dab]">Cập nhật tự động theo phiên</p>
      </div>
      <div className="divide-y divide-[#edf1f3]">
       {data.checkins.slice(0,8).map(checkin=>{
        const d=map.delegate.get(checkin.delegate_id);
        return <div key={checkin.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
         {d?<Avatar id={d.id} name={d.full_name} photo={d.photo_path} size={36}/>:
          <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eaf0f4] text-[#91aab8]"><UserRound size={17}/></span>}
         <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-[#305b72]">{d?.full_name||"Đại biểu"}</p>
          <p className="truncate text-[11px] text-[#8399a6]">{d?.unit||"Chưa có đơn vị"}</p>
         </div>
         <span className="shrink-0 text-[10px] font-semibold text-[#7c9aa8]">{new Date(checkin.checked_in_at).toLocaleTimeString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit"})}</span>
        </div>;
       })}
       {!data.checkins.length&&<p className="p-5 text-center text-xs text-[#869ba8]">Chưa có lượt điểm danh.</p>}
      </div>
     </section>
    </div>
   </div>
  </>}
 </div>;
}
