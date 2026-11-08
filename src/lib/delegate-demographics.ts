/** Validated optional demographics for delegate CRUD, Excel and reporting. */
export type DelegateGender="male"|"female"|"other";
export type DemographicPerson={
 id:string;full_name:string;unit:string;
 gender:DelegateGender|null;birth_date:string|null;
 delegate_type?:"official"|"alternate"|"guest";
};
export type CheckinIdentity={delegate_id:string;session_id:string;checked_in_at:string};
export type AgeGroup={label:string;count:number};
export type QualityStats={
 total:number;men:number;women:number;other:number;missingGender:number;
 missingBirthDate:number;ageKnown:number;
 averageAge:number|null;minAge:number|null;maxAge:number|null;
 youngest:DemographicPerson[];oldest:DemographicPerson[];
 ageGroups:AgeGroup[];people: (DemographicPerson&{age:number|null})[];
};
export const normalizeGender=(value:unknown):DelegateGender|null=>{
 if(value===null||value===undefined||String(value).trim()==="")return null;
 const text=String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/đ/g,"d");
 if(["nam","male","m","man","1"].includes(text))return "male";
 if(["nu","female","f","woman","2"].includes(text))return "female";
 if(["khac","other","nonbinary","non-binary","3"].includes(text))return "other";
 throw new Error("Giới tính phải là Nam, Nữ hoặc Khác.");
};
function formatDate(year:number,month:number,day:number):string|null{
 if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day)||year<1900||year>9999)return null;
 const dt=new Date(Date.UTC(year,month-1,day));
 if(dt.getUTCFullYear()!==year||dt.getUTCMonth()!==month-1||dt.getUTCDate()!==day)return null;
 const str=`${String(year).padStart(4,"0")}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Ho_Chi_Minh",
  year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const get=(key:string)=>parts.find(p=>p.type===key)?.value||"";
 const today=`${get("year")}-${get("month")}-${get("day")}`;
 if(str>today)return null;
 return str;
}
export function normalizeBirthDate(value:unknown):string|null{
 if(value===null||value===undefined||String(value).trim()==="")return null;
 if(value instanceof Date){
  if(!Number.isFinite(value.getTime()))throw new Error("Ngày sinh không hợp lệ.");
  const out=formatDate(value.getUTCFullYear(),value.getUTCMonth()+1,value.getUTCDate());
  if(!out)throw new Error("Ngày sinh không hợp lệ hoặc ở tương lai.");
  return out;
 }
 const raw=String(value).trim();
 const iso=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
 const local=/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(raw);
 let result:string|null=null;
 if(iso)result=formatDate(+iso[1],+iso[2],+iso[3]);
 else if(local)result=formatDate(+local[3],+local[2],+local[1]);
 else if(/^\d{5}(\.\d+)?$/.test(raw)){
  // Numeric cells from spreadsheets with date formatting lost by the parser.
  const dt=new Date(Date.UTC(1899,11,30)+Math.floor(Number(raw))*86400000);
  result=formatDate(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
 }
 if(!result)throw new Error("Ngày sinh không hợp lệ (nhập dd/mm/yyyy hoặc yyyy-mm-dd).");
 return result;
}
export function calculateAge(dateOfBirth:string,onDate:string):number|null{
 const birth=/^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
 const current=/^(\d{4})-(\d{2})-(\d{2})$/.exec(onDate);
 if(!birth||!current)return null;
 const [year,month,day]=birth.slice(1).map(Number);
 const [todayYear,todayMonth,todayDay]=current.slice(1).map(Number);
 const birthCheck=new Date(Date.UTC(year,month-1,day));
 if(birthCheck.getUTCFullYear()!==year||birthCheck.getUTCMonth()!==month-1||birthCheck.getUTCDate()!==day)return null;
 const age=todayYear-year-(todayMonth<month||(todayMonth===month&&todayDay<day)?1:0);
 return age>=0&&age<130?age:null;
}
export function calculateDelegateQuality(
 delegates:DemographicPerson[],checkins:CheckinIdentity[],onDate:string
):QualityStats{
 const attended=new Set(checkins.map(c=>c.delegate_id));
 const people=delegates.filter(d=>attended.has(d.id)).map(person=>({
  ...person,age:person.birth_date?calculateAge(person.birth_date,onDate):null
 }));
 const known=people.filter(p=>p.age!==null);
 const ages=known.map(p=>p.age!);
 const minAge=ages.length?Math.min(...ages):null;
 const maxAge=ages.length?Math.max(...ages):null;
 // Exact birth date, not merely rounded completed years, defines oldest/youngest.
 const birthDates=known.map(p=>p.birth_date!).sort();
 const firstBirth=birthDates[0]||null;
 const lastBirth=birthDates[birthDates.length-1]||null;
 const youngest=lastBirth?known.filter(p=>p.birth_date===lastBirth):[];
 const oldest=firstBirth?known.filter(p=>p.birth_date===firstBirth):[];
 const ageGroups=[
  {label:"Dưới 18",count:ages.filter(a=>a<18).length},
  {label:"18–25",count:ages.filter(a=>a>=18&&a<=25).length},
  {label:"26–30",count:ages.filter(a=>a>=26&&a<=30).length},
  {label:"31–40",count:ages.filter(a=>a>=31&&a<=40).length},
  {label:"41–50",count:ages.filter(a=>a>=41&&a<=50).length},
  {label:"Trên 50",count:ages.filter(a=>a>50).length}
 ];
 return {
  total:people.length,men:people.filter(p=>p.gender==="male").length,
  women:people.filter(p=>p.gender==="female").length,
  other:people.filter(p=>p.gender==="other").length,
  missingGender:people.filter(p=>!p.gender).length,
  missingBirthDate:people.filter(p=>p.age===null).length,
  ageKnown:ages.length,
  averageAge:ages.length?Math.round(ages.reduce((sum,n)=>sum+n,0)/ages.length*10)/10:null,
  minAge,maxAge,oldest,youngest,ageGroups,people
 };
}