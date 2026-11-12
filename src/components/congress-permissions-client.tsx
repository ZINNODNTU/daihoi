"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Check,ChevronDown,KeyRound,RefreshCw,ShieldCheck,UsersRound,X} from "lucide-react";
import {canCongress,CONGRESS_ROLE_LABELS,type CongressAbility,type CongressRole} from "@/lib/congress-permissions";

type StaffRole="admin"|"checkin"|"secretary";
type StaffMember={userId:string;name:string;email:string;role:StaffRole;createdAt:string};
const staffRoles:readonly StaffRole[]=["admin","checkin","secretary"];
const roleDescriptions:Record<StaffRole,string>={
 admin:"Quản lý toàn bộ nghiệp vụ và phân quyền của Đại hội.",
 checkin:"Theo dõi sơ đồ, báo cáo và xác nhận điểm danh tại bàn BTC.",
 secretary:"Xem nhân sự BCH, tài liệu và báo cáo; không được sửa dữ liệu."
};
const capabilities:{id:CongressAbility;name:string;section:string}[]=[
 {id:"workspace.view",name:"Truy cập không gian Đại hội",section:"Nền tảng"},
 {id:"delegates.read",name:"Xem danh sách đại biểu",section:"Đại biểu"},
 {id:"delegates.write",name:"Chỉnh sửa hồ sơ đại biểu",section:"Đại biểu"},
 {id:"quality.read",name:"Xem phân tích chất lượng",section:"Đại biểu"},
 {id:"seating.read",name:"Xem sơ đồ ghế",section:"Chỗ ngồi"},
 {id:"seating.write",name:"Chỉnh sửa sơ đồ ghế",section:"Chỗ ngồi"},
 {id:"attendance.read",name:"Theo dõi điểm danh",section:"Điểm danh"},
 {id:"attendance.scan",name:"Quét và xác nhận điểm danh",section:"Điểm danh"},
 {id:"attendance.sessions",name:"Quản lý phiên điểm danh",section:"Điểm danh"},
 {id:"bch.read",name:"Xem nhân sự BCH",section:"Nhân sự BCH"},
 {id:"bch.write",name:"Chỉnh sửa nhân sự và số phiếu BCH",section:"Nhân sự BCH"},
 {id:"documents.read",name:"Xem tài liệu Đại hội",section:"Tài liệu"},
 {id:"documents.write",name:"Quản lý tài liệu",section:"Tài liệu"},
 {id:"reports.read",name:"Xem báo cáo Đại hội",section:"Báo cáo"},
 {id:"team.manage",name:"Cấp tài khoản và phân quyền BTC",section:"Quản trị"},
 {id:"settings.manage",name:"Thay đổi cấu hình Đại hội",section:"Quản trị"},
 {id:"system.logs",name:"Xem nhật ký hệ thống (quản trị nền tảng)",section:"Quản trị"}
];

