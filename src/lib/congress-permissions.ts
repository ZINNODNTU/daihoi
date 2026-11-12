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

/** Account-specific permissions are restrictions on role entitlements, never
 * grants. These do not include privilege management, settings or system logs.
 */
export const ACCOUNT_PERMISSION_CAPABILITIES=[
 "workspace.view","delegates.read","delegates.write","quality.read",
 "seating.read","seating.write","bch.read","bch.write",
 "attendance.read","attendance.scan","attendance.sessions",
 "documents.read","documents.write","reports.read"
] as const satisfies readonly CongressAbility[];
export type AccountPermissionAbility=typeof ACCOUNT_PERMISSION_CAPABILITIES[number];
export function isAccountPermissionAbility(value:unknown):value is AccountPermissionAbility{
 return typeof value==="string"&&(ACCOUNT_PERMISSION_CAPABILITIES as readonly string[]).includes(value);
}
export function canCongressForAccount(
 role:CongressRole,ability:CongressAbility,restricted:readonly string[]
){
 return canCongress(role,ability)&&!restricted.includes(ability);
}

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
