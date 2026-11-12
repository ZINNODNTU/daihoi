"use client";
import {FormEvent,useState} from "react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {Camera,CheckCircle2,Save,UserRound} from "lucide-react";
import {DelegatePhotoEditor} from "@/components/delegate-photo-editor";

export type EditableDelegate={
 id:string;congress_id:string;full_name:string;unit:string;position:string;
 gender:"male"|"female"|"other"|null;birth_date:string|null;photo_path:string|null;
 congressName:string;
};
export function DelegateProfileEditor({initial}:{initial:EditableDelegate[]}){
 const router=useRouter();
 const [items,setItems]=useState(initial);
 const selectedId=initial[0]?.id||"";
 const [photoId,setPhotoId]=useState<string|null>(null);
 const [version,setVersion]=useState<Record<string,number>>({});
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const selected=items.find(item=>item.id===selectedId);
 function update(fields:Partial<EditableDelegate>){
  setItems(old=>old.map(item=>item.id===selectedId?{...item,...fields}:item));
  setError("");setMessage("");
 }
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!selected||busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/my-card/profile",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({delegateId:selected.id,full_name:selected.full_name,unit:selected.unit,
     position:selected.position,gender:selected.gender,birth_date:selected.birth_date})
   });
   const result=await response.json().catch(()=>null) as {
    ok?:boolean;error?:string;code?:string;delegate?:Partial<EditableDelegate>
   }|null;
   if(!response.ok||!result?.ok||!result.delegate){
    if(response.status===401)throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi lưu hồ sơ.");
    if(response.status===403)throw new Error(result?.error||"Bạn không có quyền sửa hồ sơ này.");
    throw new Error(result?.error||"Không nhận được xác nhận từ máy chủ. Vui lòng thử lại.");
   }
   setItems(old=>old.map(item=>item.id===selected.id?{...item,...result.delegate}:item));
   setMessage("Đã đồng bộ thông tin cá nhân trên tất cả Đại hội của bạn.");
   router.refresh();
  }catch(e){
   const text=e instanceof Error?e.message:"Không thể cập nhật hồ sơ.";
   setError(e instanceof TypeError?"Không kết nối được máy chủ. Kiểm tra Wi-Fi hoặc mạng di động rồi thử lại.":text);
  }
  finally{setBusy(false);}
 }
 async function savePhoto(blob:Blob){
  if(!selected)return;
  setBusy(true);setError("");setMessage("");
  try{
   const data=new FormData();
   data.append("photo",new File([blob],"portrait.jpg",{type:"image/jpeg"}));
   const response=await fetch("/api/delegates/"+encodeURIComponent(selected.id)+"/photo",{
    method:"PUT",credentials:"same-origin",body:data
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không lưu được ảnh.");
   setVersion(old=>({...old,[selected.id]:Date.now()}));
   setItems(old=>old.map(item=>item.id===selected.id?{...item,photo_path:result.path||item.photo_path}:item));
   setPhotoId(null);
   setMessage(result.unchanged?"Ảnh giống bản đang lưu; hệ thống không tải lên trùng.":"Đã đồng bộ ảnh đại biểu trên tất cả Đại hội của bạn.");
   router.refresh();
  }catch(e){
   setError(e instanceof Error?e.message:"Không thể tải ảnh lên.");
   throw e;
  }finally{setBusy(false);}
 }
 if(!selected)return null;
 return <section className="mt-7 max-w-[1040px] rounded-2xl border border-[#dce7ef] bg-white p-5 shadow-sm sm:p-7">
  <div className="mb-5">
   <p className="page-kicker">HỒ SƠ CÁ NHÂN DÙNG CHUNG</p>
   <h2 className="mt-2 text-[18px] font-extrabold text-[#20324d]">Ảnh và thông tin đại biểu</h2>
   <p className="mt-2 text-xs leading-6 text-[#71869a]">Thông tin và ảnh của bạn dùng chung ở tất cả Đại hội liên kết với tài khoản này. Khi lưu, hệ thống đồng bộ sang các hồ sơ đại biểu của chính bạn. Mã đại biểu, barcode, vai trò và ghế vẫn riêng theo từng Đại hội.</p>
  </div>
  <div className="grid gap-7 md:grid-cols-[190px_minmax(0,1fr)]">
   <div className="flex flex-row items-center gap-3 rounded-xl bg-[#f6f9fc] p-3 sm:flex-col sm:bg-transparent sm:p-0">
    <div className="flex h-[144px] w-[108px] shrink-0 items-center justify-center overflow-hidden sm:h-[224px] sm:w-[168px] rounded-xl border-4 border-white bg-[#eef3f8] shadow-[0_6px_22px_rgba(25,55,80,.15)]">
     {selected.photo_path?<Image unoptimized width={168} height={224}
      src={"/api/delegates/"+selected.id+"/photo?w=160&v="+(version[selected.id]||0)}
      alt={"Ảnh đại biểu "+selected.full_name} className="h-full w-full object-cover"/>:
      <UserRound size={62} className="text-[#a6b7c6]"/>}
    </div>
    <div className="min-w-0 flex-1 sm:w-full">
     <button type="button" disabled={busy} onClick={()=>setPhotoId(selected.id)}
     className="btn btn-secondary !min-h-12 !w-full !whitespace-normal !text-xs">
     <Camera size={16}/> {selected.photo_path?"Đổi ảnh đại biểu":"Thêm ảnh đại biểu"}
    </button>
    <p className="mt-2 text-center text-[11px] leading-5 text-[#7f94a4]">Ảnh 3:4, căn chỉnh và tối ưu trước khi lưu.</p>
     </div>
   </div>
   <form onSubmit={save} className="grid content-start gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2"><span className="label">Họ và tên</span>
     <input className="field mt-2" required minLength={2} maxLength={160} value={selected.full_name}
      onChange={e=>update({full_name:e.target.value})}/>
    </label>
    <label><span className="label">Đơn vị</span>
     <input className="field mt-2" maxLength={200} value={selected.unit}
      onChange={e=>update({unit:e.target.value})}/>
    </label>
    <label><span className="label">Chức vụ</span>
     <input className="field mt-2" maxLength={160} value={selected.position}
      onChange={e=>update({position:e.target.value})}/>
    </label>
    <label><span className="label">Giới tính</span>
     <select className="field mt-2" value={selected.gender||""}
      onChange={e=>update({gender:e.target.value as EditableDelegate["gender"]||null})}>
      <option value="">Chưa cập nhật</option><option value="male">Nam</option>
      <option value="female">Nữ</option><option value="other">Khác</option>
     </select>
    </label>
    <label><span className="label">Ngày sinh</span>
     <input type="date" className="field mt-2" value={selected.birth_date||""}
      onChange={e=>update({birth_date:e.target.value||null})}/>
    </label>
    {error&&<div role="alert" aria-live="assertive" className="sm:col-span-2 rounded-xl border border-[#edc7c4] bg-[#fff5f3] px-4 py-3 text-[12px] font-semibold leading-6 text-[#9f3228]"><p>{error}</p><button type="button" onClick={()=>window.location.reload()} className="mt-2 min-h-10 rounded-lg border border-[#e9b3ac] bg-white px-3 text-[12px] font-bold text-[#923127]">Tải lại trang Tài khoản</button></div>}
    {message&&<p role="status" className="sm:col-span-2 flex items-center gap-2 text-xs font-semibold text-[#157e61]"><CheckCircle2 size={16}/>{message}</p>}
    <div className="sm:col-span-2">
     <button type="submit" disabled={busy} className="btn btn-primary !min-h-12 w-full justify-center !text-[13px] sm:w-auto">
      <Save size={16}/>{busy?"Đang lưu...":"Lưu thông tin đại biểu"}
     </button>
    </div>
   </form>
  </div>
  {photoId===selected.id&&<DelegatePhotoEditor
   name={selected.full_name} title="Ảnh thẻ đại biểu"
   initialPhotoUrl={selected.photo_path?"/api/delegates/"+selected.id+"/photo?w=600&v="+(version[selected.id]||0):null}
   onClose={()=>setPhotoId(null)} onSave={savePhoto}/>}
 </section>;
}