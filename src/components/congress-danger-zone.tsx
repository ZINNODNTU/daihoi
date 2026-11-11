"use client";
import {useCallback,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {AlertTriangle,CheckCircle2,Database,RefreshCw,ShieldAlert,Trash2} from "lucide-react";

type Key="delegates"|"bch"|"sessions"|"documents"|"seating"|"checkins";
type Overview={name:string;counts:Record<Key|"btc",number>;
 sessions:{id:string;name:string;status:string;layoutId:string|null;layoutTitle:string|null;assigned:number}[];
 layouts:{id:string;title:string}[];warnings:string[]};
const groups:{key:Key;title:string;detail:string}[]=[
 {key:"delegates",title:"Tài khoản và hồ sơ đại biểu/khách mời",detail:"Xóa đại biểu, liên kết tài khoản, phân ghế và lượt điểm danh liên quan."},
 {key:"bch",title:"Ứng cử viên BCH",detail:"Xóa danh sách trích ngang và ảnh liên kết trong Đại hội."},
 {key:"sessions",title:"Phiên Đại hội",detail:"Xóa các phiên QR cùng lịch sử điểm danh của phiên."},
 {key:"documents",title:"Tài liệu",detail:"Gỡ tệp khỏi website; không xóa bản gốc trên Google Drive."},
 {key:"seating",title:"Sơ đồ ghế",detail:"Xóa tất cả sơ đồ và phân ghế; các phiên giữ lại sẽ bị gỡ liên kết sơ đồ."},
 {key:"checkins",title:"Lịch sử điểm danh",detail:"Xóa toàn bộ lượt điểm danh nhưng giữ phiên và đại biểu."}
];
export function CongressDangerZone({id,name}:{id:string;name:string}){
 const router=useRouter();
 const [overview,setOverview]=useState<Overview|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState("");
 const [chosen,setChosen]=useState<Key[]>([]);
 const [deleteMode,setDeleteMode]=useState(false);
 const [confirmName,setConfirmName]=useState(""),[ack,setAck]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const res=await fetch("/api/congresses/"+id+"/lifecycle",{cache:"no-store",credentials:"same-origin"});
   const payload=await res.json() as Overview&{error?:string};
   if(!res.ok)throw new Error(payload.error||"Không thể kiểm tra dữ liệu.");
   setOverview(payload);
  }catch(reason){setError(reason instanceof Error?reason.message:"Không thể tải dữ liệu.");}
  finally{setLoading(false);}
 },[id]);
 useEffect(()=>{void Promise.resolve().then(()=>load());},[load]);
 function toggle(key:Key){
  setChosen(previous=>previous.includes(key)?previous.filter(k=>k!==key):[...previous,key]);
  setSuccess("");
 }
 async function submit(){
  if(!overview||busy||confirmName!==overview.name||!ack||(!deleteMode&&!chosen.length))return;
  if(!window.confirm(deleteMode
   ?"Xóa vĩnh viễn Đại hội và TẤT CẢ dữ liệu liên quan? Không thể hoàn tác."
   :"Xóa vĩnh viễn các nhóm dữ liệu đã chọn? Không thể hoàn tác."))return;
  setBusy(true);setError("");setSuccess("");
  try{
   const res=await fetch("/api/congresses/"+id+"/lifecycle",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({mode:deleteMode?"delete":"reset",sections:deleteMode?[]:chosen,
     confirmName,acknowledged:true})
   });
   const payload=await res.json() as {ok?:boolean;deleted?:boolean;pendingAuthUsers?:number;error?:string};
   if(!res.ok||!payload.ok)throw new Error(payload.error||"Yêu cầu thất bại.");
   const warning=payload.pendingAuthUsers
    ? " Có "+payload.pendingAuthUsers+" tài khoản Auth chưa dọn xong; quản trị viên cần kiểm tra hàng chờ."
    :"";
   if(deleteMode){
    router.replace("/dashboard");
    router.refresh();
    return;
   }
   setChosen([]);setAck(false);setConfirmName("");
   setSuccess("Đã reset thành công các nhóm dữ liệu đã chọn."+warning);
   await load();router.refresh();
  }catch(reason){setError(reason instanceof Error?reason.message:"Không xử lý được yêu cầu.");}
  finally{setBusy(false);}
 }
 const ready=!!overview&&ack&&confirmName===overview.name&&(deleteMode||chosen.length>0);
 return <section aria-label="Vùng quản trị dữ liệu nguy hiểm" className="overflow-hidden rounded-2xl border border-[#e7c7c4] bg-white shadow-sm">
  <div className="border-b border-[#f2dedd] bg-[#fff7f5] px-5 py-5 sm:px-6">
   <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-3">
     <span className="rounded-xl bg-[#ffe7e2] p-2.5 text-[#a93636]"><ShieldAlert size={21}/></span>
     <div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#af5350]">CHỈ DÀNH CHO SUPER ADMIN</p>
      <h2 className="mt-1 text-[20px] font-extrabold text-[#612e32]">Reset dữ liệu / Xóa Đại hội</h2>
      <p className="mt-1 max-w-[670px] text-[12px] leading-6 text-[#8d6263]">Chọn chính xác nhóm dữ liệu cần xóa hoặc xóa hẳn Đại hội. Các Đại hội khác và thư viện mẫu sơ đồ dùng chung không bị ảnh hưởng.</p>
     </div>
    </div>
    <button type="button" onClick={()=>void load()} disabled={loading||busy}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#eccdc9] bg-white px-3 text-[12px] font-bold text-[#834c48] disabled:opacity-50">
     <RefreshCw size={15} className={loading?"animate-spin":""}/> Kiểm tra dữ liệu
    </button>
   </div>
  </div>
  <div className="space-y-5 px-5 py-5 sm:px-6">
   {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-800">{error}</p>}
   {success&&<p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] font-semibold text-emerald-800"><CheckCircle2 size={17}/>{success}</p>}
   {loading&&<p className="text-[12px] text-[#7f8d9c]">Đang kiểm tra dữ liệu thực tế từ Supabase...</p>}
   {overview&&<>
    <div className="rounded-xl border border-[#dbe6eb] bg-[#f6f9fb] p-4">
     <p className="flex items-center gap-2 text-[13px] font-extrabold text-[#365268]"><Database size={17}/> Kiểm tra liên kết dữ liệu</p>
     {overview.warnings.length?<div className="mt-2 space-y-1.5">
      {overview.warnings.map(message=><p key={message} className="flex gap-2 text-[12px] leading-5 text-[#a56527]"><AlertTriangle size={14} className="mt-0.5 shrink-0"/>{message}</p>)}
     </div>:<p className="mt-2 text-[12px] text-[#39765f]">Không phát hiện phiên chưa có sơ đồ hoặc liên kết bất thường trong phạm vi kiểm tra.</p>}
     {overview.sessions.length>0&&<div className="mt-3 space-y-1.5">
      {overview.sessions.map(session=><div key={session.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-[#e5ebef] bg-white p-2.5 text-[11px]">
       <span className="font-bold text-[#435a6b]">{session.name}</span>
       <span className={session.layoutTitle?"text-[#4d7487]":"font-semibold text-[#b36d3f]"}>
        {session.layoutTitle||"Chưa có sơ đồ"} · {session.assigned} phân ghế
       </span>
      </div>)}
     </div>}
     {overview.warnings.length>0&&<Link href={"/congresses/"+id+"/seating"} className="mt-3 inline-block text-[12px] font-bold text-[#1477a4] underline underline-offset-2">Đến sơ đồ ghế để đồng bộ phiên →</Link>}
    </div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn chế độ xử lý">
     <button type="button" aria-pressed={!deleteMode} disabled={busy} onClick={()=>{setDeleteMode(false);setAck(false);setConfirmName("");}}
      className={"min-h-11 rounded-lg border px-4 text-[12px] font-extrabold "+(!deleteMode?"border-[#1d718b] bg-[#e9f5f9] text-[#176b84]":"border-[#d7e2e6] text-[#667b88]")}>Reset phần được chọn</button>
     <button type="button" aria-pressed={deleteMode} disabled={busy} onClick={()=>{setDeleteMode(true);setAck(false);setConfirmName("");}}
      className={"min-h-11 rounded-lg border px-4 text-[12px] font-extrabold "+(deleteMode?"border-[#bb4343] bg-[#fff0ed] text-[#a52e2e]":"border-[#ebcccc] text-[#a96060]")}>Xóa cả Đại hội</button>
    </div>
    {deleteMode?<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] leading-6 text-[#9a3b3b]">
     <strong>Xóa toàn bộ Đại hội:</strong> Xóa Đại hội, tài khoản BTC gắn Đại hội, đại biểu, BCH, phiên, tài liệu, sơ đồ, điểm danh và dữ liệu liên quan trong cơ sở dữ liệu. Các tài khoản Auth chỉ bị xóa nếu không còn được dùng tại Đại hội khác. File gốc lưu ở Google Drive vẫn còn.
    </div>:<div className="grid gap-2 sm:grid-cols-2">
     {groups.map(item=><label key={item.key} className={"flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition "+(chosen.includes(item.key)?"border-[#dba7a0] bg-[#fff6f4]":"border-[#e4e9ed] bg-white")}>
      <input type="checkbox" checked={chosen.includes(item.key)} disabled={busy}
       onChange={()=>toggle(item.key)} className="mt-1 h-4 w-4 accent-[#b74747]"/>
      <span className="min-w-0"><span className="block text-[13px] font-extrabold text-[#455a69]">{item.title} <span className="text-[#ae504e]">({overview.counts[item.key]})</span></span>
       <span className="mt-1 block text-[11px] leading-5 text-[#83939f]">{item.detail}</span></span>
     </label>)}
    </div>}
    <div className="space-y-3 rounded-xl border border-[#f0d2cb] bg-[#fffaf9] p-4">
     <p className="text-[12px] font-bold leading-6 text-[#8e4646]">Xác nhận hai bước trước khi {deleteMode?"xóa Đại hội":"reset dữ liệu"}:</p>
     <label className="block text-[12px] font-semibold text-[#5b6370]">Nhập chính xác tên Đại hội <span className="font-mono text-[#8d3b3b]">{name}</span>
      <input className="field mt-2 w-full" value={confirmName} onChange={e=>setConfirmName(e.target.value)} disabled={busy}
       autoComplete="off" spellCheck={false} placeholder="Nhập tên Đại hội để xác nhận"/>
     </label>
     <label className="flex items-start gap-2 text-[12px] leading-6 text-[#73494a]">
      <input type="checkbox" className="mt-1.5 h-4 w-4 accent-[#a63e3e]" checked={ack} disabled={busy}
       onChange={e=>setAck(e.target.checked)}/>
      Tôi hiểu thao tác sẽ xóa vĩnh viễn dữ liệu được chọn, không có nút hoàn tác và cần sao lưu trước.
     </label>
     <button type="button" onClick={()=>void submit()} disabled={!ready||busy}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#ad3c3c] px-5 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#d9b3b1]">
      <Trash2 size={17}/>{busy?"Đang xử lý...":deleteMode?"Xóa vĩnh viễn Đại hội":"Reset các mục đã chọn"}
     </button>
    </div>
   </>}
  </div>
 </section>;
}
