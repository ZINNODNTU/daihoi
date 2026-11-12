export type BchCandidate={
 id:string;congress_id:string;full_name:string;birth_year:number;hometown:string;
 ethnicity:string;education_level:string;union_join_year:number;current_position:string;
 photo_path:string|null;display_order:number;created_at:string;updated_at:string;
 votes_received?:number|null;total_ballots?:number|null;
};
export type BchCandidateInput=Pick<BchCandidate,
 "full_name"|"birth_year"|"hometown"|"ethnicity"|"education_level"|
 "union_join_year"|"current_position"|"display_order"> & {
 votes_received:number|null;total_ballots:number|null;
};

type Validation={data:BchCandidateInput|null;error:string|null};
const textLimit={
 full_name:160,hometown:240,ethnicity:80,education_level:180,current_position:240
} as const;
const fieldName:Record<keyof typeof textLimit,string>={
 full_name:"Họ tên",hometown:"Quê quán",ethnicity:"Dân tộc",
 education_level:"Trình độ",current_position:"Chức vụ hiện tại"
};
const clean=(value:unknown)=>typeof value==="string"?value.trim().replace(/\s+/g," "):"";
const currentYear=()=>new Date().getFullYear();

/** Calculate percentage from raw counts, rounding only for presentation. */
export function ballotPercentage(votes:number|null|undefined,total:number|null|undefined):number|null{
 if(votes==null||total==null||!Number.isSafeInteger(votes)||!Number.isSafeInteger(total)||
  total<=0||votes<0||votes>total)return null;
 return votes/total*100;
}
export function formatBallotPercentage(votes:number|null|undefined,total:number|null|undefined){
 const percentage=ballotPercentage(votes,total);
 return percentage===null?"—":percentage.toLocaleString("vi-VN",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";
}

/** Parse only a manually transcribed tally pair. No personnel fields are accepted.
 * Both blank fields intentionally clear an existing result, never assume zero.
 */
export function validateManualBchBallots(body:unknown):{
 data:{votes_received:number|null;total_ballots:number|null}|null;error:string|null
}{
 if(!body||typeof body!=="object"||Array.isArray(body))
  return {data:null,error:"Kết quả kiểm phiếu không hợp lệ."};
 const item=body as Record<string,unknown>;
 const rawVotes=item.votes_received,rawTotal=item.total_ballots;
 const blank=(value:unknown)=>value===null||value==="";
 if(blank(rawVotes)&&blank(rawTotal))
  return {data:{votes_received:null,total_ballots:null},error:null};
 if(blank(rawVotes)||blank(rawTotal))
  return {data:null,error:"Phải nhập đồng thời số phiếu đạt và tổng số phiếu."};
 const positiveInteger=/^(0|[1-9][0-9]*)$/;
 if(!([rawVotes,rawTotal].every(value=>
  (typeof value==="string"||typeof value==="number")&&positiveInteger.test(String(value)))))
  return {data:null,error:"Số phiếu phải là số nguyên không âm (không dùng số thập phân)."};
 const votes=Number(rawVotes),total=Number(rawTotal);
 if(!Number.isSafeInteger(votes)||!Number.isSafeInteger(total)||total<1||total>1000000||votes>total)
  return {data:null,error:"Tổng phiếu phải từ 1 đến 1.000.000 và phiếu đạt không vượt tổng phiếu."};
 return {data:{votes_received:votes,total_ballots:total},error:null};
}

/** Preserve old BCH editing while an additive tally migration is pending.
 * A legacy personnel update must not erase an already-recorded tally. */
export function bchWriteData(data:BchCandidateInput,includeBallots:boolean){
 if(includeBallots)return data;
 const {full_name,birth_year,hometown,ethnicity,education_level,
  union_join_year,current_position,display_order}=data;
 return {full_name,birth_year,hometown,ethnicity,education_level,
  union_join_year,current_position,display_order};
}

/** Never trust form or Excel values; the same rules apply to create and update. */
export function validateBchInput(body:unknown,year=currentYear()):Validation{
 if(!body||typeof body!=="object"||Array.isArray(body))
  return {data:null,error:"Thông tin nhân sự không hợp lệ."};
 const item=body as Record<string,unknown>;
 const fields={} as Record<keyof typeof textLimit,string>;
 for(const [key,max] of Object.entries(textLimit) as [keyof typeof textLimit,number][]){
  const value=clean(item[key]);
  if(value.length< (key==="ethnicity"?1:2)||value.length>max)
   return {data:null,error:"Trường "+fieldName[key]+" cần từ "+(key==="ethnicity"?1:2)+" đến "+max+" ký tự."};
  fields[key]=value;
 }
 const birth=Number(item.birth_year);
 const joined=Number(item.union_join_year);
 const order=item.display_order===undefined?0:Number(item.display_order);
 if(!Number.isInteger(birth)||birth<1900||birth>year)
  return {data:null,error:"Năm sinh phải hợp lệ và không được lớn hơn năm hiện tại."};
 if(!Number.isInteger(joined)||joined<1931||joined>year||joined<birth)
  return {data:null,error:"Năm vào Đoàn không hợp lệ hoặc trước năm sinh."};
 const votesRaw=item.votes_received,totalRaw=item.total_ballots;
 const votesBlank=votesRaw===undefined||votesRaw===null||votesRaw==="";
 const totalBlank=totalRaw===undefined||totalRaw===null||totalRaw==="";
 if(votesBlank!==totalBlank)
  return {data:null,error:"Cần nhập cả số phiếu đạt được và tổng số phiếu, hoặc để trống cả hai."};
 let votes:number|null=null,total:number|null=null;
 if(!votesBlank){
  const pattern=/^(0|[1-9][0-9]*)$/;
  if(!pattern.test(String(votesRaw))||!pattern.test(String(totalRaw)))
   return {data:null,error:"Số phiếu phải là số nguyên không âm."};
  votes=Number(votesRaw);total=Number(totalRaw);
  if(!Number.isSafeInteger(votes)||!Number.isSafeInteger(total)||
   total<1||total>1000000||votes>total)
   return {data:null,error:"Tổng phiếu phải từ 1 đến 1.000.000 và số phiếu đạt không vượt tổng phiếu."};
 }
 if(!Number.isInteger(order)||order<0||order>10000)
  return {data:null,error:"Thứ tự trình bày phải từ 0 đến 10.000."};
 return {data:{
  full_name:fields.full_name,birth_year:birth,hometown:fields.hometown,
  ethnicity:fields.ethnicity,education_level:fields.education_level,
  union_join_year:joined,current_position:fields.current_position,display_order:order,
  votes_received:votes,total_ballots:total
 },error:null};
}
export function sortBchCandidates(items:BchCandidate[]){
 return [...items].sort((a,b)=>a.display_order-b.display_order||
  a.full_name.localeCompare(b.full_name,"vi")||a.id.localeCompare(b.id));
}
/** Validate reorder payload before invoking the all-or-nothing SQL RPC. */
export function validateBchReorder(ids:unknown):ids is string[]{
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 return Array.isArray(ids)&&ids.length>0&&ids.length<=500&&
  ids.every(id=>typeof id==="string"&&uuid.test(id))&&
  new Set(ids.map(id=>id.toLowerCase())).size===ids.length;
}
