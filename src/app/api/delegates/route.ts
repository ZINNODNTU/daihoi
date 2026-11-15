import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {normalizeGender,normalizeBirthDate} from "@/lib/delegate-demographics";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const studentIdPattern=/^[A-Za-z0-9][A-Za-z0-9._-]{3,31}$/;
const delegateKinds=["official","alternate","guest"] as const;
type DelegateKind=(typeof delegateKinds)[number];
const reply=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});
const optionalLimits={
 hometown:240,religion:120,ethnicity:100,phone_number:24,class_name:120,profile_notes:500
} as const;
type OptionalField=keyof typeof optionalLimits;
const clean=(value:unknown,max:number,field:string)=>{
 if(value===null||value===undefined||value==="")return null;
 if(typeof value!=="string"||value.trim().length>max||/[\u0000-\u001f\u007f]/.test(value))
  throw new Error("Trường "+field+" không hợp lệ (tối đa "+max+" ký tự).");
 return value.trim().replace(/\s+/g," ")||null;
};
function optionalRoster(input:Record<string,unknown>){
 const out={} as Record<OptionalField,string|null>;
 for(const [name,max] of Object.entries(optionalLimits) as [OptionalField,number][])
  out[name]=clean(input[name],max,name);
 if(out.phone_number&&!/^[0-9+ ().-]+$/.test(out.phone_number))
  throw new Error("Số điện thoại chứa ký tự không hợp lệ.");
 return out;
}
function unionJoinDate(value:unknown,birth:string|null){
 const joined=normalizeBirthDate(value);
 if(joined&&(joined<"1931-03-26"||(birth&&joined<birth)))
  throw new Error("Ngày vào Đoàn không hợp lệ hoặc trước ngày sinh.");
 return joined;
}
function sameOrigin(request:Request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).host===request.headers.get("host");}catch{return false;}
}

