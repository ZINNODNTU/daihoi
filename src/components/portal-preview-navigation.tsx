"use client";
import {useRouter} from "next/navigation";
import type {MouseEvent,FormEvent,ReactNode} from "react";

const sectionByPath:Record<string,string>={
 "/my-card":"overview",
 "/my-card/checkin":"checkin",
 "/my-card/seats":"seating",
 "/my-card/documents":"documents",
 "/my-card/bch":"bch",
 "/my-card/history":"history"
};

/**
 * Keep the original delegate UI and client-side reading interactions while
 * ensuring its legacy /my-card links never navigate as the admin principal.
 * A preview is NOT a delegated Auth session; all API writes still use admin
 * credentials and must not be initiated from this rendered view.
 */
export function PortalPreviewNavigation({children,basePath,congressId}:{
 children:ReactNode;basePath:string;congressId:string
}){
 const router=useRouter();
 function navigate(event:MouseEvent<HTMLDivElement>){
  if(event.defaultPrevented||event.button!==0)return;
  if(!(event.target instanceof Element))return;
  const anchor=event.target.closest("a[href]");
  if(!anchor)return;
  const raw=anchor.getAttribute("href");
  if(!raw||raw.startsWith("#"))return;
  let url:URL;
  try{url=new URL(raw,window.location.href);}catch{return;}
  if(url.origin===window.location.origin&&url.pathname===basePath)return;
  const section=url.origin===window.location.origin?sectionByPath[url.pathname]:undefined;
  if(section){
   event.preventDefault();event.stopPropagation();
   const params=new URLSearchParams({congressId,view:section});
   const sessionId=url.searchParams.get("sessionId");
   if(section==="seating"&&sessionId)params.set("sessionId",sessionId);
   router.push(basePath+"?"+params);
   return;
  }
  // Let the published document viewer open read-only content. Other URLs,
  // including account, logout and print pages, must not escape the preview.
  if(url.origin===window.location.origin&&
     /^\/api\/documents\/[0-9a-f-]+$/i.test(url.pathname))return;
  event.preventDefault();event.stopPropagation();
 }
 function blockForm(event:FormEvent<HTMLDivElement>){
  event.preventDefault();event.stopPropagation();
 }
 return <div onClickCapture={navigate} onSubmitCapture={blockForm}>
  {children}
 </div>;
}
