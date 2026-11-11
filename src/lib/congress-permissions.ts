/** Role/capability policy shared by server guards and admin navigation.
 * An authorization decision MUST also verify authenticated user + congress scope
 * on the server: these pure helpers do not themselves authorize any request.
 */
export type CongressRole="super_admin"|"admin"|"checkin"|"secretary"|null;
export type CongressAbility=
 |"workspace.view"|"delegates.read"|"delegates.write"|"quality.read"
 |"seating.read"|"seating.write"|"bch.read"|"bch.write"
 |"attendance.read"|"attendance.scan"|"attendance.sessions"
 |"reports.read"|"documents.read"|"documents.write"
 |"team.manage"|"settings.manage"|"system.logs";

const POLICIES:Record<Exclude<CongressRole,null>,readonly CongressAbility[]>={
 super_admin:["workspace.view","delegates.read","delegates.write","quality.read",
  "seating.read","seating.write","bch.read","bch.write","attendance.read",
  "attendance.scan","attendance.sessions","reports.read","documents.read",
  "documents.write","team.manage","settings.manage","system.logs"],
 admin:["workspace.view","delegates.read","delegates.write","quality.read",
  "seating.read","seating.write","bch.read","bch.write","attendance.read",
  "attendance.scan","attendance.sessions","reports.read","documents.read",
  "documents.write","team.manage","settings.manage"],
 checkin:["workspace.view","seating.read","attendance.read","attendance.scan","reports.read"],
 secretary:["workspace.view","bch.read","documents.read","reports.read"]
};

export function canCongress(role:CongressRole,ability:CongressAbility):boolean{
 return role!==null&&POLICIES[role].includes(ability);
}
export const CONGRESS_ROLE_LABELS:Record<Exclude<CongressRole,null>,string>={
 super_admin:"Quản trị hệ thống",
 admin:"Trưởng Ban Tổ chức",
 checkin:"Tổ điểm danh",
 secretary:"Tổ thư ký"
};
export function roleAbilities(role:CongressRole):readonly CongressAbility[]{
 return role?POLICIES[role]:[];
}
