"use client";

import {useState,type FormEvent} from "react";
import {CheckCircle2,ClipboardList,Save,AlertCircle,RotateCcw} from "lucide-react";
import {ballotPercentage,formatBallotPercentage,validateManualBchBallots,
 type BchCandidate} from "@/lib/bch-candidates";

type Draft={votes_received:string;total_ballots:string};
const draftOf=(item:BchCandidate):Draft=>({
 votes_received:item.votes_received==null?"":String(item.votes_received),
 total_ballots:item.total_ballots==null?"":String(item.total_ballots)
});

function BallotRow({item,congressId,onSaved,disabled}:{
 item:BchCandidate;congressId:string;onSaved:(updated:Partial<BchCandidate>&{id:string})=>void;
 disabled:boolean
}){
 const [draft,setDraft]=useState<Draft>(()=>draftOf(item));
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState("");
 const changed=draft.votes_received!==draftOf(item).votes_received||
  draft.total_ballots!==draftOf(item).total_ballots;
 const checked=validateManualBchBallots(draft);
 const count=checked.data?.votes_received,denominator=checked.data?.total_ballots;
 const percentage=ballotPercentage(count,denominator);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(disabled||saving||!changed||!checked.data)return;
  if(checked.data.votes_received===null&&item.votes_received!==null&&
   !window.confirm("Xóa số phiếu đã lưu của "+item.full_name+"? Thao tác này sẽ xóa kết quả kiểm phiếu của riêng nhân sự này."))return;
  setSaving(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/bch-candidates/ballots",{
    method:"PATCH",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,id:item.id,expectedUpdatedAt:item.updated_at,...checked.data})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không lưu được số phiếu.");
   onSaved(result.candidate as Partial<BchCandidate>&{id:string});
   setSuccess(checked.data.votes_received===null?"Đã bỏ kết quả kiểm phiếu.":"Đã lưu kết quả.");
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được kết quả.");}
  finally{setSaving(false);}
 }
 return <form onSubmit={e=>void save(e)}
  className="rounded-lg border border-[#e1eaf0] bg-[#fbfdfe] px-4 py-4">
  <div className="grid gap-3 lg:grid-cols-[minmax(145px,1fr)_minmax(125px,155px)_minmax(125px,155px)_minmax(100px,125px)_minmax(100px,120px)] lg:items-end">
   <div className="min-w-0 self-center">
    <p className="break-words text-[13px] font-bold text-[#20445a]">{item.full_name}</p>
    <p className="mt-1 text-[11px] leading-5 text-[#738a9b]">
     {item.votes_received===null||item.votes_received===undefined?"Chưa nhập kết quả":"Đã lưu "+formatBallotPercentage(item.votes_received,item.total_ballots)}
    </p>
   </div>
   <label className="block">
    <span className="text-[11px] font-semibold text-[#4f7184]">Số phiếu đạt</span>
    <input type="number" inputMode="numeric" min={0} max={1000000} step={1}
     name="votes_received" disabled={disabled||saving}
     aria-label={"Số phiếu đạt của "+item.full_name}
     className="field mt-1 !min-h-11 w-full !rounded-lg font-semibold tabular-nums"
     placeholder="Ví dụ: 175" value={draft.votes_received}
     onChange={e=>{setDraft(prev=>({...prev,votes_received:e.target.value}));setError("");setSuccess("");}}/>
   </label>
   <label className="block">
    <span className="text-[11px] font-semibold text-[#4f7184]">Tổng số phiếu</span>
    <input type="number" inputMode="numeric" min={1} max={1000000} step={1}
     name="total_ballots" disabled={disabled||saving}
     aria-label={"Tổng phiếu kiểm phiếu của "+item.full_name}
     className="field mt-1 !min-h-11 w-full !rounded-lg font-semibold tabular-nums"
     placeholder="Ví dụ: 190" value={draft.total_ballots}
     onChange={e=>{setDraft(prev=>({...prev,total_ballots:e.target.value}));setError("");setSuccess("");}}/>
   </label>
   <div className="rounded-lg border border-[#dce9ef] bg-white px-3 py-2 lg:min-h-11">
    <span className="block text-[10px] font-medium text-[#8095a3]">Tỷ lệ tự tính</span>
    <strong aria-live="polite" className={"mt-0.5 block text-[17px] font-bold tabular-nums "+
     (percentage===null?"text-[#94a6b2]":"text-[#136d8b]")}>
     {percentage===null?"—":formatBallotPercentage(count,denominator)}
    </strong>
   </div>
   <button type="submit" disabled={disabled||saving||!changed||!checked.data}
    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#087eaa] px-3 text-[12px] font-bold text-white hover:bg-[#07698f] disabled:cursor-not-allowed disabled:bg-[#e7eef2] disabled:text-[#8799a6]">
    <Save size={16}/>{saving?"Đang lưu...":"Lưu phiếu"}
   </button>
  </div>
  {changed&&checked.error&&<p role="alert" className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-[#a14936]">
   <AlertCircle size={15} className="mt-0.5 shrink-0"/>{checked.error}
  </p>}
  {error&&<p role="alert" className="mt-2 flex items-start gap-2 text-[11px] leading-5 text-[#a14936]">
   <AlertCircle size={15} className="mt-0.5 shrink-0"/>{error}
  </p>}
  {success&&!changed&&<p role="status" className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#227d57]">
   <CheckCircle2 size={15}/>{success}
  </p>}
  {changed&&<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
   <span className="text-[11px] font-medium text-[#87652e]">Có thay đổi chưa lưu</span>
   <button type="button" disabled={saving||disabled} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#527b94] hover:underline"
    onClick={()=>{setDraft(draftOf(item));setError("");setSuccess("");}}>
    <RotateCcw size={13}/> Hoàn tác
   </button>
  </div>}
 </form>;
}

