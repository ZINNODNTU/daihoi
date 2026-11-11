"use client";
import {ChangeEvent,FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {QRCodeSVG} from "qrcode.react";
import {Download,FileSpreadsheet,Plus,Search,Users,X,Printer,ScanBarcode,Camera,UserRound} from "lucide-react";
import {DelegateBarcode} from "@/components/delegate-barcode";
import {DelegatePhotoEditor} from "@/components/delegate-photo-editor";
import type {Delegate,AttendanceSession} from "@/lib/types";
import {displayTime} from "@/lib/attendance-report";
import {normalizeBirthDate,normalizeGender} from "@/lib/delegate-demographics";
type Props={
 congressId:string;congressCode:string;delegates:Delegate[];canManage:boolean;
 sessions:AttendanceSession[];
};
type Row={full_name:string;unit:string;student_id:string;position:string;delegate_type:"official"|"alternate"|"guest";gender:string;birth_date:string};
type PhotoTarget={kind:"new"}|{kind:"existing";delegate:Delegate};
type Card={
 id:string;name:string;code:string;barcodeCode:string;token:string;
 scope:"fixed"|"session";sessionName?:string;startsAt?:string|null;endsAt?:string|null;
};
function genderLabel(gender:Delegate["gender"]){return gender==="male"?"Nam":gender==="female"?"Nữ":gender==="other"?"Khác":"Chưa cập nhật";}
function birthLabel(date:string|null){if(!date)return "Chưa cập nhật";const [y,m,d]=date.split("-");return `${d}/${m}/${y}`;}
function kindLabel(kind:Delegate["delegate_type"]){
 return kind==="official"?"Chính thức":kind==="alternate"?"Dự khuyết":"Khách mời";
}
function parseKind(value:string):Row["delegate_type"]{
 const str=value.trim().toLocaleLowerCase("vi");
 return str.includes("dự")||str==="alternate"?"alternate":
   str.includes("khách")||str==="guest"?"guest":"official";
}
function saveSvg(id:string,name:string){
 const svg=document.getElementById(id);
 if(!svg)return;
 const xml=new XMLSerializer().serializeToString(svg);
 const blob=new Blob([xml],{type:"image/svg+xml;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function DelegatesClient({congressId,congressCode,delegates,canManage,sessions}:Props){
 const router=useRouter();
 const [search,setSearch]=useState(""),[open,setOpen]=useState(false);
 const [error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 const [showCard,setShowCard]=useState<Card|null>(null);
 const [cardSession,setCardSession]=useState("");
 const [uploadRows,setUploadRows]=useState<Row[]|null>(null);
 const [photoTarget,setPhotoTarget]=useState<PhotoTarget|null>(null);
 const [pendingPhoto,setPendingPhoto]=useState<Blob|null>(null);
 const [demographicsTarget,setDemographicsTarget]=useState<Delegate|null>(null);
 const [editGender,setEditGender]=useState("");
 const [editBirthDate,setEditBirthDate]=useState("");
 const [editUnit,setEditUnit]=useState("");
 const [editPosition,setEditPosition]=useState("");
 const [pendingPhotoPreview,setPendingPhotoPreview]=useState<string|null>(null);
 useEffect(()=>()=>{if(pendingPhotoPreview)URL.revokeObjectURL(pendingPhotoPreview);},[pendingPhotoPreview]);
 async function uploadPhoto(delegateId:string,photo:Blob){
  const data=new FormData();
  data.append("photo",new File([photo],"portrait.jpg",{type:"image/jpeg"}));
  const response=await fetch("/api/delegates/"+encodeURIComponent(delegateId)+"/photo",{
   method:"PUT",body:data
  });
  const body=await response.json();
  if(!response.ok)throw new Error(body.error||"Không lưu được ảnh đại biểu.");
 }
 async function photoSaved(blob:Blob){
  if(!photoTarget)return;
  if(photoTarget.kind==="new"){
   setPendingPhoto(blob);
   setPendingPhotoPreview(URL.createObjectURL(blob));
   setPhotoTarget(null);
   return;
  }
  await uploadPhoto(photoTarget.delegate.id,blob);
  setPhotoTarget(null);
  setSuccess("Đã lưu ảnh nền trắng cho "+photoTarget.delegate.full_name+".");
  router.refresh();
 }

  useEffect(()=>{
    if(!showCard)return;
    const priorOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setShowCard(null);};
    window.addEventListener("keydown",onEscape);
    return()=>{window.removeEventListener("keydown",onEscape);document.body.style.overflow=priorOverflow;};
  },[showCard]);
 const filtered=useMemo(()=>delegates.filter(d=>
  [d.full_name,d.code,d.unit,d.student_id,d.position,d.login_email,d.barcode_code].join(" ").toLocaleLowerCase("vi")
   .includes(search.toLocaleLowerCase("vi"))
 ),[delegates,search]);
 const sessionQrChoices=sessions.filter(s=>s.qr_policy!=="fixed");
 async function save(rows:Row[],photo?:Blob|null){
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/delegates",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,delegates:rows})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không thể thêm đại biểu.");
   let photoWarning="";
   if(photo&&result.created?.[0]?.id){
    try{await uploadPhoto(result.created[0].id,photo);}
    catch(e){photoWarning="Hồ sơ đã được tạo nhưng ảnh chưa lưu: "+(e instanceof Error?e.message:"Lỗi ảnh");}
   }
   setSuccess(`Đã nhập thành công ${result.count} đại biểu. Mã được hệ thống tự cấp.`);
   if(photoWarning)setError(photoWarning);
   setPendingPhoto(null);setPendingPhotoPreview(null);
   setUploadRows(null);setOpen(false);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Lỗi nhập dữ liệu.");}
  finally{setBusy(false);}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  await save([{
   full_name:String(form.get("full_name")||"").trim(),
   unit:String(form.get("unit")||""),
   student_id:String(form.get("student_id")||"").trim(),
   position:String(form.get("position")||"").trim(),
   delegate_type:parseKind(String(form.get("delegate_type")||"official")),
    gender:String(form.get("gender")||""),
    birth_date:String(form.get("birth_date")||"")}],pendingPhoto);
 }
 async function handleFile(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>2*1024*1024){setError("File Excel/CSV không được vượt quá 2 MB.");e.target.value="";return;}
  setError("");setUploadRows(null);
  try{
   let matrix:(string|number|Date|null|undefined)[][]=[];
   if(file.name.toLowerCase().endsWith(".xlsx")){
    const {readSheet}=await import("read-excel-file/browser");
    matrix=(await readSheet(file)).map(row=>row.map(cell=>cell===null?null:
      cell instanceof Date?cell.toISOString().slice(0,10):String(cell)));
   }else if(file.name.toLowerCase().endsWith(".csv")){
    const text=await file.text();
    const records:string[][]=[];
    let line:string[]=[];let item="",quoted=false;
    for(let i=0;i<text.length;i++){
     const c=text[i];
     if(c==='"'&&quoted&&text[i+1]==='"'){item+='"';i++;}
     else if(c==='"'){quoted=!quoted;}
     else if((c===','||c===';'||c==='\n')&&!quoted){
      line.push(item);item="";
      if(c==='\n'){records.push(line);line=[];}
     }else if(c!=='\r')item+=c;
    }
    line.push(item);if(line.some(x=>x.trim()))records.push(line);
    matrix=records;
   }else throw new Error("Hãy chọn tệp .xlsx hoặc .csv.");
   if(matrix.length<2)throw new Error("Tệp chưa có dữ liệu.");
   const key=(value:unknown)=>String(value??"").trim().toLocaleLowerCase("vi")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/[^a-z0-9]/g,"");
   const heading=matrix[0].map(key);
   const fields={
    student_id:["mssv","masosinhvien","studentid"],
    full_name:["hoten","hovaten","tensinhvien","fullname"],
    unit:["chidoan","donvi","lop","unit"],
    position:["chucvu","chucdanh","position"],
    delegate_type:["vaitro","loaidaibieu","delegatetype"],
     gender:["gioitinh","sex","gender"],
     birth_date:["ngaysinh","ngaythangnamsinh","dateofbirth","birthdate","dob"]
   };
   const lookup=(names:string[])=>heading.findIndex(h=>names.map(key).includes(h));
   const header=lookup(fields.full_name)>=0&&(lookup(fields.student_id)>=0||lookup(fields.unit)>=0);
   const get=(cells:(string|number|Date|null|undefined)[],field:keyof typeof fields,fallback:number)=>
    String(cells[header?lookup(fields[field]):fallback]??"").trim();
   const rows:Row[]=matrix.slice(header?1:0)
    .filter(r=>r.some(x=>x!==null&&String(x).trim()))
    .map(r=>({
     full_name:get(r,"full_name",1),
     unit:get(r,"unit",2),
     student_id:get(r,"student_id",0).toUpperCase(),
     position:get(r,"position",3),
     delegate_type:parseKind(get(r,"delegate_type",4)),
      gender:get(r,"gender",5),birth_date:get(r,"birth_date",6)
    }));
   if(rows.length>250)throw new Error("Mỗi tệp tối đa 250 đại biểu.");
   if(rows.some(r=>!r.full_name||(!r.student_id&&r.delegate_type!=="guest")))
    throw new Error("Thiếu họ tên hoặc MSSV. Khách mời có thể không có MSSV.");
   if(rows.some(r=>r.student_id&&!/^[A-Za-z0-9][A-Za-z0-9._-]{3,31}$/.test(r.student_id)))
    throw new Error("MSSV phải từ 4–32 ký tự (chữ, số, dấu chấm, - hoặc _).");
   for(let i=0;i<rows.length;i++){
     try{normalizeGender(rows[i].gender);normalizeBirthDate(rows[i].birth_date);}
     catch(error){throw new Error("Dòng "+(i+(header?2:1))+": "+(error instanceof Error?error.message:"Ngày sinh/giới tính không hợp lệ."));}
    }
    const ids=rows.map(r=>r.student_id).filter(Boolean);
   if(new Set(ids).size!==ids.length)throw new Error("MSSV bị trùng trong tệp Excel.");
   setUploadRows(rows);
  }catch(e){setError(e instanceof Error?e.message:"Không đọc được tệp.");}
  e.target.value="";
 }
 async function downloadTemplate(){
  try{
   const {default:writeExcelFile}=await import("write-excel-file/browser");
   await writeExcelFile([{sheet:"Danh sach dai bieu",stickyRowsCount:1,data:[
    ["MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò","Giới tính","Ngày sinh"],
    ["2200000001","Nguyễn Văn A","22DTH1","Bí thư","Chính thức","Nam","24/09/2003"],
    ["","","","","","",""],
    ["","Trần Thị B","Đơn vị khách mời","Đại diện","Khách mời","Nữ","05/04/1988"]
   ]}]).toFile("mau-danh-sach-dai-bieu.xlsx");
  }catch{setError("Không thể tạo file Excel mẫu.");}
 }
 function openDemographics(delegate:Delegate){
  setDemographicsTarget(delegate);
  setEditGender(delegate.gender||"");
  setEditBirthDate(delegate.birth_date||"");
  setEditUnit(delegate.unit||"");
  setEditPosition(delegate.position||"");
  setError("");
 }
 async function updateDemographics(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!demographicsTarget)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/delegates",{
    method:"PATCH",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,delegateId:demographicsTarget.id,
     gender:editGender,birth_date:editBirthDate,unit:editUnit,position:editPosition})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không cập nhật được hồ sơ.");
   setDemographicsTarget(null);
   setSuccess("Đã cập nhật hồ sơ, đơn vị và chức vụ của "+demographicsTarget.full_name+".");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Không cập nhật được hồ sơ.");}
  finally{setBusy(false);}
 }
 async function openCard(delegate:Delegate,sessionId=""){
  setError("");setBusy(true);
  try{
   const params=sessionId?"?sessionId="+encodeURIComponent(sessionId):"";
   const response=await fetch(`/api/delegates/${delegate.id}/qr${params}`,{cache:"no-store"});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không tạo được QR.");
   setCardSession(sessionId);
   setShowCard({
    id:delegate.id,name:body.full_name,code:body.code,
    barcodeCode:body.barcodeCode,token:body.token,scope:body.scope,
    sessionName:body.sessionName,startsAt:body.startsAt,endsAt:body.endsAt
   });
  }catch(e){setError(e instanceof Error?e.message:"Không tạo được thẻ.");}
  finally{setBusy(false);}
 }
 return <div>
  <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
   <div><p className="text-xs tracking-widest text-[#007fae] font-semibold">QUẢN LÝ ĐẠI HỘI</p>
    <h1 className="page-title mt-2">Danh sách đại biểu</h1>
    <p className="helper mt-2">{delegates.length} đại biểu • QR cố định hoặc QR từng phiên • Barcode dự phòng.</p>
    <p className="helper mt-1">Mã định danh Đại hội: <strong>{congressCode.toUpperCase()}</strong></p>
   </div>
   {canManage&&<div className="mobile-toolbar w-full sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
    <button type="button" className="btn btn-secondary w-full sm:w-auto" onClick={()=>void downloadTemplate()}><Download size={17}/> Tải Excel mẫu</button>
    <label className="btn btn-secondary w-full cursor-pointer sm:w-auto"><FileSpreadsheet size={18}/> Nhập Excel/CSV
     <input className="hidden" type="file" accept=".xlsx,.csv" onChange={e=>void handleFile(e)}/></label>
    <button type="button" className="btn btn-primary w-full sm:w-auto" aria-expanded={open} onClick={()=>setOpen(!open)}><Plus size={18}/> Thêm đại biểu</button>
   </div>}
  </div>
  {error&&<p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl mb-5">{error}</p>}
  {success&&<p role="status" className="bg-green-50 text-green-700 p-3 rounded-xl mb-5">{success}</p>}
  {uploadRows&&<div className="card p-5 mb-5">
   <p className="font-bold">Đã đọc {uploadRows.length} dòng</p>
   <p className="helper my-3">MSSV · Họ tên · Đơn vị · Chức vụ · Vai trò · Giới tính · Ngày sinh (dd/mm/yyyy). Mã đại biểu được tự cấp sau khi lưu. Email đăng nhập tự tạo từ MSSV@dntu.edu.vn.</p>
   <div className="mb-4 max-h-52 overflow-auto rounded-lg border border-[#d4e5ed]"><table className="data"><thead><tr><th>MSSV</th><th>Họ tên</th><th>Đơn vị</th><th>Vai trò</th><th>Giới tính</th><th>Ngày sinh</th></tr></thead><tbody>{uploadRows.slice(0,5).map((r,i)=><tr key={i}><td>{r.student_id||"—"}</td><td>{r.full_name}</td><td>{r.unit}</td><td>{kindLabel(r.delegate_type)}</td><td>{r.gender||"—"}</td><td>{r.birth_date||"—"}</td></tr>)}</tbody></table></div>
   <div className="flex gap-2"><button disabled={busy} className="btn btn-primary" onClick={()=>void save(uploadRows)}>Xác nhận nhập</button>
    <button className="btn btn-secondary" onClick={()=>setUploadRows(null)}>Hủy</button></div>
  </div>}
  {open&&canManage&&<div className="card p-6 mb-6"><h2 className="section-title mb-5">Thêm đại biểu</h2>
   <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
    <label><span className="label">MSSV</span><input className="field" name="student_id" placeholder="Mã số sinh viên" maxLength={32}/><span className="helper">Đăng nhập: MSSV@dntu.edu.vn</span></label>
    <label><span className="label">Họ tên *</span><input className="field" name="full_name" required placeholder="Nguyễn Văn A"/></label>
    <label><span className="label">Đơn vị</span><input className="field" name="unit" placeholder="Khoa CNTT, lớp 22DTH1 hoặc cơ quan"/></label>
    <label><span className="label">Chức vụ</span><input className="field" name="position" placeholder="Bí thư, đoàn viên, khách mời..."/></label>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dae7ef] bg-[#f5f9fc] p-3 md:col-span-2">
     {pendingPhotoPreview?<Image src={pendingPhotoPreview} alt="Ảnh đại biểu đã căn chỉnh" unoptimized width={66} height={88}
       className="h-[88px] w-[66px] rounded-lg border border-[#d5e1e8] object-cover"/>:
       <div className="flex h-[88px] w-[66px] items-center justify-center rounded-lg border border-dashed border-[#b8cedd] bg-white text-[#809aaf]"><UserRound size={27}/></div>}
     <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#365c72]">Ảnh chân dung đại biểu</p>
      <p className="mt-1 text-xs leading-5 text-[#728c9e]">Tự xóa phông sang nền trắng, kéo căn khuôn mặt và crop ảnh 3:4.</p>
      <button type="button" className="btn btn-secondary mt-2 !min-h-9 !text-xs"
       onClick={()=>setPhotoTarget({kind:"new"})}><Camera size={15}/>{pendingPhoto?"Chỉnh lại ảnh":"Chọn và xử lý ảnh"}</button>
     </div>
    </div>
    <p className="rounded-lg border border-[#d6eaf1] bg-[#f0f8fc] p-3 text-xs font-semibold text-[#236785] md:col-span-2">
     Mã đại biểu được hệ thống tự cấp sau khi lưu, không nhập thủ công.
    </p>
    <label><span className="label">Loại đại biểu</span><select name="delegate_type" className="field">
     <option value="official">Chính thức</option><option value="alternate">Dự khuyết</option>
     <option value="guest">Khách mời</option></select></label>
    <label><span className="label">Giới tính</span><select name="gender" className="field" defaultValue="">
      <option value="">Chưa cung cấp</option><option value="male">Nam</option>
      <option value="female">Nữ</option><option value="other">Khác</option>
     </select></label>
     <label><span className="label">Ngày tháng năm sinh</span>
      <input name="birth_date" type="date" min="1900-01-01" className="field"/>
      <span className="helper">Không bắt buộc; dùng để thống kê độ tuổi thực tế.</span>
     </label>
     <button disabled={busy} className="btn btn-primary md:col-span-2">Lưu đại biểu</button>
   </form>
  </div>}
  <div className="card overflow-hidden">
   <div className="p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
    <h2 className="font-semibold flex gap-2 items-center"><Users size={20} className="text-[#007eae]"/>Danh sách</h2>
    <div className="relative w-full sm:w-[300px]"><Search size={18} className="absolute left-3 top-3 text-[#90a5b8]"/>
     <input value={search} onChange={e=>setSearch(e.target.value)} className="field pl-10!"
      placeholder="MSSV, họ tên, đơn vị, chức vụ..."/></div>
   </div>
   <div className="table-wrap desktop-table"><table className="data"><thead><tr>
    <th>Ảnh</th><th>Mã đại biểu</th><th>Họ tên</th><th>MSSV / Email</th><th className="hide-mobile">Đơn vị / Chức vụ</th><th>Vai trò</th><th>Giới tính / Ngày sinh</th><th>Tài khoản</th><th>Ảnh / Thẻ</th>
   </tr></thead><tbody>
    {filtered.map(d=><tr key={d.id}>
     <td>{d.photo_path?<Image unoptimized src={"/api/delegates/"+d.id+"/photo"}
      alt={"Ảnh "+d.full_name} width={40} height={54} loading="lazy"
      className="h-[54px] w-10 rounded-lg border border-[#d7e4ec] bg-white object-cover"/>:
      <div className="flex h-[54px] w-10 items-center justify-center rounded-lg bg-[#f0f5f8] text-[#9aafbc]"><UserRound size={22}/></div>}</td>
     <td className="font-bold text-[#006d9e]">{d.code}</td><td className="font-bold">{d.full_name}</td>
     <td><span className="font-semibold">{d.student_id||"—"}</span><span className="block break-all text-[11px] text-[#627c8a]">{d.login_email||""}</span></td>
     <td className="hide-mobile">{d.unit||"Chưa cập nhật"}<span className="block text-[11px] text-[#627c8a]">{d.position||""}</span>
      {canManage&&<button type="button" className="mt-1 text-[11px] font-bold text-[#007fae] underline underline-offset-2"
       onClick={()=>openDemographics(d)}>Sửa đơn vị / chức vụ</button>}</td>
     <td><span className="badge badge-gray">{kindLabel(d.delegate_type)}</span></td>
      <td className="text-xs">{genderLabel(d.gender)}
       <span className="block text-[#627c8a]">{birthLabel(d.birth_date)}</span>
       {canManage&&<button type="button" className="mt-1 text-[11px] font-bold text-[#007fae] underline underline-offset-2"
        onClick={()=>openDemographics(d)}>Chỉnh sửa</button>}
      </td>
     <td><span className={"badge "+(d.auth_user_id?"badge-green":"badge-gray")}>{d.auth_user_id?"Đã cấp":"Chưa cấp"}</span></td>
     <td><div className="flex flex-wrap gap-1.5">
      {canManage&&<button type="button" className="btn btn-secondary !min-h-9 !px-2.5 !text-xs"
       onClick={()=>setPhotoTarget({kind:"existing",delegate:d})} disabled={busy}>
       <Camera size={15}/>{d.photo_path?"Sửa ảnh":"Thêm ảnh"}
      </button>}
      <button className="btn btn-secondary !min-h-9 !px-2.5 !text-xs" disabled={busy} onClick={()=>void openCard(d)}>
       <ScanBarcode size={15}/> QR / Barcode</button></div></td></tr>)}
    {!filtered.length&&<tr><td colSpan={9} className="helper text-center py-9!">Không tìm thấy đại biểu.</td></tr>}
   </tbody></table></div>
  </div>
  <div className="mobile-cards px-3 pb-4">
    {filtered.map(d=><article key={d.id} className="mobile-record">
     <div className="flex items-start justify-between gap-3">
      {d.photo_path?<Image unoptimized src={"/api/delegates/"+d.id+"/photo"}
       alt={"Ảnh "+d.full_name} width={54} height={72} loading="lazy"
       className="h-[72px] w-[54px] shrink-0 rounded-lg border border-[#d6e6ec] bg-white object-cover"/>:
       <div className="flex h-[72px] w-[54px] shrink-0 items-center justify-center rounded-lg bg-[#f0f5f8] text-[#9aafbc]"><UserRound size={26}/></div>}
      <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold tracking-wider text-[#007eb8]">{d.code}</p><h3 className="mobile-record-title mt-1">{d.full_name}</h3></div>
      <span className="badge badge-gray shrink-0">{kindLabel(d.delegate_type)}</span>
     </div>
     <p className="mobile-record-meta mt-2">{d.unit||"Chưa cập nhật đơn vị"}{d.position?" · "+d.position:""}{d.student_id?" · "+d.student_id:""}</p>
     <p className="mt-1 text-[11px] text-[#687f91]">Giới tính: {genderLabel(d.gender)} · Ngày sinh: {birthLabel(d.birth_date)}</p>
      <p className="mt-1 text-[11px] text-[#687f91]">{d.login_email||"Khách mời không có tài khoản"} · {d.auth_user_id?"Đã cấp tài khoản":"Chưa cấp tài khoản"}</p>
     <div className="mobile-record-actions">
      {canManage&&<button type="button" className="btn btn-secondary" disabled={busy}
       onClick={()=>openDemographics(d)}>Sửa hồ sơ / chức vụ</button>}
      {canManage&&<button type="button" className="btn btn-secondary" disabled={busy}
       onClick={()=>setPhotoTarget({kind:"existing",delegate:d})}><Camera size={17}/>{d.photo_path?"Sửa ảnh":"Thêm ảnh"}</button>}
      <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>void openCard(d)}>
       <ScanBarcode size={17}/> Xem QR / Barcode</button></div>
    </article>)}
    {!filtered.length&&<div className="rounded-xl bg-[#f6fafb] p-7 text-center text-sm text-[#718795]">Không tìm thấy đại biểu phù hợp.</div>}
   </div>
   {demographicsTarget&&canManage&&<div role="presentation"
    className="fixed inset-0 z-[70] flex items-center justify-center bg-[#112c42]/65 p-3"
    onClick={e=>{if(e.target===e.currentTarget&&!busy)setDemographicsTarget(null);}}>
    <div role="dialog" aria-modal="true" aria-label={"Cập nhật nhân khẩu học "+demographicsTarget.full_name}
     className="w-full max-w-[460px] rounded-[18px] border border-[#d7e4eb] bg-white p-5 shadow-2xl sm:p-7">
     <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-[18px] font-extrabold text-[#213f5b]">Chỉnh sửa hồ sơ đại biểu</h2>
       <p className="mt-1 text-xs text-[#668297]">{demographicsTarget.full_name}</p></div>
      <button type="button" onClick={()=>setDemographicsTarget(null)} aria-label="Đóng chỉnh sửa"
       className="rounded-lg bg-[#edf4f8] p-2 text-[#3c6c82]"><X size={19}/></button>
     </div>
     <form className="mt-5 space-y-4" onSubmit={e=>void updateDemographics(e)}>
      <label className="block"><span className="label">Đơn vị</span>
       <input className="field" maxLength={200} value={editUnit} onChange={e=>setEditUnit(e.target.value)}
        placeholder="Khoa, chi đoàn, lớp hoặc cơ quan"/></label>
      <label className="block"><span className="label">Chức vụ</span>
       <input className="field" maxLength={160} value={editPosition} onChange={e=>setEditPosition(e.target.value)}
        placeholder="Bí thư, Phó Bí thư, Ủy viên..."/></label>
      <label className="block"><span className="label">Giới tính</span>
       <select className="field" value={editGender} onChange={e=>setEditGender(e.target.value)}>
        <option value="">Chưa cung cấp</option><option value="male">Nam</option>
        <option value="female">Nữ</option><option value="other">Khác</option>
       </select></label>
      <label className="block"><span className="label">Ngày tháng năm sinh</span>
       <input className="field" type="date" min="1900-01-01" value={editBirthDate}
        onChange={e=>setEditBirthDate(e.target.value)}/></label>
      <p className="text-xs leading-6 text-[#748d9c]">Đơn vị và chức vụ được đồng bộ trên hồ sơ và thẻ đại biểu; giới tính và ngày sinh phục vụ thống kê.</p>
      {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
       <button type="button" className="btn btn-secondary" disabled={busy}
        onClick={()=>setDemographicsTarget(null)}>Hủy</button>
       <button type="submit" className="btn btn-primary" disabled={busy}>{busy?"Đang lưu...":"Lưu thay đổi"}</button>
      </div>
     </form>
    </div>
   </div>}
   {showCard&&<div role="presentation" className="modal-overlay fixed inset-0 z-50 bg-[#0c2b43]/65 p-4 flex items-start justify-center overflow-y-auto"
    onClick={()=>setShowCard(null)}>
   <div role="dialog" aria-modal="true" aria-label="Thẻ đại biểu điện tử" className="card mobile-sheet max-w-lg w-full p-5 sm:p-7 md:p-8 my-4 relative delegate-card-print"
    onClick={e=>e.stopPropagation()}>
    <button className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef5f6] text-[#2a6177] hover:bg-[#e0f0f0] print:hidden" aria-label="Đóng thẻ đại biểu" onClick={()=>setShowCard(null)}><X/></button>
    <p className="text-xs tracking-widest font-semibold text-[#007eae]">THẺ ĐẠI BIỂU ĐIỆN TỬ</p>
    <p className="helper mt-2">Đại hội: <strong>{congressCode.toUpperCase()}</strong></p>
    <div className="mt-4 flex items-start gap-4">
     {delegates.find(d=>d.id===showCard.id)?.photo_path&&<Image unoptimized
      src={"/api/delegates/"+showCard.id+"/photo"} width={90} height={120}
      alt={"Ảnh "+showCard.name} className="h-[120px] w-[90px] shrink-0 rounded-lg border border-[#dfe9ee] bg-white object-cover"/>}
     <h3 className="text-xl font-semibold mt-2">{showCard.name}</h3>
    </div>
    <p className="text-[#4d6880] text-sm mt-1">Mã định danh đại biểu: <strong>{showCard.code}</strong></p>
    <label className="block mt-6 print:hidden"><span className="label">Chọn loại mã QR</span>
     <select className="field" value={cardSession} onChange={e=>{
      const delegate=delegates.find(d=>d.id===showCard.id);
      if(delegate)void openCard(delegate,e.target.value);
     }}><option value="">QR cá nhân cố định – dùng nhiều phiên</option>
      {sessionQrChoices.map(s=><option key={s.id} value={s.id}>QR riêng: {s.name}</option>)}
     </select></label>
    <div className="text-center rounded-xl bg-[#f5fafc] p-5 mt-5">
     <div className="font-semibold text-sm">{showCard.scope==="fixed"?"QR cố định":
      "QR dành riêng: "+showCard.sessionName}</div>
     <div className="bg-white rounded-xl p-3 sm:p-5 mt-3 w-fit max-w-full mx-auto border border-[#e7f1f4]">
      <QRCodeSVG id="delegate-qr" className="max-w-full h-auto" value={showCard.token} size={210} level="M" marginSize={1}/>
     </div>
     {showCard.scope==="session"&&<p className="helper mt-3">Quét trong khoảng {displayTime(showCard.startsAt)} – {displayTime(showCard.endsAt)}</p>}
    </div>
    <div className="border-t border-[#e1ebf1] pt-5 mt-5">
     <p className="font-bold text-sm mb-2">Barcode dự phòng (Code 128)</p>
     <DelegateBarcode value={showCard.barcodeCode}/>
     <p className="helper text-center mt-2">Barcode chỉ dùng tra cứu. BTC cần xác minh danh tính trước khi điểm danh.</p>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row mt-6 print:hidden">
     <button className="btn btn-secondary flex-1" onClick={()=>saveSvg("delegate-qr",`QR-${showCard.code}.svg`)}>
      <Download size={16}/> Tải QR</button>
     <button className="btn btn-primary flex-1" onClick={()=>window.print()}><Printer size={16}/> In thẻ</button>
    </div>
   </div>
  </div>}
   {photoTarget&&<DelegatePhotoEditor name={photoTarget.kind==="new"?"Đại biểu mới":photoTarget.delegate.full_name}
    initialPhotoUrl={photoTarget.kind==="new"?pendingPhotoPreview:
      photoTarget.delegate.photo_path?"/api/delegates/"+photoTarget.delegate.id+"/photo":null}
    onClose={()=>setPhotoTarget(null)} onSave={photoSaved}/>}
 </div>;
}