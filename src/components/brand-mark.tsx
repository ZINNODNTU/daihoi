import Image from "next/image";
import type {HTMLAttributes} from "react";

export type CongressKind="doan"|"hoi_sinh_vien";
export const congressBranding={
 doan:{src:"/branding/huy-hieu-doan.png",alt:"Huy hiệu Đoàn TNCS Hồ Chí Minh",name:"Đoàn TNCS Hồ Chí Minh"},
 hoi_sinh_vien:{src:"/branding/huy-hieu-hoi-sinh-vien.png",alt:"Huy hiệu Hội Sinh viên Việt Nam",name:"Hội Sinh viên Việt Nam"}
} as const;

/** Display branding from the selected congress, never infer it from its title. */
export function BrandMark({className="",kind="doan",...props}:
 HTMLAttributes<HTMLSpanElement>&{kind?:CongressKind}){
 const brand=congressBranding[kind];
 return <span className={"brand-symbol "+className} aria-label={brand.alt} role="img" {...props}>
  <Image src={brand.src} width={44} height={44}
   alt="" aria-hidden="true" unoptimized priority
   className="h-full w-full object-contain"/>
 </span>;
}
