export const MAX_DOCUMENT_BYTES=4*1024*1024;
export const DOCUMENT_FORMATS={
 ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".webp":"image/webp",
 ".pdf":"application/pdf",
 ".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 ".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
 ".pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation",
 ".doc":"application/msword",".xls":"application/vnd.ms-excel",
 ".ppt":"application/vnd.ms-powerpoint"
} as const;
export type DocumentFormat=keyof typeof DOCUMENT_FORMATS;
export class DocumentValidationError extends Error{
 constructor(message:string){super(message);this.name="DocumentValidationError";}
}
export function validateDocumentName(value:string){
 const name=value.trim().replace(/[\\/\r\n\0\u0000-\u001f\u007f]/g,"_").slice(0,180);
 if(!name||name.startsWith("."))throw new DocumentValidationError("Tên tài liệu không hợp lệ.");
 return name;
}
export function getDocumentMime(name:string){
 const extension=/\.[^.]+$/.exec(name.toLowerCase())?.[0] as DocumentFormat|undefined;
 if(!extension||!(extension in DOCUMENT_FORMATS))
  throw new DocumentValidationError("Định dạng không hỗ trợ. Dùng PDF, ảnh, DOC/DOCX, XLS/XLSX hoặc PPT/PPTX.");
 return DOCUMENT_FORMATS[extension];
}
const starts=(bytes:Uint8Array,signature:number[])=>signature.every((n,i)=>bytes[i]===n);
export function validateDocumentBytes(name:string,bytes:Uint8Array){
 if(bytes.byteLength===0)throw new DocumentValidationError("Tệp trống không thể tải lên.");
 if(bytes.byteLength>MAX_DOCUMENT_BYTES)
  throw new DocumentValidationError("Mỗi tài liệu tối đa 4 MB do giới hạn tải lên của Vercel.");
 const mime=getDocumentMime(name);
 const zip=starts(bytes,[0x50,0x4b,0x03,0x04]);
 const ole=starts(bytes,[0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]);
 const valid=mime==="image/jpeg"?starts(bytes,[0xff,0xd8,0xff]):
  mime==="image/png"?starts(bytes,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]):
  mime==="image/webp"?starts(bytes,[0x52,0x49,0x46,0x46])&&
   starts(bytes.slice(8),[0x57,0x45,0x42,0x50]):
  mime==="application/pdf"?starts(bytes,[0x25,0x50,0x44,0x46,0x2d]):
  mime.startsWith("application/vnd.openxmlformats-officedocument.")?zip:ole;
 if(!valid)throw new DocumentValidationError("Nội dung tệp không khớp định dạng. Kiểm tra tệp gốc trước khi tải lên.");
 return mime;
}