export function CongressPermissionsClient({congressId}:{congressId:string}){
 const [members,setMembers]=useState<StaffMember[]>([]);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [nextRole,setNextRole]=useState<StaffRole>("secretary");
 const load=useCallback(async()=>{
  const res=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
   credentials:"same-origin",cache:"no-store"
  });
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Không tải được quyền tài khoản BTC.");
  setMembers((data.members||[]) as StaffMember[]);
 },[congressId]);
 useEffect(()=>{
  let alive=true;
  const init=async()=>{
   try{
    const res=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{credentials:"same-origin",cache:"no-store"});
    const data=await res.json();
    if(!alive)return;
    if(!res.ok)throw new Error(data.error||"Không tải được danh sách BTC.");
    setMembers(data.members||[]);
   }catch(e){if(alive)setError(e instanceof Error?e.message:"Lỗi tải phân quyền.");}
   finally{if(alive)setLoading(false);}
  };
  void init();
  return()=>{alive=false;};
 },[congressId]);
 async function refresh(){
  setLoading(true);setError("");
  try{await load();}catch(e){setError(e instanceof Error?e.message:"Không thể làm mới.");}
  finally{setLoading(false);}
 }
 async function change(member:StaffMember){
  if(busy||member.role===nextRole)return;
  if(!window.confirm("Cấp vai trò “"+CONGRESS_ROLE_LABELS[nextRole]+"” cho "+member.name+"? Quyền truy cập sẽ thay đổi ngay sau khi lưu."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/congress-members",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,userId:member.userId,role:nextRole})
   });
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không cập nhật được quyền BTC.");
   setEditing(null);
   setNotice("Đã lưu phân quyền cho "+member.name+". Quyền được thực thi ở máy chủ theo vai trò vừa cấp.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Không cập nhật được quyền.");}
  finally{setBusy(false);}
 }
 return <div className="mx-auto max-w-[1300px] space-y-6">
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce6ec] pb-5">
   <div>
    <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#45778e]">QUẢN TRỊ ĐẠI HỘI / PHÂN QUYỀN</p>
    <h1 className="mt-1 text-[clamp(24px,3vw,31px)] font-extrabold leading-snug text-[#1d364c]">Phân quyền Ban Tổ chức</h1>
    <p className="mt-2 max-w-[740px] text-[12px] leading-6 text-[#607a8e]">
     Quyền được cấp theo vai trò và chỉ có hiệu lực trong Đại hội này. Quản trị hệ thống không phải tài khoản BTC; tài khoản đại biểu không được cấp quyền quản trị.
    </p>
   </div>
   <div className="flex gap-2">
    <button type="button" onClick={()=>void refresh()} disabled={loading||busy}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d5e2e9] bg-white px-3 text-[12px] font-bold text-[#345b73] disabled:opacity-60">
     <RefreshCw size={16} className={loading?"animate-spin":""}/> Làm mới
    </button>
    <Link href={"/congresses/"+congressId+"/team"}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0d7198] px-3 text-[12px] font-bold text-white hover:bg-[#075a7c]">
     <UsersRound size={16}/> Tài khoản BTC <ArrowRight size={15}/>
    </Link>
   </div>
  </div>
  <section className="rounded-xl border border-[#dbe6ec] bg-white">
   <div className="border-b border-[#e6edf2] px-4 py-4 sm:px-5">
    <h2 className="flex items-center gap-2 text-[16px] font-bold text-[#203f54]"><ShieldCheck size={19}/> Quyền theo vai trò</h2>
    <p className="mt-1 text-[12px] leading-5 text-[#6b8495]">Dấu kiểm cho biết vai trò được phép làm gì. Đây là các nhóm quyền cố định, không phải công tắc cấp quyền tùy ý.</p>
   </div>
   <div className="grid gap-px bg-[#e6edf2] md:grid-cols-3">
    {staffRoles.map(role=><div key={role} className="bg-[#fbfdfe] px-4 py-4 sm:px-5">
     <p className="text-[13px] font-extrabold text-[#23465b]">{CONGRESS_ROLE_LABELS[role]}</p>
     <p className="mt-1 text-[11px] leading-5 text-[#6c8493]">{roleDescriptions[role]}</p>
     <p className="mt-3 text-[11px] font-semibold text-[#3a7190]">
      {capabilities.filter(row=>canCongress(role,row.id)).length} nhóm quyền
     </p>
    </div>)}
   </div>
   <div className="overflow-x-auto">
    <table className="w-full min-w-[610px] border-collapse text-left text-[12px]">
     <thead><tr className="bg-[#f4f7f9] text-[#42637a]">
      <th scope="col" className="px-4 py-3 font-bold sm:px-5">Chức năng</th>
      {staffRoles.map(role=><th scope="col" key={role} className="px-3 py-3 text-center font-bold">{CONGRESS_ROLE_LABELS[role]}</th>)}
     </tr></thead>
     <tbody>{capabilities.map((row,index)=><tr key={row.id} className={index%2?"bg-[#fbfdfe]":"bg-white"}>
      <th scope="row" className="border-t border-[#edf1f3] px-4 py-2.5 font-medium text-[#405f72] sm:px-5">
       <span className="mr-2 inline-block text-[10px] text-[#8a9eaa]">{row.section}</span>{row.name}
      </th>
      {staffRoles.map(role=><td key={role} className="border-t border-[#edf1f3] px-3 py-2.5 text-center">
       {canCongress(role as CongressRole,row.id)?<Check size={17} className="mx-auto text-[#16825a]" aria-label="Có quyền"/>:
        <span className="text-[#c0cbd3]" aria-label="Không có quyền">—</span>}
      </td>)}
     </tr>)}</tbody>
    </table>
   </div>
  </section>
  <section className="rounded-xl border border-[#dbe6ec] bg-white">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6edf2] px-4 py-4 sm:px-5">
    <div>
     <h2 className="text-[16px] font-bold text-[#203f54]">Gán vai trò cho tài khoản BTC</h2>
     <p className="mt-1 text-[12px] text-[#6b8495]">Chỉ tài khoản BTC đang hoạt động tại Đại hội này mới xuất hiện.</p>
    </div>
    <span className="rounded-full bg-[#eff5f8] px-3 py-1 text-[11px] font-bold text-[#47738a]">{members.length} tài khoản</span>
   </div>
   {error&&<p role="alert" className="m-4 rounded-lg border border-[#f1c6c6] bg-[#fff5f5] px-4 py-3 text-[12px] text-[#9b3434]">{error}</p>}
   {notice&&<p role="status" className="m-4 rounded-lg border border-[#bde6cb] bg-[#effaf2] px-4 py-3 text-[12px] text-[#216744]">{notice}</p>}
   {loading?<p className="px-5 py-8 text-[12px] text-[#688396]">Đang tải tài khoản BTC...</p>:
    members.length===0?<div className="px-5 py-8">
     <p className="text-[13px] font-semibold text-[#415d71]">Chưa có tài khoản BTC trong Đại hội.</p>
     <Link href={"/congresses/"+congressId+"/team"} className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-[#1372a2] hover:underline">Tạo tài khoản BTC <ArrowRight size={15}/></Link>
    </div>:<div className="divide-y divide-[#edf1f3]">
     {members.map(member=><div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div className="min-w-0 flex-1">
       <p className="break-words text-[13px] font-bold text-[#234359]">{member.name}</p>
       <p className="mt-1 break-all font-mono text-[11px] text-[#798e9e]">{member.email}</p>
       <p className="mt-1 text-[11px] font-semibold text-[#3f7794]">{CONGRESS_ROLE_LABELS[member.role]}</p>
      </div>
      {editing!==member.userId?<button type="button" disabled={busy} onClick={()=>{setEditing(member.userId);setNextRole(member.role);}}
       className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d1e2eb] bg-[#f8fbfd] px-3 text-[12px] font-bold text-[#386d88]">
       <KeyRound size={16}/> Đổi vai trò <ChevronDown size={15}/>
      </button>:<div className="flex flex-wrap items-center gap-2">
       <select aria-label={"Vai trò mới cho "+member.name} value={nextRole} disabled={busy}
        onChange={e=>setNextRole(e.target.value as StaffRole)}
        className="min-h-11 rounded-lg border border-[#cbdee8] bg-white px-2 text-[12px] text-[#294e64]">
        {staffRoles.map(role=><option key={role} value={role}>{CONGRESS_ROLE_LABELS[role]}</option>)}
       </select>
       <button type="button" disabled={busy||nextRole===member.role} onClick={()=>void change(member)}
        className="min-h-11 rounded-lg bg-[#146d99] px-3 text-[12px] font-bold text-white disabled:opacity-50">Lưu quyền</button>
       <button type="button" onClick={()=>setEditing(null)} disabled={busy}
        aria-label="Hủy sửa phân quyền" className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#d5e2e9] text-[#56768b]"><X size={17}/></button>
      </div>}
     </div>)}
    </div>}
  </section>
  <p className="text-[11px] leading-5 text-[#77909f]">Tất cả thay đổi quyền được kiểm tra ở máy chủ theo tài khoản hiện tại và Đại hội được chọn; việc đổi vai trò được ghi nhận vào nhật ký.</p>
 </div>;
}
