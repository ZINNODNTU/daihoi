"use client";
import {useCallback,useEffect,useState} from "react";
import {Check,ClipboardCopy,Eye,EyeOff,KeyRound,Link2,RefreshCw,ShieldCheck,ShieldOff} from "lucide-react";
type Status={slug:string;configured:boolean;enabled:boolean;rotatedAt:string|null};
export function CongressGuestAccessManager({congressId}:{congressId:string}){
 const [status,setStatus]=useState<Status|null>(null),[loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [code,setCode]=useState(""),[show,setShow]=useState(false),[copied,setCopied]=useState(false);
 const load=useCallback(async()=>{
  const res=await fetch("/api/congresses/"+congressId+"/guest-access",{cache:"no-store"});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"Không tải được mã khách.");
  setStatus(data);
 },[congressId]);
 useEffect(()=>{let live=true;
  async function initial(){
   try{await load();}catch(e){if(live)setError(String(e));}
   finally{if(live)setLoading(false);}
  }
  void initial();return()=>{live=false};
 },[load]);
 async function action(kind:"rotate"|"toggle"){
  if(kind==="rotate"&&status?.configured&&!window.confirm("Cấp lại mã khách? Tất cả mã và phiên khách cũ của Đại hội sẽ hết hiệu lực ngay."))return;
  setBusy(true);setError("");setMessage("");setCopied(false);
  try{
   const res=await fetch("/api/congresses/"+congressId+"/guest-access",{
    method:kind==="rotate"?"POST":"PATCH",
    headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:kind==="rotate"?undefined:JSON.stringify({enabled:!status?.enabled})
   });
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"Không lưu được cấu hình khách.");
   if(kind==="rotate"){setCode(data.accessCode);setShow(false);setMessage("Mã mới chỉ hiển thị ở đây một lần. Hãy lưu và chia sẻ riêng với khách.");}
   else{setCode("");setMessage(data.enabled?"Đã mở lại chế độ khách.":"Đã khóa toàn bộ lượt truy cập khách.");}
   await load();
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được cấu hình khách.");}
  finally{setBusy(false);}
 }
 const link=code&&status?typeof window!=="undefined"?window.location.origin+"/guest/"+status.slug+"#access="+encodeURIComponent(code):"":"";
 async function copy(value:string){
  try{await navigator.clipboard.writeText(value);setCopied(true);}
  catch{setError("Không sao chép được. Vui lòng sao chép thủ công.");}
 }
 return <section className="overflow-hidden rounded-2xl border border-[#d7e4eb] bg-white">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edf2] px-5 py-5 sm:px-6">
   <div><p className="flex items-center gap-2 text-[16px] font-extrabold text-[#25465a]"><Link2 size={19} className="text-[#0085ad]"/> Chế độ khách xem Đại hội</p>
    <p className="mt-2 text-xs leading-6 text-[#6b8597]">Cấp mã đường dẫn để khách không có tài khoản xem tài liệu được công bố và ứng viên BCH. Không có quyền điểm danh hoặc xem ghế.</p></div>
   <span className={"rounded-lg px-3 py-1.5 text-xs font-bold "+(status?.enabled?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-600")}>{loading?"Đang tải":status?.enabled?"Đang mở":"Chưa mở"}</span>
  </div>
  <div className="space-y-4 p-5 sm:p-6">
   {status&&<p className="text-xs text-[#637f94]">Đường dẫn khách: <code className="break-all font-bold">/guest/{status.slug}</code></p>}
   {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
   {message&&<p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}
   {code&&<div className="space-y-3 rounded-xl border border-[#b8d6e6] bg-[#f4fafc] p-4">
    <p className="text-xs font-bold text-[#245b77]">Mã khách mới · chỉ hiển thị một lần</p>
    <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-xs font-semibold">{show?code:"••••••••••••••••••••"}</code>
     <button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?"Ẩn mã":"Hiện mã"}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>
    <div className="flex flex-wrap gap-2">
     <button type="button" className="btn btn-primary !min-h-10" onClick={()=>void copy(link)}><ClipboardCopy size={15}/>{copied?<><Check size={15}/> Đã sao chép</>:"Sao chép đường dẫn kèm mã"}</button>
     <button type="button" className="btn btn-secondary !min-h-10" onClick={()=>void copy(code)}>Sao chép mã riêng</button>
    </div>
    <p className="text-[11px] leading-5 text-[#6d8798]">Mã trong đường dẫn được đặt ở phần # nên trình duyệt không gửi nó tới máy chủ khi tải trang. Trang sẽ tự xác minh mã qua HTTPS.</p>
   </div>}
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={loading||busy} className="btn btn-primary !min-h-11" onClick={()=>void action("rotate")}>
     <KeyRound size={16}/>{status?.configured?"Cấp lại mã khách":"Tạo mã khách"}</button>
    {status?.configured&&<button type="button" disabled={busy} className="btn btn-secondary !min-h-11" onClick={()=>void action("toggle")}>
     {status.enabled?<ShieldOff size={16}/>:<ShieldCheck size={16}/>}
     {status.enabled?"Khóa truy cập khách":"Mở lại truy cập khách"}</button>}
    <button type="button" className="btn btn-secondary !min-h-11" onClick={()=>{setLoading(true);void load().catch(e=>setError(String(e))).finally(()=>setLoading(false));}} disabled={busy||loading}><RefreshCw size={15}/> Làm mới</button>
   </div>
  </div>
 </section>;
}
