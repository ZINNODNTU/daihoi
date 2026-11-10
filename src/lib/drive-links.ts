export const GOOGLE_FILE_ID=/^[A-Za-z0-9_-]{12,200}$/;
export function googleDriveFileUrl(fileId:string){
 if(!GOOGLE_FILE_ID.test(fileId))throw new Error("Mã tài liệu Google Drive không hợp lệ.");
 return "https://drive.google.com/file/d/"+encodeURIComponent(fileId)+"/view";
}
export function googleDrivePreviewUrl(fileId:string){
 if(!GOOGLE_FILE_ID.test(fileId))throw new Error("Mã tài liệu Google Drive không hợp lệ.");
 return "https://drive.google.com/file/d/"+encodeURIComponent(fileId)+"/preview";
}