/** This section is separate from personnel editing to avoid accidentally replacing a tally. */
export function BchBallotEditor({congressId,candidates,ballotReady,disabled,onSaved}:{
 congressId:string;candidates:BchCandidate[];ballotReady:boolean;disabled:boolean;
 onSaved:(item:Partial<BchCandidate>&{id:string})=>void;
}){
 const recorded=candidates.filter(item=>ballotPercentage(item.votes_received,item.total_ballots)!==null).length;
 return <section id="ket-qua-kiem-phieu-bch" aria-labelledby="bch-ballot-heading"
  className="scroll-mt-24 overflow-hidden rounded-xl border border-[#d6e4ec] bg-white">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6edf2] px-4 py-4 sm:px-5">
   <div>
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.09em] text-[#367791]">
     <ClipboardList size={16}/> NGHIỆP VỤ BCH · NHẬP TAY
    </p>
    <h2 id="bch-ballot-heading" className="mt-1 text-[18px] font-bold text-[#1b4258]">Kết quả kiểm phiếu BCH</h2>
    <p className="mt-1 text-[12px] leading-5 text-[#698495]">
     Nhập theo biên bản kiểm phiếu chính thức; tỷ lệ = số phiếu đạt / tổng số phiếu × 100.
     Mỗi nhân sự có nút lưu riêng.
    </p>
   </div>
   <span className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#cfe5dc] bg-[#f0f9f4] px-3 text-[12px] font-bold text-[#236f51]">
    <CheckCircle2 size={16}/>{recorded}/{candidates.length} đã nhập
   </span>
  </div>
  <div className="space-y-3 p-3 sm:p-4">
   {!ballotReady?<p role="status" className="rounded-lg border border-[#ecd6ad] bg-[#fff9ed] px-4 py-3 text-[12px] leading-6 text-[#926522]">
    Chức năng kiểm phiếu chưa sẵn sàng trên cơ sở dữ liệu. Vui lòng kiểm tra Supabase V47.
   </p>:candidates.length===0?<p className="px-3 py-6 text-center text-[13px] text-[#728a9a]">
    Chưa có nhân sự BCH. Hãy thêm nhân sự trước khi nhập kết quả.
   </p>:candidates.map(item=><BallotRow key={item.id+"-"+item.updated_at} item={item} congressId={congressId}
    onSaved={onSaved} disabled={disabled}/>)}
   <p className="rounded-lg bg-[#f5f8fa] px-4 py-3 text-[11px] leading-5 text-[#667f90]">
    Số phiếu không được tính từ điểm danh QR. Kết quả ở đây phục vụ BTC đối chiếu, không tự xác định trúng cử và không công bố cho tài khoản đại biểu.
   </p>
  </div>
 </section>;
}
