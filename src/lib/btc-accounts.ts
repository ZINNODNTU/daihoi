import "server-only";
import {randomBytes} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";

export type BtcRole="admin"|"checkin"|"secretary";

/** One primary BTC admin per congress, with separate delegated staff identities.
 * Caller must have already verified its authority. Clean partial Auth provisioning.
 */
export async function provisionBtcAccount({db,congressId,fullName,role,actorId}:{
 db:ReturnType<typeof createAdminClient>;congressId:string;fullName:string;
 role:BtcRole;actorId:string;
}){
 const loginEmail="btc-"+congressId.slice(0,8)+"-"+randomBytes(7).toString("hex")+"@staff.daihoi.invalid";
 const initialPassword=randomBytes(21).toString("base64url")+"!A7";
 const {data,error}=await db.auth.admin.createUser({
  email:loginEmail,password:initialPassword,email_confirm:true,
  user_metadata:{full_name:fullName},
  app_metadata:{account_kind:"btc",btc_congress_id:congressId}
 });
 if(error||!data.user)throw new Error("BTC_AUTH_CREATE_FAILED");
 const userId=data.user.id;
 try{
  const {error:accountError}=await db.from("btc_accounts").insert({
   user_id:userId,congress_id:congressId,login_email:loginEmail,
   full_name:fullName,created_by:actorId,is_primary:role==="admin"
  });
  if(accountError)throw new Error("BTC_ACCOUNT_CREATE_FAILED:"+accountError.code);
  const {error:memberError}=await db.from("congress_members").insert({
   congress_id:congressId,user_id:userId,role
  });
  if(memberError)throw new Error("BTC_MEMBER_CREATE_FAILED:"+memberError.code);
  return {account:{userId,name:fullName,email:loginEmail,role,isPrimary:role==="admin"},initialPassword};
 }catch(error){
  await db.from("congress_members").delete().eq("congress_id",congressId).eq("user_id",userId);
  await db.from("btc_accounts").delete().eq("congress_id",congressId).eq("user_id",userId);
  await db.auth.admin.deleteUser(userId);
  throw error;
 }
}
