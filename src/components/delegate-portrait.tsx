"use client";

import Image from "next/image";
import {useState,type CSSProperties} from "react";
import {congressBranding,type CongressKind} from "@/components/brand-mark";

type Props={
 delegateId:string;fullName:string;photoPath:string|null|undefined;
 kind:CongressKind;width:number;height:number;
 className?:string;style?:CSSProperties;version?:string|number;
 priority?:boolean;
};

/** A missing or broken personal photo displays the organization emblem.
 * This is a display-only fallback: it never writes a logo into delegate Storage. */
export function DelegatePortrait({delegateId,fullName,photoPath,kind,width,height,
 className="",style,version,priority=false}:Props){
 const url="/api/delegates/"+encodeURIComponent(delegateId)+"/photo?w="+
  (width>96?"160":"96")+"&v="+encodeURIComponent(String(version??photoPath??""));
 const [failedUrl,setFailedUrl]=useState<string|null>(null);
 const hasPhoto=Boolean(photoPath&&failedUrl!==url);
 const brand=congressBranding[kind];
 return <span className={"relative block shrink-0 overflow-hidden bg-white "+className} style={style}>
  {hasPhoto?<Image unoptimized src={url} alt={"Ảnh đại biểu "+fullName}
   width={width} height={height} priority={priority}
   loading={priority?undefined:"lazy"} onError={()=>setFailedUrl(url)}
   className="h-full w-full object-cover"/>:
   <Image unoptimized src={brand.src}
    alt={"Logo "+brand.name+" (ảnh đại biểu chưa được cập nhật)"}
    width={width} height={height} priority={priority}
    className="h-full w-full object-contain p-[11%]"/>}
 </span>;
}
