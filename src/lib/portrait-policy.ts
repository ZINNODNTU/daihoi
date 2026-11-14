/**
 * Single source of truth for private portrait object keys.
 *
 * Database photo_path is a stable, congress-scoped LOGICAL identity.
 * Storage objects live together under "media/" for a clean bucket tree.
 * This mapping is fully backward-compatible: existing DB rows and BCH CHECK
 * remain unchanged, and reads can fall back to legacy physical paths.
 * Never use a client-supplied key in a privileged Storage operation.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;
const BCH=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/bch\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;
const SHARED=/^people\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jpg$/i;

function id(value:string){
 if(!UUID.test(value))throw new Error("Invalid photo identity");
 return value.toLowerCase();
}
export function delegatePortraitKey(congressId:string,delegateId:string){
 return id(congressId)+"/"+id(delegateId)+".jpg";
}
export function sharedPortraitKey(authUserId:string){
 return "people/"+id(authUserId)+".jpg";
}
export function bchPortraitKey(congressId:string,candidateId:string){
 return id(congressId)+"/bch/"+id(candidateId)+".jpg";
}
export function isCanonicalPortraitKey(path:string):boolean{
 return LOCAL.test(path)||BCH.test(path)||SHARED.test(path);
}
/**
 * One physical root in the private delegate-photos bucket.
 *   media/congresses/<congress>/delegates/<delegate>.jpg
 *   media/congresses/<congress>/bch/<candidate>.jpg
 *   media/people/<auth-user>.jpg
 * Supabase DB paths NEVER change and all existing objects remain readable.
 */
export function portraitStoragePath(logicalPath:string):string{
 const bch=BCH.exec(logicalPath);
 if(bch)return "media/congresses/"+id(logicalPath.split("/")[0])+"/bch/"+id(bch[1])+".jpg";
 const local=LOCAL.exec(logicalPath);
 if(local)return "media/congresses/"+id(logicalPath.split("/")[0])+"/delegates/"+id(local[1])+".jpg";
 const shared=SHARED.exec(logicalPath);
 if(shared)return "media/people/"+id(shared[1])+".jpg";
 throw new Error("Invalid logical portrait key");
}
export function isPhysicalPortraitPath(path:string):boolean{
 if(!path.startsWith("media/"))return false;
 try{
  const canonical=path.match(/^media\/congresses\/([^/]+)\/(delegates|bch)\/([^/]+)\.jpg$/i);
  if(canonical){
   const logical=canonical[2]==="bch"?
    bchPortraitKey(canonical[1],canonical[3]):delegatePortraitKey(canonical[1],canonical[3]);
   return portraitStoragePath(logical)===path.toLowerCase();
  }
  const shared=path.match(/^media\/people\/([^/]+)\.jpg$/i);
  return Boolean(shared&&portraitStoragePath(sharedPortraitKey(shared[1]))===path.toLowerCase());
 }catch{return false;}
}
export function isAuthorizedDelegatePhotoKey(
 path:string|null,congressId:string,delegateId:string,authUserId:string|null
):boolean{
 if(!path)return false;
 if(path.toLowerCase()===delegatePortraitKey(congressId,delegateId))return true;
 return Boolean(authUserId&&path.toLowerCase()===sharedPortraitKey(authUserId));
}
/** V45 account-linking may reuse a source congress's local portrait key.
 * The API must first query the active SOURCE delegate by Auth ID. Never grant
 * access just because a local path appears in another congress profile.
 */
export function isLinkedDelegatePortraitKey(
 path:string|null,authUserId:string|null,
 sources:readonly {id:string;congress_id:string;auth_user_id:string|null;photo_path:string|null}[]
):boolean{
 if(!path||!authUserId||!LOCAL.test(path))return false;
 return sources.some(source=>source.auth_user_id===authUserId&&
  source.photo_path?.toLowerCase()===path.toLowerCase()&&
  delegatePortraitKey(source.congress_id,source.id)===path.toLowerCase());
}
export function isAuthorizedBchPhotoKey(path:string|null,congressId:string,candidateId:string):boolean{
 return Boolean(path&&path.toLowerCase()===bchPortraitKey(congressId,candidateId));
}
