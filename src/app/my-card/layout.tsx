import {redirect} from "next/navigation";
import {DelegateShell} from "@/components/delegate-shell";
import {getAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import Link from "next/link";
import {IdCard} from "lucide-react";

export const dynamic="force-dynamic";

export default async function DelegatePortalLayout({children}:{children:React.ReactNode}){
 const ready=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY));
 if(!ready)return <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 text-center">
  <IdCard size={38} className="text-[#0d6176]"/>
  <h1 className="mt-5 text-xl font-bold text-[#204457]">Cổng đại biểu chưa được kết nối</h1>
  <p className="mt-3 text-sm leading-7 text-[#718c99]">Cần cấu hình Supabase trên máy chủ để đăng nhập và xem thẻ.</p>
  <Link href="/login" className="mt-5 rounded-xl bg-[#145a70] px-5 py-3 text-sm font-bold text-white">Trở lại đăng nhập</Link>
 </main>;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
 const access=await getPortalCongressContext(user.id).catch(()=>null);
  const guestOnly=Boolean(access&&!access.delegateCongressIds.length&&access.guestCongressIds.length);
  return <DelegateShell name={profile?.full_name||user.email||"Đại biểu"} guestOnly={guestOnly}
    congresses={access?.options||[]} activeCongressId={access?.activeCongressId||null}>{children}</DelegateShell>;
}
