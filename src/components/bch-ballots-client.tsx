"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {
 ArrowLeft,CheckCircle2,ClipboardCheck,Download,FileCheck2,
 LockKeyhole,RefreshCw,Search,ShieldCheck,UsersRound
} from "lucide-react";
import {BchBallotEditor} from "@/components/bch-ballot-editor";
import {BchNewCommitteeLaunch} from "@/components/bch-new-committee-launch";
import {ballotPercentage,formatBallotPercentage,sortBchBallotsByPercentage,type BchBallotCandidate} from "@/lib/bch-candidates";

type Props={
 congressId:string;congressName:string;congressCode:string;
 initialCandidates:BchBallotCandidate[];totalBallots:number|null;
 canWrite:boolean;canViewBch:boolean;initialError:string;
};
const number=(value:number)=>value.toLocaleString("vi-VN");

export function BchBallotsClient({congressId,congressName,congressCode,
 initialCandidates,totalBallots,canWrite,canViewBch,initialError}:Props){
 const [candidates,setCandidates]=useState(initialCandidates);
 const [total,setTotal]=useState<number|null>(totalBallots);
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<"all"|"entered"|"pending">("all");
 const [sortMode,setSortMode]=useState<"votes_desc"|"manual">("votes_desc");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(initialError);
 const [notice,setNotice]=useState("");
 const recorded=candidates.filter(c=>c.votes_received!==null&&c.votes_received!==undefined).length;
 const pending=candidates.length-recorded;
 const visible=useMemo(()=>{
  const filtered=candidates.filter(c=>
  c.full_name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))&&
  (filter==="all"||filter==="entered"&&c.votes_received!==null||
   filter==="pending"&&c.votes_received===null)
 );
  return sortMode==="votes_desc"?sortBchBallotsByPercentage(filtered,total):filtered;
 },[candidates,search,filter,sortMode,total]);
 async function refresh(){
  if(busy)return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/bch-candidates/ballots?"+new URLSearchParams({congressId}),{
    credentials:"same-origin",cache:"no-store"
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Không tải lại được sổ kiểm phiếu.");
   setCandidates(body.candidates||[]);
   setTotal(body.total_ballots??null);
   setNotice("Dữ liệu đã được cập nhật từ máy chủ.");
  }catch(e){setError(e instanceof Error?e.message:"Không thể đồng bộ dữ liệu.");}
  finally{setBusy(false);}
 }
 async function exportExcel(){
  if(busy)return;
  setError("");setBusy(true);
  try{
   const {default:writeExcelFile}=await import("write-excel-file/browser");
   const rows:(string|number)[][]=[
    ["STT","Họ tên ứng viên BCH","Số phiếu đạt","Tổng số phiếu chung","Tỷ lệ (%)"],
    ...sortBchBallotsByPercentage(candidates,total).map((c,i)=>[
     i+1,c.full_name,c.votes_received??"",total??"",
     ballotPercentage(c.votes_received,total)===null?"":Number(ballotPercentage(c.votes_received,total)!.toFixed(2))
    ])
   ];
   await writeExcelFile([{sheet:"Kiem phieu BCH",stickyRowsCount:1,data:rows}])
    .toFile("kiem-phieu-BCH-"+congressCode.replace(/[^A-Za-z0-9_-]/g,"-")+".xlsx");
  }catch{setError("Không xuất được bảng kiểm phiếu Excel.");}
  finally{setBusy(false);}
 }
 const completed=total!==null&&candidates.length>0&&pending===0;
 return <div className="mx-auto max-w-[1320px] space-y-5 pb-8">
  <header className="overflow-hidden rounded-2xl border border-[#d7e6ee] bg-white">
   <div className="border-b border-[#e2ebf1] bg-[linear-gradient(115deg,#eff7fa_0%,#ffffff_65%,#fff8e9_100%)] px-5 py-6 sm:px-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
     <div className="min-w-0">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#286f90]">
       <ClipboardCheck size={17}/> ĐẠI HỘI ĐOÀN · NGHIỆP VỤ KIỂM PHIẾU
      </p>
      <h1 className="mt-2 text-[clamp(25px,3vw,36px)] font-extrabold tracking-[-.035em] text-[#193e55]">
       Sổ kiểm phiếu Ban Chấp hành
      </h1>
      <p className="mt-2 text-[13px] font-medium leading-6 text-[#55778a]">{congressName}</p>
      <p className="mt-1 max-w-[840px] text-[12px] leading-5 text-[#708899]">
       Ghi nhận kết quả từ biên bản kiểm phiếu thực tế. Đây là phân hệ nghiệp vụ độc lập,
       tách biệt với danh sách nhân sự và chức năng điểm danh đại biểu.
      </p>
     </div>
     <span className={"inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold "+(
      canWrite?"border-[#bbdfd5] bg-[#ebfaf4] text-[#1d7858]":"border-[#d9e3eb] bg-[#f4f8fa] text-[#587485]")}>
      {canWrite?<ShieldCheck size={15}/>:<LockKeyhole size={15}/>}
      {canWrite?"Được phép nhập kiểm phiếu":"Chế độ chỉ xem"}
     </span>
    </div>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7">
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#627f90]">
     <span className="inline-flex items-center gap-1.5"><FileCheck2 size={15}/> Tổng phiếu áp dụng chung cho mọi ứng viên</span>
     <span className="hidden h-3 w-px bg-[#d0dfe7] sm:block"/>
     <span>Dữ liệu nội bộ, không công bố tự động</span>
    </div>
    <div className="flex flex-wrap items-center gap-2">
     {canViewBch&&<Link href={"/congresses/"+congressId+"/bch-candidates"}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d5e3eb] bg-white px-3 text-[12px] font-semibold text-[#497084] hover:bg-[#f5f9fa]">
      <ArrowLeft size={15}/> Nhân sự BCH
     </Link>}
     <button type="button" onClick={()=>void refresh()} disabled={busy}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d5e3eb] bg-white px-3 text-[12px] font-semibold text-[#497084] disabled:opacity-50">
      <RefreshCw size={15} className={busy?"animate-spin":""}/> Làm mới
     </button>
     <button type="button" onClick={()=>void exportExcel()} disabled={busy||candidates.length===0}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#155f81] px-3 text-[12px] font-bold text-white disabled:opacity-50">
      <Download size={15}/> Xuất Excel
     </button>
    </div>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-[#f0d2c8] bg-[#fff7f3] p-4 text-[13px] font-semibold text-[#a24e3b]">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-[#cce7d8] bg-[#eff9f4] p-3 text-[12px] text-[#26734c]">{notice}</p>}
  <section aria-label="Tổng quan kiểm phiếu" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[
    {label:"Tổng số phiếu chung",value:total===null?"Chưa nhập":number(total),detail:"Một giá trị cho cả danh sách",icon:ClipboardCheck},
    {label:"Ứng viên BCH",value:number(candidates.length),detail:"Trong danh sách kiểm phiếu",icon:UsersRound},
    {label:"Đã nhập phiếu",value:number(recorded),detail:"Ứng viên đã có kết quả",icon:CheckCircle2},
    {label:"Còn thiếu kết quả",value:number(pending),detail:completed?"Đã hoàn tất nhập liệu":"Cần đối chiếu biên bản",icon:FileCheck2}
   ].map(({label,value,detail,icon:Icon})=><div key={label} className="rounded-xl border border-[#dae7ed] bg-white px-4 py-4">
    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#738ea0]"><Icon size={14}/>{label}</p>
    <p className="mt-3 text-[clamp(21px,2.6vw,30px)] font-extrabold tracking-tight text-[#1f5771]">{value}</p>
    <p className="mt-1 text-[11px] leading-4 text-[#8093a0]">{detail}</p>
   </div>)}
  </section>
  <section className="rounded-xl border border-[#dbe8ef] bg-white p-4 sm:p-5">
   <div className="grid gap-3 text-[12px] sm:grid-cols-3">
    {[
     {number:"01",title:"Nhập tổng phiếu",detail:"Chỉ nhập một lần cho Đại hội."},
     {number:"02",title:"Ghi thuận hoặc ngược",detail:"Phiếu ngược tự lấy tổng trừ số phiếu nhập."},
     {number:"03",title:"Xếp hạng và ra mắt",detail:"Lấy đúng N người theo tỷ lệ phiếu cao nhất."}
    ].map(step=><div key={step.number} className="flex items-start gap-3">
     <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ecf5f8] text-[12px] font-extrabold text-[#227c9f]">{step.number}</span>
     <div><p className="font-bold text-[#28546b]">{step.title}</p><p className="mt-1 text-[11px] leading-4 text-[#798fa0]">{step.detail}</p></div>
    </div>)}
   </div>
  </section>
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8ed] bg-white px-4 py-3">
   <div className="flex gap-1 rounded-lg bg-[#f1f6f8] p-1">
    {([
     ["all","Tất cả"],["entered","Đã nhập"],["pending","Chưa nhập"]
    ] as const).map(([value,label])=><button key={value} type="button"
     aria-pressed={filter===value} onClick={()=>setFilter(value)}
     className={"min-h-9 rounded-md px-3 text-[11px] font-bold "+(
      filter===value?"bg-white text-[#176384] shadow-sm":"text-[#68849a] hover:text-[#315870]")}>
     {label}
    </button>)}
   </div>
   <label className="flex items-center gap-2 text-[11px] font-bold text-[#52788e]">
     Sắp xếp
     <select value={sortMode} onChange={e=>setSortMode(e.target.value as "votes_desc"|"manual")}
      aria-label="Sắp xếp ứng viên kiểm phiếu"
      className="field min-h-10 min-w-[160px] rounded-lg text-[12px]">
      <option value="votes_desc">Tỷ lệ phiếu cao nhất</option>
      <option value="manual">Thứ tự danh sách</option>
     </select>
    </label>
    <label className="relative w-full max-w-[320px]">
    <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[#8fa5b3]"/>
    <input className="field min-h-10 w-full !pl-9" value={search}
     onChange={e=>setSearch(e.target.value)}
     placeholder="Tìm ứng viên theo họ tên" aria-label="Tìm ứng viên kiểm phiếu"/>
   </label>
  </div>
  {canWrite?<BchBallotEditor key={total??"unset"} congressId={congressId} candidates={visible}
   ballotReady={!initialError} disabled={busy} total={total}
   onTotalSaved={value=>{setTotal(value);void refresh();}}
   onSaved={saved=>{
    setCandidates(previous=>previous.map(item=>item.id===saved.id?{...item,...saved}:item));
    setNotice(saved.votes_received==null?"Đã xóa kết quả phiếu của ứng viên.":
      "Đã lưu "+saved.votes_received.toLocaleString("vi-VN")+" phiếu đạt ("+
      formatBallotPercentage(saved.votes_received,total)+").");
   }}/>:<section className="overflow-hidden rounded-xl border border-[#dbe8ef] bg-white">
    <div className="border-b border-[#e4edf2] px-4 py-4 sm:px-5">
     <h2 className="text-[16px] font-bold text-[#27506b]">Bảng kết quả kiểm phiếu</h2>
     <p className="mt-1 text-[12px] text-[#738b9a]">Bạn có thể xem và xuất dữ liệu, nhưng không được chỉnh sửa số phiếu.</p>
    </div>
    <div className="overflow-x-auto">
     <table className="w-full min-w-[560px] text-left text-[12px]">
      <thead className="bg-[#f6f9fb] text-[#54768a]"><tr>
       <th className="px-4 py-3">Ứng viên</th><th className="px-4 py-3">Số phiếu đạt</th>
       <th className="px-4 py-3">Tổng phiếu chung</th><th className="px-4 py-3">Tỷ lệ (%)</th>
      </tr></thead>
      <tbody>{visible.map(item=><tr key={item.id} className="border-t border-[#eaf0f3]">
       <td className="px-4 py-3 font-bold text-[#244a60]">{item.full_name}</td>
       <td className="px-4 py-3 tabular-nums">{item.votes_received===null?"Chưa nhập":number(item.votes_received)}</td>
       <td className="px-4 py-3 tabular-nums">{total===null?"—":number(total)}</td>
       <td className="px-4 py-3 font-bold tabular-nums text-[#146587]">{formatBallotPercentage(item.votes_received,total)}</td>
      </tr>)}</tbody>
     </table>
     {!visible.length&&<p className="p-5 text-[12px] text-[#738e9d]">Không có ứng viên phù hợp với bộ lọc.</p>}
    </div>
   </section>}
  <BchNewCommitteeLaunch candidates={candidates} total={total}
    congressName={congressName} canViewBch={canViewBch}/>
   <p className="text-[11px] leading-6 text-[#7b919f]">
   Sổ kiểm phiếu chỉ ghi nhận kết quả từ biên bản thực tế; không phải hệ thống bỏ phiếu điện tử.
   Quyền xem và quyền ghi được quản lý riêng cho từng tài khoản BTC tại trang Phân quyền Đại hội.
  </p>
 </div>;
}
