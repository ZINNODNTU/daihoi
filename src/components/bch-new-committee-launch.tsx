"use client";
import Image from "next/image";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowRight,Award,CheckCircle2,Presentation,ShieldAlert,X} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {formatBallotPercentage,selectNewBchMembers,type BchBallotCandidate} from "@/lib/bch-candidates";

const PAGE_SIZE=8;

function Portrait({candidate,allowPhoto}:{
 candidate:BchBallotCandidate;allowPhoto:boolean
}){
 const [failed,setFailed]=useState(false);
 return <div className="relative mx-auto flex h-[120px] w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-[#e8f1f8] shadow-[0_8px_25px_rgba(31,62,89,.15)] sm:h-[132px] sm:w-[106px]">
  {allowPhoto&&candidate.photo_path&&!failed?
   <Image unoptimized src={"/api/bch-candidates/"+candidate.id+"/photo?w=260&v="+encodeURIComponent(candidate.updated_at)}
    width={106} height={136} alt={"Ảnh "+candidate.full_name}
    className="h-full w-full object-cover" onError={()=>setFailed(true)}/>:
   <span className="text-[36px] font-extrabold text-[#6a8ba2]">
    {candidate.full_name.trim().split(/\s+/).slice(-1)[0]?.slice(0,1).toUpperCase()||"?"}
   </span>}
 </div>;
}

