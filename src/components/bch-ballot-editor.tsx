"use client";
import {useState,type FormEvent} from "react";
import {AlertCircle,CheckCircle2,ClipboardList,RotateCcw,Save} from "lucide-react";
import {ballotPercentage,formatBallotPercentage,validateBchVoteEntry,validateSharedBchTotal,
 type BchBallotCandidate,type BchVoteInputMode} from "@/lib/bch-candidates";

function VoteRow({item,congressId,total,disabled,onSaved}:{
 item:BchBallotCandidate;congressId:string;total:number|null;disabled:boolean;
 onSaved:(candidate:Partial<BchBallotCandidate>&{id:string})=>void;
}){
 const [mode,setMode]=useState<BchVoteInputMode>("favorable");
 const [draft,setDraft]=useState(item.votes_received==null?"":String(item.votes_received));
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 // Input mode is an editing interpretation, not another persisted election count.
 // Switching from 6 favorable of 10 to against displays 4, and vice versa.
 const old=item.votes_received==null?"":String(mode==="against"&&total!==null?
  total-item.votes_received:item.votes_received);
 const changed=draft!==old;
 const checked=validateBchVoteEntry(draft,total,mode);
 const percent=ballotPercentage(checked.votes,total);
 

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(disabled||busy||!changed||checked.error)return;
  if(draft===""&&old!==""&&!window.confirm("Xóa số phiếu đã ghi nhận của "+item.full_name+"?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/bch-candidates/ballots",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,id:item.id,vote_mode:mode,entered_votes:checked.entered,
     expectedUpdatedAt:item.updated_at})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Không lưu được số phiếu.");
   onSaved(data.candidate);
   setNotice("Đã lưu "+(checked.votes??"")+" phiếu đạt.");
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được số phiếu.");}
  finally{setBusy(false);}
 }
 return <form onSubmit={e=>void submit(e)}
  className="rounded-xl border border-[#e1eaf0] bg-white p-3.5 sm:p-4">
  <div className="grid items-end gap-3 sm:grid-cols-[minmax(150px,1fr)_130px_132px_122px_112px]">
   <div className="min-w-0 self-center">
    <p className="text-[13px] font-bold leading-5 text-[#264a60]">{item.full_name}</p>
    <p className="mt-1 text-[11px] text-[#70899a]">
     {item.votes_received==null?"Chưa nhập phiếu":
      "Đã lưu "+item.votes_received.toLocaleString("vi-VN")+" phiếu đạt"}
    </p>
   </div>
   <label className="block">
    <span className="text-[11px] font-semibold text-[#486c80]">Hình thức nhập</span>
    <select value={mode} disabled={disabled||busy||total===null}
     aria-label={"Hình thức nhập phiếu "+item.full_name}
     onChange={e=>{
      const next=e.target.value as BchVoteInputMode;
      setMode(next);
      setDraft(item.votes_received==null?"":String(next==="against"&&total!==null?
       total-item.votes_received:item.votes_received));
      setError("");setNotice("");
     }}
     className="field mt-1 min-h-11 w-full rounded-lg !px-2 text-[12px] font-semibold">
     <option value="favorable">Phiếu thuận</option>
     <option value="against">Phiếu ngược</option>
    </select>
   </label>
   <label className="block">
    <span className="text-[11px] font-semibold text-[#486c80]">
     {mode==="against"?"Số phiếu ngược":"Số phiếu thuận"}
    </span>
    <input type="number" inputMode="numeric" min={0} max={total??1000000} step={1}
     name="votes_received" aria-label={(mode==="against"?"Số phiếu ngược ":"Số phiếu thuận ")+item.full_name}
     disabled={disabled||busy||total===null}
     value={draft} onChange={e=>{setDraft(e.target.value);setError("");setNotice("");}}
     placeholder="Nhập số phiếu" className="field mt-1 min-h-11 w-full rounded-lg tabular-nums"/>
   </label>
   <div className="rounded-lg border border-[#deeaef] bg-[#f6fafc] px-3 py-2">
    <p className="text-[10px] text-[#6d8b9a]">Phiếu đạt / Tỷ lệ</p>
    <p aria-live="polite" className="mt-0.5 text-[12px] font-bold tabular-nums text-[#176a86]">
     {checked.votes===null?"—":checked.votes.toLocaleString("vi-VN")+" phiếu"}
    </p>
    <p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-[#176a86]">
     {percent===null?"—":formatBallotPercentage(checked.votes,total)}
    </p>
   </div>
   <button type="submit" disabled={disabled||busy||!changed||!!checked.error}
    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-[#117fa9] px-3 text-[12px] font-bold text-white disabled:bg-[#e4edf2] disabled:text-[#879aa6]">
    <Save size={16}/>{busy?"Đang lưu...":"Lưu phiếu"}
   </button>
  </div>
  {mode==="against"&&total!==null&&draft!==""&&!checked.error&&<p className="mt-2 text-[11px] font-medium text-[#3e718b]">
   Quy đổi: {total.toLocaleString("vi-VN")} tổng phiếu − {checked.entered?.toLocaleString("vi-VN")} phiếu ngược
   = <strong>{checked.votes?.toLocaleString("vi-VN")} phiếu đạt</strong>, sau đó mới tính tỷ lệ.
  </p>}
  {changed&&checked.error&&<p role="alert" className="mt-2 text-[11px] text-[#ab5b37]">{checked.error}</p>}
  {error&&<p role="alert" className="mt-2 text-[11px] text-[#a43e3e]">{error}</p>}
  {notice&&!changed&&<p role="status" className="mt-2 flex items-center gap-1 text-[11px] text-[#247750]">
   <CheckCircle2 size={14}/>{notice}
  </p>}
  {changed&&!busy&&<button type="button" onClick={()=>{setDraft(old);setError("");setNotice("");}}
   className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#587c91] hover:underline">
   <RotateCcw size={13}/> Hủy thay đổi
  </button>}
 </form>;
}

export function BchBallotEditor({congressId,candidates,ballotReady,disabled,total,onTotalSaved,onSaved}:{
 congressId:string;candidates:BchBallotCandidate[];ballotReady:boolean;disabled:boolean;
 total:number|null;onTotalSaved:(value:number|null)=>void;
 onSaved:(updated:Partial<BchBallotCandidate>&{id:string})=>void;
}){
 const [totalDraft,setTotalDraft]=useState(total===null?"":String(total));
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const checkedTotal=validateSharedBchTotal(totalDraft);
 const changed=totalDraft!==(total===null?"":String(total));
 const recorded=candidates.filter(c=>c.votes_received!==null&&c.votes_received!==undefined).length;
 async function saveTotal(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(disabled||saving||!changed||checkedTotal===undefined)return;
  if(checkedTotal===null&&total!==null&&!window.confirm("Xóa tổng số phiếu chung? Chỉ được xóa khi chưa có ứng viên nào đã nhập phiếu."))return;
  setSaving(true);setError("");setNotice("");
  try{
   const result=await fetch("/api/bch-candidates/ballots/total",{
    method:"PATCH",headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:JSON.stringify({congressId,total_ballots:checkedTotal})
   });
   const body=await result.json();
   if(!result.ok)throw Error(body.error||"Không lưu được tổng phiếu.");
   onTotalSaved(body.total_ballots);
   setNotice("Đã lưu tổng số phiếu chung cho toàn bộ ứng viên.");
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được tổng phiếu.");}
  finally{setSaving(false);}
 }
 return <section id="ket-qua-kiem-phieu-bch" aria-labelledby="bch-tally-heading"
  className="scroll-mt-24 overflow-hidden rounded-xl border border-[#d7e6ee] bg-white">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eef2] px-4 py-4 sm:px-5">
   <div>
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.11em] text-[#39809c]"><ClipboardList size={16}/> NHẬP KẾT QUẢ KIỂM PHIẾU · ĐẠI HỘI ĐOÀN</p>
    <h2 id="bch-tally-heading" className="mt-1 text-[19px] font-bold text-[#204356]">Kết quả kiểm phiếu BCH</h2>
    <p className="mt-1 text-[12px] leading-5 text-[#648093]">
     Tổng phiếu là <strong>một giá trị chung</strong>. Từng ứng viên chọn <strong>phiếu thuận</strong> hoặc
     <strong> phiếu ngược</strong>; hệ thống luôn lưu số phiếu đạt sau quy đổi.
    </p>
   </div>
   <span className="rounded-md bg-[#eff7f4] px-3 py-2 text-[12px] font-bold text-[#237450]">{recorded}/{candidates.length} đã nhập</span>
  </header>
  {!ballotReady?<p role="alert" className="m-4 rounded-lg bg-[#fff6e9] p-3 text-[12px] text-[#93652c]">Chưa kích hoạt được dữ liệu kiểm phiếu. Kiểm tra migration Supabase V47/V57/V58.</p>:
   <div className="space-y-4 p-4 sm:p-5">
    <form onSubmit={e=>void saveTotal(e)} className="rounded-lg border border-[#d1e3ec] bg-[#f1f7fa] p-4">
     <div className="flex flex-wrap items-end gap-3">
      <label className="block w-full max-w-[245px]"><span className="text-[12px] font-bold text-[#2c5971]">Tổng số phiếu chung <span className="text-[#b34747]">*</span></span>
       <input type="number" name="bch_total_ballots" min={1} max={1000000} step={1}
        value={totalDraft} disabled={disabled||saving}
        onChange={e=>{setTotalDraft(e.target.value);setError("");setNotice("");}}
        placeholder="Ví dụ: 190" className="field mt-2 min-h-11 w-full rounded-lg bg-white tabular-nums"/>
      </label>
      <button type="submit" disabled={disabled||saving||!changed||checkedTotal===undefined}
       className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#156b90] px-4 text-[12px] font-bold text-white disabled:bg-[#dbe7ed] disabled:text-[#8396a4]">
       <Save size={16}/>{saving?"Đang lưu...":"Lưu tổng phiếu"}
      </button>
      {total!==null&&<p className="self-center text-[12px] font-semibold text-[#387e6c]">Đang áp dụng: {total.toLocaleString("vi-VN")} phiếu</p>}
     </div>
     {changed&&checkedTotal===undefined&&<p role="alert" className="mt-2 text-[11px] text-[#ad5c3b]">Tổng phiếu phải là số nguyên từ 1 đến 1.000.000.</p>}
     {error&&<p role="alert" className="mt-2 flex items-center gap-1 text-[12px] text-[#ae4b3c]"><AlertCircle size={15}/>{error}</p>}
     {notice&&!changed&&<p role="status" className="mt-2 text-[12px] text-[#217b57]">{notice}</p>}
    </form>
    <div>
     <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-[14px] font-bold text-[#2a4c62]">Phiếu đạt của từng ứng viên</h3>
      {total===null&&<span className="text-[12px] text-[#9c6b30]">Hãy lưu tổng số phiếu chung trước</span>}
     </div>
     <div className="space-y-2.5">
      {candidates.length===0?<p className="rounded-lg bg-[#f8fafb] p-5 text-[12px] text-[#70889a]">Chưa có nhân sự BCH để nhập phiếu.</p>:
       candidates.map(item=><VoteRow key={item.id+"-"+item.updated_at} item={item}
        congressId={congressId} total={total} onSaved={onSaved} disabled={disabled||saving}/>)}
     </div>
    </div>
    <p className="text-[11px] leading-5 text-[#73899a]">
     Phiếu thuận: phiếu đạt = số nhập. Phiếu ngược: phiếu đạt = tổng phiếu chung − số nhập.
     Tỷ lệ (%) = phiếu đạt / tổng phiếu chung × 100. Chế độ nhập chỉ để quy đổi khi lưu;
     số phiếu đạt vẫn được bảo toàn nếu tải lại trang. Không sử dụng số lượt điểm danh QR để tính phiếu.
    </p>
   </div>}
 </section>;
}
