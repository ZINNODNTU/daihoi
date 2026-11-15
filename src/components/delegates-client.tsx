"use client";
import {ChangeEvent,FormEvent,Fragment,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Image from "next/image";
import {QRCodeSVG} from "qrcode.react";
import {Download,FileSpreadsheet,Plus,Search,Users,X,Printer,ScanBarcode,Camera,CheckSquare2,ChevronDown,ChevronRight,Layers3,Link2,LoaderCircle} from "lucide-react";
import {DelegateBarcode} from "@/components/delegate-barcode";
import {DelegatePhotoEditor} from "@/components/delegate-photo-editor";
import type {Delegate,AttendanceSession} from "@/lib/types";
import {displayTime} from "@/lib/attendance-report";
import {normalizeBirthDate,normalizeGender} from "@/lib/delegate-demographics";
import {DELEGATE_IMPORT_COLUMNS,delegateImportRow,splitDelegateImportBatches,selectDelegateTransfer} from "@/lib/delegate-transfer";
import {DELEGATE_ROSTER_HEADERS,DELEGATE_ROSTER_SUBHEADERS,parseDelegateImportSheet,type DelegateUploadRow} from "@/lib/delegate-roster-import";
import {groupDelegatesByUnit} from "@/lib/delegate-unit-groups";
import {DelegatePortrait} from "@/components/delegate-portrait";
import type {CongressKind} from "@/components/brand-mark";
type Props={
 congressId:string;congressCode:string;congressKind:CongressKind;delegates:Delegate[];canManage:boolean;
 sessions:AttendanceSession[];
};
type Row=DelegateUploadRow;
type PhotoTarget={kind:"new"}|{kind:"existing";delegate:Delegate};
type PhotoLinkOption={id:string;congressName:string};
type PhotoLinkDialog={delegate:Delegate;options:PhotoLinkOption[];selected:string;loading:boolean;error:string};
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
type UnitGroupHeadingProps={
 label:string;count:number;total:number;collapsed:boolean;selectedCount:number;
 canManage:boolean;onToggle:()=>void;onSelect:()=>void;
};
function UnitGroupHeading({label,count,total,collapsed,selectedCount,canManage,onToggle,onSelect}:UnitGroupHeadingProps){
 const allSelected=count>0&&selectedCount===count;
 return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
  <button type="button" onClick={onToggle} aria-expanded={!collapsed}
   aria-label={(collapsed?"Mở":"Thu gọn")+" đơn vị "+label}
   className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 text-left text-[13px] font-bold text-[#214e6b] hover:text-[#007eb8]">
   {collapsed?<ChevronRight size={17} className="shrink-0 text-[#65879b]"/>:
    <ChevronDown size={17} className="shrink-0 text-[#65879b]"/>}
   <span className="min-w-0 break-words">{label}</span>
   <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#32728f] ring-1 ring-[#d4e4ec]">
    {count===total?count:count+"/"+total} đại biểu
   </span>
  </button>
  {canManage&&<label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#3b7088] hover:bg-white">
   <input type="checkbox" checked={allSelected} onChange={onSelect}
    aria-label={"Chọn tất cả đại biểu thuộc đơn vị "+label}
    className="h-4 w-4 accent-[#007fae]"/>
   Chọn nhóm{selectedCount?" ("+selectedCount+"/"+count+")":""}
  </label>}
 </div>;
}
function saveSvg(id:string,name:string){
 const svg=document.getElementById(id);
 if(!svg)return;
 const xml=new XMLSerializer().serializeToString(svg);
 const blob=new Blob([xml],{type:"image/svg+xml;charset=utf-8"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function DelegatesClient({congressId,congressCode,congressKind,delegates,canManage,sessions}:Props){
 const router=useRouter();
 const [search,setSearch]=useState(""),[open,setOpen]=useState(false);
 const [collapsedUnitKeys,setCollapsedUnitKeys]=useState<Set<string>>(()=>new Set());
  const [selectedIds,setSelectedIds]=useState<Set<string>>(()=>new Set());
 const [error,setError]=useState(""),[success,setSuccess]=useState(""),[busy,setBusy]=useState(false);
 const [showCard,setShowCard]=useState<Card|null>(null);
 const [cardSession,setCardSession]=useState("");
 const [uploadRows,setUploadRows]=useState<Row[]|null>(null);
 const [photoTarget,setPhotoTarget]=useState<PhotoTarget|null>(null);
  const [photoLink,setPhotoLink]=useState<PhotoLinkDialog|null>(null);
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
  const body=await response.json() as {error?:string;unchanged?:boolean};
  if(!response.ok)throw new Error(body.error||"Không lưu được ảnh đại biểu.");
  return body;
 }
 async function openPhotoLink(delegate:Delegate){
  if(!canManage||!delegate.student_id)return;
  setPhotoLink({delegate,options:[],selected:"",loading:true,error:""});
  try{
   const q=new URLSearchParams({congressId,delegateId:delegate.id});
   const response=await fetch("/api/delegates/photo-links?"+q.toString(),
    {credentials:"same-origin",cache:"no-store"});
   const result=await response.json() as {error?:string;options?:PhotoLinkOption[]};
   if(!response.ok)throw new Error(result.error||"Không tra cứu được ảnh đã có.");
   const options=result.options||[];
   setPhotoLink(current=>current?.delegate.id===delegate.id?{...current,options,
    selected:options.length===1?options[0].id:"",loading:false}:current);
  }catch(e){
   setPhotoLink(current=>current?.delegate.id===delegate.id?{...current,loading:false,
    error:e instanceof Error?e.message:"Không tải được ảnh đã có."}:current);
  }
 }
 async function confirmPhotoLink(){
  if(!photoLink?.selected||busy)return;
  const {delegate,selected}=photoLink;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/delegates/photo-links",{
    method:"POST",headers:{"Content-Type":"application/json"},
    credentials:"same-origin",body:JSON.stringify({congressId,delegateId:delegate.id,sourceId:selected})
   });
   const result=await response.json() as {ok?:boolean;error?:string};
   if(!response.ok||!result.ok)throw new Error(result.error||"Không liên kết được ảnh.");
   setPhotoLink(null);
   setSuccess("Đã liên kết ảnh cho "+delegate.full_name+
    " từ Đại hội khác mà không tạo bản sao mới trong Storage.");
   router.refresh();
  }catch(e){
   setPhotoLink(current=>current?.delegate.id===delegate.id?{...current,
    error:e instanceof Error?e.message:"Không thể liên kết ảnh."}:current);
  }finally{setBusy(false);}
 }
 async function photoSaved(blob:Blob){
  if(!photoTarget)return;
  if(photoTarget.kind==="new"){
   setPendingPhoto(blob);
   setPendingPhotoPreview(URL.createObjectURL(blob));
   setPhotoTarget(null);
   return;
  }
  const uploaded=await uploadPhoto(photoTarget.delegate.id,blob);
  setPhotoTarget(null);
  setSuccess((uploaded.unchanged?"Ảnh giống bản hiện tại, không tải lên lại: ":"Đã lưu ảnh nền trắng cho ")+photoTarget.delegate.full_name+".");
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
 const unitGroups=useMemo(()=>groupDelegatesByUnit(filtered),[filtered]);
 const fullUnitCounts=useMemo(()=>new Map(groupDelegatesByUnit(delegates).map(group=>[
  group.key,group.delegates.length
 ])),[delegates]);
 const unitCount=fullUnitCounts.size;
 const allUnitsCollapsed=unitGroups.length>0&&unitGroups.every(group=>collapsedUnitKeys.has(group.key));
 const selectedCount=delegates.filter(d=>selectedIds.has(d.id)).length;
 const filteredIds=filtered.map(d=>d.id);
 const filteredAllSelected=filteredIds.length>0&&filteredIds.every(id=>selectedIds.has(id));
 const filteredSomeSelected=filteredIds.some(id=>selectedIds.has(id));
 const existingStudentIds=new Set(delegates.map(d=>d.student_id?.toUpperCase()).filter(Boolean));
 const importableRows=uploadRows?.filter(row=>!row.student_id||!existingStudentIds.has(row.student_id.toUpperCase()))||[];
 const skippedImportCount=uploadRows?uploadRows.length-importableRows.length:0;

 function selectFiltered(){
  setSelectedIds(previous=>{
   const next=new Set(previous);
   for(const id of filteredIds){if(filteredAllSelected)next.delete(id);else next.add(id);}
   return next;
  });
 }
 function toggleUnit(key:string){
  setCollapsedUnitKeys(previous=>{
   const next=new Set(previous);
   if(next.has(key))next.delete(key);else next.add(key);
   return next;
  });
 }
 function toggleAllUnits(){
  setCollapsedUnitKeys(allUnitsCollapsed?new Set():new Set(unitGroups.map(group=>group.key)));
 }
 function selectUnit(ids:readonly string[]){
  setSelectedIds(previous=>{
   const everySelected=ids.every(id=>previous.has(id));
   const next=new Set(previous);
   for(const id of ids){if(everySelected)next.delete(id);else next.add(id);}
   return next;
  });
 }
 function selectOne(id:string){
  setSelectedIds(previous=>{
   const next=new Set(previous);
   if(next.has(id))next.delete(id);else next.add(id);
   return next;
  });
 }
 async function exportDelegates(mode:"all"|"selected"){
  const chosen=selectDelegateTransfer(delegates,mode==="all"?null:selectedIds);
  if(!chosen.length){setError("Chưa có đại biểu nào để xuất.");return;}
  setBusy(true);setError("");setSuccess("");
  try{
   const {default:writeExcelFile}=await import("write-excel-file/browser");
   const batches=splitDelegateImportBatches(chosen);
   const safeCode=congressCode.replace(/[^A-Za-z0-9_-]/g,"-").slice(0,48);
   for(let i=0;i<batches.length;i++){
    const name="dai-bieu-"+safeCode+"-"+(mode==="all"?"tat-ca":"da-chon")+
     (batches.length>1?"-"+String(i+1).padStart(3,"0"):"")+".xlsx";
    const cells=[ [...DELEGATE_IMPORT_COLUMNS],...batches[i].map(delegateImportRow)];
    await writeExcelFile([{sheet:"Danh sach dai bieu",stickyRowsCount:1,data:cells}]).toFile(name);
   }
   setSuccess("Đã xuất "+chosen.length+" đại biểu thành "+batches.length+
    " tệp Excel đúng mẫu nhập của Đại hội khác. Ảnh, tài khoản, mã QR và ghế không nằm trong tệp.");
  }catch(e){setError("Không xuất được Excel: "+(e instanceof Error?e.message:"Lỗi không xác định"));}
  finally{setBusy(false);}
 }
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
  e.target.value="";
  if(file.size>2*1024*1024){setError("File Excel/CSV không được vượt quá 2 MB.");return;}
  setError("");setSuccess("");setUploadRows(null);
  setBusy(true);
  try{
   let matrix:(string|number|Date|null|undefined)[][]=[];
   if(file.name.toLowerCase().endsWith(".xlsx")){
    const {readSheet}=await import("read-excel-file/browser");
    // Keep real Date/Excel serial cells: the roster parser knows both formats.
    matrix=await readSheet(file) as (string|number|Date|null|undefined)[][];
   }else if(file.name.toLowerCase().endsWith(".csv")){
    const contents=await file.text();
    const records:string[][]=[];
    let cells:string[]=[],cell="",quoted=false;
    for(let i=0;i<contents.length;i++){
     const c=contents[i];
     if(c==='"'&&quoted&&contents[i+1]==='"'){cell+='"';i++;}
     else if(c==='"')quoted=!quoted;
     else if((c===','||c===';'||c==='\n')&&!quoted){
      cells.push(cell);cell="";
      if(c==='\n'){records.push(cells);cells=[];}
     }else if(c!=='\r')cell+=c;
    }
    cells.push(cell);if(cells.some(value=>value.trim()))records.push(cells);
    matrix=records;
   }else throw new Error("Chỉ hỗ trợ tệp .xlsx hoặc .csv.");
   setUploadRows(parseDelegateImportSheet(matrix));
  }catch(error){
   setError(error instanceof Error?error.message:"Không đọc được tệp Excel.");
  }finally{setBusy(false);}
 }
 async function downloadTemplate(){
  try{
   const {default:writeExcelFile}=await import("write-excel-file/browser");
   const style={
    fontFamily:"Times New Roman",fontSize:11,fontWeight:"bold",textColor:"#173B59",
    backgroundColor:"#E7F0F7",align:"center" as const,alignVertical:"center" as const,
    wrap:true,borderColor:"#9CB4C5",borderStyle:"thin" as const
   };
   const top=DELEGATE_ROSTER_HEADERS.map((label,index)=>{
    if(index===4)return null; // The D1 heading spans both NAM and NỮ.
    return {value:label||"",type:String,...style,height:42,
     ...(index===3?{columnSpan:2}:{rowSpan:2})};
   });
   const sub=DELEGATE_ROSTER_SUBHEADERS.map((label,index)=>
    index===3||index===4?{value:label,type:String,...style,height:25}:null);
   const empty=Array.from({length:50},()=>Array.from({length:DELEGATE_ROSTER_HEADERS.length},()=>({
    value:"",type:String,borderColor:"#D5E1E9",borderStyle:"thin" as const,
    fontFamily:"Times New Roman",height:22
   })));
   const widths=[7,30,20,18,18,28,34,20].map(width=>({width}));
   await writeExcelFile([{sheet:"Danh sach dai bieu",stickyRowsCount:2,
    columns:widths,data:[top,sub,...empty] as unknown as (string|number)[][]}]).toFile("mau-nhap-dai-bieu-NAM-NU-chuc-vu-don-vi-loai.xlsx");
   setSuccess("Đã tải mẫu 8 cột có Loại đại biểu: Chính thức, Dự khuyết hoặc Khách mời. Điền dữ liệu từ dòng 3.");
  }catch(error){
   setError("Không tạo được Excel mẫu: "+(error instanceof Error?error.message:"Lỗi không xác định"));
  }
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
  {canManage&&<section aria-label="Xuất danh sách đại biểu để chuyển Đại hội" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#cfe1eb] bg-[#f4f9fc] px-4 py-3.5">
  <div className="min-w-0"><p className="flex items-center gap-2 text-[13px] font-extrabold text-[#235872]"><CheckSquare2 size={18}/> Xuất danh sách đại biểu</p>
   <p className="mt-1 text-[11px] leading-5 text-[#66869a]">Đã chọn {selectedCount}/{delegates.length} đại biểu · Tệp tương thích Nhập Excel/CSV ở Đại hội khác.</p></div>
  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
   <button type="button" className="btn btn-secondary flex-1 justify-center !text-xs sm:flex-none" disabled={busy||!delegates.length} onClick={()=>void exportDelegates("all")}><Download size={16}/> Xuất tất cả ({delegates.length})</button>
   <button type="button" className="btn btn-primary flex-1 justify-center !text-xs sm:flex-none" disabled={busy||!selectedCount} onClick={()=>void exportDelegates("selected")}><Download size={16}/> Xuất đã chọn ({selectedCount})</button>
   {selectedCount>0&&<button type="button" className="btn btn-secondary !text-xs" disabled={busy} onClick={()=>setSelectedIds(new Set())}>Bỏ chọn</button>}
  </div>
  <p className="w-full text-[10px] leading-5 text-[#7d95a5]">Chỉ xuất các trường hồ sơ có thể nhập lại. Không xuất mật khẩu, mã QR, ảnh hay ghế; ảnh sẽ được liên kết theo tài khoản khi cấp tài khoản tại Đại hội nhận.</p>
 </section>}
 {error&&<p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl mb-5">{error}</p>}
  {success&&<p role="status" className="bg-green-50 text-green-700 p-3 rounded-xl mb-5">{success}</p>}
  {uploadRows&&<div className="card p-5 mb-5">
   <p className="font-bold">Đã đọc {uploadRows.length} dòng · Có thể thêm {importableRows.length} đại biểu</p>
    {skippedImportCount>0&&<p className="mt-2 rounded-lg border border-[#e7d6ae] bg-[#fff9ec] px-3 py-2 text-xs text-[#88642e]">Đã bỏ qua {skippedImportCount} MSSV có sẵn tại Đại hội hiện tại, tránh nhập trùng. Chỉ các dòng mới được thêm.</p>}
   <p className="helper my-3">Mẫu 8 cột với ngày sinh NAM/NỮ và Loại đại biểu (Chính thức, Dự khuyết, Khách mời). Để trống loại sẽ mặc định Chính thức. Các mẫu Excel cũ vẫn nhập được.</p>
   <div className="mb-4 max-h-52 overflow-auto rounded-lg border border-[#d4e5ed]"><table className="data"><thead><tr><th>MSSV</th><th>Họ tên</th><th>Đơn vị</th><th>Chức vụ</th><th>Loại đại biểu</th><th>Giới tính</th><th>Ngày sinh</th></tr></thead><tbody>{uploadRows.slice(0,5).map((r,i)=><tr key={i}><td>{r.student_id||"—"}</td><td>{r.full_name}</td><td>{r.unit||"—"}</td><td>{r.position||"—"}</td><td>{kindLabel(r.delegate_type)}</td><td>{r.gender==="male"?"Nam":r.gender==="female"?"Nữ":r.gender||"—"}</td><td>{birthLabel(r.birth_date||null)}</td></tr>)}</tbody></table></div>
   <div className="flex gap-2"><button type="button" className="btn btn-primary" onClick={()=>void save(importableRows)} disabled={busy||!importableRows.length}>Xác nhận nhập</button>
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
       <DelegatePortrait delegateId="" fullName="Đại biểu mới" photoPath={null} kind={congressKind}
        width={66} height={88} className="h-[88px] w-[66px] rounded-lg border border-[#d5e1e8]"/>}
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
    <h2 className="font-semibold flex flex-wrap gap-2 items-center"><Users size={20} className="text-[#007eae]"/>Danh sách
    {canManage&&<span className="rounded-full bg-[#edf6f9] px-2.5 py-1 text-[11px] font-semibold text-[#2a718d]">{selectedCount} đã chọn</span>}
     <span className="rounded-full bg-[#eff5f9] px-2.5 py-1 text-[11px] font-semibold text-[#4d758b]">{unitCount} đơn vị</span></h2>
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <button type="button" onClick={toggleAllUnits} disabled={!unitGroups.length}
       className="btn btn-secondary !min-h-10 !text-xs" aria-label={allUnitsCollapsed?"Mở tất cả đơn vị":"Thu gọn tất cả đơn vị"}>
       <Layers3 size={15}/>{allUnitsCollapsed?"Mở tất cả":"Thu gọn tất cả"}</button>
      <div className="relative min-w-0 flex-1 sm:w-[300px] sm:flex-none"><Search size={18} className="absolute left-3 top-3 text-[#90a5b8]"/>
     <input value={search} onChange={e=>{setSearch(e.target.value);setCollapsedUnitKeys(new Set());}} className="field pl-10!"
      placeholder="MSSV, họ tên, đơn vị, chức vụ..."/></div>
   </div>
   </div>
    <div className="table-wrap desktop-table"><table className="data"><thead><tr>
    {canManage&&<th><label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold"><input type="checkbox" aria-label="Chọn tất cả đại biểu đang hiển thị" checked={filteredAllSelected} onChange={selectFiltered} disabled={busy||!filteredIds.length} className="h-4 w-4 accent-[#167aa3]"/>Chọn{filteredSomeSelected&&!filteredAllSelected?" *":""}</label></th>}
     <th>Ảnh</th><th>Mã đại biểu</th><th>Họ tên</th><th>MSSV / Email</th><th className="hide-mobile">Đơn vị / Chức vụ</th><th>Vai trò</th><th>Giới tính / Ngày sinh</th><th>Tài khoản</th><th>Ảnh / Thẻ</th>
   </tr></thead><tbody>
    {unitGroups.map(group=><Fragment key={group.key}>
     <tr className="bg-[#eff6fa]"><td colSpan={canManage?10:9} className="!border-b !border-[#d8e6ee] !px-4 !py-2.5">
      <UnitGroupHeading label={group.label} count={group.delegates.length}
       total={fullUnitCounts.get(group.key)||group.delegates.length}
       collapsed={collapsedUnitKeys.has(group.key)}
       selectedCount={group.delegates.filter(d=>selectedIds.has(d.id)).length}
       canManage={canManage} onToggle={()=>toggleUnit(group.key)}
       onSelect={()=>selectUnit(group.delegates.map(d=>d.id))}/>
     </td></tr>
     {!collapsedUnitKeys.has(group.key)&&group.delegates.map(d=><tr key={d.id}>
     {canManage&&<td><input type="checkbox" aria-label={"Chọn xuất đại biểu "+d.full_name} checked={selectedIds.has(d.id)} onChange={()=>selectOne(d.id)} disabled={busy} className="h-4 w-4 accent-[#167aa3]"/></td>}
     <td><DelegatePortrait delegateId={d.id} fullName={d.full_name} photoPath={d.photo_path}
       kind={congressKind} width={40} height={54}
       className="h-[54px] w-10 rounded-lg border border-[#d7e4ec]"/></td>
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
      {canManage&&d.student_id&&<button type="button"
        className="btn btn-secondary !min-h-9 !px-2.5 !text-xs"
        disabled={busy} onClick={()=>void openPhotoLink(d)}
        title="Dùng lại ảnh từ Đại hội khác cùng MSSV"><Link2 size={15}/> {d.photo_path?"Dùng ảnh khác":"Liên kết ảnh cũ"}</button>}
       <button className="btn btn-secondary !min-h-9 !px-2.5 !text-xs" disabled={busy} onClick={()=>void openCard(d)}>
       <ScanBarcode size={15}/> QR / Barcode</button></div></td></tr>)}
     </Fragment>)}
    {!filtered.length&&<tr><td colSpan={canManage?10:9} className="helper text-center py-9!">Không tìm thấy đại biểu.</td></tr>}
   </tbody></table></div>
  </div>
  <div className="mobile-cards px-3 pb-4">
    {unitGroups.map(group=><section key={group.key} className="mb-4 overflow-hidden rounded-xl border border-[#dce8ef] bg-[#f8fbfd]">
      <div className="border-b border-[#dce8ef] bg-[#eff6fa] px-3 py-2.5">
       <UnitGroupHeading label={group.label} count={group.delegates.length}
        total={fullUnitCounts.get(group.key)||group.delegates.length}
        collapsed={collapsedUnitKeys.has(group.key)}
        selectedCount={group.delegates.filter(d=>selectedIds.has(d.id)).length}
        canManage={canManage} onToggle={()=>toggleUnit(group.key)}
        onSelect={()=>selectUnit(group.delegates.map(d=>d.id))}/>
      </div>
      {!collapsedUnitKeys.has(group.key)&&<div className="space-y-2 p-2.5">
      {group.delegates.map(d=><article key={d.id} className="mobile-record">
     {canManage&&<label className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#d4e5ee] bg-white px-3 py-2 text-[11px] font-bold text-[#2d7797]"><input type="checkbox" checked={selectedIds.has(d.id)} onChange={()=>selectOne(d.id)} disabled={busy} aria-label={"Chọn xuất đại biểu "+d.full_name} className="h-4 w-4 accent-[#167aa3]"/> Chọn để xuất</label>}
     <div className="flex items-start justify-between gap-3">
      <DelegatePortrait delegateId={d.id} fullName={d.full_name} photoPath={d.photo_path}
        kind={congressKind} width={54} height={72}
        className="h-[72px] w-[54px] rounded-lg border border-[#d6e6ec]"/>
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
      {canManage&&d.student_id&&<button type="button"
        className="btn btn-secondary" disabled={busy} onClick={()=>void openPhotoLink(d)}>
        <Link2 size={17}/> {d.photo_path?"Dùng ảnh khác":"Liên kết ảnh cũ"}</button>}
       <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>void openCard(d)}>
       <ScanBarcode size={17}/> Xem QR / Barcode</button></div>
    </article>)}
      </div>}
     </section>)}
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
     <DelegatePortrait delegateId={showCard.id} fullName={showCard.name}
      photoPath={delegates.find(d=>d.id===showCard.id)?.photo_path}
      kind={congressKind} width={90} height={120}
      className="h-[120px] w-[90px] rounded-lg border border-[#dfe9ee]"/>
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
   {photoLink&&canManage&&<div role="presentation"
     className="fixed inset-0 z-[75] flex items-center justify-center overflow-y-auto bg-[#122b42]/65 p-3 sm:p-5"
     onClick={event=>{if(event.target===event.currentTarget&&!busy)setPhotoLink(null);}}>
     <div role="dialog" aria-modal="true" aria-label={"Liên kết ảnh đã có cho "+photoLink.delegate.full_name}
      className="w-full max-w-[490px] rounded-[20px] border border-[#d9e5ed] bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-3">
       <div><p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#1a829c]">DÙNG CHUNG ẢNH HỒ SƠ</p>
        <h2 className="mt-1 text-[19px] font-extrabold text-[#213f55]">Liên kết ảnh đã có</h2>
        <p className="mt-1 text-xs leading-5 text-[#6b8699]">{photoLink.delegate.full_name}
         {" · MSSV "}{photoLink.delegate.student_id}</p></div>
       <button type="button" aria-label="Đóng liên kết ảnh" disabled={busy}
        className="rounded-lg border border-[#dae7ed] p-2 text-[#537084] hover:bg-[#f1f7fa]"
        onClick={()=>setPhotoLink(null)}><X size={18}/></button>
      </div>
      <p className="mt-4 rounded-xl bg-[#f1f8fb] px-4 py-3 text-[12px] leading-6 text-[#426c81]">
       Chọn ảnh từ hồ sơ cùng MSSV, họ tên và thông tin định danh tại Đại hội khác.
       {photoLink.delegate.photo_path?" Ảnh đang dùng sẽ được thay bằng liên kết đã chọn.":""}
       Chỉ liên kết ảnh có sẵn, không tải lên tệp mới hoặc tạo bản sao trong Supabase Storage.
      </p>
      {photoLink.loading?<div role="status" className="flex items-center gap-2 py-8 text-sm text-[#5d8296]">
       <LoaderCircle size={18} className="animate-spin"/> Đang kiểm tra ảnh có thể liên kết...</div>:
       <div className="mt-4 space-y-2">
        {photoLink.options.length?<fieldset className="space-y-2">
         <legend className="mb-2 text-[12px] font-bold text-[#375f74]">Ảnh có thể dùng lại ({photoLink.options.length})</legend>
         {photoLink.options.map(source=><label key={source.id}
          className={"flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left text-[12px] leading-5 "+(photoLink.selected===source.id?
           "border-[#5da3bd] bg-[#edf8fd]":"border-[#dce8ee] bg-white hover:bg-[#f8fbfd]")}>
          <input type="radio" name="sourceDelegatePhoto" value={source.id}
           checked={photoLink.selected===source.id} disabled={busy}
           onChange={()=>setPhotoLink(current=>current?{...current,selected:source.id,error:""}:current)}
           className="mt-1 h-4 w-4 shrink-0 accent-[#087fa9]"/>
          <span><strong className="block font-semibold text-[#224b63]">{source.congressName}</strong>
           <span className="text-[11px] text-[#7390a0]">Dùng lại tệp ảnh hiện có · không chiếm thêm dung lượng</span></span>
         </label>)}</fieldset>:
         <p className="rounded-lg border border-[#e1e9ec] bg-[#f8fafb] p-4 text-[12px] leading-6 text-[#6b8492]">
          Chưa tìm thấy ảnh phù hợp ở Đại hội khác. Hãy kiểm tra MSSV, họ tên,
          ngày sinh, tài khoản hoặc quyền xem Đại hội nguồn; nếu chưa có ảnh nguồn, chọn “Thêm ảnh”.</p>}
       </div>}
      {photoLink.error&&<p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{photoLink.error}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
       <button type="button" className="btn btn-secondary" disabled={busy}
        onClick={()=>setPhotoLink(null)}>Hủy</button>
       <button type="button" className="btn btn-primary"
        disabled={busy||photoLink.loading||!photoLink.selected}
        onClick={()=>void confirmPhotoLink()}>
        {busy?<LoaderCircle size={15} className="animate-spin"/>:<Link2 size={16}/>}
        {busy?"Đang liên kết...":"Xác nhận dùng lại ảnh"}</button>
      </div>
     </div>
    </div>}
   {photoTarget&&<DelegatePhotoEditor name={photoTarget.kind==="new"?"Đại biểu mới":photoTarget.delegate.full_name}
    initialPhotoUrl={photoTarget.kind==="new"?pendingPhotoPreview:
      photoTarget.delegate.photo_path?"/api/delegates/"+photoTarget.delegate.id+"/photo":null}
    onClose={()=>setPhotoTarget(null)} onSave={photoSaved}/>}
 </div>;
}