import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";

export const runtime="nodejs";
const studentIdPattern=/^[A-Za-z0-9][A-Za-z0-9._-]{3,31}$/;
const delegateKinds=["official","alternate","guest"] as const;
type DelegateKind=(typeof delegateKinds)[number];
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});

export async function POST(request:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return reply("Cần đăng nhập.",401);
  const body=await request.json();
  const congressId=String(body.congressId||"");
  if(!(await hasRole(supabase,user.id,congressId,"admin")))return reply("Không có quyền quản lý đại biểu.",403);
  const entries:unknown[]=Array.isArray(body.delegates)?body.delegates:[body];
  if(!entries.length||entries.length>250)return reply("Mỗi lần nhập tối đa 250 đại biểu.",400);
  const rows=entries.map(entry=>{
   const item=(entry&&typeof entry==="object"&&!Array.isArray(entry)?entry:{}) as Record<string,unknown>;
   const studentId=String(item.student_id??"").trim().toUpperCase();
   const type=delegateKinds.includes(item.delegate_type as DelegateKind)?item.delegate_type as DelegateKind:"official";
   return {
    congress_id:congressId,
    full_name:String(item.full_name??"").trim().slice(0,160),
    unit:String(item.unit??"").trim().slice(0,200),
    student_id:studentId||null,
    position:String(item.position??"").trim().slice(0,160),
    login_email:studentId?studentId.toLowerCase()+"@dntu.edu.vn":null,
    delegate_type:type
   };
  });
  if(rows.some(r=>!r.full_name||(!r.student_id&&r.delegate_type!=="guest")))
   return reply("Đại biểu cần có MSSV và họ tên; khách mời có thể để trống MSSV.",400);
  if(rows.some(r=>r.student_id&&!studentIdPattern.test(r.student_id)))
   return reply("MSSV phải gồm 4–32 ký tự chữ, số, dấu chấm, gạch nối hoặc gạch dưới.",400);
  const students=rows.filter(r=>r.student_id).map(r=>r.student_id!.toLowerCase());
  if(new Set(students).size!==students.length)
   return reply("MSSV bị trùng trong tệp.",400);
  const {data,error}=await supabase.from("delegates").insert(rows).select("id,code,full_name");
  if(error)return reply(error.code==="23505"?"MSSV đã tồn tại trong dữ liệu.":"Không thể lưu danh sách. Kiểm tra migration v7 cấp mã tự động.",error.code==="23505"?409:500);
  return NextResponse.json({ok:true,count:data?.length??0,created:data??[]},{headers:{"Cache-Control":"no-store"}});
 }catch{return reply("Yêu cầu không hợp lệ.",400);}
}
