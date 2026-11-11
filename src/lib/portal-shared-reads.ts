import "server-only";
import {unstable_cache} from "next/cache";
import {createAdminClient} from "@/lib/supabase/admin";

// Cache ONLY shared, non-secret congress metadata. Caller must verify that each
// congress ID belongs to the authenticated delegate / guest BEFORE invoking.
// Never cache delegate identities, attendance rows, tokens, passwords or roles.
export const loadSharedCongressInfo=unstable_cache(
 async (ids:string[])=>{
  if(!ids.length)return [];
  const {data,error}=await createAdminClient().from("congresses")
   .select("id,name,term,status,kind,venue").in("id",ids).limit(100);
  if(error)throw new Error("Không tải được thông tin Đại hội.");
  return data||[];
 },["portal-shared-congress-info-v1"],{revalidate:15}
);

// Only session metadata is shared. Attendance/checkin state is always verified
// and fetched per individual user, and checkin timestamps are never cached here.
export const loadSharedSessionInfo=unstable_cache(
 async (ids:string[])=>{
  if(!ids.length)return [];
  const {data,error}=await createAdminClient().from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id")
   .in("congress_id",ids).order("starts_at",{ascending:false}).limit(500);
  if(error)throw new Error("Không tải được phiên Đại hội.");
  return data||[];
 },["portal-shared-congress-sessions-v1"],{revalidate:10,tags:["daihoi-portal-sessions"]}
);
