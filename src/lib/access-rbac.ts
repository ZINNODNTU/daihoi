/** Shared RBAC vocabulary. Group grants may only RESTRICT a verified base role. */
import {ACCOUNT_PERMISSION_CAPABILITIES,canCustomizeCongressAbility,roleAbilities,type CongressAbility} from "@/lib/congress-permissions";

export type ManagedRole="admin"|"checkin"|"secretary"|"delegate"|"guest";
export type PortalAbility="portal.access"|"portal.card"|"portal.checkin"|"portal.seating"|"portal.documents"|"portal.bch"|"portal.history";
export type ManagedAbility=CongressAbility|PortalAbility;

export const PORTAL_ABILITIES:readonly PortalAbility[]=[
 "portal.access","portal.card","portal.checkin","portal.seating","portal.documents","portal.bch","portal.history"
];
export const RBAC_LABELS:Record<ManagedRole,string>={
 admin:"Trưởng Ban Tổ chức",checkin:"Tổ điểm danh",secretary:"Tổ thư ký",
 delegate:"Đại biểu",guest:"Khách mời"
};
export const RBAC_ABILITY_LABELS:Record<string,string>={
 "workspace.view":"Vào hệ thống điều hành","delegates.read":"Xem đại biểu","delegates.write":"Sửa đại biểu",
 "quality.read":"Phân tích đại biểu","seating.read":"Xem sơ đồ ghế","seating.write":"Quản lý sơ đồ ghế",
 "bch.read":"Xem nhân sự BCH","bch.write":"Quản lý nhân sự BCH",
 "ballots.read":"Xem kiểm phiếu","ballots.write":"Nhập kiểm phiếu",
 "attendance.read":"Xem điểm danh","attendance.scan":"Quét điểm danh BTC",
 "attendance.sessions":"Quản lý phiên điểm danh","documents.read":"Xem tài liệu",
 "documents.write":"Quản lý tài liệu","reports.read":"Xem báo cáo",
 "portal.access":"Vào cổng đại biểu/khách mời","portal.card":"Xem thẻ đại biểu",
 "portal.checkin":"Tự điểm danh QR","portal.seating":"Xem chỗ ngồi",
 "portal.documents":"Xem tài liệu công bố","portal.bch":"Xem nhân sự BCH",
 "portal.history":"Xem lịch sử điểm danh"
};
export function isManagedRole(v:unknown):v is ManagedRole{
 return v==="admin"||v==="checkin"||v==="secretary"||v==="delegate"||v==="guest";
}
export function baseManagedAbilities(role:ManagedRole):string[]{
 if(role==="delegate")return [...PORTAL_ABILITIES];
 if(role==="guest")return ["portal.access","portal.documents","portal.bch"];
 return [...roleAbilities(role).filter(a=>ACCOUNT_PERMISSION_CAPABILITIES.includes(a as typeof ACCOUNT_PERMISSION_CAPABILITIES[number]))];
}
export function editableGroupAbilities(role:ManagedRole):string[]{
 return role==="admin"||role==="checkin"||role==="secretary"
  ? [...ACCOUNT_PERMISSION_CAPABILITIES].filter(a=>canCustomizeCongressAbility(role,a))
  : baseManagedAbilities(role);
}
export function validGroupAbilities(role:ManagedRole,value:unknown):value is string[]{
 return Array.isArray(value)&&value.length<=24&&
  value.every(v=>typeof v==="string"&&editableGroupAbilities(role).includes(v))&&
  new Set(value).size===value.length;
}
export function resolveGroupAbilities<T extends string>(base:readonly T[],group:readonly string[]|null):T[]{
 return group===null?[...base]:base.filter(ability=>group.includes(ability));
}
