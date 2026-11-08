"use client";
import {FormEvent,useState} from "react";
import {Eye,EyeOff,LockKeyhole,ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/browser";

export function AccountSecurity(){
 const [current,setCurrent]=useState("");
 const [next,setNext]=useState("");
 const [confirm,setConfirm]=useState("");
 const [show,setShow]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setError("");setSuccess(false);
  if(next.length<12){setError("Mật khẩu mới cần ít nhất 12 ký tự.");return;}
  if(next!==confirm){setError("Mật khẩu xác nhận không khớp.");return;}
  if(next===current){setError("Mật khẩu mới phải khác mật khẩu hiện tại.");return;}
  setBusy(true);
  try{
   const supabase=createClient();
   const {data:{user},error:getError}=await supabase.auth.getUser();
   if(getError||!user?.email)throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
   const {error:passwordError}=await supabase.auth.signInWithPassword({email:user.email,password:current});
   if(passwordError)throw new Error("Mật khẩu hiện tại không chính xác.");
   const {error:updateError}=await supabase.auth.updateUser({password:next});
   if(updateError)throw new Error(updateError.message||"Không thể thay đổi mật khẩu.");
   setCurrent("");setNext("");setConfirm("");setSuccess(true);
  }catch(e){
   setError(e instanceof Error?e.message:"Không thể cập nhật mật khẩu.");
  }finally{setBusy(false);}
 }
 return <section className="rounded-xl border border-[#dfe7ef] bg-white p-6 shadow-[0_10px_28px_rgba(20,37,63,.035)]">
  <div className="flex items-center gap-3">
   <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f5fb] text-[#007eb8]"><LockKeyhole size={21}/></span>
   <div><h2 className="text-[16px] font-bold text-[#20324d]">Đổi mật khẩu</h2>
    <p className="mt-1 text-[12px] leading-5 text-[#8692a4]">Xác nhận mật khẩu hiện tại trước khi thay đổi.</p></div>
  </div>
  <form className="mt-6 space-y-5" onSubmit={submit}>
   <label className="block"><span className="label">Mật khẩu hiện tại</span>
    <input type={show?"text":"password"} className="field mt-2" required
     autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)}/></label>
   <label className="block"><span className="label">Mật khẩu mới</span>
    <input type={show?"text":"password"} className="field mt-2" minLength={12} required
     autoComplete="new-password" value={next} onChange={e=>setNext(e.target.value)}/></label>
   <label className="block"><span className="label">Nhập lại mật khẩu mới</span>
    <input type={show?"text":"password"} className="field mt-2" minLength={12} required
     autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   <label className="flex w-fit cursor-pointer items-center gap-2 text-[12px] font-medium text-[#68778b]">
    <input type="checkbox" className="h-4 w-4 accent-[#007eb8]" checked={show} onChange={e=>setShow(e.target.checked)}/>
    {show?<EyeOff size={15}/>:<Eye size={15}/>} Hiện mật khẩu
   </label>
   <p className="text-[12px] leading-6 text-[#8692a4]">Sử dụng mật khẩu riêng, dài ít nhất 12 ký tự. Không chia sẻ với người khác.</p>
   {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] leading-6 text-red-700">{error}</p>}
   {success&&<p role="status" className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-[12px] leading-6 text-green-700"><ShieldCheck size={17} className="mt-1 shrink-0"/>Đã đổi mật khẩu thành công. Hãy dùng mật khẩu mới từ lần đăng nhập tiếp theo.</p>}
   <button disabled={busy} type="submit" className="btn btn-primary min-h-[44px] justify-center !text-[13px]">
    <LockKeyhole size={16}/>{busy?"Đang cập nhật...":"Lưu mật khẩu mới"}
   </button>
  </form>
 </section>;
}
