/**
 * Names are compared only as a warning gate when reusing an existing Auth account.
 * They are never sufficient proof of identity; matching student ID + verified account
 * must also hold. Accent/case/whitespace differences alone do not trigger a conflict.
 */
export function normalizeDelegateIdentityName(value:string){
 return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/đ/gi,"d").replace(/\s+/g," ").trim().toLowerCase();
}
export function isSameDelegateIdentity(nameA:string,nameB:string){
 return normalizeDelegateIdentityName(nameA)===normalizeDelegateIdentityName(nameB);
}
