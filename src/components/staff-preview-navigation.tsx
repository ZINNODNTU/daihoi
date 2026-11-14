"use client";

import {useRouter} from "next/navigation";
import type {MouseEvent,FormEvent,ReactNode} from "react";

/**
 * This is NOT impersonation. Render the real administrative shell with the
 * target account's resolved RBAC, while keeping the Super Admin's JWT.
 * Prevent preview links and forms from leaking into writable admin routes.
 */
export function StaffPreviewNavigation({children,basePath,congressId}:{
 children:ReactNode;basePath:string;congressId:string
}){
 const router=useRouter();
 function intercept(event:MouseEvent<HTMLDivElement>){
  if(event.defaultPrevented||!(event.target instanceof Element))return;
  const button=event.target.closest("button");
  if(button&&!button.closest("#main-sidebar")&&!button.closest(".admin-topbar")){
   event.preventDefault();event.stopPropagation();return;
  }
  const anchor=event.target.closest("a[href]");
  if(!anchor)return;
  const raw=anchor.getAttribute("href");
  if(!raw){event.preventDefault();return;}
  if(raw.startsWith("#"))return;
  let target:URL;
  try{target=new URL(raw,window.location.href);}catch{event.preventDefault();return;}
  const currentOrigin=window.location.origin;
  // Block the actual Admin portal, all external destinations, API operations
  // and action links. The only navigable destinations are preview views.
  event.preventDefault();
  event.stopPropagation();
  if(event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  if(target.origin!==currentOrigin)return;
  if(target.pathname===basePath){
   const requested=target.searchParams.get("view")||"overview";
   const query=new URLSearchParams({congressId,view:requested});
   router.push(basePath+"?"+query);
   return;
  }
  const base="/congresses/"+congressId;
  let section:string|null=null;
  if(target.pathname==="/dashboard"||target.pathname===base)section="overview";
  else if(target.pathname.startsWith(base+"/")){
   section=target.pathname.slice(base.length+1).split("/")[0];
  }
  if(!section)return;
  if(section==="attendance")section="attendance";
  const query=new URLSearchParams({congressId,view:section});
  router.push(basePath+"?"+query);
 }
 function blockForm(event:FormEvent<HTMLDivElement>){
  event.preventDefault();event.stopPropagation();
 }
 return <div onClickCapture={intercept} onSubmitCapture={blockForm}>
  {children}
 </div>;
}
