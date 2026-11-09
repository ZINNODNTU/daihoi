import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {renumberGridSeats} from "@/lib/seating";
import {instantiateTemplateSeats,snapshotTemplateSeats,type SeatTemplateSummary} from "@/lib/seating-templates";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
const missing=(error:{code?:string})=>error.code==="42P01"||error.code==="PGRST205"||error.code==="PGRST202";
const migrationNeeded="Thư viện mẫu sơ đồ chưa được cài đặt. BTC cần chạy supabase/upgrade-seating-reusable-templates-v26.sql.";
const fields="id,title,stage_label,grid_rows,grid_columns,seat_count,visibility,organization_id,created_by,created_at,updated_at";

async function access(congressId:string){
 const {user,supabase}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 if(!uuid.test(congressId))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
 if(!(await hasRole(supabase,user.id,congressId,"admin")))
  return {error:fail("Chỉ quản trị viên Đại hội được sử dụng thư viện mẫu.",403)} as const;
 const db=createAdminClient();
 const {data:congress,error}=await db.from("congresses")
  .select("organization_id").eq("id",congressId).maybeSingle();
 if(error||!congress?.organization_id)
  return {error:fail("Không xác minh được đơn vị tổ chức Đại hội.",503)} as const;
 return {user,db,organizationId:congress.organization_id as string} as const;
}

