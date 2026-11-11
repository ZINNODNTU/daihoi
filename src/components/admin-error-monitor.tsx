"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";

/** Lightweight browser error telemetry for the internal AppShell only.
 * Deliberately does NOT send error.message, stack, URLs with query strings,
 * cookies, form fields, or arbitrary application state.
 */
export function AdminErrorMonitor(){
 const pathname=usePathname();
 useEffect(()=>{
  if(!pathname.startsWith("/dashboard")&&!pathname.startsWith("/congresses/"))return;
  const sent=new Set<string>();
  let sentCount=0;
  function report(event:string,name:string,filename="",line=0,column=0){
   if(sentCount>=5)return;
   const signature=event+":"+filename+":"+line+":"+column;
   if(sent.has(signature))return;
   sent.add(signature);sentCount++;
   const safeFile=filename.split("?")[0].split("#")[0];
   let file="";
   try{file=new URL(safeFile,window.location.origin).pathname;}catch{/* discard */}
   void fetch("/api/system-logs/report",{
    method:"POST",credentials:"same-origin",keepalive:true,
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
     event,route:pathname,errorName:/^[a-zA-Z]{1,40}$/.test(name)?name:"Error",
     filename:file,line,column
    })
   }).catch(()=>{});
  }
  const onError=(event:ErrorEvent)=>{
   report("frontend.runtime_error",event.error instanceof Error?event.error.name:"Error",
    event.filename||"",event.lineno||0,event.colno||0);
  };
  const onRejection=(event:PromiseRejectionEvent)=>{
   report("frontend.unhandled_rejection",
    event.reason instanceof Error?event.reason.name:"Error");
  };
  window.addEventListener("error",onError);
  window.addEventListener("unhandledrejection",onRejection);
  return ()=>{
   window.removeEventListener("error",onError);
   window.removeEventListener("unhandledrejection",onRejection);
  };
 },[pathname]);
 return null;
}
