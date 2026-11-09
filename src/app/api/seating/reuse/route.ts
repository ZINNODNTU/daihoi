import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {renumberGridSeats} from "@/lib/seating";
import {instantiateTemplateSeats,snapshotTemplateSeats} from "@/lib/seating-templates";

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
  return {error:fail("Chỉ quản trị viên Đại hội mới được sao chép sơ đồ.",403)} as const;
 return {supabase,user} as const;
}

/** List only source layouts from congresses the current user administers. */
export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  const auth=await targetAccess(congressId);
  if("error" in auth)return auth.error;
  const db=createAdminClient();
  const [profile,membership]=await Promise.all([
   db.from("profiles").select("platform_role").eq("id",auth.user.id).maybeSingle(),
   db.from("congress_members").select("congress_id").eq("user_id",auth.user.id)
    .eq("role","admin").limit(200)
  ]);
  if(profile.error||membership.error)return fail("Không xác minh được các Đại hội đang quản trị.",503);
  const isSuper=profile.data?.platform_role==="super_admin";
  let congressIds=(membership.data||[]).map(m=>m.congress_id).filter(id=>id!==congressId);
  if(isSuper){
   const all=await db.from("congresses").select("id").limit(200);
   if(all.error)return fail("Không tải được danh sách Đại hội.",503);
   congressIds=(all.data||[]).map(c=>c.id).filter(id=>id!==congressId);
  }
  if(!congressIds.length)return NextResponse.json({layouts:[]},{headers});
  const [sources,congresses]=await Promise.all([
   db.from("seating_layouts").select("id,congress_id,title,grid_rows,grid_columns,updated_at")
    .in("congress_id",congressIds).order("updated_at",{ascending:false}).limit(100),
   db.from("congresses").select("id,name").in("id",congressIds).limit(200)
  ]);
  if(sources.error||congresses.error)return fail("Không tải được sơ đồ ở các Đại hội khác.",503);
  const names=new Map((congresses.data||[]).map(item=>[item.id,item.name]));
  return NextResponse.json({layouts:(sources.data||[]).map(item=>({
   id:item.id,congressId:item.congress_id,
   congressName:names.get(item.congress_id)||"Đại hội",
   title:item.title,gridRows:item.grid_rows,gridColumns:item.grid_columns
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
  if(!uuid.test(sourceCongressId)||!uuid.test(sourceLayoutId)||sourceCongressId===congressId)
   return fail("Vui lòng chọn một sơ đồ thuộc Đại hội nguồn khác.",400);
  // Both congresses require admin; a user cannot copy layouts from an unrelated tenant.
  if(!(await hasRole(auth.supabase,auth.user.id,sourceCongressId,"admin")))
   return fail("Bạn không có quyền sao chép sơ đồ của Đại hội nguồn.",403);
  const db=createAdminClient();
  const [layoutResult,seatsResult]=await Promise.all([
   db.from("seating_layouts").select("id,title,stage_label,grid_rows,grid_columns")
    .eq("id",sourceLayoutId).eq("congress_id",sourceCongressId).maybeSingle(),
   db.from("seats").select("id,code,zone,row_label,seat_number,x,y,blocked,seat_type")
    .eq("layout_id",sourceLayoutId).eq("congress_id",sourceCongressId).limit(501)
  ]);
  if(layoutResult.error||seatsResult.error)return fail("Không tải được sơ đồ nguồn.",503);
  if(!layoutResult.data)return fail("Không tìm thấy sơ đồ ở Đại hội nguồn.",404);
  if(!seatsResult.data?.length||seatsResult.data.length>500)
   return fail("Sơ đồ nguồn phải có từ 1 đến 500 ghế.",400);
  let seats;
  try{
   const geometry=snapshotTemplateSeats(seatsResult.data.map(s=>({
    id:s.id,code:s.code,zone:s.zone,rowLabel:s.row_label,seatNumber:s.seat_number,
    x:s.x,y:s.y,blocked:s.blocked,seatType:s.seat_type||"delegate"
   })));
   seats=renumberGridSeats(instantiateTemplateSeats(geometry,randomUUID),
    {rows:layoutResult.data.grid_rows,columns:layoutResult.data.grid_columns});
  }catch(e){return fail(e instanceof Error?e.message:"Sơ đồ nguồn không hợp lệ.",400);}
  const layoutId=randomUUID();
  const requestedTitle=typeof body.title==="string"?body.title.trim():"";
  const title=requestedTitle||layoutResult.data.title;
  if(!title||title.length>120)return fail("Tên sơ đồ mới phải từ 1 đến 120 ký tự.",400);
  const {data:version,error}=await db.rpc("seating_save_layout_v6",{
   p_congress_id:congressId,p_layout_id:layoutId,p_expected_version:0,
   p_actor:auth.user.id,p_title:title,p_stage_label:layoutResult.data.stage_label,
   p_grid_rows:layoutResult.data.grid_rows,p_grid_columns:layoutResult.data.grid_columns,
   p_seats:seats
  });
  if(error){
   console.error("reuse source seating layout",error.code||"unknown");
   return fail("Không thể sao chép sơ đồ. Kiểm tra chức năng sơ đồ ghế V6.",503);
  }
  return NextResponse.json({ok:true,layoutId,version,seatCount:seats.length},{headers});
 }catch{return fail("Không thể tái sử dụng sơ đồ giữa các Đại hội.",503);}
}
