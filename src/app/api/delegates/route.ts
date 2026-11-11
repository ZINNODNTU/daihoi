import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {normalizeGender,normalizeBirthDate} from "@/lib/delegate-demographics";
import {writeSystemLog} from "@/lib/system-log";

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
    delegate_type:type,
     gender:normalizeGender(item.gender),
     birth_date:normalizeBirthDate(item.birth_date)
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
export async function PATCH(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin){
   const host=request.headers.get("host");
   if(new URL(origin).host!==host)return reply("Nguồn cập nhật không hợp lệ.",403);
  }
  const {supabase,user}=await getAuth();
  if(!user)return reply("Cần đăng nhập.",401);
  const body=await request.json();
  const congressId=String(body?.congressId||"");
  const delegateId=String(body?.delegateId||"");
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(congressId)||!uuid.test(delegateId))
   return reply("Mã Đại hội hoặc đại biểu không hợp lệ.",400);
  if(!(await hasRole(supabase,user.id,congressId,"admin")))
   return reply("Không có quyền cập nhật đại biểu.",403);
  // Allow only profile attributes; QR, seat identity and authentication stay unchanged.
  const allowed=new Set(["congressId","delegateId","gender","birth_date","unit","position"]);
  if(!body||typeof body!=="object"||Object.keys(body).some(key=>!allowed.has(key)))
   return reply("Trường thông tin cập nhật không hợp lệ.",400);
  const patch:Record<string,string|null>={};
  if("gender" in body)patch.gender=normalizeGender(body.gender);
  if("birth_date" in body)patch.birth_date=normalizeBirthDate(body.birth_date);
  for(const [field,max] of [["unit",200],["position",160]] as const){
   if(!(field in body))continue;
   if(typeof body[field]!=="string"||body[field].trim().length>max||
      /[\u0000-\u001f\u007f]/.test(body[field]))
    return reply((field==="unit"?"Đơn vị":"Chức vụ")+" không hợp lệ (tối đa "+max+" ký tự).",400);
   patch[field]=body[field].trim().replace(/\s+/g," ");
  }
  if(!Object.keys(patch).length)return reply("Chưa chọn thông tin cần chỉnh sửa.",400);
  const {data,error}=await supabase.from("delegates")
   .update(patch).eq("congress_id",congressId)
   .eq("id",delegateId).select("id,unit,position,gender,birth_date").maybeSingle();
  if(error)return reply("Không lưu được hồ sơ đại biểu. Kiểm tra phân quyền và cấu hình cơ sở dữ liệu.",500);
  if(!data)return reply("Không tìm thấy hồ sơ đại biểu trong Đại hội.",404);
  await writeSystemLog({level:"info",source:"api",event:"delegate.profile_updated",
   message:"Quản trị đã cập nhật hồ sơ đại biểu.",actorId:user.id,congressId,
   context:{operation:"delegate.update",endpoint:"/api/delegates",httpMethod:"PATCH"}});
  return NextResponse.json({ok:true,delegate:data},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  return reply(e instanceof Error&&/Giới tính|Ngày sinh/.test(e.message)?
   e.message:"Dữ liệu cập nhật không hợp lệ.",400);
 }
}
