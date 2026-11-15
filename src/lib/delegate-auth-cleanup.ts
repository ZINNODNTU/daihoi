import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

/** Never delete a globally shared identity or a user owning historical work.
 * An unknown table/schema or network error fails CLOSED to preserving Auth.
 */
export async function canDeleteOrphanDelegateAuth(
 db:ReturnType<typeof createAdminClient>,userId:string
):Promise<{allowed:boolean;reason:string}>{
 const user=await db.auth.admin.getUserById(userId);
 if(user.error||!user.data.user)return {allowed:false,reason:"Không xác minh được tài khoản Auth."};
 if(user.data.user.app_metadata?.provisioned_by!=="daihoi")
  return {allowed:false,reason:"Tài khoản không do hệ thống Đại hội cấp; giữ lại tài khoản Auth."};
 const refs=[
  ["delegates","auth_user_id"],["congress_members","user_id"],
  ["btc_accounts","user_id"],["documents","uploaded_by"],
  ["bch_candidates","created_by"],["seating_layouts","created_by"],
  ["seat_assignments","assigned_by"],["checkins","checked_in_by"],
  ["audit_logs","actor_id"],["seating_templates","created_by"],
  ["system_logs","actor_id"]
 ] as const;
 for(const [table,column] of refs){
  const result=await db.from(table).select("*",{head:true,count:"exact"})
   .eq(column,userId);
  if(result.error)
   return {allowed:false,reason:"Không kiểm tra được tất cả ràng buộc tài khoản; giữ nguyên Auth."};
  if((result.count||0)>0)return {allowed:false,
   reason:"Tài khoản còn được dùng ở Đại hội khác hoặc có dữ liệu nghiệp vụ cần bảo toàn."};
 }
 return {allowed:true,reason:""};
}
