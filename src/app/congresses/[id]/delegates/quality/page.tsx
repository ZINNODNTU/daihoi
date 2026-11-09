import {redirect} from "next/navigation";

/** Giữ liên kết cũ hoạt động; phân tích nay là phân hệ độc lập. */
export default async function LegacyDelegateQualityRoute({params,searchParams}:{
 params:Promise<{id:string}>;searchParams:Promise<{sessionId?:string}>
}){
 const {id}=await params;
 const {sessionId}=await searchParams;
 const query=sessionId?("?sessionId="+encodeURIComponent(sessionId)):"";
 redirect("/congresses/"+id+"/quality"+query);
}
