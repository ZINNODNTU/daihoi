"use client";

import {FormEvent,useEffect,useMemo,useState} from "react";
import Image from "next/image";
import {
 BookOpen,Camera,Download,Edit3,FileSpreadsheet,GraduationCap,RefreshCw,UserRound,
 Plus,Search,Trash2,UserRoundPlus,Users,X
} from "lucide-react";
import {DelegatePhotoEditor} from "@/components/delegate-photo-editor";
import {sortBchCandidates,validateBchInput,
 type BchCandidate} from "@/lib/bch-candidates";

type DelegateOption={id:string;full_name:string;position:string;code:string;photo_path:string|null};
type PhotoTarget={kind:"form"}|{kind:"existing";candidate:BchCandidate};
type UploadedPhoto={photo_path:string;updated_at:string};
type Props={
 congressId:string;congressName:string;congressCode:string;canManage:boolean;
 initialCandidates:BchCandidate[];initialError:string;delegates:DelegateOption[];
};
type FormDataState={
 full_name:string;birth_year:string;hometown:string;ethnicity:string;
 education_level:string;union_join_year:string;current_position:string;display_order:string;
};
const initial:FormDataState={
 full_name:"",birth_year:"",hometown:"",ethnicity:"",
 education_level:"",union_join_year:"",current_position:"",display_order:"0"
};
type Field=keyof FormDataState;
const fields:{key:Field;label:string;placeholder:string;type?:"number";required?:boolean}[]=[
 {key:"full_name",label:"Họ tên",placeholder:"Nguyễn Văn A",required:true},
 {key:"birth_year",label:"Năm sinh",placeholder:"2001",type:"number",required:true},
 {key:"hometown",label:"Quê quán",placeholder:"Biên Hòa, Đồng Nai",required:true},
 {key:"ethnicity",label:"Dân tộc",placeholder:"Kinh",required:true},
 {key:"education_level",label:"Trình độ",placeholder:"Đại học / Cao đẳng / Thạc sĩ...",required:true},
 {key:"union_join_year",label:"Năm vào Đoàn",placeholder:"2016",type:"number",required:true},
 {key:"current_position",label:"Chức vụ hiện tại",placeholder:"Bí thư Chi đoàn...",required:true},
];
const encodeFilename=(text:string)=>text.replace(/[^a-zA-Z0-9_-]+/g,"-").slice(0,48);
const formatCandidate=(c:BchCandidate):FormDataState=>({
 full_name:c.full_name,birth_year:String(c.birth_year),
 hometown:c.hometown,ethnicity:c.ethnicity,education_level:c.education_level,
 union_join_year:String(c.union_join_year),current_position:c.current_position,
 display_order:String(c.display_order)
});

function bchPhotoUrl(candidate:BchCandidate){
 return "/api/bch-candidates/"+encodeURIComponent(candidate.id)+"/photo?w=96&v="+
  encodeURIComponent(candidate.updated_at);
}
function BchPortrait({candidate,large=false}:{
 candidate:BchCandidate;large?:boolean
}){
 const dimensions=large?{width:64,height:86}:{width:46,height:62};
 const className=large?
  "h-[86px] w-16 shrink-0 rounded-lg border border-[#d8e7ef] bg-white object-cover":
  "h-[62px] w-[46px] shrink-0 rounded-lg border border-[#d8e7ef] bg-white object-cover";
 return candidate.photo_path?<Image unoptimized src={bchPhotoUrl(candidate)}
  alt={"Ảnh nhân sự "+candidate.full_name} {...dimensions} loading="lazy" className={className}/>:
  <div className={"flex shrink-0 items-center justify-center rounded-lg border border-[#e0eaf0] bg-[#edf4f8] text-[#9bafbb] "+
   (large?"h-[86px] w-16":"h-[62px] w-[46px]")} aria-label={"Chưa có ảnh của "+candidate.full_name}>
   <UserRound size={large?27:21}/>
  </div>;
}