export function BchNewCommitteeLaunch({candidates,total,congressName,canViewBch}:{
 candidates:BchBallotCandidate[];total:number|null;congressName:string;canViewBch:boolean
}){
 const [countInput,setCountInput]=useState("");
 const [acknowledgedTie,setAcknowledgedTie]=useState(false);
 const [open,setOpen]=useState(false);
 const [page,setPage]=useState(0);
 const {members,cutoffTie,error}=selectNewBchMembers(candidates,total,countInput);
 const pages=Math.max(1,Math.ceil(members.length/PAGE_SIZE));
 const showModal=open&&!error&&(!cutoffTie||acknowledgedTie);
 const visible=members.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);
 useEffect(()=>{
  if(!showModal)return;
  const previous=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape")setOpen(false);
   if(event.key==="ArrowRight")setPage(i=>Math.min(pages-1,i+1));
   if(event.key==="ArrowLeft")setPage(i=>Math.max(0,i-1));
  };
  document.addEventListener("keydown",onKey);
  return()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",onKey);};
 },[showModal,pages]);
 function start(){
  if(error||cutoffTie&&!acknowledgedTie)return;
  setPage(0);setOpen(true);
 }
 return <section aria-labelledby="new-bch-title" className="overflow-hidden rounded-2xl border border-[#d5e5ed] bg-white">
  <div className="border-b border-[#e1edf2] bg-[linear-gradient(110deg,#eff7fb,#ffffff_70%,#fcf6e9)] px-4 py-5 sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#387d9b]">
      <Award size={16}/> TỔNG HỢP KẾT QUẢ BẦU CỬ
     </p>
     <h2 id="new-bch-title" className="mt-2 text-[22px] font-extrabold tracking-tight text-[#23475e]">
      Ra mắt Ban Chấp hành khóa mới
     </h2>
     <p className="mt-1 max-w-[720px] text-[12px] leading-5 text-[#668497]">
      Nhập số lượng cần ra mắt. Hệ thống xếp phiếu đạt và tỷ lệ % từ cao xuống thấp,
      chọn <strong>đúng số lượng đã nhập</strong> — không chọn thêm người khi đồng phiếu.
     </p>
    </div>
    <span className="rounded-full border border-[#d3e6ed] bg-white px-3 py-2 text-[12px] font-bold text-[#4d7891]">
     {members.length} / {candidates.length} ứng viên
    </span>
   </div>
  </div>
  <div className="space-y-4 p-4 sm:p-6">
   <div className="flex flex-wrap items-end gap-3">
    <label className="block w-full max-w-[245px]">
     <span className="text-[12px] font-bold text-[#355e74]">Số lượng ủy viên BCH khóa mới</span>
     <input type="number" min={1} max={candidates.length} step={1} inputMode="numeric"
      value={countInput} onChange={e=>{setCountInput(e.target.value);setAcknowledgedTie(false);setOpen(false);}}
      placeholder="Ví dụ: 15" className="field mt-2 min-h-12 w-full rounded-xl tabular-nums"
      aria-label="Số lượng ủy viên BCH khóa mới"/>
    </label>
    <button type="button" disabled={!!error||cutoffTie&&!acknowledgedTie}
     onClick={start}
     className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#176d90] px-5 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#dfe8ed] disabled:text-[#829aa9]">
     <Presentation size={18}/> Trình chiếu ra mắt {members.length||""} ủy viên
    </button>
   </div>
   {error&&<p role="status" className="rounded-lg bg-[#f7fafb] px-3 py-2 text-[12px] leading-5 text-[#728b9c]">{error}</p>}
   {cutoffTie&&!error&&<div className="rounded-xl border border-[#ecd8b8] bg-[#fff8e9] p-4">
    <p className="flex items-start gap-2 text-[12px] font-bold leading-5 text-[#885e26]">
     <ShieldAlert size={17} className="shrink-0"/>
     Có ứng viên đồng số phiếu tại vị trí cuối cùng được chọn và vị trí đầu tiên không được chọn.
    </p>
    <p className="mt-1 text-[11px] leading-5 text-[#927344]">
     Để bảo đảm đúng số lượng, hệ thống sắp theo thứ tự hồ sơ hiện có khi bằng phiếu.
     BTC phải đối chiếu biên bản và quy định xử lý đồng phiếu trước khi công bố chính thức.
    </p>
    <label className="mt-3 flex cursor-pointer items-start gap-2 text-[12px] font-semibold text-[#755626]">
     <input type="checkbox" className="mt-0.5 h-4 w-4"
      checked={acknowledgedTie} onChange={e=>setAcknowledgedTie(e.target.checked)}/>
     Tôi đã đối chiếu biên bản và chấp nhận danh sách đúng số lượng hiển thị.
    </label>
   </div>}
   {!error&&members.length>0&&<>
    <div className="flex flex-wrap items-center justify-between gap-2">
     <p className="text-[13px] font-bold text-[#315a70]">Danh sách theo tỷ lệ phiếu cao nhất</p>
     <span className="text-[11px] text-[#7991a0]">Xếp hạng theo phiếu thực, không làm tròn trước khi so sánh</span>
    </div>
    <div className="overflow-x-auto rounded-xl border border-[#e1eaf0]">
     <table className="w-full min-w-[460px] text-left text-[12px]">
      <thead className="bg-[#f3f8fb] font-bold text-[#55788d]"><tr>
       <th className="px-3 py-3">Thứ hạng</th>
       <th className="px-3 py-3">Họ tên</th>
       <th className="px-3 py-3 text-right">Phiếu đạt</th>
       <th className="px-3 py-3 text-right">Tỷ lệ</th>
      </tr></thead>
      <tbody>{members.map((candidate,i)=><tr key={candidate.id} className="border-t border-[#edf2f5]">
       <td className="px-3 py-3 font-extrabold text-[#24718f]">{i+1}</td>
       <td className="px-3 py-3 font-semibold text-[#325469]">{candidate.full_name}</td>
       <td className="px-3 py-3 text-right tabular-nums">{candidate.votes_received?.toLocaleString("vi-VN")}</td>
       <td className="px-3 py-3 text-right font-extrabold tabular-nums text-[#126e8d]">
        {formatBallotPercentage(candidate.votes_received,total)}
       </td>
      </tr>)}</tbody>
     </table>
    </div>
   </>}
   <p className="text-[11px] leading-5 text-[#8395a1]">
    Danh sách ra mắt là đề xuất xếp hạng tự động từ phiếu đã lưu, không tự thay thế biên bản,
    kết luận về điều kiện trúng cử hoặc quyết định công nhận BCH mới.
   </p>
  </div>
  {showModal&&<div role="dialog" aria-modal="true" aria-label="Ra mắt Ban Chấp hành khóa mới"
    className="fixed inset-0 z-[110] flex h-dvh flex-col overflow-hidden bg-[#f0f5f9] text-[#233e53]">
   <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#d7e6ed] bg-white px-4 py-3 shadow-sm sm:px-8">
    <div className="flex min-w-0 items-center gap-3">
     <BrandMark kind="doan" className="!h-12 !w-12 !shrink-0 !rounded-xl"/>
     <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#367e9d]">ĐẠI HỘI ĐOÀN · CÔNG BỐ DANH SÁCH</p>
      <h2 className="truncate text-[18px] font-extrabold sm:text-[24px]">Ban Chấp hành khóa mới · {members.length} ủy viên</h2>
      <p className="max-w-[75vw] truncate text-[11px] text-[#718a99]">{congressName}</p>
     </div>
    </div>
    <button type="button" onClick={()=>setOpen(false)} aria-label="Thoát trình chiếu"
     className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cadae4] bg-[#f7fafc] px-4 text-[12px] font-bold text-[#3c667f]">
     <X size={18}/> Thoát trình chiếu
    </button>
   </header>
   <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-8 sm:py-7">
    <div className="mx-auto max-w-[1450px]">
     <div className="mb-5 text-center">
      <p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#4187a4]">CHÀO MỪNG</p>
      <h3 className="mt-1 text-[clamp(24px,3vw,38px)] font-extrabold leading-[1.25] text-[#213d55]">
       Ban Chấp hành Đoàn khóa mới
      </h3>
      <p className="mt-2 text-[12px] font-medium text-[#7290a2]">
       {members.length} nhân sự có tỷ lệ phiếu cao nhất · Trang {page+1}/{pages}
      </p>
     </div>
     <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
      {visible.map((candidate,index)=><article key={candidate.id}
       className="flex min-w-0 flex-col items-center rounded-2xl border border-[#d9e7ee] bg-white px-3 py-5 text-center shadow-sm sm:px-5">
       <div className="mb-3 rounded-full bg-[#e9f4f9] px-3 py-1 text-[10px] font-extrabold text-[#237999]">
        HẠNG {page*PAGE_SIZE+index+1}
       </div>
       <Portrait candidate={candidate} allowPhoto={canViewBch}/>
       <h4 className="mt-3 break-words text-[clamp(12px,1.6vw,18px)] font-extrabold leading-snug text-[#25445b]">
        {candidate.full_name}
       </h4>
       {candidate.current_position&&<p className="mt-1 line-clamp-2 text-[11px] text-[#7b8e9a]">
        {candidate.current_position}
       </p>}
       <p className="mt-auto pt-3 text-[14px] font-extrabold tabular-nums text-[#187596]">
        {formatBallotPercentage(candidate.votes_received,total)}
       </p>
       <p className="mt-1 text-[11px] text-[#8296a4]">
        {candidate.votes_received?.toLocaleString("vi-VN")} phiếu đạt
       </p>
      </article>)}
     </div>
    </div>
   </div>
   <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#d7e5ed] bg-white px-4 py-3 sm:px-8">
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#6b8799]">
     <CheckCircle2 size={15} className="text-[#277c88]"/> Đã chọn đúng {members.length} người
    </span>
    <nav className="flex gap-2" aria-label="Điều hướng trang ra mắt BCH">
     <button type="button" disabled={page===0} onClick={()=>setPage(v=>Math.max(0,v-1))}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#ccdde6] px-3 text-[12px] font-bold disabled:opacity-40">
      <ArrowLeft size={16}/> Trước
     </button>
     <button type="button" disabled={page>=pages-1} onClick={()=>setPage(v=>Math.min(pages-1,v+1))}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#196b8c] px-4 text-[12px] font-bold text-white disabled:opacity-40">
      Tiếp <ArrowRight size={16}/>
     </button>
    </nav>
   </footer>
  </div>}
 </section>;
}
