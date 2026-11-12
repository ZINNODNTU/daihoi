/** Preserve pre-migration access only when RBAC tables do not exist yet.
 * Other authorization lookup failures remain fail-closed.
 * Apply upgrade-global-rbac-groups-v60.sql before assigning custom groups.
 */
export function isRbacMigrationPending(error:{code?:string;message?:string}|null|undefined){
 return error?.code==="42P01"||error?.code==="PGRST205";
}
