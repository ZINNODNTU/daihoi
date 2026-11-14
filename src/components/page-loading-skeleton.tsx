/** Lightweight server-only placeholders while protected data is loading.
 * No client runtime, no fabricated statistics or previously cached PII.
 */
export function PageLoadingSkeleton({kind}:{kind:"admin"|"delegate"|"guest"}){
 const isGuest=kind==="guest";
 const title=kind==="admin"?"Đang tải bảng điều hành…":
  kind==="delegate"?"Đang chuẩn bị thông tin đại biểu…":
   "Đang tải thông tin Đại hội…";
 return <div role="status" aria-label={title}
  className={isGuest?"mx-auto min-h-[65vh] max-w-[1200px] space-y-6 px-5 py-10 sm:px-8":
   "mx-auto min-h-[45vh] max-w-[1400px] space-y-6 px-4 py-6 sm:px-7"}>
  <span className="sr-only">{title}</span>
  <div aria-hidden="true" className="motion-safe:animate-pulse space-y-5">
   <div className="space-y-3">
    <div className="h-3 w-32 rounded bg-[#d8e7ef]"/>
    <div className="h-9 max-w-[470px] rounded-lg bg-[#dce7ef]"/>
    <div className="h-3 max-w-[360px] rounded bg-[#e5edf2]"/>
   </div>
   <div className={"grid gap-3 "+(isGuest?"grid-cols-1 sm:grid-cols-2":"grid-cols-2 lg:grid-cols-4")}>
    {Array.from({length:isGuest?2:4},(_,i)=>
     <div key={i} className="h-28 rounded-xl border border-[#e0eaf0] bg-[#f2f7fa]"/>)}
   </div>
   <div className="h-56 rounded-xl border border-[#e0eaf0] bg-[#f2f7fa]"/>
  </div>
 </div>;
}
