/** Consistent congress naming without duplicating the formal organization heading.
 *
 * Database congresses.name stores the complete display title for compatibility
 * with existing menus, attendance, exports, QR screens and documents.
 * BTC forms only edit the institution/branch-specific part of that title.
 */
export type CongressTitleKind="doan"|"hoi_sinh_vien";
export const CONGRESS_FORMAL_HEADING:Record<CongressTitleKind,string>={
 doan:"Đại hội Đại biểu Đoàn TNCS Hồ Chí Minh",
 hoi_sinh_vien:"Đại hội Đại biểu Hội Sinh viên Việt Nam"
};

function normalizeName(value:string):string{
 return value.normalize("NFC").trim().replace(/\s+/g," ");
}

const olderHeadings:Record<CongressTitleKind,RegExp[]>={
 doan:[
  /^đại hội\s+đại biểu\s+đoàn\s+tncs\s+hồ\s+chí\s+minh(?=\s|$)/iu,
  /^đại hội\s+đoàn\s+tncs\s+hồ\s+chí\s+minh(?=\s|$)/iu,
  /^đại hội\s+đại biểu\s+đoàn(?=\s|$)/iu,
  /^đại hội\s+đoàn(?=\s|$)/iu
 ],
 hoi_sinh_vien:[
  /^đại hội\s+đại biểu\s+hội\s+sinh\s+viên\s+việt\s+nam(?=\s|$)/iu,
  /^đại hội\s+hội\s+sinh\s+viên\s+việt\s+nam(?=\s|$)/iu,
  /^đại hội\s+đại biểu\s+hội\s+sinh\s+viên(?=\s|$)/iu,
  /^đại hội\s+hội\s+sinh\s+viên(?=\s|$)/iu
 ]
};

/** Accept old already-prefixed records without showing "Đại hội" twice. */
export function congressShortName(name:string,kind:CongressTitleKind):string{
 let specific=normalizeName(name);
 for(const prefix of olderHeadings[kind]){
  if(prefix.test(specific)){
   specific=specific.replace(prefix,"").replace(/^[\s:–—-]+/u,"").trim();
   break;
  }
 }
 return specific;
}

/** Idempotent: old full names and newly typed short names both resolve to one prefix. */
export function congressFullName(name:string,kind:CongressTitleKind):string{
 const specific=congressShortName(name,kind);
 return specific?CONGRESS_FORMAL_HEADING[kind]+" "+specific:CONGRESS_FORMAL_HEADING[kind];
}
