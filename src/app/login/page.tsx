"use client";

import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Eye,EyeOff,LockKeyhole,Mail,ShieldCheck} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";
import {createClient} from "@/lib/supabase/browser";
import {toSupabaseAuthEmail} from "@/lib/login-identity";

export default function Login(){
  const router=useRouter();
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const supabaseReady=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");
    try{
      if(!supabaseReady)throw new Error("Máy chủ chưa có Supabase Publishable Key. Hãy liên hệ quản trị viên.");
      const client=createClient();
      const normalized=email.trim().toLowerCase();
      const internal=toSupabaseAuthEmail(normalized);
      let {data:authData,error:authError}=await client.auth.signInWithPassword({email:internal,password});
      // Tài khoản email cơ quan có thật (đã mời từ trước) vẫn đăng nhập được.
      if(authError&&internal!==normalized){
       ({data:authData,error:authError}=await client.auth.signInWithPassword({email:normalized,password}));
      }
      if(authError||!authData.user)throw authError||new Error("Không thể xác thực tài khoản.");
      const {data:myDelegate}=await client.from("delegates").select("id").eq("auth_user_id",authData.user.id).eq("is_active",true).limit(1).maybeSingle();
      router.push(myDelegate?"/my-card":"/dashboard");router.refresh();
    }catch(err){
      setError(err instanceof Error?err.message:"Đăng nhập thất bại. Hãy thử lại.");
      setBusy(false);
    }
  }

  return <main className="auth-shell flex min-h-dvh">
    <aside className="auth-aside relative hidden min-h-dvh w-[45%] flex-col justify-between overflow-hidden px-10 py-11 lg:flex xl:px-16">
      <div className="auth-pattern" aria-hidden="true"/>
      <Link href="/" className="relative flex w-fit items-center gap-3">
        <BrandMark/>
        <span className="text-[17px] font-bold tracking-[-.04em] text-white">Đại hội số<span className="ml-1 text-[#e6c283]">.</span></span>
      </Link>
      <div className="relative max-w-[510px] pb-8">
        <p className="premium-eyebrow">KHÔNG GIAN ĐIỀU HÀNH NỘI BỘ</p>
        <h1 className="mt-9 text-[clamp(37px,3.5vw,55px)] font-semibold leading-[1.22] tracking-[-.035em] text-white">
          Tổ chức<br/>chuẩn mực.<br/><span className="font-sans font-semibold not-italic tracking-[-.035em] text-[#ffdf83]">Điều hành chủ động.</span>
        </h1>
        <p className="mt-7 max-w-[380px] text-[14px] leading-[1.95] text-[#b6c7df]">
          Một hệ thống thống nhất để Ban Tổ chức chuẩn bị, phối hợp và điều hành Đại hội từ đầu đến cuối.
        </p>
        <div className="mt-12 grid max-w-[420px] gap-0 border-y border-white/15">
          {[
            ["01","Phân quyền công việc rõ ràng"],
            ["02","Theo dõi từng phiên làm việc"],
            ["03","Tổng hợp dữ liệu tập trung"]
          ].map(([number,title])=><div key={number} className="flex items-center gap-5 border-b border-white/10 py-4 last:border-b-0">
            <span className="text-[11px] font-bold text-[#d4b47c]">{number}</span>
            <span className="text-[13px] font-medium text-[#d4e0f0]">{title}</span>
          </div>)}
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-3 text-[11px] text-[#94a7c3]">
        <span>ĐẠI HỘI SỐ / WORKSPACE</span>
        <span>Đoàn – Hội</span>
      </div>
    </aside>

    <section className="flex min-w-0 flex-1 flex-col px-5 pb-12 pt-6 sm:px-10 sm:py-11 lg:justify-center lg:px-14">
      <div className="mx-auto w-full max-w-[430px]">
        <div className="mb-14 flex items-center justify-between lg:mb-18">
          <Link href="/" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[#778499] hover:text-[#0084bd]"><ArrowLeft size={16}/> Trang chủ</Link>
          <Link href="/" className="flex items-center gap-2 text-[12px] font-bold text-[#263650] lg:hidden"><BrandMark className="brand-symbol-light !h-8 !w-8 !flex-[0_0_32px] !rounded-[8px] [&_svg]:!h-6 [&_svg]:!w-6"/> Đại hội số</Link>
        </div>

        <div className="mb-9">
          <p className="page-kicker">ĐĂNG NHẬP HỆ THỐNG</p>
          <h2 className="mt-5 text-[35px] font-bold leading-[1.14] tracking-[-.055em] text-[#1c2b41] sm:text-[41px]">Chào mừng<br/>trở lại.</h2>
          <p className="mt-4 max-w-[400px] text-[14px] leading-7 text-[#758398]">Sử dụng tài khoản đã được Ban Tổ chức cấp quyền để truy cập không gian làm việc.</p>
        </div>

        <form onSubmit={submit} className="space-y-5 rounded-[13px] border border-[#e0e6ef] bg-white p-5 shadow-[0_12px_34px_rgba(18,32,56,.045)] sm:p-8">
          <label className="block">
            <span className="label !mb-2">Địa chỉ email</span>
            <span className="relative block">
              <Mail size={17} className="pointer-events-none absolute left-3.5 top-[14px] text-[#93a0b1]"/>
              <input className="field pl-11!" type="email" inputMode="email" required autoComplete="username"
                value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@donvi.edu.vn"/>
            </span>
          </label>
          <label className="block">
            <span className="label !mb-2">Mật khẩu</span>
            <span className="relative block">
              <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-[14px] text-[#93a0b1]"/>
              <input className="field pl-11! pr-12!" type={showPassword?"text":"password"} required autoComplete="current-password"
                value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nhập mật khẩu"/>
              <button type="button" aria-label={showPassword?"Ẩn mật khẩu":"Hiện mật khẩu"} aria-pressed={showPassword}
                onClick={()=>setShowPassword(value=>!value)}
                className="absolute right-1 top-0 flex h-[44px] w-10 items-center justify-center rounded-md text-[#8c98a8] hover:text-[#0084bd]">
                {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
              </button>
            </span>
          </label>
          {!supabaseReady&&<div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-6 text-amber-900">
            <strong className="block text-[13px]">Chưa kết nối cơ sở dữ liệu</strong>
            <span>Thiếu Supabase Publishable Key. Quản trị viên cần cập nhật <code className="font-semibold">.env.local</code> rồi khởi động lại web.</span>
          </div>}
          {error&&<p role="alert" className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-[12px] font-medium leading-6 text-red-700">{error}</p>}
          <button disabled={busy||!supabaseReady} type="submit" className="btn btn-primary mt-1 min-h-[48px] w-full justify-center !text-[13px]">
            {busy?"Đang xác thực...":"Đăng nhập vào hệ thống"} <ArrowRight size={17}/>
          </button>
        </form>
        <div className="mt-7 flex items-start gap-2.5 border-t border-[#e1e6ee] pt-5 text-[12px] leading-6 text-[#8794a6]">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#637a9c]"/>
          <p>Truy cập được kiểm soát theo tài khoản và quyền Đại hội. Hệ thống không hỗ trợ tự đăng ký.</p>
        </div>
      </div>
    </section>
  </main>;
}
