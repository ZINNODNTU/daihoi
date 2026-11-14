import {notFound,redirect} from "next/navigation";
import Link from "next/link";
import {Images,FolderTree,ArrowRight,ShieldCheck} from "lucide-react";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {resolveAdminSidebarCongress} from "@/lib/admin-sidebar-context";
import {AppShell} from "@/components/app-shell";
import {MediaLibraryClient,type MediaEntry} from "@/components/media-library-client";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function MediaLibraryPage({searchParams}:{
 searchParams:Promise<{congressId?:string}>
}){
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("platform_role,full_name")
  .eq("id",user.id).maybeSingle();
 if(profile?.platform_role!=="super_admin")redirect("/dashboard");
 const {congressId}=await searchParams;
 if(congressId&&(!UUID.test(congressId)||typeof congressId!=="string"))notFound();
 const db=createAdminClient();
 const [{data:congresses,error:congressError},sidebar]=await Promise.all([
  db.from("congresses").select("id,name,kind,status")
   .order("created_at",{ascending:false}).limit(100),
  resolveAdminSidebarCongress(db,congressId)
 ]);
 if(congressError)throw new Error("Không thể đọc danh sách Đại hội.");
 if(congressId&&!sidebar)notFound();
 const items:MediaEntry[]=[];
 if(sidebar){
  const [{data:delegates,error:delegatesError},{data:people,error:peopleError}]=await Promise.all([
   db.from("delegates").select("id,full_name,unit,photo_path,auth_user_id")
    .eq("congress_id",sidebar.id).eq("is_active",true)
    .order("full_name").limit(1000),
   db.from("bch_candidates").select("id,full_name,current_position,photo_path")
    .eq("congress_id",sidebar.id).order("full_name").limit(1000)
  ]);
  if(delegatesError||peopleError)throw new Error("Không thể đọc thông tin ảnh Đại hội.");
  for(const item of delegates||[]){
   items.push({id:item.id,kind:"delegate",name:item.full_name,
    detail:item.unit||"",linked:Boolean(item.photo_path),
    source:item.photo_path?.startsWith("people/")?"shared":"congress"});
  }
  for(const item of people||[]){
   items.push({id:item.id,kind:"bch",name:item.full_name,
    detail:item.current_position||"",linked:Boolean(item.photo_path),source:"congress"});
  }
 }
 return <AppShell name={profile.full_name||user.email||"Quản trị"}
  accessRole="super_admin" canViewSystemLogs
  congressId={sidebar?.id} congressName={sidebar?.name} congressKind={sidebar?.kind}>
  <section className="command-hero mb-6 px-6 py-8 sm:px-9">
   <p className="command-label"><Images size={16}/> MEDIA MANAGEMENT / ẢNH ĐẠI HỘI</p>
   <h1 className="mt-4 text-[clamp(28px,3.5vw,40px)] font-extrabold tracking-[-.04em] text-white">
    Thư viện ảnh tập trung
   </h1>
   <p className="mt-3 max-w-2xl text-[12px] leading-7 text-[#c6dbe6]">
    Theo dõi ảnh đại biểu và nhân sự BCH theo từng Đại hội trên một giao diện;
    giữ một bản ảnh gốc, quyền truy cập riêng tư và liên kết dữ liệu ổn định.
   </p>
   {sidebar&&<div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white">
    <FolderTree size={15}/> <span className="truncate">{sidebar.name}</span>
   </div>}
  </section>
  <section className="workspace-panel mb-5 px-5 py-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0"><p className="page-kicker">CẤU TRÚC STORAGE</p>
     <h2 className="section-title mt-1">Một thư mục gốc · Phân loại rõ ràng</h2>
    </div>
    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#45856d]">
     <ShieldCheck size={16}/> Bucket private
    </div>
   </div>
   <div className="mt-4 grid gap-3 rounded-xl border border-[#e0e9ef] bg-[#f6f9fb] p-4 text-[11px] text-[#45687e] sm:grid-cols-3">
    <p className="min-w-0 font-mono">media/congresses/<br/>…/delegates/</p>
    <p className="min-w-0 font-mono">media/congresses/<br/>…/bch/</p>
    <p className="min-w-0 font-mono">media/people/</p>
   </div>
   <p className="mt-3 text-[11px] leading-6 text-[#788e9d]">
    Các đường dẫn cũ vẫn được đọc tương thích; ảnh mới tự lưu về cấu trúc trên.
    Thư mục hiển thị là đường dẫn Storage thực, còn dữ liệu hồ sơ giữ nguyên.
   </p>
  </section>
  <section className="workspace-panel mb-5 px-5 py-4">
   <div className="flex flex-wrap items-center gap-3">
    <span className="shrink-0 text-[12px] font-bold text-[#415f74]">Chọn Đại hội</span>
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
     {(congresses||[]).map(c=><Link key={c.id} href={"/dashboard/media?congressId="+c.id}
      className={"inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold "+
       (sidebar?.id===c.id?"border-[#9ecbdc] bg-[#e5f2f8] text-[#1f6b8d]":"border-[#e0e9ef] bg-white text-[#658294]")}>
      <span className="max-w-[270px] truncate">{c.name}</span>
      {sidebar?.id===c.id&&<ArrowRight size={13}/>}
     </Link>)}
    </div>
   </div>
  </section>
  {sidebar?<MediaLibraryClient items={items}/>:
   <div className="workspace-panel p-9 text-center text-[13px] text-[#69899c]">
    Chưa có Đại hội để quản lý thư viện ảnh.
   </div>}
 </AppShell>;
}
