"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {CheckCircle2,Download,Eye,EyeOff,FileSpreadsheet,KeyRound,LockKeyhole,Search,ShieldAlert,UserRoundPlus,Users} from "lucide-react";
import type {Delegate} from "@/lib/types";
import {DelegateAdminTabs} from "@/components/delegate-admin-tabs";
import {DEFAULT_DELEGATE_PASSWORD} from "@/lib/delegate-password-policy";

type Issued={id:string;name:string;email:string;password:string};
const DEFAULT_PASSWORD=DEFAULT_DELEGATE_PASSWORD;
const safe=(value:string)=>/^[=+@\-\t\r]/.test(value)?"'"+value:value;
async function toExcel(name:string,headers:string[],rows:(string|number)[][]){
 const {default:writeExcelFile}=await import("write-excel-file/browser");
 const data=[
  headers.map(value=>({value,fontWeight:"bold" as const,backgroundColor:"#17263f",textColor:"#ffffff"})),
  ...rows.map(row=>row.map(v=>typeof v==="string"?safe(v):v))
 ];
 const widths=[8,26,18,29,34,26,22,28,50];
 await writeExcelFile([{sheet:"Tai khoan dai bieu",stickyRowsCount:1,showGridLines:false,
  columns:headers.map((_,index)=>({width:widths[index]||23})),data}]).toFile(name);
}

