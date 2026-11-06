"use client";

import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Eye,EyeOff,LockKeyhole,Mail,ShieldCheck} from "lucide-react";
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

  return <main className="auth-shell flex min-h-dvh">
    <aside className="auth-aside hidden min-h-dvh w-[45%] flex-col justify-between px-10 py-11 lg:flex xl:px-16">
      <Link href="/" className="flex w-fit items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[9px] border border-white/25 bg-white/10 text-[12px] font-bold tracking-tight">ĐH</span>
        <span className="text-[17px] font-bold tracking-[-.03em]">Đại hội số</span>
      </Link>
      <div className="max-w-[530px]">
        <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.15em] text-[#b0c3e5]">
          <span className="h-px w-7 bg-[#a7c1ed]"/> KHÔNG GIAN DÀNH CHO BTC
        </p>
        <h1 className="mt-7 text-[39px] font-bold leading-[1.22] tracking-[-.055em] text-white xl:text-[48px]">
          Tổ chức bài bản.<br/>Điều hành chính xác.
        </h1>
        <p className="mt-6 max-w-[410px] text-[15px] leading-[1.85] text-[#c3cfdf]">
          Quản lý đại biểu, phiên làm việc, chỗ ngồi và báo cáo trên một hệ thống thống nhất.
        </p>
        <div className="mt-12 max-w-[420px] border-t border-white/20">
          {["Quản lý dữ liệu theo từng Đại hội","Phân quyền công việc cho Ban Tổ chức","Theo dõi hoạt động theo phiên"].map((item,index)=>
            <div key={item} className="flex items-center gap-4 border-b border-white/15 py-4">
              <span className="text-[11px] font-bold text-[#8facd9]">0{index+1}</span>
              <span className="text-[13px] font-medium text-[#e6ebf5]">{item}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-[#a5b5c9]">Đại hội số · Nền tảng quản lý Đại hội Đoàn – Hội</p>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col px-5 pb-12 pt-6 sm:px-10 sm:py-11 lg:justify-center lg:px-14">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="mb-16 flex items-center justify-between lg:mb-14">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[#68768b] hover:text-[#2456c9]">
            <ArrowLeft size={16}/> Trang chủ
          </Link>
          <span className="flex items-center gap-2 text-[12px] font-bold text-[#263650] lg:hidden"><span className="brand-icon">ĐH</span> Đại hội số</span>
        </div>

        <div className="mb-8">
          <p className="page-kicker">CỔNG QUẢN TRỊ NỘI BỘ</p>
          <h2 className="mt-4 text-[33px] font-bold leading-[1.18] tracking-[-.055em] text-[#1d2a3e] sm:text-[38px]">Chào mừng trở lại.</h2>
          <p className="mt-3 text-[14px] leading-7 text-[#788598]">Đăng nhập bằng tài khoản Ban Tổ chức đã được cấp quyền.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-[12px] border border-[#e2e7ef] bg-white p-5 shadow-[0_7px_20px_rgba(32,45,68,.025)] sm:p-7">
          <label className="block">
            <span className="label">Địa chỉ email</span>
            <span className="relative block">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-[14px] text-[#9aa5b4]"/>
              <input className="field pl-11!" type="email" inputMode="email" required autoComplete="username"
                value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@donvi.edu.vn"/>
            </span>
          </label>
          <label className="block">
            <span className="label">Mật khẩu</span>
            <span className="relative block">
              <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-[14px] text-[#9aa5b4]"/>
              <input className="field pl-11! pr-12!" type={showPassword?"text":"password"} required autoComplete="current-password"
                value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nhập mật khẩu"/>
              <button type="button" aria-label={showPassword?"Ẩn mật khẩu":"Hiện mật khẩu"} aria-pressed={showPassword}
                onClick={()=>setShowPassword(value=>!value)}
                className="absolute right-1 top-0 flex h-[44px] w-10 items-center justify-center rounded-md text-[#8b97a6] hover:text-[#2456c9]">
                {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
              </button>
            </span>
          </label>
          {error&&<p role="alert" className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-[12px] font-medium leading-6 text-red-700">{error}</p>}
          <button disabled={busy} type="submit" className="btn btn-primary mt-1 min-h-[46px] w-full justify-center">
            {busy?"Đang xác thực...":"Đăng nhập"} <ArrowRight size={17}/>
          </button>
        </form>
        <div className="mt-7 flex items-start gap-2.5 text-[12px] leading-6 text-[#8793a1]">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#7b8ba4]"/>
          <p>Chỉ tài khoản được phân quyền mới có thể truy cập. Hệ thống không mở đăng ký công khai.</p>
        </div>
      </div>
    </div>
  </main>;
}
