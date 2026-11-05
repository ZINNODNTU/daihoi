"use client";
import {ChangeEvent,useState} from "react";
import {useRouter} from "next/navigation";
import {CloudUpload,Download,FileText,Image as ImageIcon} from "lucide-react";
import type {DocRow} from "@/lib/types";
export function DocumentsClient({congressId,docs,canManage}:{congressId:string;docs:DocRow[];canManage:boolean}){
 const router=useRouter();const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 async function upload(e:ChangeEvent<HTMLInputElement>){
  const file=e.target.files?.[0];if(!file)return;setBusy(true);setNotice("");
  try{
   const f=new FormData();f.append("congressId",congressId);f.append("file",file);
   const r=await fetch("/api/documents",{method:"POST",body:f});const j=await r.json();
   if(!r.ok)throw new Error(j.error||"Không thể tải tệp.");
   setNotice("Đã lưu tệp lên Google Drive.");router.refresh();
  }catch(err){setNotice(err instanceof Error?err.message:"Lỗi tải tệp.");}
  finally{setBusy(false);e.target.value="";}
 }
 return <div><div className="flex flex-wrap justify-between items-start gap-4 mb-8"><div><p className="text-xs tracking-widest font-extrabold text-[#1c9a9f]">HỒ SƠ ĐẠI HỘI</p><h1 className="text-3xl font-extrabold mt-2">Tài liệu và hình ảnh</h1><p className="helper mt-2">Tệp lưu tại Google Drive, quyền tải được kiểm tra qua tài khoản Đại hội.</p></div>{canManage&&<label className="btn btn-primary cursor-pointer"><CloudUpload size={18}/>{busy?"Đang tải lên...":"Tải tài liệu"}<input type="file" disabled={busy} className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx" onChange={e=>void upload(e)}/></label>}</div>
 {notice&&<p role="status" className="card p-4 mb-6 text-sm">{notice}</p>}
 <div className="card overflow-hidden"><div className="p-6 border-b border-[#edf2f6]"><h2 className="section-title">Danh sách tệp ({docs.length})</h2></div><div className="table-wrap"><table className="data"><thead><tr><th>Tên tệp</th><th>Định dạng</th><th>Ngày tải</th><th></th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td className="font-semibold flex gap-2 items-center">{d.mime_type.startsWith("image/")?<ImageIcon size={18} className="text-[#1b9ea2]"/>:<FileText size={18} className="text-[#237bb0]"/>}{d.file_name}</td><td>{d.mime_type.split("/").at(-1)?.toUpperCase()}</td><td>{new Date(d.created_at).toLocaleDateString("vi-VN")}</td><td><a className="btn btn-secondary" href={`/api/documents/${d.id}`}><Download size={17}/> Tải</a></td></tr>)}{docs.length===0&&<tr><td colSpan={4} className="text-center helper py-12!">Chưa có tài liệu nào. Cấu hình Google Drive OAuth để bắt đầu tải lên.</td></tr>}</tbody></table></div></div>
 <p className="helper mt-5">Giới hạn phiên bản này: tệp tối đa 4 MB (giới hạn tải qua Vercel Function); khi sử dụng chính thức, cần thiết lập Google OAuth và thư mục Drive gốc.</p></div>;
}
