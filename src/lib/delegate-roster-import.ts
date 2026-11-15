import {normalizeBirthDate,normalizeGender} from "./delegate-demographics.ts";

export const DELEGATE_ROSTER_HEADERS=[
 "STT","HỌ VÀ TÊN","MSSV","NGÀY THÁNG NĂM SINH (dd/mm/yyyy)",
 "","CHỨC VỤ","ĐƠN VỊ"
] as const;
export const DELEGATE_ROSTER_SUBHEADERS=[
 "","","","NAM","NỮ","",""
] as const;

export type DelegateUploadRow={
 full_name:string;student_id:string;unit:string;position:string;
 delegate_type:"official"|"alternate"|"guest";gender:string;birth_date:string;
 };

const text=(value:unknown):string=>{
 if(value===null||value===undefined)return "";
 if(value instanceof Date){
  return Number.isFinite(value.getTime())?value.toISOString().slice(0,10):"";
 }
 return String(value).trim();
};
const key=(value:unknown):string=>text(value).toLocaleLowerCase("vi")
 .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d")
 .replace(/[^a-z0-9]/g,"");
const get=(row:readonly unknown[],index:number):string=>index<0?"":text(row[index]);
const indexOf=(keys:string[],names:readonly string[])=>keys.findIndex(h=>
 names.some(name=>h===name||h.startsWith(name)));
function kind(value:string):DelegateUploadRow["delegate_type"]{
 const normalized=key(value);
 if(normalized.includes("khach")||normalized==="guest")return "guest";
 if(normalized.includes("dukhuyet")||normalized==="alternate")return "alternate";
 return "official";
}
const mssvPattern=/^[A-Za-z0-9][A-Za-z0-9._-]{3,31}$/;
const limit=(value:string,max:number,field:string,line:number)=>{
 if(value.length>max||/[\u0000-\u001f\u007f]/.test(value))
  throw new Error("Dòng "+line+": "+field+" không hợp lệ (tối đa "+max+" ký tự).");
 return value;
};
function parseDate(value:unknown,line:number,field:string):string{
 const raw=text(value);
 if(!raw)return "";
 try{return normalizeBirthDate(raw)||"";}
 catch{throw new Error("Dòng "+line+": "+field+" không hợp lệ. Hãy nhập ngày dd/mm/yyyy.");}
}

/** Reads the TWO-ROW Vietnamese organization roster, including workbooks whose
 * first row merges D:E and whose dates are Excel serials, strings or Date cells.
 * Gender is derived strictly from which of the NAM/NỮ birth-date columns is filled.
 * Existing 7-column flat files remain supported for cross-congress compatibility. */
export function parseDelegateImportSheet(matrix:readonly (readonly unknown[])[]):DelegateUploadRow[]{
 if(!matrix.length)throw new Error("Tệp Excel trống.");
 const headers=(matrix[0]||[]).map(key);
 const nameIndex=indexOf(headers,["hovaten","hoten","fullname","tensinhvien"]);
 const studentIndex=indexOf(headers,["mssv","msvv","masosinhvien","studentid"]);
 const dobIndex=indexOf(headers,["ngaythangnamsinh","ngaysinh","birthdate"]);
 const subHeaders=(matrix[1]||[]).map(key);
 const maleIndex=subHeaders.findIndex(v=>v==="nam");
 const femaleIndex=subHeaders.findIndex(v=>v==="nu");
 const isRoster=nameIndex>=0&&studentIndex>=0&&dobIndex>=0&&maleIndex>=0&&femaleIndex>=0&&maleIndex!==femaleIndex;
 const isFlat=nameIndex>=0&&(studentIndex>=0||indexOf(headers,["donvi","unit","lop"])>=0);
 if(!isRoster&&!isFlat)throw new Error("Không tìm thấy tiêu đề hợp lệ. Hãy dùng file mẫu hoặc bảng trích ngang đã cung cấp.");
 const field=(row:readonly unknown[],aliases:readonly string[])=>get(row,indexOf(headers,aliases));
 const firstRow=isRoster?2:1;
 const parsed:DelegateUploadRow[]=[];
 const ids=new Set<string>();
 for(let i=firstRow;i<matrix.length;i++){
  const row=matrix[i]||[];
  if(!row.some(cell=>text(cell)!==""))continue;
  const line=i+1;
  const full_name=limit(field(row,["hovaten","hoten","fullname","tensinhvien"]),160,"Họ tên",line);
  const student_id=field(row,["mssv","msvv","masosinhvien","studentid"]).toUpperCase();
  const role=kind(field(row,["vaitro","loaidaibieu","delegatetype"]));
  if(!full_name)throw new Error("Dòng "+line+": thiếu họ và tên.");
  if(!student_id&&role!=="guest")throw new Error("Dòng "+line+": thiếu MSSV (chỉ khách mời được để trống).");
  if(student_id&&!mssvPattern.test(student_id))
   throw new Error("Dòng "+line+": MSSV phải gồm 4–32 ký tự chữ/số/dấu chấm, gạch dưới hoặc gạch nối.");
  if(student_id&&ids.has(student_id))throw new Error("Dòng "+line+": MSSV bị trùng trong tệp.");
  if(student_id)ids.add(student_id);
  let gender="",birth_date="";
  if(isRoster){
   const male=text(row[maleIndex]),female=text(row[femaleIndex]);
   if(male&&female)throw new Error("Dòng "+line+": chỉ được điền ngày sinh ở một trong hai cột NAM hoặc NỮ.");
   if(male){gender="male";birth_date=parseDate(row[maleIndex],line,"Ngày sinh NAM");}
   else if(female){gender="female";birth_date=parseDate(row[femaleIndex],line,"Ngày sinh NỮ");}
  }else{
   const genderText=field(row,["gioitinh","sex","gender"]);
   try{gender=normalizeGender(genderText)||"";}catch{throw new Error("Dòng "+line+": giới tính không hợp lệ.");}
   birth_date=parseDate(field(row,["ngaysinh","ngaythangnamsinh","birthdate","dateofbirth","dob"]),line,"Ngày sinh");
  }
  const position=limit(field(row,["chucvudonvicongtac","chucvuhientai","chucvu","chucdanh","position"]),160,"Chức vụ",line);
  const unit=limit(field(row,["donvi","unit","chidoan","lop","classname"]),200,"Đơn vị",line);
  parsed.push({full_name,student_id,unit,position,delegate_type:role,gender,birth_date});
  if(parsed.length>250)throw new Error("Mỗi lần nhập tối đa 250 đại biểu. Hãy chia tệp.");
 }
 if(!parsed.length)throw new Error("Tệp chưa có hồ sơ đại biểu.");
 return parsed;
}
