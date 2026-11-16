"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Check,ClipboardCopy,Eye,EyeOff,ShieldCheck} from "lucide-react";
import {CONGRESS_FORMAL_HEADING,congressFullName,type CongressTitleKind} from "@/lib/congress-title";

type Issued={userId:string;name:string;email:string;initialPassword:string};
export function CreateCongress(){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const [issued,setIssued]=useState<{congressId:string;credentials:Issued}|null>(null);
 const [showPassword,setShowPassword]=useState(false),[copied,setCopied]=useState(false);
  const [kind,setKind]=useState<CongressTitleKind>("doan");
  const [congressName,setCongressName]=useState("");
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||issued)return;
  setBusy(true);setError("");
  const form=new FormData(e.currentTarget),body=Object.fromEntries(form.entries());
  try{
   const res=await fetch("/api/congresses",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Không thể tạo Đại hội.");
   setIssued({congressId:data.congress.id,credentials:data.primaryAdmin});
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Lỗi không xác định");}
  finally{setBusy(false);}
 }
 async function copy(){
  if(!issued)return;
  const a=issued.credentials;
  try{
   await navigator.clipboard.writeText("Đăng nhập: /login\nTài khoản: "+a.email+"\nMật khẩu: "+a.initialPassword);
   setCopied(true);
  }catch{setError("Không thể sao chép tự động. Vui lòng sao chép thủ công.");}
 }
 return <div className="card max-w-4xl p-4 sm:p-7">
  <h2 className="section-title mb-2">Tạo Đại hội mới</h2>
  <p className="helper mb-7">Mỗi Đại hội được cấp duy nhất một tài khoản quản trị chính. Nhân sự BTC khác được cấp quyền riêng sau khi tạo.</p>
  {issued?<div role="status" className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
   <p className="flex items-center gap-2 font-bold text-emerald-800"><ShieldCheck size={19}/> Đã tạo Đại hội và tài khoản quản trị chính</p>
   <p className="text-xs leading-6 text-emerald-800">Hãy sao chép thông tin ngay: mật khẩu chỉ được hiển thị một lần. Tất cả tài khoản đăng nhập qua cùng cổng <Link href="/login" className="underline">/login</Link>.</p>
   <div className="grid gap-3 sm:grid-cols-2">
    <div><p className="label">Tài khoản · {issued.credentials.name}</p><code className="block break-all rounded-lg bg-white p-3 text-xs">{issued.credentials.email}</code></div>
    <div><p className="label">Mật khẩu cấp lần đầu</p>
     <div className="flex items-center gap-2 rounded-lg bg-white p-3">
      <code className="min-w-0 flex-1 break-all text-xs">{showPassword?issued.credentials.initialPassword:"••••••••••••••••"}</code>
      <button type="button" aria-label={showPassword?"Ẩn mật khẩu":"Hiện mật khẩu"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
     </div>
    </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <button type="button" onClick={()=>void copy()} className="btn btn-primary"><ClipboardCopy size={16}/>{copied?<><Check size={16}/> Đã sao chép</>:"Sao chép đăng nhập"}</button>
    <Link href={"/congresses/"+issued.congressId+"/team"} className="btn btn-secondary">Quản lý nhân sự BTC</Link>
    <button type="button" className="btn btn-secondary" onClick={()=>{setIssued(null);setCopied(false);setShowPassword(false);}}>Tạo Đại hội khác</button>
   </div>
  </div>:<form onSubmit={create} className="grid gap-4 sm:grid-cols-2 sm:gap-5">
   <div className="sm:col-span-2 space-y-2">
     <p className="label">Tên Đại hội *</p>
     <div className="rounded-xl border border-[#cbdfe9] bg-[#f2f7fa] px-4 py-3">
      <p className="text-[12px] font-extrabold leading-5 text-[#285675]">{CONGRESS_FORMAL_HEADING[kind]}</p>
      <p className="mt-1 text-[12px] text-[#718c9d]">Dòng tiêu đề cố định theo loại Đại hội · không cần nhập lại.</p>
     </div>
     <label className="block"><span className="label">Tên đơn vị / kỳ Đại hội</span>
      <input name="name" className="field" required minLength={2} maxLength={180}
       value={congressName} onChange={e=>setCongressName(e.target.value)}
       placeholder={kind==="doan"?"Khoa Công nghệ thông tin hoặc Chi đoàn 23DTH1":"Khoa Công nghệ thông tin hoặc Liên chi Hội..."}/>
     </label>
     {congressName.trim()&&<p className="text-[12px] leading-6 text-[#54788a]">
      <strong>Hiển thị:</strong> {congressFullName(congressName,kind)}
     </p>}
    </div>
   <label><span className="label">Tên đơn vị *</span><input name="organization_name" className="field" required placeholder="Đoàn Trường Đại học ABC"/></label>
   <label><span className="label">Mã đơn vị *</span><input name="organization_code" className="field" required pattern="[a-z0-9-]+" placeholder="doan-truong-abc"/></label>
   <label><span className="label">Đường dẫn (slug) *</span><input name="slug" className="field" required pattern="[a-z0-9-]+" placeholder="dai-hoi-doan-abc-2027"/></label>
   <label><span className="label">Loại Đại hội</span><select name="kind" className="field" value={kind} onChange={e=>setKind(e.target.value as CongressTitleKind)}><option value="doan">Đoàn TNCS Hồ Chí Minh</option><option value="hoi_sinh_vien">Hội Sinh viên Việt Nam</option></select></label>
   <label><span className="label">Nhiệm kỳ</span><input name="term" className="field" placeholder="2027–2029"/></label>
   <label><span className="label">Địa điểm</span><input name="venue" className="field" placeholder="Hội trường A"/></label>
   <label className="sm:col-span-2"><span className="label">Họ tên người quản trị chính BTC *</span>
    <input name="btc_admin_name" className="field" required minLength={2} maxLength={120} placeholder="Nguyễn Văn A"/>
    <span className="mt-1 block text-xs text-slate-500">Hệ thống sẽ cấp tài khoản quản trị riêng và mật khẩu mạnh ngay khi tạo Đại hội.</span>
   </label>
   {error&&<p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
   <button disabled={busy} className="btn btn-primary sm:col-span-2">{busy?"Đang tạo...":"Tạo Đại hội và tài khoản quản trị"}</button>
  </form>}
  {error&&issued&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
 </div>;
}
