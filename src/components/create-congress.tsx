"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
export function CreateCongress(){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  const form=new FormData(e.currentTarget);const body=Object.fromEntries(form.entries());
  try { const res=await fetch("/api/congresses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Không thể tạo đại hội.");router.push(`/congresses/${data.congress.id}`);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Lỗi không xác định");}finally{setBusy(false);}
 }
 return <div className="card p-7 max-w-3xl"><h2 className="section-title mb-2">Tạo Đại hội mới</h2><p className="helper mb-7">Chỉ quản trị hệ thống có thể tạo mới; dữ liệu các Đại hội tách biệt.</p>
 <form onSubmit={create} className="grid md:grid-cols-2 gap-5">
  <label className="md:col-span-2"><span className="label">Tên Đại hội *</span><input name="name" className="field" required minLength={5} placeholder="Đại hội Đoàn Trường Đại học ABC lần thứ XII"/></label>
  <label><span className="label">Tên đơn vị *</span><input name="organization_name" className="field" required placeholder="Đoàn Trường Đại học ABC"/></label>
  <label><span className="label">Mã đơn vị *</span><input name="organization_code" className="field" required pattern="[a-z0-9-]+" placeholder="doan-truong-abc"/></label>
  <label><span className="label">Đường dẫn (slug) *</span><input name="slug" className="field" required pattern="[a-z0-9-]+" placeholder="dai-hoi-doan-abc-2027"/></label>
  <label><span className="label">Loại Đại hội</span><select name="kind" className="field"><option value="doan">Đoàn TNCS Hồ Chí Minh</option><option value="hoi_sinh_vien">Hội Sinh viên Việt Nam</option></select></label>
  <label><span className="label">Nhiệm kỳ</span><input name="term" className="field" placeholder="2027–2029"/></label>
  <label><span className="label">Địa điểm</span><input name="venue" className="field" placeholder="Hội trường A"/></label>
  {error&&<p role="alert" className="md:col-span-2 text-red-700 text-sm">{error}</p>}
  <button disabled={busy} className="btn btn-primary md:col-span-2">{busy?"Đang tạo...":"Tạo Đại hội"}</button>
 </form></div>;
}
