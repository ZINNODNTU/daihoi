"use client";
import {useCallback,useEffect,useState} from "react";
import {RefreshCw,ShieldCheck,UserPlus,UsersRound,Trash2} from "lucide-react";
type Role="admin"|"checkin"|"secretary";
type Member={userId:string;email:string;name:string;role:Role;invited:boolean};
const roles:{value:Role;label:string}[]=[
 {value:"admin",label:"Quản trị Đại hội"},
 {value:"checkin",label:"Nhân sự điểm danh"},
 {value:"secretary",label:"Thư ký / báo cáo"}
];
export function CongressTeamClient({congressId}:{congressId:string}){
 const [members,setMembers]=useState<Member[]>([]);
 const [email,setEmail]=useState("");
 const [role,setRole]=useState<Role>("checkin");
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);
  try{
   const res=await fetch("/api/congress-members?congressId="+encodeURIComponent(congressId),{cache:"no-store"});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Không tải được nhân sự.");
   setMembers(data.members||[]);setError("");
  }catch(e){setError(e instanceof Error?e.message:"Lỗi tải dữ liệu.");}
  finally{setLoading(false);}
 },[congressId]);
 useEffect(()=>{
  let active=true;
  fetch("/api/congress-members?congressId="+encodeURIComponent(congressId),{cache:"no-store"})
   .then(async res=>{
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"Không tải được nhân sự.");
    if(active){setMembers(data.members||[]);setError("");}
   })
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Lỗi tải dữ liệu.");})
   .finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[congressId]);
 async function send(method:"POST"|"PATCH"|"DELETE",body:Record<string,string>){
  setBusy(true);setError("");setMessage("");
  try{
   const res=await fetch("/api/congress-members",{
    method,headers:{"Content-Type":"application/json"},body:JSON.stringify({congressId,...body})
   });
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Không thể lưu thay đổi.");
   setMessage(method==="POST"?(data.invited?"Đã gửi thư mời và cấp quyền.":"Đã thêm nhân sự BTC."):"Đã cập nhật danh sách BTC.");
   if(method==="POST")setEmail("");
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Yêu cầu thất bại.");}
  finally{setBusy(false);}
 }
 return <div className="space-y-6">
  <div className="flex items-start justify-between gap-4 flex-wrap">
   <div><p className="text-sm font-bold tracking-wider text-[#159ba6]">QUẢN TRỊ NHÂN SỰ</p><h1 className="page-title mt-2">Ban Tổ chức Đại hội</h1><p className="helper mt-2">Thêm tài khoản bằng email, phân quyền và quản lý người vận hành. Mỗi Đại hội có danh sách BTC riêng.</p></div>
   <button className="btn btn-secondary" onClick={()=>void load()} disabled={loading}><RefreshCw size={16}/> Làm mới</button>
  </div>
  {error&&<p role="alert" className="card p-4 text-red-700 border-red-200">{error}</p>}
  {message&&<p role="status" className="card p-4 text-teal-800">{message}</p>}
  <form className="card p-4 sm:p-6 space-y-4" onSubmit={e=>{e.preventDefault();void send("POST",{email,role});}}>
   <div className="flex gap-2 items-center font-bold text-lg"><UserPlus size={21} className="text-[#14959e]"/> Mời nhân sự BTC</div>
   <p className="helper">Nếu email chưa có tài khoản, Supabase sẽ gửi thư mời đăng nhập. Không mở đăng ký tự do.</p>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_auto] items-end">
    <label className="block"><span className="text-sm font-semibold">Email</span><input className="field mt-2 w-full" required type="email" maxLength={254} placeholder="nhansu@donvi.vn" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label className="block"><span className="text-sm font-semibold">Vai trò</span><select className="field mt-2 w-full" value={role} onChange={e=>setRole(e.target.value as Role)}>{roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
    <button className="btn btn-primary sm:col-span-2 xl:col-span-1" disabled={busy||!email.trim()} type="submit"><UserPlus size={17}/> {busy?"Đang xử lý...":"Thêm nhân sự"}</button>
   </div>
  </form>
  <section className="card p-4 sm:p-6">
   <div className="flex items-center gap-2 font-bold text-lg mb-5"><UsersRound className="text-[#14959e]" size={21}/> Danh sách BTC ({members.length})</div>
   {loading?<p className="helper">Đang tải danh sách...</p>:members.length===0?<p className="helper">Chưa có nhân sự BTC.</p>:
    <div className="space-y-3">{members.map(m=><div className="flex gap-4 items-center justify-between flex-wrap border-b border-[#e5edf2] pb-3" key={m.userId}>
      <div className="min-w-0"><div className="font-bold break-all">{m.name||m.email||m.userId}</div><div className="helper break-all">{m.email||m.userId}{m.invited?" · Chưa xác nhận email":""}</div></div>
      <div className="flex w-full gap-2 items-center flex-wrap sm:w-auto">
       <ShieldCheck size={17} className="text-[#159ba6]"/>
       <select aria-label={"Vai trò của "+(m.email||m.userId)} className="field min-w-0 flex-1 sm:max-w-[230px]" value={m.role} disabled={busy} onChange={e=>{if(window.confirm("Xác nhận thay đổi quyền tài khoản này?"))void send("PATCH",{userId:m.userId,role:e.target.value});}}>
        {roles.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
       </select>
       <button type="button" className="btn btn-secondary text-red-700" disabled={busy} aria-label={"Xóa "+(m.email||m.userId)} onClick={()=>{if(window.confirm("Gỡ tài khoản này khỏi BTC Đại hội?"))void send("DELETE",{userId:m.userId});}}><Trash2 size={16}/></button>
      </div>
     </div>)}</div>}
  </section>
  <p className="helper">Quản trị Đại hội được quản lý đại biểu, phiên điểm danh, tài liệu và nhân sự. Nhân sự điểm danh chỉ ghi nhận QR/barcode/thủ công; thư ký được xem dữ liệu và báo cáo. Không được tự gỡ quyền của chính mình.</p>
 </div>;
}
