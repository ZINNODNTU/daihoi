import {redirect} from "next/navigation";

export const dynamic="force-dynamic";
// Giữ đường dẫn cũ để bookmark của BTC tiếp tục hoạt động.
// QR không còn là màn hình riêng: mọi thứ hiển thị tại Màn hình điểm danh.
export default async function FormerQrPage({params,searchParams}:{
 params:Promise<{id:string}>;searchParams:Promise<{sessionId?:string}>;
}){
 const {id}=await params;
 const {sessionId}=await searchParams;
 redirect("/congresses/"+encodeURIComponent(id)+"/attendance/live"+
  (sessionId?"?sessionId="+encodeURIComponent(sessionId):""));
}