export function DelegateAccountsClient({congressId,congressCode,delegates}:{
 congressId:string;congressCode:string;delegates:Delegate[]
}){
 const router=useRouter();
 const [search,setSearch]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [chosen,setChosen]=useState<string[]>([]);
 const [resetChosen,setResetChosen]=useState<string[]>([]);
 const [target,setTarget]=useState<Delegate|null>(null);
 const [showDefault,setShowDefault]=useState(false);
 const [issued,setIssued]=useState<Issued[]>([]);
 const filtered=useMemo(()=>delegates.filter(d=>[d.full_name,d.student_id,d.login_email,d.unit]
  .join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))),[delegates,search]);
 const unlinked=delegates.filter(d=>d.is_active&&!d.auth_user_id&&!!d.student_id);
 const linked=delegates.filter(d=>d.auth_user_id);
 const selectedForReset=linked.filter(d=>d.is_active&&resetChosen.includes(d.id)).slice(0,15);
 const selectedIds=unlinked.filter(d=>chosen.includes(d.id)).map(d=>d.id);
 const eligible=selectedIds.length?selectedIds.slice(0,100):unlinked.slice(0,100).map(d=>d.id);

 async function exportInventory(includePasswords=true){
  if(includePasswords&&!issued.length){setError("Chưa có mật khẩu để xuất. Mật khẩu cũ đã được mã hóa một chiều; hãy chọn tài khoản đã cấp và dùng Reset & tải Excel.");return;}
  if(includePasswords&&issued.length&&!window.confirm("Excel sẽ chứa mật khẩu mới cấp/reset trong phiên quản trị này. Hãy bảo quản và chuyển riêng cho đại biểu; tiếp tục xuất?"))return;
  setError("");setNotice("");
  try{
   const known=new Map((includePasswords?issued:[]).map(item=>[item.id,item.password]));
   await toExcel("danh-sach-tai-khoan-"+congressCode+".xlsx",
    ["STT","Họ tên","MSSV","Đơn vị","Email đăng nhập","Trạng thái tài khoản","Vai trò","Mật khẩu vừa cấp/reset","Ghi chú mật khẩu"],
    delegates.map((d,i)=>[i+1,d.full_name,d.student_id||"",d.unit||"",
     d.login_email||"",d.auth_user_id?"Đã cấp":"Chưa cấp",d.delegate_type,
     known.get(d.id)||"",!d.auth_user_id?"Chưa cấp tài khoản":known.has(d.id)?
      "Đã cấp hoặc reset trong phiên này":"Không đọc được mật khẩu hiện tại; reset để cấp lại"]));
   setNotice("Đã xuất danh sách. Có "+known.size+" mật khẩu vừa cấp/reset được điền; tài khoản khác không thể xem lại mật khẩu hiện tại.");
  }catch{setError("Không xuất được tệp Excel.");}
 }
 async function exportIssued(values=issued){
  if(!values.length)return;
  await toExcel("mat-khau-cap-mot-lan-"+congressCode+".xlsx",
   ["Họ tên","Email đăng nhập","Mật khẩu vừa cấp/reset (một lần)"],
   values.map(d=>[d.name,d.email,d.password]));
 }
 async function provision(){
  if(!eligible.length)return;
  if(!window.confirm("Cấp tài khoản cho "+eligible.length+" đại biểu đã chọn? Mật khẩu được xuất một lần; cần lưu và chuyển riêng cho từng người."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/delegates/accounts",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({congressId,delegateIds:eligible})});
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không thể cấp tài khoản.");
   const created=(body.created||[]) as Issued[];
   if(created.length){
    setIssued(previous=>[...new Map([...previous,...created].map(item=>[item.id,item])).values()]);
    await exportIssued(created);
   }
   setNotice("Tạo mới "+created.length+", liên kết tài khoản có sẵn "+Number(body.linkedExisting||0)+
    ". "+(body.errors?.length||0)+" tài khoản không xử lý được.");
   if(body.errors?.length)setError(body.errors.slice(0,5).map((e:{reason:string;name:string})=>e.name+": "+e.reason).join(" · "));
   setChosen([]);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Lỗi cấp tài khoản.");}
  finally{setBusy(false);}
 }
 async function resetSelectedAndExport(){
  if(!selectedForReset.length||busy)return;
  const count=selectedForReset.length;
  if(!window.confirm("Reset "+count+" tài khoản đã chọn về mật khẩu mặc định rồi xuất Excel?\\n"+
   "Mật khẩu hiện tại sẽ bị thay thế ở TẤT CẢ Đại hội dùng chung tài khoản. Không thể hoàn tác. Tiếp tục?"))return;
  setBusy(true);setError("");setNotice("");
  const resetItems:Issued[]=[];
  const failed:string[]=[];
  try{
   for(const delegate of selectedForReset){
    try{
     const response=await fetch("/api/delegates/accounts/reset",{
      method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({congressId,delegateId:delegate.id})
     });
     const body=await response.json();
     if(!response.ok)throw new Error(body.error||"Không reset được.");
     const item={id:body.id,name:body.name,email:body.email,password:body.password} as Issued;
     resetItems.push(item);
     setIssued(prev=>[...new Map([...prev,item].map(value=>[value.id,value])).values()]);
    }catch(err){failed.push(delegate.full_name+": "+(err instanceof Error?err.message:"Lỗi reset"));}
   }
   setResetChosen(prev=>prev.filter(id=>!resetItems.some(value=>value.id===id)));
   if(resetItems.length)await exportIssued(resetItems);
   setNotice("Đã reset "+resetItems.length+"/"+count+" tài khoản. Chỉ những tài khoản reset thành công có mật khẩu trong Excel.");
   if(failed.length)setError(failed.slice(0,5).join(" · "));
  }catch(err){
   setError("Đã reset "+resetItems.length+" tài khoản nhưng chưa tạo được Excel. Dùng nút Tải lại Excel lần này trước khi rời trang. "+(err instanceof Error?err.message:""));
  }finally{setBusy(false);}
 }
 async function reset(){
  if(!target)return;
  if(!window.confirm("Reset mật khẩu của "+target.full_name+" về "+DEFAULT_PASSWORD+"?\nMật khẩu cũ sẽ hết hiệu lực ở TẤT CẢ Đại hội thuộc tài khoản này. Hãy báo đại biểu đổi mật khẩu sau khi đăng nhập."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/delegates/accounts/reset",{
    method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",
    body:JSON.stringify({congressId,delegateId:target.id})
   });
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không thể đặt lại mật khẩu.");
   const details=[{id:body.id,name:body.name,email:body.email,password:body.password}] as Issued[];
   setIssued(previous=>[...new Map([...previous,...details].map(item=>[item.id,item])).values()]);
   setTarget(null);setShowDefault(false);
   await exportIssued(details);
   setNotice("Đã reset mật khẩu của "+body.name+" về mật khẩu mặc định. Excel chứa mật khẩu vừa cấp đã tải về; yêu cầu đại biểu đổi mật khẩu khi đăng nhập.");
  }catch(err){setError(err instanceof Error?err.message:"Không thể đặt lại mật khẩu.");}
  finally{setBusy(false);}
 }

 return <div className="space-y-5">
  <DelegateAdminTabs congressId={congressId} active="accounts" canManage/>
  <header className="flex flex-wrap items-start justify-between gap-4">
   <div>
    <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#408ca1]">BẢO MẬT · TÀI KHOẢN ĐẠI BIỂU</p>
    <h1 className="page-title mt-2">Quản lý tài khoản đại biểu</h1>
    <p className="page-description mt-2">Tài khoản đại biểu mới được cấp mật khẩu khởi tạo mặc định; admin có thể reset về mặc định và xuất Excel mật khẩu vừa cấp/reset.</p>
   </div>
   <div className="flex w-full flex-col items-start gap-1.5 sm:w-auto sm:items-end">
    <button type="button" disabled={busy} onClick={()=>void exportInventory(true)}
     className="btn btn-secondary !min-h-12 w-full justify-center sm:w-auto"><FileSpreadsheet size={18}/> Xuất Excel kèm mật khẩu</button>
    <button type="button" disabled={busy} onClick={()=>void exportInventory(false)}
     className="text-[11px] font-bold text-[#266e87] underline underline-offset-2">Xuất danh sách (không mật khẩu)</button>
    <p className="text-[11px] leading-5 text-[#7b93a1]">{issued.length} mật khẩu sẵn sàng · Mật khẩu cũ không thể đọc lại.</p>
   </div>
  </header>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
   {[["Tổng hồ sơ",delegates.length],["Đã có tài khoản",linked.length],["Chưa cấp",unlinked.length]].map(([label,count])=>
    <div key={String(label)} className="rounded-[14px] border border-[#dce8eb] bg-white p-4">
     <p className="text-[11px] font-bold text-[#7e98a5]">{label}</p>
     <p className="mt-2 text-[25px] font-extrabold tabular-nums text-[#24546c]">{count}</p>
    </div>)}
  </div>
  <div className="rounded-[14px] border border-[#d8e6eb] bg-white p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2 font-extrabold text-[#255469]"><UserRoundPlus size={19}/> Cấp tài khoản</div>
    <button type="button" disabled={busy||!eligible.length}
     onClick={()=>void provision()} className="btn btn-primary">
     {busy?"Đang xử lý...":"Cấp "+eligible.length+" tài khoản"}
    </button>
   </div>
   <p className="mt-2 text-xs leading-6 text-[#8199a4]">Chọn các đại biểu chưa có tài khoản (tối đa 100/lần). Mọi tài khoản vừa tạo mới đều dùng mật khẩu ban đầu Abc@123456 và Excel tải tự động sẽ chứa mật khẩu này. Tài khoản đã tồn tại không bị đổi mật khẩu khi tham gia Đại hội khác; muốn cấp lại cần Reset về mặc định. Yêu cầu đại biểu đổi mật khẩu sau đăng nhập.</p>
  </div>
  {notice&&<p role="status" className="rounded-xl border border-[#c9e7d8] bg-[#effaf5] px-4 py-3 text-[12px] font-semibold text-[#226e55]">{notice}</p>}
  {error&&<p role="alert" className="rounded-xl border border-[#f2d2c4] bg-[#fff5f0] px-4 py-3 text-[12px] font-semibold text-[#a04f38]">{error}</p>}
  <div className="rounded-[14px] border border-[#eadfc4] bg-[#fffbf2] p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div><p className="text-[13px] font-extrabold text-[#654f2c]">Xuất mật khẩu tài khoản đã cấp</p>
     <p className="mt-1 max-w-2xl text-xs leading-6 text-[#7b725c]">Chọn ô bên cạnh tài khoản đã cấp trong danh sách. Hệ thống cần đặt lại mật khẩu về mặc định trước khi xuất chính xác ra Excel (tối đa 15 tài khoản/lần). Việc đặt lại ảnh hưởng mọi Đại hội dùng chung tài khoản này.</p>
    </div>
    <button type="button" className="btn btn-secondary" disabled={busy||!selectedForReset.length}
     onClick={()=>void resetSelectedAndExport()}><KeyRound size={16}/>{busy?"Đang xử lý...":"Reset & tải Excel ("+selectedForReset.length+")"}</button>
   </div>
  </div>
  {!!issued.length&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7dcb9] bg-[#fffaed] px-4 py-4">
   <p className="text-xs font-semibold leading-6 text-[#80672a]"><ShieldAlert size={17} className="mr-1 inline-block"/> {issued.length} mật khẩu vừa cấp — chỉ hiển thị trong phiên thao tác này. Không lưu lại mật khẩu tại website.</p>
   <button className="btn btn-secondary" type="button" onClick={()=>void exportIssued()}><Download size={16}/> Tải lại Excel lần này</button>
   <button className="text-[11px] font-bold text-[#876d2e] underline" type="button" onClick={()=>setIssued([])}>Ẩn thông tin</button>
  </div>}
  <section className="overflow-hidden rounded-[16px] border border-[#dce7eb] bg-white shadow-sm">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eef0] p-4 sm:p-5">
    <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-[#284b60]"><Users size={20}/> Danh sách tài khoản</h2>
    <label className="relative w-full sm:w-[330px]"><span className="sr-only">Tìm tài khoản</span>
     <Search size={17} className="absolute left-3 top-[14px] text-[#94aab5]"/>
     <input className="field !pl-10" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm họ tên, MSSV, email..."/>
    </label>
   </div>
   <div className="divide-y divide-[#edf1f3]">
    {filtered.map(d=><div key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5">
     <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
      <input type="checkbox" aria-label={(d.auth_user_id?"Chọn reset mật khẩu của ":"Chọn cấp tài khoản cho ")+d.full_name} disabled={!d.is_active}
       checked={d.auth_user_id?resetChosen.includes(d.id):chosen.includes(d.id)}
       onChange={e=>d.auth_user_id?
        setResetChosen(prev=>e.target.checked?[...prev,d.id]:prev.filter(id=>id!==d.id)):
        setChosen(prev=>e.target.checked?[...prev,d.id]:prev.filter(id=>id!==d.id))}
       className="h-4 w-4 shrink-0 accent-[#167b83]"/>
      <span className="min-w-0">
       <span className="block text-[13px] font-extrabold text-[#2b5065]">{d.full_name}</span>
       <span className="mt-1 block break-all text-[11px] leading-5 text-[#7d96a4]">{d.login_email||d.student_id||"Chưa có email đăng nhập"}</span>
      </span>
     </label>
     <span className={"rounded-full px-2.5 py-1.5 text-[10px] font-bold "+(d.auth_user_id?"bg-[#eaf7ef] text-[#21795a]":"bg-[#fff5e5] text-[#9a772f]")}>
      {d.auth_user_id?"Đã cấp":"Chưa cấp"}
     </span>
     {d.auth_user_id&&<button type="button" disabled={busy}
      onClick={()=>{setTarget(d);setShowDefault(false);setError("");}}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#d7e5e8] bg-[#f7fafb] px-3 text-[11px] font-bold text-[#3a6d7d] hover:bg-[#ecf5f7]">
      <KeyRound size={15}/> Reset về mặc định
     </button>}
    </div>)}
    {!filtered.length&&<p className="px-5 py-10 text-center text-xs text-[#8198a6]">Không tìm thấy đại biểu phù hợp.</p>}
   </div>
  </section>
  {target&&<div className="fixed inset-0 z-[100] grid place-items-center bg-[#122b38]/65 p-3 backdrop-blur-[2px]" role="presentation"
   onClick={e=>{if(e.target===e.currentTarget&&!busy)setTarget(null);}}>
   <div role="dialog" aria-modal="true" aria-label={"Reset mật khẩu cho "+target.full_name}
    className="w-full max-w-[480px] rounded-[18px] border border-[#dae6e9] bg-white p-5 shadow-2xl sm:p-7">
    <div className="flex items-center gap-3"><LockKeyhole size={23} className="text-[#147e7a]"/>
     <div><h2 className="text-[18px] font-extrabold text-[#22475b]">Reset mật khẩu đại biểu</h2>
      <p className="mt-1 text-xs text-[#7c96a3]">{target.full_name}</p></div>
    </div>
    <div className="mt-5 rounded-xl border border-[#cce4ed] bg-[#f1f8fc] p-4">
     <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#507d94]">Mật khẩu mặc định sau khi reset</p>
     <div className="mt-2 flex items-center justify-between gap-2">
      <code className="min-w-0 flex-1 select-all rounded-lg bg-white px-3 py-2.5 text-[16px] font-bold tracking-[.05em] text-[#24516b]">{showDefault?DEFAULT_PASSWORD:"••••••••••"}</code>
      <button type="button" aria-label={showDefault?"Ẩn mật khẩu mặc định":"Hiện mật khẩu mặc định"}
       onClick={()=>setShowDefault(!showDefault)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#cde1eb] bg-white text-[#37667f]">
       {showDefault?<EyeOff size={19}/>:<Eye size={19}/>}</button>
     </div>
    </div>
    <p className="mt-4 text-[12px] leading-6 text-[#8095a1]">Mật khẩu cũ sẽ bị thay thế ở mọi Đại hội dùng chung tài khoản này. Nên yêu cầu đại biểu đổi mật khẩu mặc định ngay khi đăng nhập; không thể xem lại mật khẩu hiện tại.</p>
    {error&&<p role="alert" className="mt-3 rounded-lg border border-[#f2d2c4] bg-[#fff5ef] p-3 text-[12px] font-semibold leading-5 text-[#a04f38]">{error}</p>}
    <div className="mt-5 flex justify-end gap-2">
     <button type="button" className="btn btn-secondary" disabled={busy} onClick={()=>setTarget(null)}>Hủy</button>
     <button type="button" className="btn btn-primary" disabled={busy}
      onClick={()=>void reset()}><CheckCircle2 size={17}/>{busy?"Đang reset...":"Reset về mặc định"}</button>
    </div>
   </div>
  </div>}
 </div>;
}