export function BchCandidatesClient({
 congressId,congressName,congressCode,canManage,initialCandidates,initialError,delegates
}:Props){
 const [candidates,setCandidates]=useState(()=>sortBchCandidates(initialCandidates));
 const [search,setSearch]=useState("");
 const [form,setForm]=useState<FormDataState>(initial);
 const [showForm,setShowForm]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(initialError);
 const [notice,setNotice]=useState("");
 const [photoTarget,setPhotoTarget]=useState<PhotoTarget|null>(null);
 const [pendingPhoto,setPendingPhoto]=useState<Blob|null>(null);
 const [pendingPhotoPreview,setPendingPhotoPreview]=useState<string|null>(null);
 const [selectedDelegateId,setSelectedDelegateId]=useState("");
 useEffect(()=>()=>{if(pendingPhotoPreview)URL.revokeObjectURL(pendingPhotoPreview);},[pendingPhotoPreview]);
 const selectedDelegate=delegates.find(delegate=>delegate.id===selectedDelegateId);
 const currentFormCandidate=editing?candidates.find(candidate=>candidate.id===editing):null;
 const currentFormPhoto=pendingPhotoPreview||
  (currentFormCandidate?.photo_path?"/api/bch-candidates/"+currentFormCandidate.id+"/photo?v="+
   encodeURIComponent(currentFormCandidate.updated_at):null);
 async function uploadPhoto(candidateId:string,photo:Blob):Promise<UploadedPhoto>{
  const multipart=new FormData();
  multipart.append("photo",new File([photo],"portrait.jpg",{type:"image/jpeg"}));
  const response=await fetch("/api/bch-candidates/"+encodeURIComponent(candidateId)+"/photo",{
   method:"PUT",body:multipart
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||"Không tải được ảnh nhân sự BCH.");
  return result as UploadedPhoto;
 }
 async function savePhoto(photo:Blob){
  if(!photoTarget)return;
  if(photoTarget.kind==="form"){
   setPendingPhoto(photo);
   setPendingPhotoPreview(URL.createObjectURL(photo));
   setPhotoTarget(null);
   setNotice("Ảnh đã được crop nền trắng. Lưu hồ sơ để hoàn tất.");
   return;
  }
  const updated=await uploadPhoto(photoTarget.candidate.id,photo);
  setCandidates(previous=>previous.map(candidate=>
   candidate.id===photoTarget.candidate.id?{...candidate,...updated}:candidate
  ));
  setPhotoTarget(null);
  setNotice("Đã cập nhật ảnh chân dung cho "+photoTarget.candidate.full_name+".");
 }
 async function copyDelegatePhoto(){
  if(!selectedDelegate?.photo_path||busy)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/delegates/"+encodeURIComponent(selectedDelegate.id)+"/photo",{
    cache:"no-store"
   });
   if(!response.ok)throw new Error("Không lấy được ảnh đại biểu đã chọn.");
   const photo=await response.blob();
   if(photo.type!=="image/jpeg"||photo.size>2*1024*1024)
    throw new Error("Ảnh nguồn không phù hợp.");
   setPendingPhoto(photo);
   setPendingPhotoPreview(URL.createObjectURL(photo));
   setNotice("Đã sao chép ảnh từ đại biểu. Bạn có thể căn chỉnh lại trước khi lưu BCH.");
  }catch(e){setError(e instanceof Error?e.message:"Không sao chép được ảnh.");}
  finally{setBusy(false);}
 }

 const sorted=useMemo(()=>sortBchCandidates(candidates),[candidates]);
 const visible=useMemo(()=>sorted.filter(candidate=>
  [candidate.full_name,candidate.hometown,candidate.ethnicity,candidate.education_level,
   candidate.current_position,String(candidate.birth_year),String(candidate.union_join_year)]
   .join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))
 ),[sorted,search]);
 const maxOrder=sorted.reduce((max,c)=>Math.max(max,c.display_order),0);
 function reset(){
  setShowForm(false);setEditing(null);setForm(initial);
  setPendingPhoto(null);setPendingPhotoPreview(null);setSelectedDelegateId("");
 }
 function create(){
  reset();
  setForm({...initial,display_order:String(Math.min(10000,maxOrder+1))});
  setShowForm(true);setError("");setNotice("");
 }
 function edit(item:BchCandidate){
  setPendingPhoto(null);setPendingPhotoPreview(null);setSelectedDelegateId("");
  setEditing(item.id);setForm(formatCandidate(item));
  setShowForm(true);setError("");setNotice("");
  window.scrollTo({top:0,behavior:"smooth"});
 }
 function setField(key:Field,value:string){
  setForm(prev=>({...prev,[key]:value}));
 }
 function fillFromDelegate(id:string){
  setSelectedDelegateId(id);
  const delegate=delegates.find(d=>d.id===id);
  if(!delegate)return;
  setForm(prev=>({...prev,full_name:delegate.full_name,current_position:delegate.position||prev.current_position}));
 }
 async function refresh(){
  if(busy)return;
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/bch-candidates?congressId="+encodeURIComponent(congressId),{cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không đồng bộ được danh sách.");
   setCandidates(sortBchCandidates(body.candidates as BchCandidate[]));
  }catch(e){setError(e instanceof Error?e.message:"Không thể làm mới.");}
  finally{setBusy(false);}
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!canManage||busy)return;
  const checked=validateBchInput(form);
  if(!checked.data){setError(checked.error||"Thông tin chưa hợp lệ.");return;}
  setBusy(true);setError("");setNotice("");
  try{
   const method=editing?"PATCH":"POST";
   const response=await fetch("/api/bch-candidates",{
    method,headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,id:editing,...checked.data})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không lưu được nhân sự.");
   let item=result.candidate as BchCandidate;
   if(pendingPhoto){
    try{
     const uploaded=await uploadPhoto(item.id,pendingPhoto);
     item={...item,...uploaded};
    }catch(e){
     setCandidates(prev=>sortBchCandidates([...prev.filter(c=>c.id!==item.id),item]));
     setEditing(item.id); // Saving again will retry the same photo; do not create a duplicate candidate.
     setError("Thông tin nhân sự đã lưu nhưng ảnh chưa được tải lên: "+
      (e instanceof Error?e.message:"Lỗi ảnh")+". Hãy bấm Lưu thay đổi để thử lại.");
     return;
    }
   }
   setCandidates(prev=>sortBchCandidates([...prev.filter(c=>c.id!==item.id),item]));
   reset();
   setNotice(method==="POST"?"Đã thêm nhân sự và ảnh (nếu có) vào danh sách BCH.":"Đã cập nhật hồ sơ nhân sự BCH.");
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được dữ liệu.");}
  finally{setBusy(false);}
 }
 async function remove(item:BchCandidate){
  if(!canManage||busy)return;
  if(!window.confirm("Xóa "+item.full_name+" khỏi danh sách giới thiệu BCH? Thao tác này không xóa hồ sơ đại biểu."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/bch-candidates",{
    method:"DELETE",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,id:item.id})
   });
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không xóa được nhân sự.");
   setCandidates(prev=>prev.filter(c=>c.id!==item.id));
   if(editing===item.id)reset();
   setNotice("Đã xóa nhân sự khỏi danh sách BCH.");
  }catch(e){setError(e instanceof Error?e.message:"Không thể xóa.");}
  finally{setBusy(false);}
 }
 async function downloadExcel(){
  setError("");
  try{
   const {default:writeExcelFile}=await import("write-excel-file/browser");
   const columns=["STT","Họ tên","Năm sinh","Quê quán","Dân tộc",
    "Trình độ","Năm vào Đoàn","Chức vụ hiện tại"];
   const rows:(string|number)[][]=[
    columns,
    ...sorted.map((candidate,index)=>[
     index+1,candidate.full_name,candidate.birth_year,candidate.hometown,
     candidate.ethnicity,candidate.education_level,candidate.union_join_year,
     candidate.current_position
    ])
   ];
   await writeExcelFile([{
    sheet:"Trich ngang BCH",stickyRowsCount:1,
    data:rows
   }]).toFile("trich-ngang-nhan-su-BCH-"+encodeFilename(congressCode)+".xlsx");
  }catch{setError("Không tạo được file Excel. Vui lòng thử lại.");}
 }
 return <div className="space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4">
   <div className="min-w-0">
    <p className="page-kicker">CÔNG TÁC TỔ CHỨC · NHÂN SỰ ĐẠI HỘI</p>
    <h1 className="page-title mt-3">Danh sách trích ngang nhân sự BCH</h1>
    <p className="page-description mt-2">Tổng hợp thông tin nhân sự được giới thiệu tham gia Ban Chấp hành của {congressName}.</p>
    <p className="mt-2 text-xs font-medium text-[#7893a3]">Danh sách giới thiệu · Không phải kết quả bầu cử</p>
   </div>
   <div className="flex w-full flex-wrap gap-2 sm:w-auto">
    <button type="button" className="btn btn-secondary flex-1 justify-center sm:flex-none"
     disabled={busy} onClick={()=>void refresh()}><RefreshCw size={15}/> Làm mới</button>
    <button type="button" className="btn btn-secondary flex-1 justify-center sm:flex-none"
     disabled={busy||!sorted.length} onClick={()=>void downloadExcel()}>
     <Download size={16}/> Xuất Excel
    </button>
    {canManage&&<button type="button" className="btn btn-primary flex-1 justify-center sm:flex-none"
     disabled={busy} onClick={create}><Plus size={17}/> Thêm nhân sự</button>}
   </div>
  </header>

  <div className="grid gap-3 sm:grid-cols-3">
   <div className="rounded-xl border border-[#dce7ef] bg-white p-4">
    <p className="flex items-center gap-2 text-xs font-semibold text-[#7790a0]"><Users size={15}/> Nhân sự giới thiệu</p>
    <p className="mt-2 text-[30px] font-extrabold leading-none text-[#175876]">{sorted.length}</p>
   </div>
   <div className="rounded-xl border border-[#dce7ef] bg-white p-4">
    <p className="flex items-center gap-2 text-xs font-semibold text-[#7790a0]"><BookOpen size={15}/> Thông tin trích ngang</p>
    <p className="mt-2 text-[16px] font-bold text-[#284b65]">7 trường chính</p>
   </div>
   <div className="rounded-xl border border-[#dce7ef] bg-white p-4">
    <p className="flex items-center gap-2 text-xs font-semibold text-[#7790a0]"><GraduationCap size={15}/> Trạng thái sử dụng</p>
    <p className="mt-2 text-[13px] font-bold text-[#3c718b]">{canManage?"Có quyền biên tập":"Chế độ xem / xuất"}</p>
   </div>
  </div>

  {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">{error}</div>}
  {notice&&<div role="status" className="rounded-xl border border-[#cce8db] bg-[#eef9f2] px-4 py-3 text-[13px] font-medium text-[#197750]">{notice}</div>}

  {showForm&&canManage&&<section className="overflow-hidden rounded-xl border border-[#d3e5f1] bg-white shadow-[0_10px_30px_rgba(17,60,80,.05)]">
   <div className="flex items-center justify-between gap-3 border-b border-[#e5edf2] bg-[#f5f9fc] px-4 py-3 sm:px-6">
    <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#285b78]">
     <UserRoundPlus size={19}/>{editing?"Chỉnh sửa nhân sự":"Thêm nhân sự giới thiệu BCH"}
    </h2>
    <button type="button" onClick={reset} aria-label="Đóng biểu mẫu" className="rounded-lg p-2 text-[#6c8597] hover:bg-[#eaf2f6]"><X size={18}/></button>
   </div>
   <form onSubmit={e=>void save(e)} className="space-y-5 p-4 sm:p-6">
    {!!delegates.length&&<label className="block rounded-lg border border-[#dcebf3] bg-[#f5fafd] p-3">
     <span className="mb-2 block text-xs font-bold text-[#3f7087]">Điền nhanh từ danh sách đại biểu (tùy chọn)</span>
     <select defaultValue="" onChange={e=>fillFromDelegate(e.target.value)}
      className="field bg-white">
      <option value="">Chọn đại biểu để lấy họ tên, chức vụ...</option>
      {delegates.map(d=><option key={d.id} value={d.id}>{d.full_name} · {d.code}</option>)}
     </select>
     <span className="mt-2 block text-[11px] leading-5 text-[#7792a0]">Thông tin năm sinh, quê quán, dân tộc, trình độ và năm vào Đoàn được điền riêng để BTC kiểm tra.</span>
    </label>}
    <div className="flex flex-wrap items-start gap-4 rounded-xl border border-[#d9e9f1] bg-[#f6fafc] p-4">
     <div className="shrink-0">
      {currentFormPhoto?<Image unoptimized src={currentFormPhoto} width={96} height={128}
       alt="Ảnh chân dung nhân sự BCH" className="h-32 w-24 rounded-lg border border-[#d6e3eb] bg-white object-cover"/>:
       <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-[#c0d4df] bg-white text-[#94adba]"><UserRound size={36}/></div>}
     </div>
     <div className="min-w-[200px] flex-1">
      <h3 className="flex items-center gap-2 text-[14px] font-extrabold text-[#315f77]"><Camera size={18}/> Ảnh chân dung nhân sự BCH</h3>
      <p className="mt-1.5 text-xs leading-6 text-[#728e9c]">Tải ảnh, tự xóa phông nền trắng, kéo căn khuôn mặt và crop chuẩn 3:4 (600 × 800 px) giống mục Đại biểu.</p>
      <div className="mt-3 flex flex-wrap gap-2">
       <button type="button" className="btn btn-secondary !min-h-9 !text-xs" disabled={busy}
        onClick={()=>setPhotoTarget({kind:"form"})}><Camera size={15}/>{currentFormPhoto?"Chỉnh / thay ảnh":"Tải và chỉnh ảnh"}</button>
       {selectedDelegate?.photo_path&&<button type="button" className="btn btn-secondary !min-h-9 !text-xs"
        disabled={busy} onClick={()=>void copyDelegatePhoto()}><UserRound size={15}/>Lấy ảnh từ đại biểu</button>}
       {pendingPhoto&&<button type="button" className="btn btn-secondary !min-h-9 !text-xs" disabled={busy}
        onClick={()=>{setPendingPhoto(null);setPendingPhotoPreview(null);}}>Bỏ ảnh vừa chọn</button>}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[#8196a3]">Ảnh lưu riêng cho nhân sự BCH khi lưu hồ sơ; không thay đổi ảnh đại biểu gốc.</p>
     </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
     {fields.map(field=><label key={field.key} className="block">
      <span className="label">{field.label} {field.required&&<span aria-hidden="true" className="text-red-500">*</span>}</span>
      <input className="field mt-2" type={field.type||"text"} required={field.required}
       min={field.type==="number"?1900:undefined} max={field.type==="number"?new Date().getFullYear():undefined}
       value={form[field.key]} placeholder={field.placeholder}
       onChange={e=>setField(field.key,e.target.value)}/>
     </label>)}
     <label className="block">
      <span className="label">Thứ tự trình bày</span>
      <input type="number" min={0} max={10000} className="field mt-2"
       value={form.display_order} onChange={e=>setField("display_order",e.target.value)}/>
     </label>
    </div>
    <div className="flex flex-col-reverse gap-2 border-t border-[#edf1f4] pt-4 sm:flex-row sm:justify-end">
     <button type="button" onClick={reset} className="btn btn-secondary justify-center">Hủy</button>
     <button disabled={busy} type="submit" className="btn btn-primary justify-center">
      {busy?"Đang lưu...":editing?"Lưu thay đổi":"Thêm vào danh sách"}
     </button>
    </div>
   </form>
  </section>}

  <section className="overflow-hidden rounded-xl border border-[#dfe8ee] bg-white">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eef3] px-4 py-4 sm:px-5">
    <div>
     <h2 className="text-[16px] font-extrabold text-[#294f68]">Bảng trích ngang nhân sự</h2>
     <p className="mt-1 text-xs text-[#8396a4]">Tổng cộng {sorted.length} người · Hiển thị {visible.length} kết quả</p>
    </div>
    <div className="relative w-full sm:w-[305px]">
     <Search size={16} className="absolute left-3 top-3 text-[#93a6b2]"/>
     <input className="field !pl-10" value={search} onChange={e=>setSearch(e.target.value)}
      placeholder="Tìm họ tên, quê quán, chức vụ..." aria-label="Tìm nhân sự BCH"/>
    </div>
   </div>

   <div className="hidden overflow-x-auto md:block">
    <table className="data w-full min-w-[1080px]">
     <thead><tr>
      <th className="!text-center">STT</th><th>Ảnh</th><th>Họ tên</th><th>Năm sinh</th>
      <th>Quê quán</th><th>Dân tộc</th><th>Trình độ</th>
      <th>Năm vào Đoàn</th><th>Chức vụ hiện tại</th>
      {canManage&&<th>Thao tác</th>}
     </tr></thead>
     <tbody>{visible.map(item=><tr key={item.id}>
      <td className="text-center font-bold text-[#577d94]">{sorted.findIndex(c=>c.id===item.id)+1}</td>
      <td><BchPortrait candidate={item}/></td>
      <td className="min-w-[175px] font-bold text-[#214d6a]">{item.full_name}</td>
      <td>{item.birth_year}</td><td>{item.hometown}</td>
      <td>{item.ethnicity}</td><td>{item.education_level}</td>
      <td>{item.union_join_year}</td><td>{item.current_position}</td>
      {canManage&&<td><div className="flex flex-wrap gap-1.5">
       <button type="button" aria-label={"Thêm hoặc sửa ảnh "+item.full_name}
        className="btn btn-secondary !min-h-8 !px-2 !text-xs"
        onClick={()=>setPhotoTarget({kind:"existing",candidate:item})} disabled={busy}>
        <Camera size={15}/>{item.photo_path?"Sửa ảnh":"Thêm ảnh"}
       </button>
       <button type="button" aria-label={"Sửa "+item.full_name}
        className="btn btn-secondary !min-h-8 !px-2 !text-xs" onClick={()=>edit(item)} disabled={busy}><Edit3 size={15}/>Sửa</button>
       <button type="button" aria-label={"Xóa "+item.full_name}
        className="btn btn-secondary !min-h-8 !px-2 !text-xs" onClick={()=>void remove(item)} disabled={busy}><Trash2 size={15}/>Xóa</button>
      </div></td>}
     </tr>)}
     {!visible.length&&<tr><td colSpan={canManage?10:9} className="py-10 text-center text-sm text-[#8193a1]">Chưa có nhân sự phù hợp.</td></tr>}
     </tbody>
    </table>
   </div>

   <div className="space-y-3 p-3 md:hidden">
    {visible.map(item=><article key={item.id} className="rounded-xl border border-[#e0e9f0] bg-[#fbfdfe] p-4">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <BchPortrait candidate={item} large/>
      <div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-[.12em] text-[#748fa1]">NHÂN SỰ {String(sorted.findIndex(c=>c.id===item.id)+1).padStart(2,"0")}</p>
       <h3 className="mt-1.5 text-[16px] font-extrabold text-[#254f68]">{item.full_name}</h3></div>
      <span className="badge badge-blue">{item.birth_year}</span>
     </div>
     <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
      <div className="col-span-2"><dt className="text-[#8397a5]">Quê quán</dt><dd className="mt-1 font-semibold text-[#3e5a6c]">{item.hometown}</dd></div>
      <div><dt className="text-[#8397a5]">Dân tộc</dt><dd className="mt-1 font-semibold text-[#3e5a6c]">{item.ethnicity}</dd></div>
      <div><dt className="text-[#8397a5]">Năm vào Đoàn</dt><dd className="mt-1 font-semibold text-[#3e5a6c]">{item.union_join_year}</dd></div>
      <div className="col-span-2"><dt className="text-[#8397a5]">Trình độ</dt><dd className="mt-1 font-semibold text-[#3e5a6c]">{item.education_level}</dd></div>
      <div className="col-span-2"><dt className="text-[#8397a5]">Chức vụ hiện tại</dt><dd className="mt-1 font-semibold text-[#3e5a6c]">{item.current_position}</dd></div>
     </dl>
     {canManage&&<div className="mt-4 flex flex-wrap gap-2 border-t border-[#e3edf1] pt-3">
      <button type="button" disabled={busy} className="btn btn-secondary flex-1 justify-center"
       onClick={()=>setPhotoTarget({kind:"existing",candidate:item})}><Camera size={15}/>{item.photo_path?"Sửa ảnh":"Thêm ảnh"}</button>
      <button type="button" disabled={busy} className="btn btn-secondary flex-1 justify-center" onClick={()=>edit(item)}><Edit3 size={15}/>Sửa</button>
      <button type="button" disabled={busy} className="btn btn-secondary flex-1 justify-center" onClick={()=>void remove(item)}><Trash2 size={15}/>Xóa</button>
     </div>}
    </article>)}
    {!visible.length&&<div className="rounded-xl bg-[#f6fafc] px-4 py-9 text-center text-sm text-[#7d93a1]">Chưa có nhân sự phù hợp.</div>}
   </div>
  </section>
  <p className="flex items-center gap-2 text-xs leading-6 text-[#8294a1]">
   <FileSpreadsheet size={16}/><span>File Excel xuất đầy đủ danh sách theo thứ tự, không bị ảnh hưởng bởi bộ lọc tìm kiếm.</span>
  </p>
   {photoTarget&&<DelegatePhotoEditor
    title="Ảnh nhân sự giới thiệu BCH"
    name={photoTarget.kind==="form"?form.full_name||"Nhân sự mới":photoTarget.candidate.full_name}
    initialPhotoUrl={photoTarget.kind==="form"?currentFormPhoto:
     photoTarget.candidate.photo_path?bchPhotoUrl(photoTarget.candidate):null}
    onClose={()=>setPhotoTarget(null)} onSave={savePhoto}/>}
 </div>;
}
