import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {AttendanceSessionsClient} from "@/components/attendance-sessions-client";
import type {AttendanceSession} from "@/lib/types";

export const dynamic="force-dynamic";
export default async function AttendancePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 const canManage=!!user&&await hasRole(supabase,user.id,id,"admin");
 const canView=!!user&&await hasRole(supabase,user.id,id,"viewer");
 if(!canView)return <p className="card p-6 text-sm text-red-700">Không có quyền quản lý phiên của Đại hội.</p>;
 const db=createAdminClient();
 const [sessionRows,layoutRows]=await Promise.all([
  db.from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id")
   .eq("congress_id",id).order("created_at",{ascending:false}).limit(150),
  db.from("seating_layouts")
   .select("id,title,grid_rows,grid_columns")
   .eq("congress_id",id).order("updated_at",{ascending:false}).limit(100)
 ]);
 return sessionRows.error||layoutRows.error?
  <p className="card p-6 text-sm text-red-700">Không tải được phiên điểm danh hoặc sơ đồ ghế. Kiểm tra migration v10.</p>:
  <AttendanceSessionsClient congressId={id}
   initialSessions={(sessionRows.data||[]) as AttendanceSession[]}
   layouts={(layoutRows.data||[]) as {id:string;title:string;grid_rows:number;grid_columns:number}[]}
   canManage={canManage}/>;
}
