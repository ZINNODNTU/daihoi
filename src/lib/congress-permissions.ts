/** Role/capability policy shared by server guards and admin navigation.
 * An authorization decision MUST also verify authenticated user + congress scope
 * on the server: these pure helpers do not themselves authorize any request.
 */
export type CongressRole="super_admin"|"admin"|"checkin"|"secretary"|null;
export type CongressAbility=
 |"workspace.view"|"delegates.read"|"delegates.write"|"quality.read"
 |"seating.read"|"seating.write"|"bch.read"|"bch.write"|"ballots.read"|"ballots.write"
 |"attendance.read"|"attendance.scan"|"attendance.sessions"
 |"reports.read"|"documents.read"|"documents.write"
 |"team.manage"|"settings.manage"|"system.logs";

const POLICIES:Record<Exclude<CongressRole,null>,readonly CongressAbility[]>={
 super_admin:["workspace.view","delegates.read","delegates.write","quality.read",
  "seating.read","seating.write","bch.read","bch.write","ballots.read","ballots.write","attendance.read",
  "attendance.scan","attendance.sessions","reports.read","documents.read",
  "documents.write","team.manage","settings.manage","system.logs"],
 admin:["workspace.view","delegates.read","delegates.write","quality.read",
  "seating.read","seating.write","bch.read","bch.write","ballots.read","ballots.write","attendance.read",
  "attendance.scan","attendance.sessions","reports.read","documents.read",
  "documents.write","team.manage","settings.manage"],
 checkin:["workspace.view","seating.read","attendance.read","attendance.scan","reports.read"],
 secretary:["workspace.view","bch.read","documents.read","reports.read"]
};

/** Account overrides can revoke role defaults. Explicit grants beyond the
 * role are possible only for the isolated ballot-room capabilities.
 * Privilege management, global settings and system logs are never toggleable.
 */
export const ACCOUNT_PERMISSION_CAPABILITIES=[
 "workspace.view","delegates.read","delegates.write","quality.read",
 "seating.read","seating.write","bch.read","bch.write",
 "ballots.read","ballots.write","attendance.read","attendance.scan","attendance.sessions",
 "documents.read","documents.write","reports.read"
] as const satisfies readonly CongressAbility[];
export type AccountPermissionAbility=typeof ACCOUNT_PERMISSION_CAPABILITIES[number];
export function isAccountPermissionAbility(value:unknown):value is AccountPermissionAbility{
 return typeof value==="string"&&(ACCOUNT_PERMISSION_CAPABILITIES as readonly string[]).includes(value);
}
/** Only isolated ballot-room privileges may be granted beyond a BTC base role.
 * Everything else is role-bound; high-risk account management is never toggleable.
 */
export function canCustomizeCongressAbility(role:CongressRole,ability:AccountPermissionAbility){
 return canCongress(role,ability)||ability==="ballots.read"||ability==="ballots.write";
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
