"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft,ArrowRight,LockKeyhole,Mail,Layers3} from "lucide-react";
import {createClient} from "@/lib/supabase/browser";
export default function Login() {
 const router=useRouter();
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");
  try{
   const {error}=await createClient().auth.signInWithPassword({email,password});
   if(error)throw error;
   router.push("/dashboard");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Đăng nhập thất bại.");setBusy(false);}
 }
 return <main className="min-h-screen flex bg-[#ecf5fa]">
  <div className="hidden lg:flex w-[46%] bg-[#0e3552] text-white p-14 flex-col justify-between relative overflow-hidden">
    <div className="absolute bg-[#12aaa9]/15 w-[500px] h-[500px] rounded-full top-[20%] left-[-20%] blur-3xl"/>
    <div className="relative flex items-center gap-3 font-black text-xl"><Layers3/> ĐẠI HỘI SỐ</div>
    <div className="relative"><div className="text-[#64dacf] text-sm tracking-widest font-bold">NỀN TẢNG ĐIỀU HÀNH</div><h1 className="text-5xl font-extrabold leading-tight mt-5">Đón tiếp nhanh.<br/>Điều hành gọn.<br/><span className="text-[#5ee3d5]">Dữ liệu minh bạch.</span></h1><p className="text-[#adc7d9] mt-6">Tất cả các kỳ đại hội được quản lý tập trung và bảo vệ bằng phân quyền.</p></div>
    <div className="text-[#7fa6be] text-sm relative">Đoàn TNCS Hồ Chí Minh • Hội Sinh viên Việt Nam</div>
  </div>
  <div className="flex-1 flex items-center justify-center p-6">
   <div className="w-full max-w-md">
    <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#7188a0] hover:text-[#116a9e] mb-12"><ArrowLeft size={16}/> Về trang chủ</Link>
    <h2 className="text-4xl font-extrabold tracking-tight">Chào mừng trở lại</h2>
    <p className="text-[#7c8fa3] mt-3 mb-9">Đăng nhập tài khoản Ban Tổ chức của bạn.</p>
    <form onSubmit={submit} className="card p-7 space-y-5">
      <div><label className="label">Địa chỉ email</label><div className="relative"><Mail className="absolute left-3 top-3 text-[#87a0b5]" size={20}/><input className="field pl-11!" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@truong.edu.vn"/></div></div>
      <div><label className="label">Mật khẩu</label><div className="relative"><LockKeyhole className="absolute left-3 top-3 text-[#87a0b5]" size={20}/><input className="field pl-11!" type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div></div>
      {error&&<p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</p>}
      <button disabled={busy} className="btn btn-primary w-full">{busy?"Đang xác thực...":"Đăng nhập"}<ArrowRight size={18}/></button>
    </form>
    <p className="helper text-center mt-7">Tài khoản do quản trị hệ thống cấp. Không hỗ trợ đăng ký công khai.</p>
   </div>
  </div>
 </main>
}
