#!/usr/bin/env node
/** Read-only integrity audit for one congress on the pinned Supabase project.
 * Prints aggregate counts and relation warnings, never passwords or PII.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
nextEnv.loadEnvConfig(process.cwd());

const expected="https://pnxdxdagpeyqarucdphk.supabase.co";
const url=process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
const id=process.argv[2]||"79e7f633-e824-4a9d-ba25-d0fa59349a26";
if(url!==expected||!key||!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)){
 console.error("[BLOCK] Cần đúng project Supabase, khóa server và UUID Đại hội hợp lệ.");
 process.exit(2);
}
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const tables={
 congresses:"id,name",seating_layouts:"id,title,grid_rows,grid_columns,version",
 attendance_sessions:"id,name,status,seating_layout_id",
 seats:"id,layout_id,congress_id,code,row_label,seat_number,blocked,seat_type",
 seat_assignments:"seat_id,layout_id,congress_id,delegate_id",
 delegates:"id,congress_id,delegate_type,is_active,auth_user_id",
 checkins:"id,session_id,delegate_id",
 documents:"id,drive_file_id",
 bch_candidates:"id",btc_accounts:"user_id",
 congress_members:"user_id,role"
};
const rows={};
const missing=[];
for(const [table,columns] of Object.entries(tables)){
 const query=db.from(table).select(columns);
 const result=table==="congresses"?await query.eq("id",id).limit(2):
  await query.eq("congress_id",id).limit(1001);
 if(result.error){missing.push(table+" ("+(result.error.code||"error")+")");continue;}
 if((result.data||[]).length>1000){
  console.error("[BLOCK] "+table+" có hơn 1000 bản ghi; cần phân trang trước khi kết luận.");
  process.exit(2);
 }
 rows[table]=result.data||[];
}
console.log("Audit dữ liệu Đại hội / Supabase project: "+id);
if(!rows.congresses?.length){console.error("[BLOCK] Đại hội không tồn tại hoặc không thể đọc.");process.exit(2);}
console.log("Bảng đọc được: "+Object.keys(rows).length+"/"+Object.keys(tables).length);
console.log("Số lượng:",Object.entries(rows).filter(([k])=>k!=="congresses")
 .map(([k,v])=>k+"="+v.length).join(", "));
const warnings=[];
const memberRoles=Object.entries((rows.congress_members||[]).reduce((acc,m)=>{acc[m.role]=(acc[m.role]||0)+1;return acc;},{}));
console.log("Quyền hội viên:",memberRoles.map(([role,count])=>role+"="+count).join(", ")||"trống");
const layouts=new Map((rows.seating_layouts||[]).map(x=>[x.id,x]));
const sessions=new Map((rows.attendance_sessions||[]).map(x=>[x.id,x]));
const delegates=new Map((rows.delegates||[]).map(x=>[x.id,x]));
const seats=new Map((rows.seats||[]).map(x=>[x.id,x]));
const assignPerLayout=new Map();
for(const a of rows.seat_assignments||[]){
 const seat=seats.get(a.seat_id);
 const delegate=delegates.get(a.delegate_id);
 if(!layouts.has(a.layout_id)||!seat||!delegate||seat.layout_id!==a.layout_id)
  warnings.push("Phân ghế có khóa ngoại sai/mất liên kết (layout/seat/delegate).");
 if(seat?.blocked)warnings.push("Có đại biểu được phân vào ghế khóa.");
 if(delegate&&seat&&((delegate.delegate_type==="guest")!==(seat.seat_type==="guest")))
  warnings.push("Có phân ghế sai loại đại biểu/khách mời.");
 assignPerLayout.set(a.layout_id,(assignPerLayout.get(a.layout_id)||0)+1);
}
for(const s of rows.attendance_sessions||[]){
 if(s.seating_layout_id&&!layouts.has(s.seating_layout_id))
  warnings.push("Phiên tham chiếu sơ đồ không tồn tại.");
 if(!s.seating_layout_id&&layouts.size)
  warnings.push("Phiên chưa gắn sơ đồ: "+s.name);
 const applied=s.seating_layout_id?layouts.get(s.seating_layout_id):null;
 console.log("Phiên: "+s.name+" | trạng thái="+s.status+
  " | sơ đồ="+(applied?.title||"CHƯA GẮN")+
  " | phân ghế="+(assignPerLayout.get(s.seating_layout_id)||0));
}
for(const l of rows.seating_layouts||[]){
 const items=(rows.seats||[]).filter(x=>x.layout_id===l.id);
 const physical=items.filter(x=>!x.blocked).length;
 console.log("Sơ đồ: "+l.title+" | lưới="+l.grid_rows+"x"+l.grid_columns+
  " | vị trí ghế="+items.length+" | khả dụng="+physical+
  " | phân ghế="+(assignPerLayout.get(l.id)||0));
 if(!(rows.attendance_sessions||[]).some(s=>s.seating_layout_id===l.id))
  warnings.push("Sơ đồ chưa được gán cho phiên nào: "+l.title);
}
for(const c of rows.checkins||[]){
 if(!sessions.has(c.session_id)||!delegates.has(c.delegate_id))
  warnings.push("Lịch sử điểm danh chứa liên kết không hợp lệ.");
}
const seen=new Set();
for(const a of rows.seat_assignments||[]){
 const key=a.layout_id+":"+a.delegate_id;
 if(seen.has(key))warnings.push("Đại biểu bị gán trùng trong một sơ đồ.");
 seen.add(key);
}
if(missing.length)warnings.push("Không đọc được bảng: "+missing.join(", "));
const unique=[...new Set(warnings)];
console.log("Cảnh báo ("+unique.length+"):");
for(const w of unique)console.log("  - "+w);
if(!unique.length)console.log("  Không phát hiện lỗi quan hệ trong phạm vi kiểm tra.");
process.exitCode=unique.length?1:0;
