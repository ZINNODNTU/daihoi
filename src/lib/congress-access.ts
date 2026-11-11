import "server-only";
import {notFound,redirect} from "next/navigation";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import type {CongressAbility} from "@/lib/congress-permissions";

/** Route-level defense in depth. All child pages in a protected route
 * must pass a verified principal and a congress-scoped capability check.
 * No data is queried before this guard. Never rely on hidden navigation.
 */
export async function requireCongressAbility(id:string,ability:CongressAbility){
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 if(!(await hasCongressAbility(supabase,user.id,id,ability)))notFound();
 return {supabase,user};
}
