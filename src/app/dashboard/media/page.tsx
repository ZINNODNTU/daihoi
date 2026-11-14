import {notFound,redirect} from "next/navigation";
import Link from "next/link";
import {Images,FolderTree,ArrowRight,ShieldCheck} from "lucide-react";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {resolveAdminSidebarCongress} from "@/lib/admin-sidebar-context";
import {AppShell} from "@/components/app-shell";
import {MediaLibraryClient,type MediaEntry,type MediaCounts,type MediaFilter} from "@/components/media-library-client";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE=36;
const MIXED_SIZE=18;
const FILTERS=new Set(["all","delegate","bch","missing"]);
const cleanSearch=(value:unknown)=>typeof value==="string"?
 value.trim().replace(/[^\p{L}\p{N}\s-]/gu,"").replace(/\s+/g," ").slice(0,64):"";

export default async function MediaLibraryPage({searchParams}:{
 searchParams:Promise<{congressId?:string;filter?:string;q?:string;page?:string}>
}){
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("platform_role,full_name")
  .eq("id",user.id).maybeSingle();
 if(profile?.platform_role!=="super_admin")redirect("/dashboard");
 const params=await searchParams;
 const congressId=params.congressId;
 if(congressId&&(typeof congressId!=="string"||!UUID.test(congressId)))notFound();
 const filter:MediaFilter=FILTERS.has(params.filter||"")?params.filter as MediaFilter:"all";
 const query=cleanSearch(params.q);
 const requestedPage=typeof params.page==="string"&&/^[1-9]\d{0,3}$/.test(params.page)?
  Number(params.page):1;
 const db=createAdminClient();
 const [{data:congresses,error:congressError},sidebar]=await Promise.all([
  db.from("congresses").select("id,name,kind,status")
   .order("created_at",{ascending:false}).limit(100),
  resolveAdminSidebarCongress(db,congressId)
 ]);
 if(congressError)throw new Error("Không thể đọc danh sách Đại hội.");
 if(congressId&&!sidebar)notFound();
 const items:MediaEntry[]=[];
 let summary:MediaCounts={total:0,linked:0,missing:0,delegates:0,candidates:0};
 let totalMatches=0,pageCount=1,page=1;
 if(sidebar){
  const congress=sidebar.id;
  // Query only record counts (HEAD), not full rows, for totals.
  const countDelegateRows=(missing:boolean,term:string)=>{
   let q=db.from("delegates").select("id",{count:"exact",head:true})
    .eq("congress_id",congress).eq("is_active",true);
   if(missing)q=q.is("photo_path",null);
   if(term)q=q.or("full_name.ilike.*"+term+"*,unit.ilike.*"+term+"*");
   return q;
  };
  const bchCountQuery=(missing:boolean,term:string)=>{
   let q=db.from("bch_candidates").select("id",{count:"exact",head:true})
    .eq("congress_id",congress);
   if(missing)q=q.is("photo_path",null);
   if(term)q=q.or("full_name.ilike.*"+term+"*,current_position.ilike.*"+term+"*");
   return q;
  };
  const delegatePage=(missing:boolean,term:string,from:number,to:number)=>{
   let q=db.from("delegates").select("id,full_name,unit,photo_path")
    .eq("congress_id",congress).eq("is_active",true);
   if(missing)q=q.is("photo_path",null);
   if(term)q=q.or("full_name.ilike.*"+term+"*,unit.ilike.*"+term+"*");
   return q.order("full_name").order("id").range(from,to);
  };
  const bchPage=(missing:boolean,term:string,from:number,to:number)=>{
   let q=db.from("bch_candidates").select("id,full_name,current_position,photo_path")
    .eq("congress_id",congress);
   if(missing)q=q.is("photo_path",null);
   if(term)q=q.or("full_name.ilike.*"+term+"*,current_position.ilike.*"+term+"*");
   return q.order("full_name").order("id").range(from,to);
  };
  const [totalDelegates,missingDelegates,totalBch,missingBch]=await Promise.all([
   countDelegateRows(false,""),countDelegateRows(true,""),
   bchCountQuery(false,""),bchCountQuery(true,"")
  ]);
  if(totalDelegates.error||missingDelegates.error||totalBch.error||missingBch.error)
   throw new Error("Không thể tổng hợp thư viện ảnh.");
  const delegateCount=totalDelegates.count||0,bchCount=totalBch.count||0;
  const missingCount=(missingDelegates.count||0)+(missingBch.count||0);
  summary={total:delegateCount+bchCount,
   linked:delegateCount+bchCount-missingCount,missing:missingCount,
   delegates:delegateCount,candidates:bchCount};
  const absent=filter==="missing";
  // Counts and pages use the SAME search/absence conditions. Avoid loading
  // hundreds of people merely to filter them in browser JavaScript.
  const [delegateMatches,bchMatches]=await Promise.all([
   filter==="bch"?Promise.resolve({count:0,error:null}):
    !query?(absent?missingDelegates:totalDelegates):countDelegateRows(absent,query),
   filter==="delegate"?Promise.resolve({count:0,error:null}):
    !query?(absent?missingBch:totalBch):bchCountQuery(absent,query)
  ]);
  if(delegateMatches.error||bchMatches.error)
   throw new Error("Không thể tìm kiếm hồ sơ ảnh.");
  const dCount=delegateMatches.count||0,bCount=bchMatches.count||0;
  totalMatches=dCount+bCount;
  const mixed=filter==="all"||filter==="missing";
  const batch=mixed?MIXED_SIZE:PAGE_SIZE;
  pageCount=Math.max(1,mixed?
   Math.max(Math.ceil(dCount/batch),Math.ceil(bCount/batch)):
   Math.ceil(totalMatches/batch));
  page=Math.min(requestedPage,pageCount);
  const from=(page-1)*batch,to=from+batch-1;
  const [delegateRows,bchRows]=await Promise.all([
   dCount?delegatePage(absent,query,from,to):
    Promise.resolve({data:[],error:null}),
   bCount?bchPage(absent,query,from,to):
    Promise.resolve({data:[],error:null})
  ]);
  if(delegateRows.error||bchRows.error)throw new Error("Không thể đọc trang thư viện ảnh.");
  for(const entry of delegateRows.data||[]){
   items.push({id:entry.id,kind:"delegate",name:entry.full_name,
    detail:entry.unit||"",linked:Boolean(entry.photo_path),
    source:entry.photo_path?.startsWith("people/")?"shared":"congress"});
  }
  for(const entry of bchRows.data||[]){
   items.push({id:entry.id,kind:"bch",name:entry.full_name,
    detail:entry.current_position||"",linked:Boolean(entry.photo_path),source:"congress"});
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
    Ảnh được phân nhóm trong Storage và đọc qua API có kiểm tra quyền.
   </p>
  </section>
  <section className="workspace-panel mb-5 px-5 py-4">
   <div className="flex flex-wrap items-center gap-3">
    <span className="shrink-0 text-[12px] font-bold text-[#415f74]">Chọn Đại hội</span>
    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
     {(congresses||[]).map(c=><Link key={c.id} prefetch={false} href={"/dashboard/media?congressId="+c.id}
      className={"inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-bold "+
       (sidebar?.id===c.id?"border-[#9ecbdc] bg-[#e5f2f8] text-[#1f6b8d]":"border-[#e0e9ef] bg-white text-[#658294]")}>
      <span className="max-w-[270px] truncate">{c.name}</span>
      {sidebar?.id===c.id&&<ArrowRight size={13}/>}
     </Link>)}
    </div>
   </div>
  </section>
  {sidebar?<MediaLibraryClient items={items} summary={summary}
   filter={filter} query={query} congressId={sidebar.id}
   page={page} pageCount={pageCount} totalMatches={totalMatches}/>:
   <div className="workspace-panel p-9 text-center text-[13px] text-[#69899c]">
    Chưa có Đại hội để quản lý thư viện ảnh.
   </div>}
 </AppShell>;
}