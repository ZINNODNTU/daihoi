import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {revalidateTag} from "next/cache";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {renumberGridSeats} from "@/lib/seating";
import {instantiateTemplateSeats,snapshotTemplateSeats,type SeatTemplateSlot} from "@/lib/seating-templates";
import {reusableLayoutId,sameSeatGeometry} from "@/lib/seating-reuse";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"private, no-store"};
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers});

async function targetAccess(congressId:string){
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Cần đăng nhập.",401)} as const;
 if(!uuid.test(congressId))return {error:fail("Mã Đại hội không hợp lệ.",400)} as const;
 if(!(await hasRole(supabase,user.id,congressId,"admin")))
  return {error:fail("Chỉ quản trị viên Đại hội mới được sử dụng sơ đồ.",403)} as const;
 return {supabase,user} as const;
}
type LayoutRow={
 id:string;title:string;stage_label:string;grid_rows:number;grid_columns:number;
};
type SeatRow={
 id:string;code:string;zone:string;row_label:string;seat_number:number;
 x:number;y:number;blocked:boolean;seat_type:string;
};
const slots=(rows:SeatRow[]):SeatTemplateSlot[]=>
 snapshotTemplateSeats(rows.map(s=>({
  id:s.id,code:s.code,zone:s.zone,rowLabel:s.row_label,
  seatNumber:s.seat_number,x:s.x,y:s.y,blocked:s.blocked,
  seatType:s.seat_type==="guest"?"guest":"delegate"
 })));
const seatFields="id,code,zone,row_label,seat_number,x,y,blocked,seat_type";
const respond=(layoutId:string,seatCount:number,reused:boolean,version?:number)=>
 NextResponse.json({ok:true,layoutId,seatCount,reused,created:!reused,version},{headers});

/** Only show source layouts in other congresses where an enabled BTC
 * account (or global super admin role) grants management access. */
