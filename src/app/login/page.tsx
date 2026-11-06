"use client";

import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Eye,EyeOff,Layers3,LockKeyhole,Mail,ShieldCheck,Sparkles} from "lucide-react";
import {createClient} from "@/lib/supabase/browser";

export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");
    try{
      const {error:authError}=await createClient().auth.signInWithPassword({email,password});
      if(authError)throw authError;
      router.push("/dashboard");router.refresh();
    }catch(err){
      setError(err instanceof Error?err.message:"Đăng nhập thất bại. Hãy thử lại.");
      setBusy(false);
    }
  }

  return <main className="flex min-h-dvh bg-[#f2f7f9]">
    <aside className="relative hidden min-h-dvh w-[46%] flex-col justify-between overflow-hidden bg-[#10364d] px-10 py-12 text-white lg:flex xl:px-16">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-[25%] h-[600px] w-[600px] rounded-full bg-[#149aa0]/20 blur-[80px]"/>
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-48 h-[520px] w-[520px] rounded-full bg-[#13b59b]/15 blur-[80px]"/>
      <Link href="/" className="relative flex w-fit items-center gap-3 font-black tracking-[.08em]">
        <span className="brand-icon"><Layers3 size={23}/></span>
        <span className="text-lg">ĐẠI HỘI <span className="text-[#78eadb]">SỐ</span></span>
      </Link>
      <div className="relative max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6be6d6]/20 bg-white/5 px-4 py-2 text-xs font-bold tracking-[.13em] text-[#9beadd]"><Sparkles size={15}/> ĐIỀU HÀNH TẬP TRUNG</span>
        <h1 className="mt-8 text-4xl font-black leading-[1.25] tracking-[-.04em] xl:text-5xl">Đón tiếp nhanh.<br/>Điều hành gọn.<br/><span className="text-[#6ce2d2]">Thông tin rõ ràng.</span></h1>
        <p className="mt-6 max-w-md text-base leading-8 text-[#bed4df]">Từ quản lý đại biểu đến điểm danh QR và báo cáo theo phiên — tất cả trong một không gian dành cho Ban Tổ chức.</p>
        <div className="mt-10 flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <ShieldCheck size={24} className="shrink-0 text-[#7ae5d9]"/>
          <p className="text-sm leading-relaxed text-[#bcd7e1]">Tài khoản và quyền truy cập được cấp riêng theo từng Đại hội.</p>
        </div>
      </div>
      <p className="relative text-xs tracking-wide text-[#8caebf]">Đoàn TNCS Hồ Chí Minh · Hội Sinh viên Việt Nam</p>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col px-4 pb-10 pt-5 sm:px-8 sm:py-10 lg:justify-center lg:px-12">
      <div className="mx-auto w-full max-w-[450px]">
        <div className="mb-8 flex items-center justify-between lg:mb-12">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#577788] hover:text-[#0c7c80]"><ArrowLeft size={17}/> Trang chủ</Link>
          <span className="flex items-center gap-2 text-xs font-black tracking-wider text-[#0e7f7f] lg:hidden"><Layers3 size={19}/> ĐẠI HỘI SỐ</span>
        </div>
        <div className="mb-7">
          <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#e0f4ef] text-[#087c7b]"><LockKeyhole size={23}/></div>
          <p className="eyebrow">Cổng dành cho Ban Tổ chức</p>
          <h2 className="page-title mt-2">Đăng nhập hệ thống</h2>
          <p className="page-description">Sử dụng tài khoản đã được quản trị viên cấp.</p>
        </div>

        <form onSubmit={submit} className="card space-y-5 p-5 shadow-[0_18px_55px_rgba(20,63,78,.07)] sm:p-8">
          <label className="block">
            <span className="label">Địa chỉ email</span>
            <span className="relative block"><Mail size={19} className="pointer-events-none absolute left-3.5 top-3.5 text-[#8aa1ad]"/>
              <input className="field pl-11!" type="email" inputMode="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@donvi.edu.vn"/>
            </span>
          </label>
          <label className="block">
            <span className="label">Mật khẩu</span>
            <span className="relative block"><LockKeyhole size={19} className="pointer-events-none absolute left-3.5 top-3.5 text-[#8aa1ad]"/>
              <input className="field pl-11! pr-12!" type={showPassword?"text":"password"} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nhập mật khẩu"/>
              <button type="button" className="absolute right-1 top-0 flex h-[46px] w-11 items-center justify-center rounded-lg text-[#688394] hover:text-[#0d7e84]"
                aria-label={showPassword?"Ẩn mật khẩu":"Hiện mật khẩu"} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>
                {showPassword?<EyeOff size={19}/>:<Eye size={19}/>}
              </button>
            </span>
          </label>
          {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={busy} type="submit" className="btn btn-primary min-h-[48px] w-full text-sm">
            {busy?"Đang xác thực...":"Đăng nhập"} <ArrowRight size={19}/>
          </button>
        </form>
        <p className="helper mt-6 text-center">Chỉ tài khoản được cấp quyền mới có thể đăng nhập. Hệ thống không mở đăng ký công khai.</p>
      </div>
    </div>
  </main>;
}
