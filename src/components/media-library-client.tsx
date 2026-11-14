import Link from "next/link";
import Image from "next/image";
import {ImageOff,Images,Search,UserRoundCheck,Users} from "lucide-react";

export type MediaEntry={
 id:string;kind:"delegate"|"bch";name:string;detail:string;
 linked:boolean;source:"congress"|"shared";
};
export type MediaFilter="all"|"delegate"|"bch"|"missing";
export type MediaCounts={
 total:number;linked:number;missing:number;delegates:number;candidates:number;
};
export function MediaLibraryClient({items,summary,filter,query,congressId,page,pageCount,totalMatches}:{
 items:MediaEntry[];summary:MediaCounts;filter:MediaFilter;query:string;
 congressId:string;page:number;pageCount:number;totalMatches:number;
}){
 const link=(nextFilter:MediaFilter,nextPage:number)=>{
  const q=new URLSearchParams({congressId,filter:nextFilter,page:String(nextPage)});
  if(query)q.set("q",query);
  return "/dashboard/media?"+q;
 };
 const tabs:readonly {id:MediaFilter;label:string;count:number}[]=[
  {id:"all",label:"Tất cả",count:summary.total},
  {id:"delegate",label:"Đại biểu",count:summary.delegates},
  {id:"bch",label:"Nhân sự BCH",count:summary.candidates},
  {id:"missing",label:"Chưa có ảnh",count:summary.missing}
 ];
 return <div className="space-y-5">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[
    {title:"Tổng hồ sơ",value:summary.total,icon:Users},
    {title:"Có liên kết ảnh",value:summary.linked,icon:Images},
    {title:"Chưa có ảnh",value:summary.missing,icon:ImageOff},
    {title:"Đã gắn hồ sơ",value:summary.linked,icon:UserRoundCheck}
   ].map(({title,value,icon:Icon})=><div key={title} className="metric-card">
    <div className="flex items-center justify-between gap-2"><span className="metric-label">{title}</span>
     <span className="metric-icon"><Icon size={18}/></span></div>
    <p className="metric-value">{value.toLocaleString("vi-VN")}</p>
   </div>)}
  </div>
  <div className="workspace-panel overflow-hidden">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5edf2] px-5 py-4">
    <div><p className="page-kicker">THƯ VIỆN ẢNH ĐẠI HỘI</p>
     <h2 className="section-title mt-1">Ảnh liên kết theo hồ sơ</h2></div>
    <form method="GET" action="/dashboard/media" role="search"
     className="flex w-full flex-wrap gap-2 sm:w-auto">
     <input type="hidden" name="congressId" value={congressId}/>
     <input type="hidden" name="filter" value={filter}/>
     <label className="relative block min-w-0 flex-1 sm:w-[280px]">
      <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#7390a0]"/>
      <input type="search" name="q" defaultValue={query} maxLength={64}
       placeholder="Tìm tên hoặc đơn vị…" aria-label="Tìm ảnh hồ sơ"
       className="field min-h-11 pl-10"/>
     </label>
     <button type="submit" className="min-h-11 rounded-lg bg-[#206e90] px-4 text-[12px] font-bold text-white">
      Tìm
     </button>
    </form>
   </div>
   <div className="flex flex-wrap gap-2 border-b border-[#e5edf2] px-5 py-3">
    {tabs.map(tab=><Link key={tab.id} prefetch={false} href={link(tab.id,1)}
     aria-current={filter===tab.id?"page":undefined}
     className={"inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold "+
      (filter===tab.id?"bg-[#deeff7] text-[#1b7096]":"border border-[#e1eaf0] bg-white text-[#607d91] hover:bg-[#f3f8fa]")}>
     {tab.label}<span className="rounded-md bg-white/75 px-1.5 py-0.5 text-[10px]">{tab.count}</span>
    </Link>)}
   </div>
   <p className="px-5 pt-4 text-[11px] text-[#718c9d]">
    {totalMatches.toLocaleString("vi-VN")} hồ sơ phù hợp · Trang {page}/{pageCount}.
    Mỗi trang chỉ tải dữ liệu ảnh cần thiết, bucket không công khai.
   </p>
   {items.length?<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
    {items.map(item=><div key={item.kind+":"+item.id} className="min-w-0 overflow-hidden rounded-xl border border-[#e0e9ee] bg-white">
     <div className="relative mx-auto flex aspect-[3/4] max-h-[242px] items-center justify-center overflow-hidden bg-[#edf4f7]">
      {item.linked?<Image
       src={item.kind==="delegate"?"/api/delegates/"+item.id+"/photo?w=160":
        "/api/bch-candidates/"+item.id+"/photo?w=160"}
       width={160} height={213} unoptimized loading="lazy" decoding="async"
       alt={"Ảnh "+item.name} className="h-full w-full object-cover"/>:
       <ImageOff size={32} className="text-[#a0b8c5]"/>}
      <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-[9px] font-bold text-[#2b6884] backdrop-blur-sm">
       {item.kind==="delegate"?"Đại biểu":"BCH"}
      </span>
     </div>
     <div className="px-3 py-3">
      <p className="truncate text-[12px] font-extrabold text-[#2d4a60]" title={item.name}>{item.name}</p>
      <p className="mt-1 truncate text-[10px] text-[#7c93a4]" title={item.detail}>{item.detail||"Chưa cập nhật đơn vị"}</p>
      <p className={"mt-2 text-[10px] font-semibold "+(item.linked?"text-[#318875]":"text-[#a17e4a]")}>
       {item.linked?(item.source==="shared"?"Ảnh dùng chung liên Đại hội":"Đã liên kết ảnh"):"Chưa tải ảnh"}
      </p>
     </div>
    </div>)}
   </div>:<div className="px-6 py-14 text-center"><ImageOff className="mx-auto text-[#a2b4c1]" size={36}/>
    <p className="mt-3 text-sm font-semibold text-[#456173]">Không tìm thấy hồ sơ phù hợp.</p>
   </div>}
   {pageCount>1&&<nav aria-label="Phân trang thư viện ảnh"
    className="flex flex-wrap items-center justify-center gap-3 border-t border-[#e5edf2] px-5 py-4">
    {page>1?<Link prefetch={false} href={link(filter,page-1)}
     className="min-h-11 rounded-lg border border-[#c8dfe9] bg-[#f2f8fb] px-4 py-3 text-[12px] font-bold text-[#206d91]">Trang trước</Link>:
     <span className="px-3 text-[12px] text-[#9caeba]">Trang trước</span>}
    <span className="text-[12px] font-bold text-[#527589]">{page} / {pageCount}</span>
    {page<pageCount?<Link prefetch={false} href={link(filter,page+1)}
     className="min-h-11 rounded-lg border border-[#c8dfe9] bg-[#f2f8fb] px-4 py-3 text-[12px] font-bold text-[#206d91]">Trang tiếp</Link>:
     <span className="px-3 text-[12px] text-[#9caeba]">Trang tiếp</span>}
   </nav>}
   <div className="border-t border-[#e5edf2] bg-[#f7fafb] px-5 py-3 text-[11px] text-[#8296a4]">
    Ảnh được lưu trong bucket riêng tư. Thay ảnh tại phân hệ Đại biểu hoặc Nhân sự BCH tương ứng.
   </div>
  </div>
 </div>;
}
