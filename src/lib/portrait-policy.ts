/**
 * Single source of truth for private portrait object keys.
 *
 * IMPORTANT: Existing Supabase rows and the BCH photo_path CHECK constraint
 * require these exact legacy-compatible keys. Do not introduce a new folder,
 * random UUID or content-hash filename without a coordinated DB migration.
 * Never use a client-supplied object key for a privileged Storage operation.
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
