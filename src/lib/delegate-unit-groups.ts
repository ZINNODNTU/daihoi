/** Group congress delegates by the displayed Đơn vị without changing personnel data. */
export type UnitGroup<T>={key:string;label:string;delegates:T[];unassigned:boolean};

export function delegateUnitKey(unit:string|null|undefined):string{
 const normalized=(unit??"").trim().replace(/\s+/g," ").normalize("NFC");
 return normalized?"unit:"+normalized.toLocaleLowerCase("vi"):"unassigned";
}

/** Stable within-unit order, Vietnamese-aware alphabetical unit headings and
 * one separate catch-all for delegates without an assigned unit. */
export function groupDelegatesByUnit<T extends {unit?:string|null}>(
 delegates:readonly T[]
):UnitGroup<T>[]{
 const groups=new Map<string,UnitGroup<T>>();
 for(const delegate of delegates){
  const normalized=(delegate.unit??"").trim().replace(/\s+/g," ").normalize("NFC");
  const key=delegateUnitKey(delegate.unit);
  let group=groups.get(key);
  if(!group){
   group={key,label:normalized||"Chưa phân đơn vị",delegates:[],unassigned:!normalized};
   groups.set(key,group);
  }
  group.delegates.push(delegate);
 }
 const collator=new Intl.Collator("vi",{numeric:true,sensitivity:"base"});
 return [...groups.values()].sort((a,b)=>
  Number(a.unassigned)-Number(b.unassigned)||
  collator.compare(a.label,b.label)||
  a.key.localeCompare(b.key,"vi")
 );
}
