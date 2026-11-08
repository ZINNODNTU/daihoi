export type BchCandidate={
 id:string;congress_id:string;full_name:string;birth_year:number;hometown:string;
 ethnicity:string;education_level:string;union_join_year:number;current_position:string;
 display_order:number;created_at:string;updated_at:string;
};
export type BchCandidateInput=Pick<BchCandidate,
 "full_name"|"birth_year"|"hometown"|"ethnicity"|"education_level"|
 "union_join_year"|"current_position"|"display_order">;

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
 if(!Number.isInteger(order)||order<0||order>10000)
  return {data:null,error:"Thứ tự trình bày phải từ 0 đến 10.000."};
 return {data:{
  full_name:fields.full_name,birth_year:birth,hometown:fields.hometown,
  ethnicity:fields.ethnicity,education_level:fields.education_level,
  union_join_year:joined,current_position:fields.current_position,display_order:order
 },error:null};
}
export function sortBchCandidates(items:BchCandidate[]){
 return [...items].sort((a,b)=>a.display_order-b.display_order||
  a.full_name.localeCompare(b.full_name,"vi")||a.id.localeCompare(b.id));
}
