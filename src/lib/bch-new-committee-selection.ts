import type {BchCandidate} from "./bch-candidates.ts";

/** Minimal snapshot on the existing congress; no profiles or vote totals copied. */
export type CongressBchPublication={
 bch_new_member_ids:string[]|null;
 bch_new_published_at:string|null;
};
export type PublishedNewBch={
 memberCount:number;publishedAt:string;members:BchCandidate[];
};
export type BchPublicationStatus={memberCount:number;publishedAt:string};

/** NULL/NULL means unpublished. Partial, duplicated and empty publications fail closed. */
export function congressBchPublication(
 congress:CongressBchPublication|null
):BchPublicationStatus|null{
 if(!congress)return null;
 const ids=congress.bch_new_member_ids;
 const at=congress.bch_new_published_at;
 if(ids===null&&at===null)return null;
 if(!Array.isArray(ids)||typeof at!=="string"||!at||
  ids.length<1||ids.length>500||new Set(ids).size!==ids.length)
  throw new Error("Danh sách BCH khóa mới đã công bố không hợp lệ.");
 return {memberCount:ids.length,publishedAt:at};
}

/** Get the candidate profiles by ID, preserving BTC's published exact order.
 * Never substitute an automatically re-ranked list after results change. */
export function mapPublishedNewBch(
 congress:CongressBchPublication|null,
 records:readonly BchCandidate[]
):PublishedNewBch|null{
 const status=congressBchPublication(congress);
 if(!status||!congress)return null;
 const lookup=new Map(records.map(item=>[item.id,item]));
 const members=congress.bch_new_member_ids!.map(id=>lookup.get(id));
 if(members.some(member=>!member))
  throw new Error("Danh sách BCH khóa mới không còn đủ nhân sự. BTC cần công bố lại.");
 return {...status,members:members as BchCandidate[]};
}
