import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {BCH_IMPORT_MAX_ROWS,bchPersonKey,bchWriteData,validateBchInput} from "@/lib/bch-candidates";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_FIELDS="id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at";
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{"Cache-Control":"no-store"}});

/** Single database insert: invalid or conflicting files never partially import.
 * No votes, photos, accounts or delegate profiles may be created by this endpoint. */
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Nguồn yêu cầu không hợp lệ.",403);
  const size=Number(request.headers.get("content-length")||0);
  if(size>200000)return fail("Dữ liệu nhập vượt giới hạn 200 KB.",413);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  const body=await request.json();
  const congressId=typeof body?.congressId==="string"?body.congressId:"";
  if(!uuid.test(congressId))return fail("Mã Đại hội không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"bch.write")))
   return fail("Không có quyền nhập nhân sự BCH của Đại hội này.",403);
  if(!Array.isArray(body.candidates)||!body.candidates.length||body.candidates.length>BCH_IMPORT_MAX_ROWS)
   return fail("Mỗi lần nhập từ 1 đến "+BCH_IMPORT_MAX_ROWS+" nhân sự.",400);
  const verified=[];
  const seen=new Set<string>();
  for(let i=0;i<body.candidates.length;i++){
   const checked=validateBchInput(body.candidates[i]);
   if(!checked.data)return fail("Dòng "+(i+2)+": "+(checked.error||"Thông tin không hợp lệ."),400);
   const key=bchPersonKey(checked.data);
   if(seen.has(key))return fail("Danh sách tải lên có nhân sự bị lặp (dòng "+(i+2)+").",400);
   seen.add(key);
   verified.push(checked.data);
  }
  // Obtain existing rows directly before writing; never trust a stale browser preview.
  const {data:existing,error:readError}=await supabase.from("bch_candidates")
   .select("full_name,birth_year,hometown,display_order").eq("congress_id",congressId).limit(501);
  if(readError)return fail("Không kiểm tra được nhân sự hiện có. Vui lòng thử lại.",503);
  if((existing?.length||0)+verified.length>500)
   return fail("Danh sách BCH chỉ hỗ trợ tối đa 500 nhân sự trong một Đại hội.",400);
  const existingKeys=new Set((existing||[]).map(bchPersonKey));
  if(verified.some(person=>existingKeys.has(bchPersonKey(person))))
   return fail("Một hoặc nhiều nhân sự đã có trong Đại hội. Hãy làm mới danh sách và chọn lại tệp.",409);
  const startOrder=(existing||[]).reduce((max,item)=>Math.max(max,item.display_order),0);
  const records=verified.map((person,index)=>({
   congress_id:congressId,created_by:user.id,
   ...bchWriteData({...person,display_order:Math.min(10000,startOrder+index+1)},false)
  }));
  const {data,error}=await supabase.from("bch_candidates").insert(records).select(PUBLIC_FIELDS);
  if(error){
   console.error("bch bulk import failed",error.code);
   return fail("Không lưu được danh sách BCH. Kiểm tra quyền truy cập và cấu hình Supabase.",500);
  }
  await writeSystemLog({level:"info",source:"api",event:"bch.candidates_imported",
   message:"Ban tổ chức đã nhập danh sách nhân sự BCH từ Excel.",actorId:user.id,congressId,
   context:{operation:"bch.import",endpoint:"/api/bch-candidates/import",httpMethod:"POST",count:records.length}});
  return NextResponse.json({ok:true,count:data?.length||records.length,candidates:data||[]},
   {status:201,headers:{"Cache-Control":"no-store"}});
 }catch{
  return fail("Không đọc được dữ liệu nhập. Hãy kiểm tra tệp Excel.",400);
 }
}
