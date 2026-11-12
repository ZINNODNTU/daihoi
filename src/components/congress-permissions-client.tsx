"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {
 ArrowRight,Check,ChevronDown,Clock3,ClipboardCheck,
 FileText,KeyRound,LockKeyhole,RefreshCw,Save,Search,Settings2,
 Shield,ShieldCheck,SlidersHorizontal,UserCog,UsersRound,X
} from "lucide-react";
import {
 ACCOUNT_PERMISSION_CAPABILITIES,canCongress,canCustomizeCongressAbility,
 CONGRESS_ROLE_LABELS,type AccountPermissionAbility
} from "@/lib/congress-permissions";

type Role="admin"|"checkin"|"secretary";
type Override={ability:AccountPermissionAbility;allowed:boolean};
type StaffMember={
 userId:string;name:string;email:string;role:Role;createdAt:string;
 deniedAbilities:string[];permissionOverrides:Override[];isSelf:boolean;
};
type AuditEntry={
 id:number;actor_id:string;action:string;created_at:string;
 details:{role?:string;changes?:{ability:string;before:boolean;after:boolean}[]};
};
const roles:Role[]=["admin","checkin","secretary"];
const groups=[
 {id:"overview",title:"Không gian làm việc",description:"Truy cập giao diện điều hành Đại hội",icon:ShieldCheck,
  items:["workspace.view"]},
 {id:"delegate",title:"Đại biểu & chất lượng",description:"Danh sách, hồ sơ và báo cáo cơ cấu đại biểu",icon:UsersRound,
  items:["delegates.read","delegates.write","quality.read"]},
 {id:"attendance",title:"Điểm danh & sơ đồ",description:"Quyền xem, quét QR, điều hành phiên và xếp chỗ",icon:SlidersHorizontal,
  items:["attendance.read","attendance.scan","attendance.sessions","seating.read","seating.write"]},
 {id:"personnel",title:"Nhân sự BCH",description:"Hồ sơ và hình ảnh nhân sự được giới thiệu",icon:UserCog,
  items:["bch.read","bch.write"]},
 {id:"ballot",title:"Kiểm phiếu BCH",description:"Phân hệ riêng · cấp quyền xem hoặc nhập phiếu cho đúng tài khoản",icon:ClipboardCheck,
  items:["ballots.read","ballots.write"]},
 {id:"documents",title:"Tài liệu & báo cáo",description:"Văn kiện lưu trữ và thống kê",icon:FileText,
  items:["documents.read","documents.write","reports.read"]}
] as const;
const label:Record<AccountPermissionAbility,string>={
 "workspace.view":"Truy cập không gian Đại hội",
 "delegates.read":"Xem danh sách đại biểu",
 "delegates.write":"Thêm và chỉnh sửa hồ sơ đại biểu",
 "quality.read":"Xem cơ cấu, chất lượng đại biểu",
 "seating.read":"Xem sơ đồ chỗ ngồi",
 "seating.write":"Tạo, chỉnh sửa sơ đồ và phân ghế",
 "attendance.read":"Theo dõi và xem kết quả điểm danh",
 "attendance.scan":"Quét QR / xác nhận điểm danh",
 "attendance.sessions":"Tạo và vận hành phiên điểm danh",
 "bch.read":"Xem hồ sơ nhân sự BCH",
 "bch.write":"Tạo và cập nhật nhân sự BCH",
 "ballots.read":"Xem sổ kiểm phiếu BCH",
 "ballots.write":"Nhập và cập nhật số phiếu",
 "documents.read":"Xem tài liệu Đại hội",
 "documents.write":"Đăng tải, sắp xếp, công bố tài liệu",
 "reports.read":"Xem các báo cáo Đại hội"
};
const key=(item:AccountPermissionAbility)=>item;
const basePermission=(member:StaffMember,ability:AccountPermissionAbility)=>{
 const override=member.permissionOverrides?.find(o=>o.ability===ability);
 if(override)return override.allowed;
 return canCongress(member.role,ability);
};
function formatTime(date:string){
 try{return new Intl.DateTimeFormat("vi-VN",{dateStyle:"short",timeStyle:"short"}).format(new Date(date));}
 catch{return date;}
}
export function CongressPermissionsClient({congressId}:{congressId:string}){
 const [members,setMembers]=useState<StaffMember[]>([]);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [draft,setDraft]=useState<Partial<Record<AccountPermissionAbility,boolean>>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [userSearch,setUserSearch]=useState("");
 const [roleMode,setRoleMode]=useState(false);
 const [roleDraft,setRoleDraft]=useState<Role>("secretary");
 const [history,setHistory]=useState<AuditEntry[]>([]);
 const [historyBusy,setHistoryBusy]=useState(false);
 const selected=members.find(m=>m.userId===selectedId)||null;
 const effective=(ability:AccountPermissionAbility)=>
  draft[ability]??(selected?basePermission(selected,ability):false);
 const changes=selected?ACCOUNT_PERMISSION_CAPABILITIES
  .filter(ability=>canCustomizeCongressAbility(selected.role,ability))
  .filter(ability=>effective(ability)!==basePermission(selected,ability))
  .map(ability=>({ability,allowed:effective(ability)})):[];
 const granted=selected?ACCOUNT_PERMISSION_CAPABILITIES.filter(a=>effective(a)).length:0;
 const filtered=useMemo(()=>members.filter(item=>
  (item.name+" "+item.email+" "+CONGRESS_ROLE_LABELS[item.role])
   .toLocaleLowerCase("vi").includes(userSearch.toLocaleLowerCase("vi"))
 ),[members,userSearch]);
 const load=useCallback(async()=>{
  const response=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
   credentials:"same-origin",cache:"no-store"
  });
  const body=await response.json();
  if(!response.ok)throw Error(body.error||"Không tải được tài khoản BTC.");
  const result=(body.members||[]) as StaffMember[];
  setMembers(result);
  setSelectedId(previous=>previous&&result.some(m=>m.userId===previous)?previous:
   (result[0]?.userId||null));
  setDraft({});
 },[congressId]);
 useEffect(()=>{
  let active=true;
  async function init(){
   try{
    const response=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
     credentials:"same-origin",cache:"no-store"
    });
    const body=await response.json();
    if(!active)return;
    if(!response.ok)throw Error(body.error||"Không đọc được tài khoản BTC.");
    setMembers(body.members||[]);
    setSelectedId(body.members?.[0]?.userId||null);
   }catch(e){if(active)setError(e instanceof Error?e.message:"Không tải được tài khoản.");}
   finally{if(active)setLoading(false);}
  }
  void init();
  return()=>{active=false;};
 },[congressId]);
 useEffect(()=>{
  if(!selectedId)return;
  let active=true;
  async function loadHistory(){
   setHistoryBusy(true);
   try{
    const res=await fetch("/api/congress-members/permissions?"+
     new URLSearchParams({congressId,userId:selectedId!}),{
     cache:"no-store",credentials:"same-origin"
    });
    const body=await res.json();
    if(active)setHistory(res.ok?body.history||[]:[]);
   }catch{if(active)setHistory([]);}
   finally{if(active)setHistoryBusy(false);}
  }
  void loadHistory();
  return()=>{active=false;};
 },[congressId,selectedId]);
 const choose=(userId:string)=>{
  if(changes.length&&!window.confirm("Có quyền chưa lưu. Chuyển tài khoản sẽ bỏ các thay đổi này. Tiếp tục?"))return;
  setSelectedId(userId);setDraft({});setRoleMode(false);setError("");setNotice("");
 };
 const toggle=(ability:AccountPermissionAbility,enabled:boolean)=>{
  if(!selected||busy||selected.isSelf)return;
  setDraft(previous=>({
   ...previous,[key(ability)]:enabled,
   ...(ability==="ballots.read"&&!enabled?{"ballots.write":false}:{}),
   ...(ability==="ballots.write"&&enabled?{"ballots.read":true}:{})
  }));
  setNotice("");setError("");
 };
 async function refresh(){
  if(changes.length&&!window.confirm("Bỏ các thay đổi chưa lưu và làm mới?"))return;
  setLoading(true);setError("");setNotice("");
  try{await load();}catch(e){setError(e instanceof Error?e.message:"Không tải lại được dữ liệu.");}
  finally{setLoading(false);}
 }
 async function save(){
  if(!selected||selected.isSelf||busy||changes.length===0)return;
  if(changes.some(c=>!c.allowed&&c.ability==="workspace.view")&&
     !window.confirm("Bạn đang thu hồi quyền truy cập không gian Đại hội. Tiếp tục?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/congress-members/permissions",{
    method:"PUT",headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:JSON.stringify({congressId,userId:selected.userId,changes})
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Không lưu được phân quyền.");
   await load();
   setNotice("Đã lưu "+body.updated+" thay đổi quyền cho tài khoản "+selected.name+".");
   const h=await fetch("/api/congress-members/permissions?"+
    new URLSearchParams({congressId,userId:selected.userId}),{cache:"no-store"});
   if(h.ok)setHistory((await h.json()).history||[]);
  }catch(e){setError(e instanceof Error?e.message:"Không thể lưu phân quyền.");}
  finally{setBusy(false);}
 }
 async function updateRole(){
  if(!selected||selected.isSelf||busy||roleDraft===selected.role)return;
  if(!window.confirm("Đổi vai trò nền thành "+CONGRESS_ROLE_LABELS[roleDraft]+
   "? Quyền ngoài vai trò sẽ được giới hạn lại, trừ quyền kiểm phiếu được cấp riêng."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/congress-members",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,userId:selected.userId,role:roleDraft})
   });
   const body=await response.json();
   if(!response.ok)throw Error(body.error||"Không lưu được vai trò.");
   await load();setRoleMode(false);
   setNotice("Đã cập nhật vai trò nền của "+selected.name+".");
  }catch(e){setError(e instanceof Error?e.message:"Không cập nhật được vai trò.");}
  finally{setBusy(false);}
 }
 return <div className="mx-auto max-w-[1360px] space-y-5 pb-10">
  <header className="overflow-hidden rounded-2xl border border-[#d8e5ed] bg-white">
   <div className="bg-[linear-gradient(120deg,#eaf4f8_0%,#ffffff_65%)] px-5 py-6 sm:px-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
     <div>
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.11em] text-[#276f91]">
       <ShieldCheck size={17}/> QUẢN TRỊ TRUY CẬP · ACCOUNT ACCESS CONTROL
      </p>
      <h1 className="mt-2 text-[clamp(24px,3vw,34px)] font-extrabold tracking-[-.035em] text-[#1c425a]">Phân quyền tài khoản BTC</h1>
      <p className="mt-2 max-w-[780px] text-[12px] leading-6 text-[#617e8f]">
       Cấu hình chức năng theo từng người, từng Đại hội. Quyền được xác minh tại máy chủ,
       áp dụng khi tải trang hoặc gọi API và lưu đầy đủ nhật ký thay đổi.
      </p>
     </div>
     <Link href={"/congresses/"+congressId+"/team"}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#176f94] px-4 text-[12px] font-bold text-white">
      <UsersRound size={16}/> Quản lý tài khoản <ArrowRight size={15}/>
     </Link>
    </div>
   </div>
   <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#e0e9f0] px-5 py-3 text-[11px] sm:px-7">
    <span className="inline-flex items-center gap-1.5 font-bold text-[#39758b]">
     <UsersRound size={15}/>{members.length} tài khoản BTC đang hoạt động
    </span>
    <span className="inline-flex items-center gap-1.5 text-[#6a8494]">
     <Shield size={15}/> Quyền riêng theo Đại hội, không dùng chung với tài khoản đại biểu
    </span>
    <span className="inline-flex items-center gap-1.5 text-[#6a8494]">
     <LockKeyhole size={15}/> Thay đổi có kiểm tra và ghi nhật ký
    </span>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-xl border border-[#eed2c9] bg-[#fff8f4] p-4 text-[12px] font-semibold text-[#a14f3d]">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-[#cae4d8] bg-[#f1faf5] p-4 text-[12px] font-semibold text-[#27734f]">{notice}</p>}
  {loading?<p className="rounded-xl border border-[#dce8ed] bg-white p-8 text-[13px] text-[#6a8799]">Đang xác minh danh sách tài khoản BTC...</p>:
  <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
   <aside className="overflow-hidden rounded-xl border border-[#dae7ed] bg-white lg:sticky lg:top-6">
    <div className="border-b border-[#e3ecf1] px-4 py-4">
     <h2 className="text-[14px] font-bold text-[#2b5068]">Chọn tài khoản</h2>
     <label className="relative mt-3 block">
      <Search size={15} className="pointer-events-none absolute left-3 top-3 text-[#9bb0bb]"/>
      <input className="field min-h-10 w-full !pl-9" value={userSearch}
       onChange={e=>setUserSearch(e.target.value)} placeholder="Tìm họ tên hoặc tài khoản"
       aria-label="Tìm tài khoản BTC"/>
     </label>
    </div>
    <div className="max-h-[650px] overflow-y-auto">
     {filtered.map(member=>{
      const active=selectedId===member.userId;
      const overridden=member.permissionOverrides?.length||0;
      return <button key={member.userId} type="button" onClick={()=>choose(member.userId)}
       aria-current={active?"true":undefined}
       className={"flex w-full items-center gap-3 border-l-[3px] border-b border-b-[#eff3f5] px-3.5 py-3.5 text-left transition "+
        (active?"border-l-[#1b82a5] bg-[#edf7fa]":"border-l-transparent bg-white hover:bg-[#f7fafb]")}>
       <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[14px] font-extrabold "+
        (active?"bg-[#1a7597] text-white":"bg-[#edf3f6] text-[#53798c]")}>
        {member.name.trim().charAt(0).toLocaleUpperCase("vi")||"B"}
       </span>
       <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-[#264b60]">{member.name}</span>
        <span className="mt-0.5 block truncate text-[10px] text-[#8195a2]">{member.email}</span>
        <span className="mt-1 block text-[10px] font-semibold text-[#41819b]">
         {CONGRESS_ROLE_LABELS[member.role]}
         {member.isSelf&&<span className="ml-1 text-[#567e91]">· Tài khoản của bạn</span>}
         {overridden>0&&<span className="ml-1.5 text-[#a06c38]">· {overridden} tùy chỉnh</span>}
        </span>
       </span>
       {active&&<Check size={17} className="shrink-0 text-[#1b799e]"/>}
      </button>;
     })}
     {filtered.length===0&&<p className="p-4 text-[12px] text-[#8499a5]">Không tìm thấy tài khoản BTC.</p>}
    </div>
    <div className="border-t border-[#e8eff3] p-3">
     <button type="button" onClick={()=>void refresh()} disabled={busy}
      className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#dae6ed] bg-[#fafcfd] text-[11px] font-semibold text-[#51778c]">
      <RefreshCw size={15}/> Tải lại danh sách quyền
     </button>
    </div>
   </aside>
   <div className="min-w-0 space-y-4">
    {selected?<div className="space-y-4">
     <section className="rounded-xl border border-[#d8e5ec] bg-white px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div>
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#4b849d]">QUYỀN CỦA TÀI KHOẢN</p>
        <h2 className="mt-1.5 text-[22px] font-extrabold text-[#1c4058]">{selected.name}</h2>
        <p className="mt-1 break-all text-[12px] text-[#8095a3]">{selected.email}</p>
        {selected.isSelf&&<p className="mt-2 rounded-md border border-[#ebd6b5] bg-[#fffaf1] p-2 text-[11px] font-medium text-[#91682c]">Đây là tài khoản đang đăng nhập. Vì an toàn, không thể tự cấp hoặc thu hồi quyền của chính mình. Hãy chọn tài khoản BTC khác.</p>}
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#547b8e]">
         <ShieldCheck size={15}/>{granted}/{ACCOUNT_PERMISSION_CAPABILITIES.length} quyền đang bật
        </p>
       </div>
       <span className={"rounded-md border px-3 py-2 text-[11px] font-bold "+(
        changes.length?"border-[#e6c99f] bg-[#fff8e9] text-[#8c6328]":"border-[#cfe7db] bg-[#f1faf5] text-[#327355]")}>
        {changes.length?changes.length+" thay đổi chưa lưu":"Quyền đã đồng bộ"}
       </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e5edf1] bg-[#f7fafb] p-3">
       <div className="flex items-center gap-2">
        <KeyRound size={18} className="text-[#41809c]"/>
        <span className="text-[12px] text-[#536d80]">Vai trò nền: <strong className="text-[#24506c]">{CONGRESS_ROLE_LABELS[selected.role]}</strong></span>
       </div>
       {!roleMode?<button type="button" onClick={()=>{setRoleMode(true);setRoleDraft(selected.role);}} disabled={selected.isSelf}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-[#d4e3e9] bg-white px-3 text-[11px] font-bold text-[#347a98]">
        <Settings2 size={15}/> Thay đổi vai trò <ChevronDown size={13}/>
       </button>:<div className="flex flex-wrap gap-2">
        <select value={roleDraft} onChange={e=>setRoleDraft(e.target.value as Role)}
         className="min-h-10 rounded-lg border border-[#d5e3eb] bg-white px-2 text-[12px]">
         {roles.map(role=><option key={role} value={role}>{CONGRESS_ROLE_LABELS[role]}</option>)}
        </select>
        <button type="button" onClick={()=>void updateRole()} disabled={busy||roleDraft===selected.role}
         className="min-h-10 rounded-lg bg-[#166c92] px-3 text-[11px] font-bold text-white disabled:opacity-50">
         Lưu vai trò
        </button>
        <button type="button" aria-label="Hủy đổi vai trò" onClick={()=>setRoleMode(false)}
         className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d8e4e9] bg-white"><X size={16}/></button>
       </div>}
      </div>
     </section>
     <section className="space-y-3" aria-label="Ma trận quyền theo tài khoản">
      {groups.map(group=>{
       const Icon=group.icon;
       return <div key={group.id} className="overflow-hidden rounded-xl border border-[#dae7ed] bg-white">
        <div className={"flex items-center gap-3 border-b border-[#e7edf1] px-4 py-4 "+(
         group.id==="ballot"?"bg-[#fffaf1]":"bg-[#fafcfd]")}>
         <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg "+(
          group.id==="ballot"?"bg-[#f7ebd3] text-[#9c6a27]":"bg-[#e9f3f7] text-[#267594]")}>
          <Icon size={19}/>
         </div>
         <div className="min-w-0">
          <h3 className="text-[14px] font-extrabold text-[#264c63]">{group.title}</h3>
          <p className="mt-0.5 text-[11px] leading-4 text-[#7b91a1]">{group.description}</p>
         </div>
        </div>
        <div className="divide-y divide-[#edf2f5]">
         {group.items.map(raw=>{
          const ability=raw as AccountPermissionAbility;
          const possible=canCustomizeCongressAbility(selected.role,ability);
          const checked=effective(ability);
          const custom=selected.permissionOverrides?.find(o=>o.ability===ability);
          const dirty=changes.some(c=>c.ability===ability);
          const badge=dirty?"Chưa lưu":custom?
           custom.allowed?"Cấp riêng":"Đã hạn chế":
           canCongress(selected.role,ability)?"Theo vai trò":"Không có trong vai trò";
          return <label key={ability} className={"flex items-center gap-3 px-4 py-3 transition "+(
           possible?"cursor-pointer hover:bg-[#fafcfd]":"cursor-not-allowed bg-[#f8fafb] opacity-65")}>
           <input type="checkbox" checked={checked} disabled={!possible||busy||selected.isSelf}
            onChange={e=>toggle(ability,e.target.checked)}
            aria-label={label[ability]}
            className="h-[18px] w-[18px] shrink-0 accent-[#197da2]"/>
           <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-bold leading-5 text-[#294c61]">{label[ability]}</span>
            {ability==="ballots.read"&&<span className="text-[10px] text-[#9a753d]">Có thể cấp riêng cho tổ thư ký hoặc tổ điểm danh</span>}
            {ability==="ballots.write"&&<span className="text-[10px] text-[#9a753d]">Yêu cầu quyền xem sổ kiểm phiếu</span>}
           </span>
           <span className={"shrink-0 rounded px-2 py-1 text-[10px] font-semibold "+(
            dirty?"bg-[#fff4de] text-[#946a2a]":custom?
            custom.allowed?"bg-[#e8f7ef] text-[#23805a]":"bg-[#fff0ed] text-[#ab654c]":
            "bg-[#f0f5f8] text-[#7390a0]")}>
            {badge}
           </span>
          </label>;
         })}
        </div>
       </div>;
      })}
     </section>
     <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#ccdee8] bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(34,69,89,.12)] backdrop-blur-lg">
      <div>
       <p className="text-[12px] font-bold text-[#2c5b71]">{changes.length?changes.length+" quyền đã chỉnh, chưa lưu":"Quyền của tài khoản đã đồng bộ"}</p>
       <p className="mt-0.5 text-[10px] text-[#8499a6]">Chỉ quyền của tài khoản đang chọn được thay đổi.</p>
      </div>
      <div className="flex flex-wrap gap-2">
       <button type="button" onClick={()=>setDraft({})} disabled={busy||changes.length===0||selected.isSelf}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d5e3ea] bg-white px-3 text-[11px] font-bold text-[#638398] disabled:opacity-50">
        <X size={15}/> Hoàn tác
       </button>
       <button type="button" onClick={()=>void save()} disabled={busy||changes.length===0||selected.isSelf}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#176b91] px-4 text-[12px] font-bold text-white disabled:bg-[#dce7ed] disabled:text-[#9aadb8]">
        {busy?<RefreshCw size={16} className="animate-spin"/>:<Save size={16}/>}
        {busy?"Đang lưu...":"Lưu "+(changes.length||"")+" thay đổi"}
       </button>
      </div>
     </div>
     <section className="overflow-hidden rounded-xl border border-[#dbe7ed] bg-white">
      <div className="border-b border-[#e7eef1] px-4 py-4">
       <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-[#285068]"><Clock3 size={17}/> Nhật ký phân quyền</h3>
       <p className="mt-1 text-[11px] text-[#8195a3]">Lịch sử lưu trong cơ sở dữ liệu, theo tài khoản và Đại hội.</p>
      </div>
      {historyBusy?<p className="p-4 text-[12px] text-[#7b92a2]">Đang đọc lịch sử...</p>:
       history.length===0?<p className="p-4 text-[12px] text-[#7b92a2]">Chưa có thay đổi phân quyền được ghi nhận.</p>:
       <div className="divide-y divide-[#edf2f4]">{history.map(event=><div key={event.id} className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5 rounded-lg bg-[#edf5f8] p-2 text-[#39809b]"><Shield size={15}/></span>
        <div className="min-w-0 flex-1">
         <p className="text-[12px] font-bold text-[#315870]">{event.action==="btc.role_changed"?"Đổi vai trò nền":"Cập nhật quyền chức năng"}</p>
         {(event.details?.changes||[]).map((item,i)=><p key={i} className="mt-1 text-[11px] text-[#688292]">
          {label[item.ability as AccountPermissionAbility]||item.ability}:
          <span className={"ml-1 font-bold "+(item.after?"text-[#22805a]":"text-[#b05f45]")}>
           {item.after?"Đã cấp":"Đã thu hồi"}
          </span>
         </p>)}
         {event.action==="btc.role_changed"&&<p className="mt-1 text-[11px] text-[#6f8a9b]">Vai trò: {event.details?.role||"Không xác định"}</p>}
         <p className="mt-1 text-[10px] text-[#95a5b0]">Người thao tác: {event.actor_id.slice(0,8)}…</p>
        </div>
        <time className="shrink-0 text-[10px] text-[#8599a7]">{formatTime(event.created_at)}</time>
       </div>)}</div>}
     </section>
     <p className="rounded-lg bg-[#f2f7fa] px-4 py-3 text-[11px] leading-5 text-[#6d8494]">
      <strong>Nguyên tắc bảo mật:</strong> Các quyền hệ thống, cấu hình và quản lý tài khoản
      không thể được cấp vượt vai trò nền. Chỉ hai quyền kiểm phiếu độc lập có thể cấp riêng
      cho nhân sự BTC phù hợp. Mọi thao tác được xác minh tại API và ghi audit.
     </p>
    </div>:<p className="rounded-xl border border-[#dce8ee] bg-white p-8 text-[13px] text-[#748c9a]">
     Chọn tài khoản BTC ở danh sách bên trái để cấu hình quyền.
    </p>}
   </div>
  </div>}
 </div>;
}
