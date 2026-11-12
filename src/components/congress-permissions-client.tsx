"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Check,ChevronDown,KeyRound,RefreshCw,Save,UsersRound,X} from "lucide-react";
import {ACCOUNT_PERMISSION_CAPABILITIES,canCongress,CONGRESS_ROLE_LABELS,
 type AccountPermissionAbility} from "@/lib/congress-permissions";
type StaffRole="admin"|"checkin"|"secretary";
type StaffMember={userId:string;name:string;email:string;role:StaffRole;createdAt:string;deniedAbilities:string[]};
const staffRoles:StaffRole[]=["admin","checkin","secretary"];
const names:Record<AccountPermissionAbility,string>={
 "workspace.view":"Truy cập không gian Đại hội",
 "delegates.read":"Xem danh sách đại biểu",
 "delegates.write":"Thêm/sửa hồ sơ đại biểu",
 "quality.read":"Xem phân tích chất lượng",
 "seating.read":"Xem sơ đồ ghế",
 "seating.write":"Thiết lập và điều chỉnh sơ đồ ghế",
 "attendance.read":"Theo dõi điểm danh",
 "attendance.scan":"Quét và xác nhận điểm danh",
 "attendance.sessions":"Quản lý phiên điểm danh",
 "bch.read":"Xem nhân sự BCH",
 "bch.write":"Chỉnh sửa BCH và nhập kết quả kiểm phiếu",
 "documents.read":"Xem tài liệu Đại hội",
 "documents.write":"Thêm/sửa/xóa tài liệu",
 "reports.read":"Xem báo cáo Đại hội"
};
const sections:Record<string,string>={
 workspace:"Không gian làm việc",delegates:"Đại biểu",quality:"Đại biểu",
 seating:"Chỗ ngồi",attendance:"Điểm danh",bch:"Nhân sự BCH",
 documents:"Tài liệu",reports:"Báo cáo"
};
export function CongressPermissionsClient({congressId}:{congressId:string}){
 const [members,setMembers]=useState<StaffMember[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [editingRole,setEditingRole]=useState(false);
 const [roleDraft,setRoleDraft]=useState<StaffRole>("secretary");
 const load=useCallback(async()=>{
  const response=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
   credentials:"same-origin",cache:"no-store"
  });
  const data=await response.json();
  if(!response.ok)throw Error(data.error||"Không tải được tài khoản BTC.");
  setMembers(data.members||[]);
  setSelectedId(prev=>prev&&data.members.some((m:StaffMember)=>m.userId===prev)?prev:(data.members[0]?.userId||null));
 },[congressId]);
 useEffect(()=>{
  let alive=true;
  async function initial(){
   try{
    const response=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
     credentials:"same-origin",cache:"no-store"
    });
    const data=await response.json();
    if(!alive)return;
    if(!response.ok)throw Error(data.error||"Không đọc được danh sách BTC.");
    setMembers(data.members||[]);
    setSelectedId(data.members[0]?.userId||null);
   }catch(e){if(alive)setError(e instanceof Error?e.message:"Không tải được danh sách.");}
   finally{if(alive)setLoading(false);}
  }
  void initial();
  return()=>{alive=false;};
 },[congressId]);
 const selected=members.find(m=>m.userId===selectedId)||null;
 const permitted=selected?ACCOUNT_PERMISSION_CAPABILITIES.filter(a=>canCongress(selected.role,a)):[];
 const granted=selected?permitted.filter(a=>!selected.deniedAbilities.includes(a)).length:0;
 async function refresh(){
  setLoading(true);setError("");setNotice("");
  try{await load();}catch(e){setError(e instanceof Error?e.message:"Không thể tải lại.");}
  finally{setLoading(false);}
 }
 async function toggle(member:StaffMember,ability:AccountPermissionAbility,allowed:boolean){
  if(busy)return;
  setBusy(ability);setError("");setNotice("");
  try{
   const response=await fetch("/api/congress-members/permissions",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,userId:member.userId,ability,allowed})
   });
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Không lưu được quyền tài khoản.");
   setMembers(prev=>prev.map(m=>m.userId!==member.userId?m:{
    ...m,deniedAbilities:allowed?m.deniedAbilities.filter(a=>a!==ability):
     [...new Set([...m.deniedAbilities,ability])]
   }));
   setNotice("Đã "+(allowed?"bật":"tắt")+" quyền “"+names[ability]+"” cho "+member.name+".");
  }catch(e){setError(e instanceof Error?e.message:"Không thay đổi được quyền.");}
  finally{setBusy("");}
 }
 async function changeRole(member:StaffMember){
  if(busy||member.role===roleDraft)return;
  if(!window.confirm("Thay vai trò nền của "+member.name+" thành "+CONGRESS_ROLE_LABELS[roleDraft]+
   "? Những quyền tùy chỉnh của tài khoản vẫn được giữ và sẽ bị giới hạn bởi vai trò mới."))return;
  setBusy("role");setError("");setNotice("");
  try{
   const response=await fetch("/api/congress-members",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,userId:member.userId,role:roleDraft})
   });
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Không lưu được vai trò.");
   await load();
   setEditingRole(false);
   setNotice("Đã cập nhật vai trò nền của tài khoản "+member.name+".");
  }catch(e){setError(e instanceof Error?e.message:"Không cập nhật được vai trò.");}
  finally{setBusy("");}
 }
 return <div className="mx-auto max-w-[1240px] space-y-5">
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#dce6ec] pb-5">
   <div>
    <p className="text-[11px] font-bold uppercase tracking-[.11em] text-[#397c98]">QUẢN TRỊ ĐẠI HỘI</p>
    <h1 className="mt-1 text-[clamp(23px,3vw,31px)] font-extrabold text-[#1d3b51]">Phân quyền theo tài khoản</h1>
    <p className="mt-2 max-w-[750px] text-[12px] leading-6 text-[#678093]">
     Chọn tài khoản BTC và bật hoặc tắt từng chức năng. Mỗi tài khoản được phân quyền riêng trong đúng Đại hội.
     Vai trò nền là giới hạn quyền tối đa; không cấp vượt vai trò hoặc cấp quyền cho đại biểu.
    </p>
   </div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>void refresh()} disabled={loading||!!busy}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d8e5eb] bg-white px-3 text-[12px] font-bold text-[#3c647c] disabled:opacity-50">
     <RefreshCw size={16} className={loading?"animate-spin":""}/> Làm mới
    </button>
    <Link href={"/congresses/"+congressId+"/team"}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1179a5] px-3 text-[12px] font-bold text-white">
     <UsersRound size={16}/> Quản lý tài khoản BTC <ArrowRight size={15}/>
    </Link>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-lg border border-[#f0d0c8] bg-[#fff6f2] px-4 py-3 text-[12px] text-[#a44936]">{error}</p>}
  {notice&&<p role="status" className="rounded-lg border border-[#cde7d8] bg-[#f0faf4] px-4 py-3 text-[12px] text-[#246f4b]">{notice}</p>}
  {loading?<p className="rounded-xl border border-[#e1ebf0] bg-white p-6 text-[13px] text-[#698395]">Đang đọc tài khoản BTC...</p>:
   <div className="grid items-start gap-5 lg:grid-cols-[295px_minmax(0,1fr)]">
    <aside className="overflow-hidden rounded-xl border border-[#dae7ee] bg-white">
     <div className="border-b border-[#e7eef2] px-4 py-4">
      <h2 className="text-[14px] font-bold text-[#2a4e63]">Tài khoản BTC ({members.length})</h2>
      <p className="mt-1 text-[11px] text-[#7b93a2]">Chọn người cần cấp hoặc thu hồi quyền</p>
     </div>
     {members.length===0?<p className="p-4 text-[12px] text-[#6f899a]">Chưa có tài khoản BTC tại Đại hội này.</p>:
      <div className="divide-y divide-[#edf1f4]">
       {members.map(member=><button type="button" key={member.userId}
        onClick={()=>{setSelectedId(member.userId);setEditingRole(false);setError("");setNotice("");}}
        className={"w-full border-l-[3px] px-4 py-3 text-left transition "+(selectedId===member.userId?
         "border-l-[#1987af] bg-[#edf7fb]":"border-l-transparent bg-white hover:bg-[#f7fafc]")}>
        <span className="block break-words text-[13px] font-bold text-[#254b64]">{member.name}</span>
        <span className="mt-1 block break-all text-[10px] text-[#8193a3]">{member.email}</span>
        <span className="mt-1.5 block text-[11px] text-[#3e7896]">{CONGRESS_ROLE_LABELS[member.role]}</span>
       </button>)}
      </div>}
    </aside>
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#dae7ee] bg-white">
     {selected?<div className="space-y-4 p-4 sm:p-5">
      <div className="border-b border-[#e7eef2] pb-4">
       <p className="text-[11px] font-bold uppercase tracking-[.09em] text-[#708c9d]">THIẾT LẬP QUYỀN TÀI KHOẢN</p>
       <h2 className="mt-1 break-words text-[18px] font-bold text-[#23455b]">{selected.name}</h2>
       <p className="mt-1 break-all text-[11px] text-[#7a92a0]">{selected.email}</p>
       <p className="mt-2 text-[12px] font-bold text-[#367c99]">{granted}/{permitted.length} chức năng được phép</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[#f6f9fb] px-3 py-3">
       <span className="text-[12px] text-[#536f83]">Vai trò nền: <strong>{CONGRESS_ROLE_LABELS[selected.role]}</strong></span>
       {!editingRole?<button type="button" onClick={()=>{setEditingRole(true);setRoleDraft(selected.role);}}
        className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md border border-[#d1e0e8] bg-white px-2 text-[11px] font-bold text-[#38708d]"><KeyRound size={15}/> Đổi vai trò <ChevronDown size={14}/></button>:
        <div className="ml-auto flex flex-wrap items-center gap-2">
         <select value={roleDraft} onChange={e=>setRoleDraft(e.target.value as StaffRole)}
          className="min-h-10 rounded-lg border border-[#d2e1e8] bg-white px-2 text-[12px]">
          {staffRoles.map(role=><option key={role} value={role}>{CONGRESS_ROLE_LABELS[role]}</option>)}
         </select>
         <button type="button" onClick={()=>void changeRole(selected)} disabled={!!busy||roleDraft===selected.role}
          className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#157ea8] px-3 text-[12px] font-bold text-white disabled:opacity-50"><Save size={14}/> Lưu</button>
         <button type="button" aria-label="Hủy đổi vai trò" onClick={()=>setEditingRole(false)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d2e1e8] bg-white"><X size={16}/></button>
        </div>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
       {ACCOUNT_PERMISSION_CAPABILITIES.map(ability=>{
        const possible=canCongress(selected.role,ability);
        const allowed=possible&&!selected.deniedAbilities.includes(ability);
        return <label key={ability} className={"flex items-center gap-3 rounded-lg border px-3 py-3 "+(possible?
         "cursor-pointer border-[#dae7ee] bg-white":"cursor-not-allowed border-[#edf0f3] bg-[#f5f7f9] opacity-65")}>
         <input type="checkbox" checked={allowed} disabled={!possible||!!busy}
          onChange={e=>void toggle(selected,ability,e.target.checked)}
          aria-label={names[ability]} className="h-[18px] w-[18px] shrink-0 accent-[#137a9d]"/>
         <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-bold leading-5 text-[#2b4b60]">{names[ability]}</span>
          <span className="block text-[10px] text-[#7892a2]">{sections[ability.split(".")[0]]}</span>
         </span>
         {allowed&&<Check size={15} className="shrink-0 text-[#158260]"/>}
        </label>;
       })}
      </div>
      <p className="rounded-lg bg-[#f4f8fa] px-4 py-3 text-[11px] leading-5 text-[#6d8293]">
       Những quyền bị mờ không thuộc vai trò hiện tại. Quyền quản lý tài khoản, cấu hình hệ thống và nhật ký không được cấp bằng checkbox để tránh vượt thẩm quyền.
       Sau khi đổi quyền, tài khoản được áp dụng theo các kiểm tra máy chủ; người dùng có thể cần tải lại trang để cập nhật menu.
      </p>
     </div>:<p className="p-6 text-[13px] text-[#738c9e]">Chọn tài khoản BTC ở bên trái để chỉnh quyền.</p>}
    </section>
   </div>}
 </div>;
}
