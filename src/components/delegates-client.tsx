"use client";
import {ChangeEvent,FormEvent,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {QRCodeSVG} from "qrcode.react";
import {Download,FileSpreadsheet,Plus,Search,Users,X,Printer,ScanBarcode} from "lucide-react";
import {DelegateBarcode} from "@/components/delegate-barcode";
import type {Delegate,AttendanceSession} from "@/lib/types";
import {displayTime} from "@/lib/attendance-report";
type Props={
 congressId:string;congressCode:string;delegates:Delegate[];canManage:boolean;
 sessions:AttendanceSession[];
};
type Row={code:string;full_name:string;unit:string;delegate_type:"official"|"alternate"|"guest"};
type Card={
 id:string;name:string;code:string;barcodeCode:string;token:string;
 scope:"fixed"|"session";sessionName?:string;startsAt?:string|null;endsAt?:string|null;
};
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
  useEffect(()=>{
    if(!showCard)return;
    const priorOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setShowCard(null);};
    window.addEventListener("keydown",onEscape);
    return()=>{window.removeEventListener("keydown",onEscape);document.body.style.overflow=priorOverflow;};
  },[showCard]);
 const filtered=useMemo(()=>delegates.filter(d=>
  [d.full_name,d.code,d.unit,d.barcode_code].join(" ").toLocaleLowerCase("vi")
   .includes(search.toLocaleLowerCase("vi"))
 ),[delegates,search]);
 const sessionQrChoices=sessions.filter(s=>s.qr_policy!=="fixed");
 async function save(rows:Row[]){
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/delegates",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({congressId,delegates:rows})
   });
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Không thể thêm đại biểu.");
   setSuccess(`Đã nhập thành công ${result.count} đại biểu.`);
   setUploadRows(null);setOpen(false);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Lỗi nhập dữ liệu.");}
  finally{setBusy(false);}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  await save([{code:String(form.get("code")||"").trim(),
   full_name:String(form.get("full_name")||"").trim(),
   unit:String(form.get("unit")||""),
   delegate_type:parseKind(String(form.get("delegate_type")||"official"))}]);
 }
 async function handleFile(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;
  setError("");setUploadRows(null);
  try{
   let matrix:(string|number|Date|null|undefined)[][]=[];
   if(file.name.toLowerCase().endsWith(".xlsx")){
    const {readSheet}=await import("read-excel-file/browser");
    matrix=(await readSheet(file)).map(row=>row.map(cell=>cell===null?null:String(cell)));
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
   const first=matrix[0].map(v=>String(v??"").toLocaleLowerCase("vi"));
   const hasHeader=first.some(v=>v.includes("mã")||v.includes("họ")||v.includes("code"));
   const rows=matrix.slice(hasHeader?1:0)
    .filter(r=>r.some(x=>x!==null&&String(x).trim()))
    .map(r=>({code:String(r[0]??"").trim(),full_name:String(r[1]??"").trim(),
     unit:String(r[2]??"").trim(),delegate_type:parseKind(String(r[3]??""))}));
   if(rows.length>250)throw new Error("Mỗi tệp được nhập tối đa 250 đại biểu.");
   if(rows.some(r=>!r.code||!r.full_name))
    throw new Error("Cột A phải có mã đại biểu, cột B phải có họ tên.");
   setUploadRows(rows);
  }catch(e){setError(e instanceof Error?e.message:"Không đọc được tệp.");}
  e.target.value="";
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
   <div><p className="text-xs tracking-widest text-[#169ca1] font-extrabold">QUẢN LÝ ĐẠI HỘI</p>
    <h1 className="page-title mt-2">Danh sách đại biểu</h1>
    <p className="helper mt-2">{delegates.length} đại biểu • QR cố định hoặc QR từng phiên • Barcode dự phòng.</p>
    <p className="helper mt-1">Mã định danh Đại hội: <strong>{congressCode.toUpperCase()}</strong></p>
   </div>
   {canManage&&<div className="mobile-toolbar w-full sm:flex sm:w-auto sm:flex-wrap sm:gap-2">
    <label className="btn btn-secondary w-full cursor-pointer sm:w-auto"><FileSpreadsheet size={18}/> Nhập Excel/CSV
     <input className="hidden" type="file" accept=".xlsx,.csv" onChange={e=>void handleFile(e)}/></label>
    <button type="button" className="btn btn-primary w-full sm:w-auto" aria-expanded={open} onClick={()=>setOpen(!open)}><Plus size={18}/> Thêm đại biểu</button>
   </div>}
  </div>
  {error&&<p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl mb-5">{error}</p>}
  {success&&<p role="status" className="bg-green-50 text-green-700 p-3 rounded-xl mb-5">{success}</p>}
  {uploadRows&&<div className="card p-5 mb-5">
   <p className="font-bold">Đã đọc {uploadRows.length} dòng</p>
   <p className="helper my-3">A: Mã đại biểu · B: Họ tên · C: Đơn vị · D: Loại đại biểu.</p>
   <div className="flex gap-2"><button disabled={busy} className="btn btn-primary" onClick={()=>void save(uploadRows)}>Xác nhận nhập</button>
    <button className="btn btn-secondary" onClick={()=>setUploadRows(null)}>Hủy</button></div>
  </div>}
  {open&&canManage&&<div className="card p-6 mb-6"><h2 className="section-title mb-5">Thêm đại biểu</h2>
   <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
    <label><span className="label">Mã đại biểu *</span><input className="field" name="code" required placeholder="DB001"/></label>
    <label><span className="label">Họ tên *</span><input className="field" name="full_name" required placeholder="Nguyễn Văn A"/></label>
    <label><span className="label">Đơn vị</span><input className="field" name="unit" placeholder="Khoa Công nghệ thông tin"/></label>
    <label><span className="label">Loại đại biểu</span><select name="delegate_type" className="field">
     <option value="official">Chính thức</option><option value="alternate">Dự khuyết</option>
     <option value="guest">Khách mời</option></select></label>
    <button disabled={busy} className="btn btn-primary md:col-span-2">Lưu đại biểu</button>
   </form>
  </div>}
  <div className="card overflow-hidden">
   <div className="p-4 sm:p-5 flex items-center justify-between flex-wrap gap-3">
    <h2 className="font-extrabold flex gap-2 items-center"><Users size={20} className="text-[#1d98a4]"/>Danh sách</h2>
    <div className="relative w-full sm:w-[300px]"><Search size={18} className="absolute left-3 top-3 text-[#90a5b8]"/>
     <input value={search} onChange={e=>setSearch(e.target.value)} className="field pl-10!"
      placeholder="Mã, họ tên, đơn vị, barcode..."/></div>
   </div>
   <div className="table-wrap desktop-table"><table className="data"><thead><tr>
    <th>Mã đại biểu</th><th>Họ tên</th><th className="hide-mobile">Đơn vị</th><th>Loại</th><th>Thẻ</th>
   </tr></thead><tbody>
    {filtered.map(d=><tr key={d.id}>
     <td className="font-bold text-[#116d93]">{d.code}</td><td className="font-bold">{d.full_name}</td>
     <td className="hide-mobile">{d.unit}</td>
     <td><span className="badge badge-gray">{kindLabel(d.delegate_type)}</span></td>
     <td><button className="btn btn-secondary text-xs!" disabled={busy} onClick={()=>void openCard(d)}>
      <ScanBarcode size={15}/> QR / Barcode</button></td></tr>)}
    {!filtered.length&&<tr><td colSpan={5} className="helper text-center py-9!">Không tìm thấy đại biểu.</td></tr>}
   </tbody></table></div>
  </div>
  <div className="mobile-cards px-3 pb-4">
    {filtered.map(d=><article key={d.id} className="mobile-record">
     <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><p className="text-[11px] font-extrabold tracking-wider text-[#0d8788]">{d.code}</p><h3 className="mobile-record-title mt-1">{d.full_name}</h3></div>
      <span className="badge badge-gray shrink-0">{kindLabel(d.delegate_type)}</span>
     </div>
     <p className="mobile-record-meta mt-2">{d.unit||"Chưa cập nhật đơn vị"}</p>
     <div className="mobile-record-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>void openCard(d)}>
      <ScanBarcode size={17}/> Xem QR / Barcode</button></div>
    </article>)}
    {!filtered.length&&<div className="rounded-2xl bg-[#f6fafb] p-7 text-center text-sm text-[#718795]">Không tìm thấy đại biểu phù hợp.</div>}
   </div>
   {showCard&&<div role="presentation" className="modal-overlay fixed inset-0 z-50 bg-[#0c2b43]/65 p-4 flex items-start justify-center overflow-y-auto"
    onClick={()=>setShowCard(null)}>
   <div role="dialog" aria-modal="true" aria-label="Thẻ đại biểu điện tử" className="card mobile-sheet max-w-lg w-full p-5 sm:p-7 md:p-8 my-4 relative delegate-card-print"
    onClick={e=>e.stopPropagation()}>
    <button className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef5f6] text-[#2a6177] hover:bg-[#e0f0f0] print:hidden" aria-label="Đóng thẻ đại biểu" onClick={()=>setShowCard(null)}><X/></button>
    <p className="text-xs tracking-widest font-extrabold text-[#139aa0]">THẺ ĐẠI BIỂU ĐIỆN TỬ</p>
    <p className="helper mt-2">Đại hội: <strong>{congressCode.toUpperCase()}</strong></p>
    <h3 className="text-xl font-extrabold mt-3">{showCard.name}</h3>
    <p className="text-[#4d6880] text-sm mt-1">Mã định danh đại biểu: <strong>{showCard.code}</strong></p>
    <label className="block mt-6 print:hidden"><span className="label">Chọn loại mã QR</span>
     <select className="field" value={cardSession} onChange={e=>{
      const delegate=delegates.find(d=>d.id===showCard.id);
      if(delegate)void openCard(delegate,e.target.value);
     }}><option value="">QR cá nhân cố định – dùng nhiều phiên</option>
      {sessionQrChoices.map(s=><option key={s.id} value={s.id}>QR riêng: {s.name}</option>)}
     </select></label>
    <div className="text-center rounded-xl bg-[#f5fafc] p-5 mt-5">
     <div className="font-extrabold text-sm">{showCard.scope==="fixed"?"QR cố định":
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
 </div>;
}
