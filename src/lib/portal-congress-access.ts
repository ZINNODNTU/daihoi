import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {cache} from "react";
import {getPortalAbilities} from "@/lib/rbac-server";

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
 const delegateCandidates=[...new Set((delegates.data||[]).map(row=>row.congress_id))];
  const guestCandidates=[...new Set((guests.data||[]).map(row=>row.congress_id))];
  const [delegateRights,guestRights]=await Promise.all([
   Promise.all(delegateCandidates.map(id=>getPortalAbilities(userId,id,"delegate"))),
   Promise.all(guestCandidates.map(id=>getPortalAbilities(userId,id,"guest")))
  ]);
  const delegateCongressIds=delegateCandidates.filter((id,i)=>delegateRights[i].includes("portal.access"));
 const guestCongressIds=guestCandidates.filter((id,i)=>guestRights[i].includes("portal.access"));
 return {
  delegateCongressIds,guestCongressIds,
  congressIds:[...new Set([...delegateCongressIds,...guestCongressIds])]
 };
});
