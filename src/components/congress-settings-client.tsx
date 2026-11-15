"use client";
import {useState} from "react";
import {Save,Settings2} from "lucide-react";
import {CONGRESS_FORMAL_HEADING,congressShortName,type CongressTitleKind} from "@/lib/congress-title";
type Status="preparing"|"live"|"completed";
type Values={id:string;name:string;term:string;venue:string;status:Status;slug:string;kind:string};
export function CongressSettingsClient({initial}:{initial:Values}){
 const kind:CongressTitleKind=initial.kind==="hoi_sinh_vien"?"hoi_sinh_vien":"doan";
 const [value,setValue]=useState({...initial,name:congressShortName(initial.name,kind)});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage("");setError("");
  try{
   const res=await fetch("/api/congress-settings",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    congressId:value.id,name:value.name,term:value.term,venue:value.venue,status:value.status
   })});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Không thể lưu.");
   setMessage("Đã cập nhật thông tin Đại hội.");
  }catch(e){setError(e instanceof Error?e.message:"Có lỗi xảy ra.");}
  finally{setBusy(false);}
 }
 return <div className="max-w-3xl space-y-6">
  <div><p className="text-sm font-bold text-[#007eb8] tracking-wider">THIẾT LẬP</p><h1 className="page-title mt-2">Cấu hình Đại hội</h1><p className="helper mt-2">Chỉnh sửa thông tin điều hành. Mã định danh và loại Đại hội không thay đổi.</p></div>
  {error&&<p role="alert" className="card p-4 text-red-700">{error}</p>}
  {message&&<p role="status" className="card p-4 text-teal-700">{message}</p>}
  <form className="card p-4 sm:p-6 space-y-5" onSubmit={save}>
   <div className="flex gap-2 items-center font-bold text-lg"><Settings2 size={21}/> Thông tin tổ chức</div>
   <div className="space-y-3">
     <p className="text-sm font-semibold">Tên Đại hội</p>
     <div className="rounded-xl border border-[#d3e2ec] bg-[#f1f7fa] px-4 py-3">
      <p className="text-[12px] font-extrabold leading-5 text-[#21516c]">{CONGRESS_FORMAL_HEADING[kind]}</p>
      <p className="mt-1 text-[11px] text-[#6e8798]">Tiêu đề cố định theo loại Đại hội.</p>
     </div>
     <label className="block"><span className="text-[12px] font-semibold text-[#456477]">Tên đơn vị / kỳ Đại hội</span>
      <input className="field mt-2 w-full" minLength={2} maxLength={180} required
       placeholder={kind==="doan"?"Khoa Công nghệ thông tin hoặc Chi đoàn 23DTH1":"Hội Sinh viên Khoa Công nghệ thông tin"}
       value={value.name} onChange={e=>setValue({...value,name:e.target.value})}/>
     </label>
     {value.name.trim()&&<p className="text-[12px] text-[#567b90]"><strong>Hiển thị:</strong> {CONGRESS_FORMAL_HEADING[kind]} {congressShortName(value.name,kind)}</p>}
    </div>
   <div className="grid gap-4 md:grid-cols-2">
    <label className="block"><span className="text-sm font-semibold">Nhiệm kỳ</span><input className="field w-full mt-2" maxLength={50} value={value.term} onChange={e=>setValue({...value,term:e.target.value})}/></label>
    <label className="block"><span className="text-sm font-semibold">Địa điểm</span><input className="field w-full mt-2" maxLength={180} value={value.venue} onChange={e=>setValue({...value,venue:e.target.value})}/></label>
   </div>
   <label className="block"><span className="text-sm font-semibold">Trạng thái Đại hội</span><select className="field w-full mt-2" value={value.status} onChange={e=>setValue({...value,status:e.target.value as Status})}>
    <option value="preparing">Đang chuẩn bị</option><option value="live">Đang diễn ra</option><option value="completed">Đã hoàn thành</option>
   </select></label>
   <p className="helper">Trạng thái Đại hội dùng để hiển thị và theo dõi tiến độ. Việc đóng/mở quét QR được kiểm soát riêng trong từng phiên điểm danh.</p>
   <div className="grid gap-3 sm:grid-cols-2 text-sm"><div className="rounded-xl bg-[#f6f8fc] p-4"><b>Mã định danh</b><div className="break-all mt-2">{value.id}</div></div><div className="rounded-xl bg-[#f6f8fc] p-4"><b>Đường dẫn</b><div className="break-all mt-2">{value.slug}</div></div></div>
   <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy}><Save size={17}/> {busy?"Đang lưu...":"Lưu thay đổi"}</button>
  </form>
 </div>;
}