export async function POST(request:Request){
 try{
  if(!sameOrigin(request))return reply("Nguồn yêu cầu không hợp lệ.",403);
  const {supabase,user}=await getAuth();
  if(!user)return reply("Cần đăng nhập.",401);
  const body=await request.json();
  const congressId=typeof body?.congressId==="string"?body.congressId:"";
  if(!UUID.test(congressId))return reply("Mã Đại hội không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return reply("Không có quyền quản lý đại biểu.",403);
  const entries:unknown[]=Array.isArray(body.delegates)?body.delegates:[body];
  if(!entries.length||entries.length>250)return reply("Mỗi lần nhập tối đa 250 đại biểu.",400);
  const rows=entries.map((entry,index)=>{
   if(!entry||typeof entry!=="object"||Array.isArray(entry))
    throw new Error("Hồ sơ tại dòng "+(index+1)+" không hợp lệ.");
   const item=entry as Record<string,unknown>;
   const studentId=String(item.student_id??"").trim().toUpperCase();
   const type=delegateKinds.includes(item.delegate_type as DelegateKind)?item.delegate_type as DelegateKind:"official";
   const full_name=clean(item.full_name,160,"Họ tên")||"";
   const unit=clean(item.unit,200,"Đơn vị")||"";
   const position=clean(item.position,160,"Chức vụ")||"";

   const birth_date=normalizeBirthDate(item.birth_date);
   const roster=optionalRoster(item);
   const joined=unionJoinDate(item.union_join_date,birth_date);
   const additional=Object.values(roster).some(Boolean)||joined?{...roster,union_join_date:joined}:{};

   return {
    congress_id:congressId,full_name,unit,student_id:studentId||null,position,
    login_email:studentId?studentId.toLowerCase()+"@dntu.edu.vn":null,
    delegate_type:type,gender:normalizeGender(item.gender),
    birth_date:normalizeBirthDate(item.birth_date),
    ...additional
   };
  });
  if(rows.some(r=>!r.full_name||(!r.student_id&&r.delegate_type!=="guest")))
   return reply("Đại biểu cần có MSSV và họ tên; khách mời có thể để trống MSSV.",400);
  if(rows.some(r=>r.student_id&&!studentIdPattern.test(r.student_id)))
   return reply("MSSV phải gồm 4–32 ký tự chữ, số, dấu chấm, gạch nối hoặc gạch dưới.",400);
  const students=rows.filter(r=>r.student_id).map(r=>r.student_id!.toLowerCase());
  if(new Set(students).size!==students.length)return reply("MSSV bị trùng trong tệp.",400);
  // One INSERT statement: a failed row rolls back the entire batch.
  const {data,error}=await supabase.from("delegates").insert(rows).select("id,code,full_name");
  if(error)return reply(error.code==="23505"?"MSSV đã tồn tại trong dữ liệu.":
   "Không thể lưu danh sách. Kiểm tra migration upgrade-delegate-roster-v78.sql và quyền Supabase.",error.code==="23505"?409:500);
  await writeSystemLog({level:"info",source:"api",event:"delegates.bulk_created",
   message:"Ban tổ chức đã nhập hồ sơ đại biểu.",actorId:user.id,congressId,
   context:{operation:"delegates.create",endpoint:"/api/delegates",httpMethod:"POST",count:rows.length}});
  return NextResponse.json({ok:true,count:data?.length??0,created:data??[]},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  return reply(error instanceof Error&&/không hợp lệ|trước ngày sinh|MSSV|tối đa|Ngày/.test(error.message)?
   error.message:"Dữ liệu nhập không hợp lệ.",400);
 }
}

export async function PATCH(request:Request){
 try{
  if(!sameOrigin(request))return reply("Nguồn cập nhật không hợp lệ.",403);
  const {supabase,user}=await getAuth();
  if(!user)return reply("Cần đăng nhập.",401);
  const body=await request.json();
  const congressId=String(body?.congressId||"");
  const delegateId=String(body?.delegateId||"");
  if(!UUID.test(congressId)||!UUID.test(delegateId))
   return reply("Mã Đại hội hoặc đại biểu không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return reply("Không có quyền cập nhật đại biểu.",403);
  const allowed=new Set(["congressId","delegateId","gender","birth_date","unit","position",
   ...Object.keys(optionalLimits),"union_join_date"]);
  if(!body||typeof body!=="object"||Object.keys(body).some(key=>!allowed.has(key)))
   return reply("Trường thông tin cập nhật không hợp lệ.",400);
  const patch:Record<string,string|null>={};
  if("gender" in body)patch.gender=normalizeGender(body.gender);
  if("birth_date" in body)patch.birth_date=normalizeBirthDate(body.birth_date);
  for(const [field,max] of [["unit",200],["position",160]] as const){
   if(field in body)patch[field]=clean(body[field],max,field)||"";
  }
  const extras=optionalRoster(body);
  for(const name of Object.keys(optionalLimits) as OptionalField[])
   if(name in body)patch[name]=extras[name];
  if("union_join_date" in body){
   // Use the edited birth date (or fetch the old value) for validation.
   let birth=patch.birth_date||null;
   if(!("birth_date" in body)){
    const previous=await supabase.from("delegates").select("birth_date")
     .eq("id",delegateId).eq("congress_id",congressId).maybeSingle();
    if(previous.error||!previous.data)return reply("Không đọc được ngày sinh hiện tại.",503);
    birth=previous.data.birth_date;
   }
   patch.union_join_date=unionJoinDate(body.union_join_date,birth);
  }
  if(!Object.keys(patch).length)return reply("Chưa chọn thông tin cần chỉnh sửa.",400);
  const {data,error}=await supabase.from("delegates").update(patch)
   .eq("congress_id",congressId).eq("id",delegateId)
   .select(Object.keys(patch).some(key=>key in optionalLimits||key==="union_join_date")?
    "id,unit,position,gender,birth_date,hometown,religion,ethnicity,union_join_date,phone_number,class_name,profile_notes":
    "id,unit,position,gender,birth_date")
   .maybeSingle();
  if(error)return reply("Không lưu được hồ sơ đại biểu. Kiểm tra migration upgrade-delegate-roster-v78.sql.",500);
  if(!data)return reply("Không tìm thấy hồ sơ đại biểu trong Đại hội.",404);
  await writeSystemLog({level:"info",source:"api",event:"delegate.profile_updated",
   message:"Quản trị đã cập nhật hồ sơ đại biểu.",actorId:user.id,congressId,
   context:{operation:"delegate.update",endpoint:"/api/delegates",httpMethod:"PATCH"}});
  return NextResponse.json({ok:true,delegate:data},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  return reply(error instanceof Error&&/không hợp lệ|trước ngày sinh|tối đa|Ngày/.test(error.message)?
   error.message:"Dữ liệu cập nhật không hợp lệ.",400);
 }
}
