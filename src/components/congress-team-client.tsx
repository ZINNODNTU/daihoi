"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {BadgeCheck,Check,ClipboardCopy,Eye,EyeOff,KeyRound,LockKeyhole,RefreshCw,ShieldAlert,ShieldCheck,Trash2,UserPlus,UsersRound} from "lucide-react";

type Role="admin"|"checkin"|"secretary";
type Member={userId:string;email:string;name:string;role:Role;createdAt:string;isPrimary:boolean;isSelf?:boolean};
type Issued={name:string;email:string;password:string;kind:"created"|"reset"};
const roles:{value:Role;label:string;description:string}[]=[
 {value:"admin",label:"Quản trị Đại hội",description:"Quản lý hồ sơ đại biểu, phiên điểm danh, sơ đồ ghế, nhân sự BCH, tài liệu, phân quyền BTC và nhật ký hệ thống."},
 {value:"checkin",label:"Nhân sự điểm danh",description:"Thao tác các nghiệp vụ điểm danh tại bàn BTC, theo dõi lượt điểm danh và xem dữ liệu được phân quyền."},
 {value:"secretary",label:"Thư ký Đại hội",description:"Xem hồ sơ, trích ngang BCH, tài liệu và báo cáo; không sửa cấu hình hoặc cấp tài khoản."}
];
const label=(role:Role)=>roles.find(r=>r.value===role)?.label||role;
export function CongressTeamClient({congressId}:{congressId:string}){
 const [members,setMembers]=useState<Member[]>([]);
 const [name,setName]=useState("");
 const [role,setRole]=useState<Role>("checkin");
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [issued,setIssued]=useState<Issued|null>(null);
 const [showPassword,setShowPassword]=useState(false);
 const [copied,setCopied]=useState(false);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);

 const load=useCallback(async()=>{
  const response=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
   credentials:"same-origin",cache:"no-store"
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||"Không đọc được nhân sự BTC.");
  setMembers((data.members||[]) as Member[]);
 },[congressId]);

 useEffect(()=>{
  let active=true;
  async function initial(){
   try{
    const response=await fetch("/api/congress-members?"+new URLSearchParams({congressId}),{
     credentials:"same-origin",cache:"no-store"
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Không đọc được danh sách BTC.");
    if(active){setMembers(data.members||[]);setError("");}
   }catch(e){if(active)setError(e instanceof Error?e.message:"Lỗi tải dữ liệu.");}
   finally{if(active)setLoading(false);}
  }
  void initial();
  return()=>{active=false;};
 },[congressId]);

 async function createAccount(){
  setBusy(true);setError("");setMessage("");setIssued(null);
  try{
   const response=await fetch("/api/congress-members",{
    method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,fullName:name.trim(),role:hasPrimary?role:"admin"})
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Không tạo được tài khoản BTC.");
   setIssued({kind:"created",name:data.account.name,email:data.account.email,password:data.initialPassword});
   setShowPassword(false);setCopied(false);
   setName("");setMessage("Đã cấp tài khoản riêng. Sao chép thông tin đăng nhập và sử dụng cổng /login.");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Không tạo được tài khoản BTC.");}
  finally{setBusy(false);}
 }

 async function action(method:"PATCH"|"DELETE"|"RESET",m:Member,nextRole?:Role){
  if(method==="DELETE"&&!window.confirm(
   "Thu hồi tài khoản BTC “"+m.name+"” khỏi Đại hội này? Người dùng sẽ không còn quyền quản trị hay điểm danh. Tài khoản được khóa nhưng lịch sử thao tác được giữ lại."
  ))return;
  if(method==="PATCH"&&!window.confirm(
   "Chuyển vai trò "+m.name+" sang "+label(nextRole||m.role)+"?"
  ))return;
  if(method==="RESET"&&!window.confirm(
   "Cấp lại mật khẩu mới cho "+m.name+"? Mật khẩu cũ sẽ không còn sử dụng được."
  ))return;
  setBusy(true);setError("");setMessage("");
  if(method!=="RESET")setIssued(null);
  try{
   const response=await fetch(method==="RESET"?"/api/congress-members/reset":"/api/congress-members",{
    method:method==="RESET"?"POST":method,
    credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,userId:m.userId,...(nextRole?{role:nextRole}:{})})
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Không thực hiện được thao tác.");
   if(method==="RESET"){
    setIssued({kind:"reset",name:m.name,email:m.email,password:data.initialPassword});
    setShowPassword(false);setCopied(false);
    setMessage("Đã cấp mật khẩu BTC mới. Vui lòng chuyển riêng cho người được cấp.");
   }else{
    setMessage(method==="DELETE"?"Đã thu hồi quyền truy cập BTC.":"Đã cập nhật phân quyền BTC.");
    await load();
   }
  }catch(e){setError(e instanceof Error?e.message:"Không cập nhật được tài khoản BTC.");}
  finally{setBusy(false);}
 }

 const hasPrimary=members.some(item=>item.isPrimary);
  const selectedRole:Role=hasPrimary?role:"admin";
  const info=roles.find(item=>item.value===selectedRole);
 async function copyCredentials(){
  if(!issued)return;
  try{
   await navigator.clipboard.writeText(
    "Tài khoản BTC: "+issued.email+"\nMật khẩu: "+issued.password
   );
   setCopied(true);
   window.setTimeout(()=>setCopied(false),4000);
  }catch{setError("Trình duyệt không cho phép sao chép. Hãy sao chép thủ công thông tin đăng nhập.");}
 }

 return <div className="mx-auto max-w-[1380px] space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4">
   <div>
    <p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-[#0b81af]">Quản trị Đại hội / Phân quyền nội bộ</p>
    <h1 className="page-title mt-2">Tài khoản Ban Tổ chức</h1>
    <p className="helper mt-2 max-w-3xl">
     Mỗi Đại hội chỉ có <strong>một tài khoản quản trị chính</strong>. Nhân sự BTC khác được cấp quyền theo nhóm.
     Không sử dụng chung tài khoản đại biểu hoặc tài khoản BTC của Đại hội khác.
    </p>
   </div>
   <Link href={"/congresses/"+congressId+"/permissions"} className="btn btn-secondary"><ShieldCheck size={16}/> Bảng phân quyền</Link>
    <button className="btn btn-secondary" onClick={()=>{setLoading(true);void load().catch(e=>setError(String(e))).finally(()=>setLoading(false));}} disabled={loading||busy}>
    <RefreshCw size={16}/> Làm mới
   </button>
  </header>

  <div className="flex items-start gap-3 rounded-xl border border-[#bfdbea] bg-[#edf7fc] px-4 py-4 text-[12px] leading-6 text-[#285770]">
   <ShieldCheck className="mt-0.5 shrink-0 text-[#0787af]" size={20}/>
   <p><strong>Tách biệt quyền truy cập:</strong> Tài khoản đại biểu chỉ có cổng đại biểu.
    BTC sử dụng tài khoản riêng theo Đại hội và vai trò, nhưng cùng đăng nhập tại <a className="font-bold underline" href="/login">/login</a>.
    Quản trị viên hệ thống có quyền điều hành toàn nền tảng nhưng không nằm trong danh sách BTC của từng Đại hội.</p>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-800">{error}</p>}
  {message&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-medium text-emerald-800">{message}</p>}

  {issued&&<section aria-label="Thông tin đăng nhập BTC vừa cấp" className="overflow-hidden rounded-2xl border-2 border-[#89cbb1] bg-white shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d0e9db] bg-[#effaf3] px-5 py-4">
    <div className="flex gap-2 text-[13px] font-extrabold text-[#166b50]"><BadgeCheck size={19}/> {issued.kind==="created"?"Tài khoản BTC đã tạo thành công":"Đã cấp lại mật khẩu BTC"}</div>
    <button type="button" className="btn btn-secondary !min-h-9" onClick={()=>{setIssued(null);setShowPassword(false);}}>
     Đã lưu thông tin
    </button>
   </div>
   <div className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
    <div className="min-w-0"><p className="text-[11px] font-semibold text-[#658298]">Tài khoản đăng nhập · {issued.name}</p>
     <code className="mt-2 block break-all rounded-lg bg-[#f5f8fa] px-3 py-3 text-[12px] font-bold text-[#28475f]">{issued.email}</code>
    </div>
    <div><p className="text-[11px] font-semibold text-[#658298]">Mật khẩu một lần · không lưu trong hệ thống</p>
     <div className="mt-2 flex items-center gap-1 rounded-lg bg-[#f5f8fa] px-3 py-2">
      <code className="min-w-0 flex-1 break-all text-[12px] font-bold text-[#28475f]">{showPassword?issued.password:"••••••••••••••••••••"}</code>
      <button type="button" className="rounded-lg p-1.5 text-[#50738b] hover:bg-[#e6eef3]" onClick={()=>setShowPassword(v=>!v)}
       aria-label={showPassword?"Ẩn mật khẩu":"Hiện mật khẩu"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
     </div>
    </div>
    <button className="btn btn-primary !min-h-11" type="button" onClick={()=>void copyCredentials()}>
     {copied?<Check size={16}/>:<ClipboardCopy size={16}/>} {copied?"Đã sao chép":"Sao chép"}
    </button>
   </div>
   <p className="px-5 pb-5 text-[11px] leading-5 text-amber-800">
    Chỉ hiển thị mật khẩu tại thời điểm cấp hoặc đặt lại. Không gửi vào nhóm công khai; người dùng nên đổi mật khẩu tại mục Tài khoản của tôi sau khi đăng nhập.
   </p>
  </section>}

  <section className="overflow-hidden rounded-2xl border border-[#dde7ed] bg-white shadow-[0_8px_30px_rgba(18,40,70,.035)]">
   <div className="border-b border-[#edf1f4] px-5 py-5 sm:px-6">
    <div className="flex items-center gap-2 text-[16px] font-extrabold text-[#1e435a]"><UserPlus size={20} className="text-[#0e83ac]"/> {hasPrimary?"Cấp tài khoản nhân sự BTC":"Cấp tài khoản quản trị chính"}</div>
    <p className="mt-2 text-[12px] leading-6 text-[#728b9e]">{hasPrimary?"Cấp tài khoản BTC với quyền hạn giới hạn theo Đại hội. Quản trị chính đã tồn tại nên không thể tạo thêm tài khoản quản trị.":"Đại hội chưa có tài khoản quản trị. Hãy cấp tài khoản chính trước khi phân quyền nhân sự BTC."} Mọi tài khoản dùng chung cổng đăng nhập /login.</p>
   </div>
   <form onSubmit={event=>{event.preventDefault();void createAccount();}} className="grid items-end gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_250px_auto]">
    <label className="block min-w-0">
     <span className="text-[12px] font-bold text-[#355773]">Họ và tên nhân sự BTC</span>
     <input className="field mt-2 w-full" required minLength={2} maxLength={120} placeholder="Nguyễn Văn A" value={name}
      onChange={e=>setName(e.target.value)}/>
    </label>
    <label className="block">
     <span className="text-[12px] font-bold text-[#355773]">Vai trò trong Đại hội</span>
     <select className="field mt-2 w-full" value={selectedRole} disabled={!hasPrimary} onChange={e=>setRole(e.target.value as Role)}>
      {roles.filter(r=>hasPrimary?r.value!=="admin":r.value==="admin").map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
     </select>
    </label>
    <button disabled={busy||name.trim().length<2} className="btn btn-primary !min-h-[44px] justify-center" type="submit">
     <UserPlus size={17}/> {busy?"Đang xử lý...":hasPrimary?"Tạo tài khoản BTC":"Tạo quản trị chính"}
    </button>
    <div className="lg:col-span-3 flex gap-2 rounded-lg border border-[#e4edf3] bg-[#f7fafc] px-3 py-3 text-[11px] leading-6 text-[#54738a]">
     <LockKeyhole size={16} className="mt-1 shrink-0 text-[#1383a4]"/>
     <p><strong>Phạm vi: {info?.label}.</strong> {info?.description}</p>
    </div>
   </form>
  </section>

  <section aria-label="Danh sách tài khoản Ban Tổ chức" className="overflow-hidden rounded-2xl border border-[#dde7ed] bg-white shadow-[0_8px_30px_rgba(18,40,70,.035)]">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f4] px-5 py-5 sm:px-6">
    <div className="flex items-center gap-2 text-[16px] font-extrabold text-[#1e435a]"><UsersRound size={20} className="text-[#0e83ac]"/> Danh sách tài khoản BTC ({members.length})</div>
    <span className="rounded-full bg-[#edf6fa] px-3 py-1.5 text-[10px] font-bold text-[#467c98]">Tài khoản riêng · chỉ Đại hội này</span>
   </div>
   {loading?<p className="px-6 py-10 text-[12px] text-[#8798a5]">Đang tải...</p>:
    members.length===0?<div className="px-6 py-12 text-center"><ShieldCheck className="mx-auto text-[#9ab6c5]" size={28}/><p className="mt-3 text-[13px] font-semibold text-[#59788d]">Chưa có tài khoản BTC.</p><p className="mt-1 text-[11px] text-[#809bab]">Hãy cấp tài khoản bằng biểu mẫu phía trên.</p></div>:
    <div className="divide-y divide-[#ebf0f3]">
     {[...members].sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)).map((member,index)=><div className="flex flex-col justify-between gap-4 px-5 py-4 sm:px-6 xl:flex-row xl:items-center" key={member.userId}>
      <div className="flex min-w-0 items-center gap-3">
       <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f4f9] text-[13px] font-extrabold text-[#287b9f]">{String(index+1).padStart(2,"0")}</span>
       <div className="min-w-0">
        <p className="break-words text-[13px] font-extrabold text-[#25465a]">{member.name} {member.isPrimary&&<span className="ml-2 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">QUẢN TRỊ CHÍNH</span>}</p>
        <p className="mt-1 break-all font-mono text-[11px] text-[#6d8799]">{member.email}</p>
       </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto">
       <ShieldCheck size={16} className="hidden text-[#2994a9] sm:block"/>
       {member.isPrimary?<span className="min-w-[210px] rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-[12px] font-bold text-blue-800">Quản trị Đại hội · cố định</span>:
        <select className="field min-w-0 flex-1 text-[12px] sm:min-w-[210px] xl:flex-none" value={member.role}
        aria-label={"Vai trò BTC của "+member.name} disabled={busy}
        onChange={e=>void action("PATCH",member,e.target.value as Role)}>
        {roles.filter(r=>r.value!=="admin").map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
       </select>}
       <button type="button" className="btn btn-secondary !min-h-10 !px-3" disabled={busy}
        title={"Đặt lại mật khẩu "+member.name} aria-label={"Đặt lại mật khẩu "+member.name}
        onClick={()=>void action("RESET",member)}><KeyRound size={16}/><span className="text-[11px]">Cấp lại</span></button>
       <button type="button" className="btn btn-secondary !min-h-10 !border-rose-200 !px-3 !text-rose-700 hover:!bg-rose-50"
        aria-label={"Thu hồi tài khoản BTC "+member.name} disabled={busy||member.isPrimary}
        onClick={()=>void action("DELETE",member)}><Trash2 size={16}/><span className="text-[11px]">Thu hồi</span></button>
      </div>
     </div>)}
    </div>}
  </section>
  <p className="flex items-start gap-2 text-[11px] leading-6 text-[#8195a3]">
   <ShieldAlert className="mt-1 shrink-0" size={15}/>
   Thu hồi tài khoản BTC sẽ chặn quyền truy cập mà không xóa nhật ký thao tác. Mỗi tài khoản BTC được định danh riêng, không dùng lại ở Đại hội khác và không cấp đồng thời cho đại biểu.
  </p>
 </div>;
}