export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  const checked=await access(congressId);
  if("error" in checked)return checked.error;
  const {db,user,organizationId}=checked;
  // Never return all other tenants' templates. The creator can also reuse
  // a private template in another organization where they are an admin.
  const [mine,shared]=await Promise.all([
   db.from("seating_templates").select(fields).eq("created_by",user.id)
    .order("updated_at",{ascending:false}).limit(100),
   db.from("seating_templates").select(fields).eq("organization_id",organizationId)
    .eq("visibility","organization").order("updated_at",{ascending:false}).limit(100)
  ]);
  if(mine.error||shared.error){
   const problem=mine.error||shared.error;
   return fail(problem&&missing(problem)?migrationNeeded:"Không đọc được thư viện mẫu sơ đồ.",503);
  }
  const all=new Map<string,SeatTemplateSummary>();
  for(const template of [...(mine.data||[]),...(shared.data||[])]){
   if(template.created_by===user.id||
    (template.visibility==="organization"&&template.organization_id===organizationId))
    all.set(template.id,{
     id:template.id,title:template.title,stage_label:template.stage_label,
     grid_rows:template.grid_rows,grid_columns:template.grid_columns,
     seat_count:template.seat_count,visibility:template.visibility,
     organization_id:template.organization_id,created_by:template.created_by,
     created_at:template.created_at,updated_at:template.updated_at
    } as SeatTemplateSummary);
  }
  return NextResponse.json({templates:[...all.values()].sort((a,b)=>
   Date.parse(b.updated_at)-Date.parse(a.updated_at))},{headers});
 }catch{
  return fail("Không thể tải thư viện mẫu sơ đồ.",503);
 }
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin){
   try{
    if(new URL(origin).host!==request.headers.get("host"))
     return fail("Nguồn yêu cầu không hợp lệ.",403);
   }catch{return fail("Nguồn yêu cầu không hợp lệ.",403);}
  }
  if(Number(request.headers.get("content-length")||0)>8192)
   return fail("Dữ liệu yêu cầu quá lớn.",413);
  let body:Record<string,unknown>;
  try{
   const parsed:unknown=await request.json();
   if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return fail("Dữ liệu không hợp lệ.",400);
   body=parsed as Record<string,unknown>;
  }catch{return fail("Dữ liệu không phải JSON hợp lệ.",400);}
  const congressId=typeof body.congressId==="string"?body.congressId:"";
  const checked=await access(congressId);
  if("error" in checked)return checked.error;
  const {db,user,organizationId}=checked;

  if(body.action==="save-template"){
   const layoutId=body.layoutId;
   const title=typeof body.title==="string"?body.title.trim():"";
   const visibility=body.visibility;
   if(typeof layoutId!=="string"||!uuid.test(layoutId)||!title||title.length>120||
    (visibility!=="private"&&visibility!=="organization"))
    return fail("Vui lòng nhập tên mẫu, sơ đồ nguồn và phạm vi chia sẻ hợp lệ.",400);
   const {data:source,error:layoutError}=await db.from("seating_layouts")
    .select("id,title,stage_label,grid_rows,grid_columns")
    .eq("id",layoutId).eq("congress_id",congressId).maybeSingle();
   if(layoutError)return fail("Không đọc được sơ đồ nguồn.",503);
   if(!source)return fail("Sơ đồ nguồn không thuộc Đại hội bạn quản trị.",404);
   const {data:sourceSeats,error:seatError}=await db.from("seats")
    .select("id,code,zone,row_label,seat_number,x,y,blocked,seat_type")
    .eq("layout_id",layoutId).eq("congress_id",congressId).limit(501);
   if(seatError)return fail("Không tải được ghế từ sơ đồ nguồn.",503);
   if(!sourceSeats?.length||sourceSeats.length>500)
    return fail("Sơ đồ nguồn phải có từ 1 đến 500 ghế.",400);
   let geometry;
   try{
    geometry=snapshotTemplateSeats(sourceSeats.map(s=>({
     id:s.id,code:s.code,zone:s.zone,rowLabel:s.row_label,seatNumber:s.seat_number,
     x:s.x,y:s.y,blocked:s.blocked,seatType:s.seat_type||"delegate"
    })));
   }catch(e){return fail(e instanceof Error?e.message:"Sơ đồ chứa ghế không hợp lệ.",400);}
   const {data:saved,error}=await db.from("seating_templates").insert({
    organization_id:organizationId,source_congress_id:congressId,created_by:user.id,
    title,visibility,stage_label:source.stage_label,
    grid_rows:source.grid_rows,grid_columns:source.grid_columns,seats:geometry
   }).select("id,title,seat_count,visibility").single();
   if(error)return fail(missing(error)?migrationNeeded:"Không thể lưu mẫu sơ đồ vào thư viện.",503);
   return NextResponse.json({ok:true,template:saved},{headers});
  }

  if(body.action==="apply-template"){
   const templateId=body.templateId;
   if(typeof templateId!=="string"||!uuid.test(templateId))
    return fail("Mã mẫu sơ đồ không hợp lệ.",400);
   const {data:template,error}=await db.from("seating_templates")
    .select("id,title,stage_label,grid_rows,grid_columns,visibility,organization_id,created_by,seats")
    .eq("id",templateId).maybeSingle();
   if(error)return fail(missing(error)?migrationNeeded:"Không tải được mẫu sơ đồ.",503);
   if(!template)return fail("Mẫu sơ đồ không tồn tại.",404);
   if(template.created_by!==user.id&&
    !(template.visibility==="organization"&&template.organization_id===organizationId))
    return fail("Bạn không có quyền áp dụng mẫu sơ đồ này.",403);
   let seats;
   try{seats=renumberGridSeats(instantiateTemplateSeats(template.seats,randomUUID),
    {rows:template.grid_rows,columns:template.grid_columns});}
   catch(e){return fail(e instanceof Error?e.message:"Nội dung mẫu sơ đồ không hợp lệ.",400);}
   const title=typeof body.title==="string"?body.title.trim():template.title;
   if(!title||title.length>120)return fail("Tên sơ đồ mới phải có 1–120 ký tự.",400);
   const layoutId=randomUUID();
   // One atomic database RPC creates a NEW layout and NEW seats. No seat
   // assignment or checkin is ever copied. Existing layouts stay unchanged.
   const {data:version,error:saveError}=await db.rpc("seating_save_layout_v6",{
    p_congress_id:congressId,p_layout_id:layoutId,p_expected_version:0,
    p_actor:user.id,p_title:title,p_stage_label:template.stage_label,
    p_grid_rows:template.grid_rows,p_grid_columns:template.grid_columns,p_seats:seats
   });
   if(saveError){
    if(missing(saveError))return fail("Chưa cài đặt chức năng sơ đồ ghế V6 trên Supabase.",503);
    if(saveError.code==="23505")return fail("Sơ đồ mới bị trùng mã. Vui lòng thử lại.",409);
    console.error("apply seating template",saveError.code||"unknown");
    return fail("Không thể tạo sơ đồ từ mẫu. Vui lòng kiểm tra cấu hình sơ đồ ghế.",503);
   }
   return NextResponse.json({ok:true,layoutId,version,seatCount:seats.length},{headers});
  }
  return fail("Thao tác thư viện mẫu không được hỗ trợ.",400);
 }catch{
  return fail("Không xử lý được thư viện mẫu sơ đồ. Vui lòng thử lại.",503);
 }
}
