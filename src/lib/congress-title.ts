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
  /^đại hội\s+đoàn(?=\s|$)/iu,
  /^đoàn\s+tncs\s+hồ\s+chí\s+minh(?=\s|$)/iu
 ],
 hoi_sinh_vien:[
  /^đại hội\s+đại biểu\s+hội\s+sinh\s+viên\s+việt\s+nam(?=\s|$)/iu,
  /^đại hội\s+hội\s+sinh\s+viên\s+việt\s+nam(?=\s|$)/iu,
  /^đại hội\s+đại biểu\s+hội\s+sinh\s+viên(?=\s|$)/iu,
  /^đại hội\s+hội\s+sinh\s+viên(?=\s|$)/iu,
  /^hội\s+sinh\s+viên\s+việt\s+nam(?=\s|$)/iu,
  /^hội\s+sinh\s+viên(?=\s|$)/iu
 ]
};

/** Accept already-prefixed names, including historical lowercase headings and
 * unit input accidentally containing the organization name. */
export function congressShortName(name:string,kind:CongressTitleKind):string{
 let specific=normalizeName(name);
 for(let attempt=0;attempt<3;attempt++){
  const prefix=olderHeadings[kind].find(pattern=>pattern.test(specific));
  if(!prefix)break;
  specific=specific.replace(prefix,"").replace(/^[\s:–—-]+/u,"").trim();
 }
 // Correct a legacy lowercase initial such as "khoa" without changing acronyms.
 return specific.replace(/^\p{Ll}/u,initial=>initial.toLocaleUpperCase("vi"));
}

/** Idempotent: old full names and newly typed short names resolve to one prefix.
 * Also use at read/render boundaries so existing DB rows display consistently,
 * without changing IDs, slugs or requiring a migration. */
export function congressFullName(name:string,kind:CongressTitleKind):string{
 const specific=congressShortName(name,kind);
 return specific?CONGRESS_FORMAL_HEADING[kind]+" "+specific:CONGRESS_FORMAL_HEADING[kind];
}
