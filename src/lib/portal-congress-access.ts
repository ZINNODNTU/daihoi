import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {cache} from "react";

/** Only congresses belonging to this authenticated user are visible in the portal. */
export const getPortalCongressAccess=cache(async (userId:string)=>{
 const db=createAdminClient();
 const [delegates,guests]=await Promise.all([
  db.from("delegates").select("congress_id").eq("auth_user_id",userId)
   .eq("is_active",true).limit(100),
  db.from("congress_members").select("congress_id").eq("user_id",userId)
   .eq("role","guest").limit(100)
 ]);
 if(delegates.error||guests.error)throw new Error("Không xác minh được Đại hội được phép truy cập.");
 const delegateCongressIds=[...new Set((delegates.data||[]).map(row=>row.congress_id))];
 const guestCongressIds=[...new Set((guests.data||[]).map(row=>row.congress_id))];
 return {
  delegateCongressIds,guestCongressIds,
  congressIds:[...new Set([...delegateCongressIds,...guestCongressIds])]
 };
});
