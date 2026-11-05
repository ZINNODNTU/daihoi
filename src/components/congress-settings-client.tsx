"use client";
import {useState} from "react";
import {Save,Settings2} from "lucide-react";
type Status="preparing"|"live"|"completed";
type Values={id:string;name:string;term:string;venue:string;status:Status;slug:string;kind:string};
export function CongressSettingsClient({initial}:{initial:Values}){
 const [value,setValue]=useState(initial);
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
  <div><p className="text-sm font-bold text-[#159ba6] tracking-wider">THIẾT LẬP</p><h1 className="text-3xl font-extrabold mt-2">Cấu hình Đại hội</h1><p className="helper mt-2">Chỉnh sửa thông tin điều hành. Mã định danh và loại Đại hội không thay đổi.</p></div>
  {error&&<p role="alert" className="card p-4 text-red-700">{error}</p>}
  {message&&<p role="status" className="card p-4 text-teal-700">{message}</p>}
  <form className="card p-6 space-y-5" onSubmit={save}>
   <div className="flex gap-2 items-center font-bold text-lg"><Settings2 size={21}/> Thông tin tổ chức</div>
   <label className="block"><span className="text-sm font-semibold">Tên Đại hội</span><input className="field w-full mt-2" minLength={5} maxLength={250} required value={value.name} onChange={e=>setValue({...value,name:e.target.value})}/></label>
   <div className="grid gap-4 md:grid-cols-2">
    <label className="block"><span className="text-sm font-semibold">Nhiệm kỳ</span><input className="field w-full mt-2" maxLength={50} value={value.term} onChange={e=>setValue({...value,term:e.target.value})}/></label>
    <label className="block"><span className="text-sm font-semibold">Địa điểm</span><input className="field w-full mt-2" maxLength={180} value={value.venue} onChange={e=>setValue({...value,venue:e.target.value})}/></label>
   </div>
   <label className="block"><span className="text-sm font-semibold">Trạng thái Đại hội</span><select className="field w-full mt-2" value={value.status} onChange={e=>setValue({...value,status:e.target.value as Status})}>
    <option value="preparing">Đang chuẩn bị</option><option value="live">Đang diễn ra</option><option value="completed">Đã hoàn thành</option>
   </select></label>
   <p className="helper">Trạng thái Đại hội dùng để hiển thị và theo dõi tiến độ. Việc đóng/mở quét QR được kiểm soát riêng trong từng phiên điểm danh.</p>
   <div className="grid gap-3 sm:grid-cols-2 text-sm"><div className="rounded-xl bg-[#eff6f8] p-4"><b>Mã định danh</b><div className="break-all mt-2">{value.id}</div></div><div className="rounded-xl bg-[#eff6f8] p-4"><b>Đường dẫn</b><div className="break-all mt-2">{value.slug}</div></div></div>
   <button type="submit" className="btn btn-primary" disabled={busy}><Save size={17}/> {busy?"Đang lưu...":"Lưu thay đổi"}</button>
  </form>
 </div>;
}
