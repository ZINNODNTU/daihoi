import type {HTMLAttributes} from "react";

/** Abstract assembly mark: an open forum and a central speaker's podium. */
export function BrandMark({className="",...props}:HTMLAttributes<HTMLSpanElement>){
  return <span className={"brand-symbol "+className} aria-hidden="true" {...props}>
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
      <path d="M8 11.5H32" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" opacity=".32"/>
      <rect x="7.2" y="17" width="6.7" height="13" rx="2" fill="currentColor" opacity=".55"/>
      <rect x="16.65" y="11.3" width="6.7" height="18.7" rx="2" fill="currentColor"/>
      <rect x="26.1" y="17" width="6.7" height="13" rx="2" fill="currentColor" opacity=".55"/>
      <path d="M6.5 33.3H33.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="20" cy="6.5" r="2.75" fill="#DFB86B"/>
    </svg>
  </span>;
}
