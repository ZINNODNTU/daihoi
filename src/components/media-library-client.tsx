"use client";

import {useState} from "react";
import Image from "next/image";
import {ImageOff,Images,Search,UserRoundCheck,Users} from "lucide-react";

export type MediaEntry={
 id:string;kind:"delegate"|"bch";name:string;detail:string;
 linked:boolean;source:"congress"|"shared";
};
type Filter="all"|"delegate"|"bch"|"missing";
export function MediaLibraryClient({items}:{items:MediaEntry[]}){
 const [search,setSearch]=useState("");
 const [filter,setFilter]=useState<Filter>("all");
 const summary={
  total:items.length,
  linked:items.filter(item=>item.linked).length,
  missing:items.filter(item=>!item.linked).length,
  delegates:items.filter(item=>item.kind==="delegate").length,
  candidates:items.filter(item=>item.kind==="bch").length
 };
 const filtered=(()=>{
  const q=search.trim().toLocaleLowerCase("vi");
  return items.filter(entry=>{
   if(filter==="missing"&&entry.linked)return false;
   if((filter==="delegate"||filter==="bch")&&entry.kind!==filter)return false;
   return !q||entry.name.toLocaleLowerCase("vi").includes(q)||
    entry.detail.toLocaleLowerCase("vi").includes(q);
  });
 })();
 const tabs:readonly {id:Filter;label:string;count:number}[]=[
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
    <label className="relative block w-full sm:w-[280px]">
     <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-[#7390a0]"/>
     <input value={search} onChange={e=>setSearch(e.target.value)}
      placeholder="Tìm theo tên hoặc đơn vị..." aria-label="Tìm ảnh hồ sơ"
      className="field min-h-11 pl-10"/>
    </label>
   </div>
   <div className="flex flex-wrap gap-2 border-b border-[#e5edf2] px-5 py-3">
    {tabs.map(tab=><button type="button" key={tab.id} onClick={()=>setFilter(tab.id)}
     aria-pressed={filter===tab.id}
     className={"inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-bold "+
      (filter===tab.id?"bg-[#deeff7] text-[#1b7096]":"border border-[#e1eaf0] bg-white text-[#607d91] hover:bg-[#f3f8fa]")}>
     {tab.label}<span className="rounded-md bg-white/75 px-1.5 py-0.5 text-[10px]">{tab.count}</span>
    </button>)}
   </div>
   <p className="px-5 pt-4 text-[11px] text-[#718c9d]">{filtered.length} hồ sơ phù hợp · Hiển thị ảnh qua API có xác thực và kiểm tra quyền; không công khai bucket.</p>
   {filtered.length?<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
    {filtered.map(item=><div key={item.kind+":"+item.id} className="min-w-0 overflow-hidden rounded-xl border border-[#e0e9ee] bg-white">
     <div className="relative mx-auto flex aspect-[3/4] max-h-[242px] items-center justify-center overflow-hidden bg-[#edf4f7]">
      {item.linked?<Image
       src={item.kind==="delegate"?"/api/delegates/"+item.id+"/photo?w=160":
        "/api/bch-candidates/"+item.id+"/photo?w=160"}
       width={160} height={213} unoptimized
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
   <div className="border-t border-[#e5edf2] bg-[#f7fafb] px-5 py-3 text-[11px] text-[#8296a4]">
    Ảnh được lưu trong bucket riêng tư · Không nhân bản ảnh 96px / 160px vào Storage.
    Thay ảnh tại phân hệ Đại biểu hoặc Nhân sự BCH tương ứng.
   </div>
  </div>
 </div>;
}
