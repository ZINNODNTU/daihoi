/** Route-aware, permission-neutral helpers for the administrative sidebar.
 * The caller must supply only server-authorized navigation items. These
 * helpers never construct an unapproved link or grant an ability.
 */
export type AdminSearchableNav={name:string;href:string};
export type AdminSearchableGroup<T extends AdminSearchableNav>={
 id:string;title:string;items:T[];
};

export function isAdminNavActive(path:string,href:string):boolean{
 return path===href||(href!=="/dashboard"&&path.startsWith(href+"/"));
}

export function findAdminNavActive<T extends AdminSearchableNav>(
 path:string,items:readonly T[],fallback:T
):T{
 return [...items].sort((a,b)=>b.href.length-a.href.length)
  .find(item=>isAdminNavActive(path,item.href))||fallback;
}

export function searchAdminNavGroups<T extends AdminSearchableNav>(
 groups:readonly AdminSearchableGroup<T>[],query:string
):AdminSearchableGroup<T>[]{
 const normalized=query.trim().toLocaleLowerCase("vi");
 return groups.map(group=>({...group,items:normalized?
  group.items.filter(item=>item.name.toLocaleLowerCase("vi").includes(normalized)||
   group.title.toLocaleLowerCase("vi").includes(normalized)):group.items
 })).filter(group=>group.items.length>0);
}
