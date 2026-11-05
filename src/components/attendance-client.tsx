"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {BrowserMultiFormatReader} from "@zxing/browser";
import {
 Camera,CheckCheck,ClipboardCheck,History,Plus,RefreshCw,Search,
 ShieldAlert,Users,Wifi,ScanBarcode,Clock3,Settings2
} from "lucide-react";
import {createClient} from "@/lib/supabase/browser";
import {displayTime} from "@/lib/attendance-report";
import {
 getWindowStatus,getWindowLabel,getQrPolicyLabel,vietnamTimeToUtc,utcToVietnamInput,type QrPolicy
} from "@/lib/attendance-window";
import type {Delegate,AttendanceSession,Checkin} from "@/lib/types";

type Props={
 congressId:string;delegates:Delegate[];sessions:AttendanceSession[];
 initialCheckins:Checkin[];canScan:boolean;canManage:boolean;
};
type Tab="qr"|"manual"|"history";
type Fallback="manual"|"barcode";
type Review={delegate:Delegate;method:Fallback};
const barcodePattern=/^DB[0-9A-F]{20}$/;
function localInput(iso:string|null){
 return utcToVietnamInput(iso);
}
function windowBody(start:string,end:string){
 if(!start||!end)throw new Error("Hãy chọn đầy đủ giờ mở và đóng điểm danh.");
 const startsAt=vietnamTimeToUtc(start),endsAt=vietnamTimeToUtc(end);
 if(!startsAt||!endsAt||Date.parse(endsAt)<=Date.parse(startsAt))
  throw new Error("Giờ đóng phải sau giờ mở; sử dụng giờ Việt Nam (GMT+7).");
 return {startsAt,endsAt};
}
export function AttendanceClient({congressId,delegates,sessions:initialSessions,initialCheckins,canScan,canManage}:Props){
 const [sessions,setSessions]=useState(initialSessions);
 const [sessionId,setSessionId]=useState(initialSessions[0]?.id||"");
 const [checkins,setCheckins]=useState(initialCheckins);
 const [tab,setTab]=useState<Tab>(canScan?"qr":"history");
 const [camera,setCamera]=useState(false);
 const [busy,setBusy]=useState(false);
 const [query,setQuery]=useState("");
 const [barcodeInput,setBarcodeInput]=useState("");
 const [review,setReview]=useState<Review|null>(null);
 const [note,setNote]=useState("");
 const [flash,setFlash]=useState<{type:"success"|"error";text:string}|null>(null);
 const [editor,setEditor]=useState<"create"|"edit"|null>(null);
 const [sessionName,setSessionName]=useState("");
 const [startLocal,setStartLocal]=useState("");
 const [endLocal,setEndLocal]=useState("");
 const [qrPolicy,setQrPolicy]=useState<QrPolicy>("both");
 const [clock,setClock]=useState(()=>Date.now());
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const controlsRef=useRef<{stop():void}|null>(null);
 const scanLock=useRef(false);
 const lastQr=useRef<{token:string;time:number}>({token:"",time:0});
 const session=sessions.find(s=>s.id===sessionId);
 const windowStatus=session?getWindowStatus(session,new Date(clock)):"not-configured";
 const allowed=windowStatus==="open" && canScan;
 const filtered=useMemo(()=>checkins.filter(c=>c.session_id===sessionId),[checkins,sessionId]);
 const checkedIds=useMemo(()=>new Set(filtered.map(c=>c.delegate_id)),[filtered]);
 const eligible=useMemo(()=>delegates.filter(d=>d.is_active),[delegates]);
 const activeIds=useMemo(()=>new Set(eligible.map(d=>d.id)),[eligible]);
 const checkinsActive=filtered.filter(c=>activeIds.has(c.delegate_id));
 const lookup=useMemo(()=>new Map(delegates.map(d=>[d.id,d])),[delegates]);
 const barcodeLookup=useMemo(()=>new Map(eligible.map(d=>[d.barcode_code?.toUpperCase(),d])),[eligible]);
 const stats={
  total:eligible.length,checked:checkinsActive.length,
  qr:checkinsActive.filter(c=>c.method==="qr").length,
  manual:checkinsActive.filter(c=>c.method==="manual").length,
  barcode:checkinsActive.filter(c=>c.method==="barcode").length
 };
 const reload=useCallback(async()=>{
  if(!sessionId)return;
  const {data,error}=await createClient().from("checkins").select("*")
   .eq("congress_id",congressId).eq("session_id",sessionId)
   .order("checked_in_at",{ascending:false}).limit(1000);
  if(error){setFlash({type:"error",text:"Không đồng bộ được dữ liệu điểm danh."});return;}
  if(data)setCheckins(previous=>[
   ...previous.filter(c=>c.session_id!==sessionId),
   ...(data as Checkin[])
  ]);
 },[sessionId,congressId]);
 useEffect(()=>{
  const t=setInterval(()=>{setClock(Date.now());void reload();},12000);
  queueMicrotask(()=>void reload());
  return()=>clearInterval(t);
 },[reload]);
 useEffect(()=>()=>{controlsRef.current?.stop();},[]);
 function stopCamera(){
  controlsRef.current?.stop();controlsRef.current=null;setCamera(false);
 }
 function selectFallback(d:Delegate,method:Fallback){
  stopCamera();
  setReview({delegate:d,method});
  setNote(method==="barcode"
   ?"QR không đọc được, BTC đã đối chiếu danh tính bằng thẻ barcode."
   :"Thiết bị đại biểu gặp sự cố, BTC đã đối chiếu danh tính.");
 }
 function readBarcode(value:string){
  const code=value.trim().toUpperCase();
  setBarcodeInput(code);
  if(!barcodePattern.test(code)){
   setFlash({type:"error",text:"Barcode không đúng định dạng. Hãy nhập mã bắt đầu bằng DB."});
   return;
  }
  const delegate=barcodeLookup.get(code);
  if(!delegate){
   setFlash({type:"error",text:"Không tìm thấy barcode trong Đại hội đang chọn."});
   return;
  }
  if(checkedIds.has(delegate.id)){
   setFlash({type:"error",text:`${delegate.full_name} đã được điểm danh ở phiên này.`});
   return;
  }
  setFlash(null);selectFallback(delegate,"barcode");
 }
 async function submit(method:"qr"|"manual"|"barcode",value:string){
  if(!session||windowStatus!=="open")
   return setFlash({type:"error",text:"Ngoài khung giờ hoặc phiên điểm danh đã đóng."});
  setBusy(true);setFlash(null);
  try{
   const delegate=method==="qr"?null:review?.delegate;
   const body={
    congressId,sessionId,method,
    ...(method==="qr"?{token:value}:{
     delegateId:delegate?.id,barcodeCode:method==="barcode"?delegate?.barcode_code:undefined,
     note,confirmedIdentity:true
    })
   };
   const res=await fetch("/api/checkins",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
   });
   const result=await res.json();
   if(!res.ok)throw new Error(result.error||"Điểm danh thất bại.");
   setFlash({type:"success",text:`Đã điểm danh: ${result.delegate.full_name} (${result.delegate.code}) – ${method==="qr"?"QR":method==="barcode"?"Barcode dự phòng":"BTC xác nhận thủ công"}.`});
   setReview(null);setBarcodeInput("");
   await reload();
  }catch(e){
   setFlash({type:"error",text:e instanceof Error?e.message:"Điểm danh thất bại."});
   await reload();
  }finally{
   setBusy(false);
   scanLock.current=false;
  }
 }
 async function startCamera(){
  if(!allowed)return setFlash({type:"error",text:"Phiên chưa mở hoặc đã hết thời gian điểm danh."});
  setFlash(null);lastQr.current={token:"",time:0};scanLock.current=false;setCamera(true);
  try{
   await new Promise(resolve=>setTimeout(resolve,120));
   if(!videoRef.current)throw new Error("Camera chưa sẵn sàng.");
   const reader=new BrowserMultiFormatReader();
   controlsRef.current=await reader.decodeFromConstraints({
    video:{facingMode:{ideal:"environment"}},audio:false
   },videoRef.current,(result)=>{
    if(!result||scanLock.current)return;
    const value=result.getText().trim();
    if(value.startsWith("dh1.")||value.startsWith("dh2.")||value.startsWith("dh3.")){
     if(value===lastQr.current.token&&Date.now()-lastQr.current.time<8000)return;
     lastQr.current={token:value,time:Date.now()};scanLock.current=true;
     void submit("qr",value);
    }else if(barcodePattern.test(value.toUpperCase())){
     scanLock.current=true;readBarcode(value);
    }else{
     if(value!==lastQr.current.token||Date.now()-lastQr.current.time>8000){
      lastQr.current={token:value,time:Date.now()};
      setFlash({type:"error",text:"Mã quét không thuộc hệ thống Đại hội này."});
     }
    }
   });
  }catch{
   stopCamera();
   setFlash({type:"error",text:"Không mở được camera. Hãy dùng HTTPS, cho phép quyền camera hoặc dùng phương thức thủ công."});
  }
 }
 function openEditor(kind:"create"|"edit"){
  stopCamera();setEditor(kind);setFlash(null);
  const source=kind==="edit"?session:null;
  setSessionName(source?.name||"");
  setStartLocal(localInput(source?.starts_at||null));
  setEndLocal(localInput(source?.ends_at||null));
  setQrPolicy(source?.qr_policy||"both");
 }
 async function saveSession(){
  setBusy(true);setFlash(null);
  try{
   const window=windowBody(startLocal,endLocal);
   const creating=editor==="create";
   if(creating&&sessionName.trim().length<3)throw new Error("Tên phiên phải có tối thiểu 3 ký tự.");
   const body={
    congressId,...window,qrPolicy,
    ...(creating?{name:sessionName.trim()}:{sessionId})
   };
   const response=await fetch("/api/attendance-sessions",{
    method:creating?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không lưu được phiên.");
   const saved=result.session as AttendanceSession;
   if(creating){setSessions(prev=>[saved,...prev]);setSessionId(saved.id);}
   else setSessions(prev=>prev.map(s=>s.id===saved.id?saved:s));
   setEditor(null);
   setFlash({type:"success",text:"Đã lưu giờ mở/đóng và chính sách QR của phiên."});
  }catch(e){setFlash({type:"error",text:e instanceof Error?e.message:"Không lưu được phiên."});}
  finally{setBusy(false);}
 }
 async function toggleSession(){
  if(!session)return;
  const newStatus=session.status==="open"?"closed":"open";
  if(newStatus==="closed"&&!window.confirm("Đóng phiên điểm danh này trước giờ kết thúc?"))return;
  setBusy(true);
  try{
   const response=await fetch("/api/attendance-sessions",{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,sessionId,status:newStatus})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không đổi được trạng thái.");
   setSessions(prev=>prev.map(s=>s.id===sessionId?result.session:s));
   if(newStatus==="closed")stopCamera();
  }catch(e){setFlash({type:"error",text:e instanceof Error?e.message:"Không đổi được trạng thái."});}
  finally{setBusy(false);}
 }
 const results=eligible.filter(d=>[d.full_name,d.code,d.unit,d.barcode_code]
  .join(" ").toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))).slice(0,100);
 return <div>
  <div className="flex flex-wrap justify-between gap-4 items-start">
   <div><p className="text-xs text-[#0ca0a0] font-extrabold tracking-widest">ĐIỀU HÀNH ĐẠI HỘI</p>
    <h1 className="text-3xl font-extrabold mt-2">Điểm danh đại biểu</h1>
    <p className="helper mt-2">Quét QR cố định, QR theo phiên, barcode dự phòng hoặc điểm danh thủ công.</p>
   </div>
   <button onClick={()=>void reload()} className="btn btn-secondary"><RefreshCw size={17}/>Làm mới</button>
  </div>
  <div className="card p-5 my-7">
   <div className="flex flex-wrap items-end gap-4">
    <label className="flex-1 min-w-[235px]"><span className="label">Phiên Đại hội</span>
     <select className="field" value={sessionId} onChange={e=>{
      stopCamera();setSessionId(e.target.value);setFlash(null);
     }}>
      {!sessions.length&&<option value="">Chưa có phiên</option>}
      {sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
     </select>
    </label>
    {session&&<span className={`badge ${windowStatus==="open"?"badge-green":windowStatus==="upcoming"?"badge-yellow":"badge-gray"}`}>{getWindowLabel(windowStatus)}</span>}
    {canManage&&<div className="flex flex-wrap gap-2">
     <button className="btn btn-secondary" onClick={()=>openEditor("create")}><Plus size={16}/>Thêm phiên</button>
     {session&&<>
      <button className="btn btn-secondary" onClick={()=>openEditor("edit")}><Settings2 size={16}/>Cấu hình giờ/QR</button>
      <button disabled={busy} className="btn btn-secondary" onClick={()=>void toggleSession()}>
       {session.status==="open"?"Đóng sớm":"Mở lại phiên"}
      </button>
     </>}
    </div>}
   </div>
   {session&&<div className="mt-4 flex flex-wrap gap-4 text-sm text-[#667e92]">
    <span className="flex gap-2 items-center"><Clock3 size={16}/>Mở: <strong>{displayTime(session.starts_at)}</strong></span>
    <span>Đóng: <strong>{displayTime(session.ends_at)}</strong></span>
    <span>{getQrPolicyLabel(session.qr_policy)}</span>
   </div>}
   {editor&&canManage&&<div className="rounded-xl bg-[#f4f9fc] p-5 mt-5 border border-[#deebf2]">
    <h2 className="font-extrabold mb-4">{editor==="create"?"Tạo phiên điểm danh":"Cập nhật thời gian và QR"}</h2>
    <div className="grid md:grid-cols-2 gap-4">
     {editor==="create"&&<label className="md:col-span-2"><span className="label">Tên phiên *</span>
      <input className="field" value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="Phiên trù bị, Phiên chính thức..."/></label>}
     <label><span className="label">Thời gian mở điểm danh *</span>
      <input className="field" type="datetime-local" value={startLocal} onChange={e=>setStartLocal(e.target.value)}/></label>
     <label><span className="label">Thời gian đóng điểm danh *</span>
      <input className="field" type="datetime-local" value={endLocal} onChange={e=>setEndLocal(e.target.value)}/></label>
     <label className="md:col-span-2"><span className="label">Loại QR được chấp nhận</span>
      <select className="field" value={qrPolicy} onChange={e=>setQrPolicy(e.target.value as QrPolicy)}>
       <option value="both">Cả QR cố định và QR theo phiên</option>
       <option value="fixed">Chỉ QR cá nhân cố định</option>
       <option value="session">Chỉ QR riêng cho phiên này</option>
      </select></label>
     <div className="md:col-span-2 flex flex-wrap gap-2">
      <button disabled={busy} className="btn btn-primary" onClick={()=>void saveSession()}>{busy?"Đang lưu...":"Lưu cấu hình"}</button>
      <button className="btn btn-secondary" onClick={()=>setEditor(null)}>Hủy</button>
     </div>
    </div>
    <p className="helper mt-3">Giờ nhập được hiểu là giờ Việt Nam (GMT+7), không phụ thuộc múi giờ thiết bị. Máy chủ kiểm tra chính xác thời điểm mở/đóng. Không thể sửa giờ hoặc loại QR sau khi phiên có lượt điểm danh.</p>
   </div>}
  </div>
  <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-7">
   {[[stats.total,"Đại biểu/khách mời",Users],[stats.checked,"Đã điểm danh",CheckCheck],
     [stats.qr,"Bằng QR",Camera],[stats.barcode,"Barcode dự phòng",ScanBarcode],
     [stats.manual,"Thủ công",ClipboardCheck]].map(([count,label,Icon])=>{
     const I=Icon as typeof Users;
     return <div className="card p-5" key={String(label)}>
      <div className="flex justify-between text-xs font-bold text-[#7b91a1]">{String(label)}<I size={18} className="text-[#21959f]"/></div>
      <div className="text-3xl font-extrabold mt-4">{String(count)}</div>
     </div>;
   })}
  </div>
  <div className="card p-6 mb-7">
   <div className="flex justify-between gap-3 flex-wrap"><strong>Tiến độ điểm danh</strong>
    <strong className="text-[#168a96]">{stats.total?Math.round(stats.checked/stats.total*100):0}%</strong>
   </div>
   <div className="rounded-full bg-[#eaf1f5] h-3 mt-3 overflow-hidden">
    <div className="h-3 bg-gradient-to-r from-[#1888b7] to-[#21ba9c] rounded-full"
      style={{width:`${stats.total?Math.min(stats.checked/stats.total*100,100):0}%`}}/>
   </div>
   <p className="helper mt-3">Số liệu chỉ phản ánh check-in, không tự xác nhận tư cách hoặc quyền biểu quyết.</p>
  </div>
  {flash&&<p role="status" className={`rounded-xl p-4 mb-6 font-semibold text-sm ${flash.type==="success"?"bg-[#ddf8ed] text-[#117d54]":"bg-red-50 text-red-700"}`}>{flash.text}</p>}
  <div className="card overflow-hidden">
   <div className="flex flex-wrap gap-2 p-4 border-b border-[#e8f0f5]">
    {canScan&&<>
     <button className={`btn ${tab==="qr"?"btn-primary":"btn-secondary"}`} onClick={()=>{stopCamera();setTab("qr");}}>
      <Camera size={17}/>Quét QR / Barcode</button>
     <button className={`btn ${tab==="manual"?"btn-primary":"btn-secondary"}`} onClick={()=>{stopCamera();setTab("manual");}}>
      <ClipboardCheck size={17}/>Điểm danh dự phòng</button>
    </>}
    <button className={`btn ${tab==="history"?"btn-primary":"btn-secondary"}`} onClick={()=>{stopCamera();setTab("history");}}>
     <History size={17}/>Lịch sử</button>
   </div>
   {tab==="qr"&&canScan&&<div className="p-6 text-center">
    <div className="max-w-xl mx-auto">
     {camera?<div className="relative rounded-2xl overflow-hidden bg-[#0b243a]">
       <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-video object-cover"/>
       <div className="absolute inset-[15%] border-2 border-[#42e1c9] rounded-xl pointer-events-none"/>
      </div>:
      <div className="rounded-2xl bg-[#f2f9fc] py-12">
       <Camera size={58} className="mx-auto text-[#31aab0]"/>
       <h3 className="text-xl font-extrabold mt-4">Sẵn sàng quét đại biểu</h3>
       <p className="helper mt-2">QR nhận ngay. Barcode sẽ hiện thông tin để BTC xác nhận trước khi điểm danh.</p>
      </div>}
     <button disabled={busy||!allowed} onClick={()=>camera?stopCamera():void startCamera()} className="btn btn-primary mt-6 w-full">
      {camera?"Dừng camera":"Mở camera quét QR / Barcode"}</button>
     <p className="helper mt-4 flex items-center justify-center gap-2"><Wifi size={16}/>Camera chạy trên thiết bị, không gửi video lên máy chủ.</p>
     {!allowed&&<p className="text-sm text-[#ab6c18] mt-3">{getWindowLabel(windowStatus)}. Không thể ghi điểm danh ngoài giờ.</p>}
    </div>
   </div>}
   {tab==="manual"&&canScan&&<div className="p-5">
    <div className="rounded-xl bg-[#edf8fa] p-4 mb-5">
     <p className="font-bold flex gap-2 items-center"><ScanBarcode size={18}/>Tra cứu bằng barcode</p>
     <p className="helper mt-1">Dùng máy quét barcode cầm tay hoặc nhập mã trên thẻ. Sau đó đối chiếu danh tính.</p>
     <form onSubmit={e=>{e.preventDefault();readBarcode(barcodeInput);}} className="flex gap-2 mt-4">
      <input className="field" value={barcodeInput} onChange={e=>setBarcodeInput(e.target.value)}
       placeholder="DB... (22 ký tự)"/>
      <button className="btn btn-secondary" type="submit" disabled={!allowed}>Tra cứu</button>
     </form>
    </div>
    <div className="relative mb-5"><Search className="absolute top-3 left-3 text-[#94a9b8]" size={19}/>
     <input className="field pl-11!" value={query} onChange={e=>setQuery(e.target.value)}
      placeholder="Tìm mã, họ tên, đơn vị hoặc barcode..."/></div>
    <div className="table-wrap"><table className="data">
     <thead><tr><th>Mã</th><th>Đại biểu</th><th className="hide-mobile">Đơn vị</th><th>Trạng thái</th><th></th></tr></thead>
     <tbody>{results.map(d=><tr key={d.id}>
      <td className="font-bold">{d.code}</td><td>{d.full_name}</td>
      <td className="hide-mobile">{d.unit}</td>
      <td><span className={`badge ${checkedIds.has(d.id)?"badge-green":"badge-yellow"}`}>{checkedIds.has(d.id)?"Đã đến":"Chưa đến"}</span></td>
      <td><button className="btn btn-secondary text-xs" disabled={busy||!allowed||checkedIds.has(d.id)}
       onClick={()=>selectFallback(d,"manual")}>Xác nhận</button></td>
     </tr>)}</tbody>
    </table></div>
   </div>}
   {tab==="history"&&<div className="p-5 table-wrap"><table className="data">
    <thead><tr><th>Thời gian GMT+7</th><th>Đại biểu</th><th>Phương thức</th><th className="hide-mobile">Ghi chú</th></tr></thead>
    <tbody>{filtered.map(c=><tr key={c.id}>
     <td>{displayTime(c.checked_in_at)}</td>
     <td><strong>{lookup.get(c.delegate_id)?.full_name||c.delegate_id}</strong>
      <div className="helper">{lookup.get(c.delegate_id)?.code}</div></td>
     <td><span className={`badge ${c.method==="qr"?"badge-green":"badge-yellow"}`}>
      {c.method==="qr"?(c.qr_scope==="session"?"QR phiên":"QR cố định"):
       c.method==="barcode"?"Barcode":"Thủ công"}</span></td>
     <td className="hide-mobile">{c.note||"—"}</td></tr>)}
     {!filtered.length&&<tr><td colSpan={4} className="text-center helper py-8!">Chưa có lượt điểm danh.</td></tr>}
    </tbody></table></div>}
  </div>
  {review&&<div className="fixed inset-0 z-50 bg-[#0d2945]/60 flex items-center justify-center p-4"
   onClick={()=>setReview(null)}><div className="card p-7 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
    <div className="flex gap-3 items-center text-[#126a89]"><ShieldAlert size={23}/>
     <h3 className="text-xl font-extrabold">Xác nhận điểm danh dự phòng</h3></div>
    <p className="helper my-5">Barcode và mã nhập chỉ là phương tiện tra cứu. BTC bắt buộc đối chiếu đúng người trước khi xác nhận.</p>
    <div className="bg-[#f1f8fb] rounded-xl p-4 space-y-1">
     <div className="font-extrabold text-lg">{review.delegate.full_name}</div>
     <div className="text-sm">Mã: {review.delegate.code} · Đơn vị: {review.delegate.unit}</div>
     <div className="helper">Phương thức: {review.method==="barcode"?"Barcode dự phòng":"Thủ công"}</div>
    </div>
    <label className="block mt-5"><span className="label">Lý do (bắt buộc)</span>
     <textarea className="field min-h-22" value={note} onChange={e=>setNote(e.target.value)}/></label>
    <div className="flex gap-3 justify-end mt-6">
     <button className="btn btn-secondary" onClick={()=>setReview(null)}>Hủy</button>
     <button disabled={busy||!allowed||note.trim().length<3} className="btn btn-primary"
      onClick={()=>void submit(review.method,review.delegate.id)}>Đã đối chiếu – ghi nhận</button>
    </div>
   </div></div>}
 </div>;
}
