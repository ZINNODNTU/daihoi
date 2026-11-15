import type {BchCandidate} from "./bch-candidates.ts";

/** Immutable public profile snapshot: no vote counts are included. */
export type PublishedNewBch={
 memberCount:number;publishedAt:string;members:BchCandidate[];
};

export function mapPublishedNewBch(
 publication:{member_ids:string[];member_count:number;published_at:string}|null,
 records:readonly BchCandidate[]
):PublishedNewBch|null{
 if(!publication)return null;
 if(!Array.isArray(publication.member_ids)||!Number.isInteger(publication.member_count)||
  publication.member_count<1||publication.member_count>500||
  publication.member_ids.length!==publication.member_count||
  new Set(publication.member_ids).size!==publication.member_count)
  throw new Error("Danh sách BCH khóa mới đã công bố không hợp lệ.");
 const lookup=new Map(records.map(item=>[item.id,item]));
 const members=publication.member_ids.map(id=>lookup.get(id));
 if(members.some(member=>!member))
  throw new Error("Danh sách BCH khóa mới không còn đủ nhân sự. BTC cần công bố lại.");
 return {
  memberCount:publication.member_count,publishedAt:publication.published_at,
  members:members as BchCandidate[]
 };
}
