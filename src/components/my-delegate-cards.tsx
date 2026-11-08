"use client";
import {useEffect,useState} from "react";
import {QRCodeSVG} from "qrcode.react";
import {CheckCircle2,Download,Eye,EyeOff,IdCard,LockKeyhole,Printer} from "lucide-react";
import {DelegateBarcode} from "@/components/delegate-barcode";
type Item={id:string;code:string;full_name:string;unit:string;position:string;student_id:string|null;login_email:string|null;congress_id:string};
type Card={token:string;barcodeCode:string;scope:string;code:string;full_name:string};
export function MyDelegateCards({items}:{items:Item[]}){
 const [cards,setCards]=useState<Record<string,Card>>({});
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [saving,setSaving]=useState(false),[password,setPassword]=useState(""),[visible,setVisible]=useState(false);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  let active=true;
  Promise.all(items.map(async item=>{
   try{
    const res=await fetch("/api/delegates/"+item.id+"/qr",{cache:"no-store"});
    const json=await res.json();
    if(!res.ok)throw new Error(json.error||"Không tải được QR.");
    if(active)setCards(prev=>({...prev,[item.id]:json}));
   }catch(error){if(active)setErrors(prev=>({...prev,[item.id]:error instanceof Error?error.message:"Lỗi mã QR"}));}
  }));
  return()=>{active=false;};
 },[items]);
 function downloadSvg(id:string,filename:string){
  const svg=document.getElementById(id);
  if(!svg)return;
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function changePassword(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(password.length<12)return setNotice("Mật khẩu cần ít nhất 12 ký tự.");
  setSaving(true);setNotice("");
  try{
   const {createClient}=await import("@/lib/supabase/browser");
   const {error}=await createClient().auth.updateUser({password});
   if(error)throw error;
   setPassword("");setNotice("Đổi mật khẩu thành công.");
  }catch(err){setNotice(err instanceof Error?err.message:"Không thể đổi mật khẩu.");}
  finally{setSaving(false);}
 }
 return <div className="space-y-6">
  <div className="grid gap-5 xl:grid-cols-2">{items.map((d,i)=><article key={d.id} className="card overflow-hidden">
   <div className="flex items-center justify-between gap-3 border-b border-[#dceaf2] bg-[#edf8fd] px-5 py-4">
    <div className="flex items-center gap-2 font-bold text-[#06547b]"><IdCard size={19}/> THẺ ĐẠI BIỂU</div>
    <span className="badge badge-blue">Đại hội {i+1}</span>
   </div>
   <div className="p-5 sm:p-7">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#007eb8]">{d.unit||"Đại biểu"}</p>
    <h2 className="mt-2 text-[23px] font-bold text-[#17334a]">{d.full_name}</h2>
    <p className="helper mt-1">{d.position||"Đại biểu"} · {d.student_id||d.code}</p>
    {cards[d.id]?<div className="mt-6 flex flex-col items-center rounded-xl border border-[#daedf6] bg-[#f8fcfe] p-5">
     <div className="rounded-xl border border-[#e5ecf0] bg-white p-3"><QRCodeSVG id={"my-qr-"+d.id} value={cards[d.id].token} size={200} level="M" marginSize={1}/></div>
     <p className="mt-3 text-center text-xs text-[#517589]">QR định danh cố định · Chỉ sử dụng cho chính bạn</p>
     <div className="mt-5 max-w-full overflow-auto rounded-lg bg-white px-2 py-4"><DelegateBarcode value={cards[d.id].barcodeCode}/></div>
    </div>:<p role={errors[d.id]?"alert":"status"} className="mt-6 rounded-lg bg-[#e8f6fb] p-4 text-sm text-[#295e78]">{errors[d.id]||"Đang tải mã định danh..."}</p>}
    <div className="mt-5 flex flex-wrap gap-2">
     <button disabled={!cards[d.id]} onClick={()=>downloadSvg("my-qr-"+d.id,"QR-"+d.code+".svg")} className="btn btn-secondary"><Download size={16}/> Tải mã QR</button>
     <button disabled={!cards[d.id]} onClick={()=>window.print()} className="btn btn-primary"><Printer size={16}/> In thẻ</button>
    </div>
   </div>
  </article>)}</div>
  <form onSubmit={changePassword} className="card max-w-xl p-5 sm:p-7">
   <div className="flex items-center gap-2 text-[17px] font-bold text-[#1d3e53]"><LockKeyhole size={19} className="text-[#007eb8]"/> Đổi mật khẩu</div>
   <p className="helper mt-3">Hãy thay mật khẩu được cấp ban đầu sau lần đăng nhập đầu tiên. Không chia sẻ mật khẩu hoặc tệp tài khoản với người khác.</p>
   <label className="mt-5 block"><span className="label">Mật khẩu mới (tối thiểu 12 ký tự)</span>
    <span className="relative block"><input className="field pr-12!" value={password} onChange={e=>setPassword(e.target.value)} type={visible?"text":"password"} autoComplete="new-password" minLength={12} required/>
    <button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?"Ẩn mật khẩu":"Hiện mật khẩu"} className="absolute right-2 top-1 h-9 w-9 text-[#52788b]">{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
   {notice&&<p role="status" className="helper mt-3 flex items-center gap-1"><CheckCircle2 size={16}/>{notice}</p>}
   <button disabled={saving||password.length<12} className="btn btn-primary mt-4" type="submit">{saving?"Đang lưu...":"Cập nhật mật khẩu"}</button>
  </form>
 </div>;
}