export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  const auth=await targetAccess(congressId);
  if("error" in auth)return auth.error;
  const db=createAdminClient();
  const [profile,membership,btc]=await Promise.all([
   db.from("profiles").select("platform_role").eq("id",auth.user.id).maybeSingle(),
   db.from("congress_members").select("congress_id").eq("user_id",auth.user.id)
    .eq("role","admin").limit(200),
   db.from("btc_accounts").select("congress_id").eq("user_id",auth.user.id)
    .is("disabled_at",null).limit(200)
  ]);
  if(profile.error||membership.error||btc.error)
   return fail("Không xác minh được các Đại hội đang quản trị.",503);
  const isSuper=profile.data?.platform_role==="super_admin";
  const enabled=new Set((btc.data||[]).map(row=>row.congress_id));
  let congressIds=(membership.data||[]).map(row=>row.congress_id)
   .filter(id=>id!==congressId&&enabled.has(id));
  if(isSuper){
   const all=await db.from("congresses").select("id").limit(200);
   if(all.error)return fail("Không tải được danh sách Đại hội.",503);
   congressIds=(all.data||[]).map(row=>row.id).filter(id=>id!==congressId);
  }
  if(!congressIds.length)return NextResponse.json({layouts:[]},{headers});
  const [sources,congresses]=await Promise.all([
   db.from("seating_layouts").select("id,congress_id,title,grid_rows,grid_columns,updated_at")
    .in("congress_id",congressIds).order("updated_at",{ascending:false}).limit(100),
   db.from("congresses").select("id,name").in("id",congressIds).limit(200)
  ]);
  if(sources.error||congresses.error)
   return fail("Không tải được sơ đồ ở các Đại hội khác.",503);
  const names=new Map((congresses.data||[]).map(item=>[item.id,item.name]));
  const bindings=(sources.data||[]).map(item=>({
   sourceId:item.id,targetId:reusableLayoutId(congressId,"layout",item.id)
  }));
  const {data:alreadyUsed,error:usedError}=bindings.length
   ?await db.from("seating_layouts").select("id")
     .eq("congress_id",congressId).in("id",bindings.map(item=>item.targetId)).limit(100)
   :{data:[],error:null};
  if(usedError)return fail("Không kiểm tra được sơ đồ đã sử dụng.",503);
  const present=new Set((alreadyUsed||[]).map(item=>item.id));
  const boundBySource=new Map(bindings.filter(item=>present.has(item.targetId))
   .map(item=>[item.sourceId,item.targetId]));
  return NextResponse.json({layouts:(sources.data||[]).map(item=>({
   id:item.id,congressId:item.congress_id,
   congressName:names.get(item.congress_id)||"Đại hội",
   title:item.title,gridRows:item.grid_rows,gridColumns:item.grid_columns,
   alreadyUsedId:boundBySource.get(item.id)||null
  }))},{headers});
 }catch{return fail("Không kết nối được thư viện sơ đồ giữa các Đại hội.",503);}
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
  if(Number(request.headers.get("content-length")||0)>8192)return fail("Dữ liệu quá lớn.",413);
  let body:Record<string,unknown>;
  try{
   const json:unknown=await request.json();
   if(!json||typeof json!=="object"||Array.isArray(json))return fail("Dữ liệu không hợp lệ.",400);
   body=json as Record<string,unknown>;
  }catch{return fail("Không đọc được dữ liệu JSON.",400);}
  const congressId=typeof body.congressId==="string"?body.congressId:"";
  const sourceCongressId=typeof body.sourceCongressId==="string"?body.sourceCongressId:"";
  const sourceLayoutId=typeof body.sourceLayoutId==="string"?body.sourceLayoutId:"";
  const auth=await targetAccess(congressId);
  if("error" in auth)return auth.error;
  if(!uuid.test(sourceCongressId)||!uuid.test(sourceLayoutId))
   return fail("Vui lòng chọn sơ đồ nguồn hợp lệ.",400);
  if(sourceCongressId!==congressId&&
   !(await hasRole(auth.supabase,auth.user.id,sourceCongressId,"admin")))
   return fail("Bạn không có quyền sử dụng sơ đồ của Đại hội nguồn.",403);
  const db=createAdminClient();
  const {data:source,error:layoutError}=await db.from("seating_layouts")
   .select("id,title,stage_label,grid_rows,grid_columns")
   .eq("id",sourceLayoutId).eq("congress_id",sourceCongressId).maybeSingle();
  if(layoutError)return fail("Không đọc được sơ đồ nguồn.",503);
  if(!source)return fail("Không tìm thấy sơ đồ đã chọn.",404);
  const src=source as LayoutRow;

  // Reusing a layout within the same congress must NEVER clone it.
  if(sourceCongressId===congressId){
   const {count,error}=await db.from("seats").select("id",{count:"exact",head:true})
    .eq("layout_id",sourceLayoutId).eq("congress_id",congressId);
   if(error)return fail("Không kiểm tra được số ghế.",503);
   return respond(sourceLayoutId,count||0,true);
  }

  // Each congress requires its own layout/seat identity because both seats and
  // assignments have compound congress-scoped foreign keys. Reuse the SAME
  // target instance on every subsequent request, including concurrent clicks.
  const stableId=reusableLayoutId(congressId,"layout",sourceLayoutId);
  const {data:bound,error:boundError}=await db.from("seating_layouts")
   .select("id").eq("id",stableId).eq("congress_id",congressId).maybeSingle();
  if(boundError)return fail("Không kiểm tra được sơ đồ đã dùng lại.",503);
  if(bound){
   const {count,error}=await db.from("seats").select("id",{count:"exact",head:true})
    .eq("layout_id",stableId).eq("congress_id",congressId);
   if(error)return fail("Không đếm được ghế trên sơ đồ cũ.",503);
   return respond(stableId,count||0,true);
  }

  const {data:sourceSeats,error:seatError}=await db.from("seats").select(seatFields)
   .eq("layout_id",sourceLayoutId).eq("congress_id",sourceCongressId).limit(501);
  if(seatError)return fail("Không tải được ghế từ sơ đồ nguồn.",503);
  if(!sourceSeats?.length||sourceSeats.length>500)
   return fail("Sơ đồ nguồn phải có từ 1 đến 500 ghế.",400);
  const geometry=slots(sourceSeats as SeatRow[]);
  let seats;
  try{
   seats=renumberGridSeats(instantiateTemplateSeats(geometry,randomUUID),
    {rows:src.grid_rows,columns:src.grid_columns});
  }catch(e){return fail(e instanceof Error?e.message:"Sơ đồ nguồn không hợp lệ.",400);}
  const normalizedGeometry=snapshotTemplateSeats(seats);

  // Recover copies created by older releases (random layout UUIDs). Exact
  // geometry matching avoids duplicating them or disturbing assignments.
  const {data:candidates,error:candidatesError}=await db.from("seating_layouts")
   .select("id,title,stage_label,grid_rows,grid_columns")
   .eq("congress_id",congressId).eq("title",src.title)
   .eq("stage_label",src.stage_label).eq("grid_rows",src.grid_rows)
   .eq("grid_columns",src.grid_columns).limit(31);
  if(candidatesError)return fail("Không kiểm tra được sơ đồ đã có.",503);
  if((candidates||[]).length>30)
   return fail("Quá nhiều sơ đồ cùng tên. Vui lòng kiểm tra danh sách trước khi sử dụng lại.",409);
  for(const candidate of candidates||[]){
   const {data:oldSeats,error}=await db.from("seats").select(seatFields)
    .eq("layout_id",candidate.id).eq("congress_id",congressId).limit(501);
   if(error)return fail("Không đối chiếu được sơ đồ đã có.",503);
   if(!oldSeats||oldSeats.length!==geometry.length)continue;
   try{
    if(sameSeatGeometry(normalizedGeometry,slots(oldSeats as SeatRow[])))
     return respond(candidate.id,oldSeats.length,true);
   }catch{
    // Do not change or delete legacy layouts that cannot be validated.
   }
  }

  const requestedTitle=typeof body.title==="string"?body.title.trim():"";
  const title=requestedTitle||src.title;
  if(!title||title.length>120)return fail("Tên sơ đồ phải từ 1 đến 120 ký tự.",400);
  const {data:version,error}=await db.rpc("seating_save_layout_v6",{
   p_congress_id:congressId,p_layout_id:stableId,p_expected_version:0,
   p_actor:auth.user.id,p_title:title,p_stage_label:src.stage_label,
   p_grid_rows:src.grid_rows,p_grid_columns:src.grid_columns,p_seats:seats
  });
  if(error){
   if(error.code==="23505"){
    const {data:existing,error:checkError}=await db.from("seating_layouts")
     .select("id").eq("id",stableId).eq("congress_id",congressId).maybeSingle();
    if(!checkError&&existing){
     const {count,error:countError}=await db.from("seats").select("id",{count:"exact",head:true})
      .eq("layout_id",stableId).eq("congress_id",congressId);
     if(!countError)return respond(stableId,count||0,true);
    }
   }
   console.error("reuse source seating layout",error.code||"unknown");
   return fail("Không thể dùng lại sơ đồ. Vui lòng kiểm tra cấu hình sơ đồ ghế.",503);
  }
  revalidateTag("daihoi-hall-geometry",{expire:0});
  return respond(stableId,seats.length,false,version);
 }catch{
  return fail("Không thể sử dụng lại sơ đồ. Vui lòng thử lại.",503);
 }
}
