import Image from "next/image";
import type {HTMLAttributes} from "react";

/** Huy hiệu Đoàn TNCS Hồ Chí Minh được sử dụng làm nhận diện chính. */
export function BrandMark({className="",...props}:HTMLAttributes<HTMLSpanElement>){
 return <span className={"brand-symbol "+className} aria-label="Huy hiệu Đoàn TNCS Hồ Chí Minh" role="img" {...props}>
  <Image src="/branding/huy-hieu-doan.png" width={40} height={44}
   alt="" aria-hidden="true" unoptimized priority
   className="h-full w-full object-contain"/>
 </span>;
}
