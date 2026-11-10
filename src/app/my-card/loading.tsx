/** Lightweight fallback while private delegate data is verified and streamed. */
export default function DelegatePortalLoading(){
 return <div role="status" aria-live="polite" aria-label="Đang tải thông tin Đại hội"
  className="mx-auto w-full max-w-[970px] space-y-6">
  <div className="space-y-3">
   <div className="h-3 w-36 rounded-full bg-[#dfe8ed] motion-safe:animate-pulse"/>
   <div className="h-8 w-56 max-w-[70%] rounded-lg bg-[#dae5eb] motion-safe:animate-pulse"/>
   <div className="h-3 w-[min(380px,90%)] rounded-full bg-[#e3ebef] motion-safe:animate-pulse"/>
  </div>
  <div className="grid gap-6 lg:grid-cols-[minmax(0,430px)_minmax(280px,1fr)]">
   <div className="rounded-2xl border border-[#dbe5ea] bg-white p-4 shadow-sm">
    <div className="mx-auto w-full max-w-[360px] space-y-5 rounded-2xl bg-[#f1f6f8] p-5">
     <div className="h-20 rounded-xl bg-[#d9e4eb] motion-safe:animate-pulse"/>
     <div className="mx-auto h-36 w-28 rounded-xl bg-[#d4e1e8] motion-safe:animate-pulse"/>
     <div className="mx-auto h-5 w-2/3 rounded-lg bg-[#d9e4eb] motion-safe:animate-pulse"/>
     <div className="h-14 rounded-xl bg-[#e0eaf0] motion-safe:animate-pulse"/>
     <div className="h-16 rounded-xl bg-[#d9e4eb] motion-safe:animate-pulse"/>
    </div>
   </div>
   <div className="space-y-3">
    <div className="h-5 w-44 rounded-lg bg-[#dce8ee] motion-safe:animate-pulse"/>
    {[0,1,2].map(n=><div key={n}
     className="flex h-20 items-center gap-4 rounded-2xl border border-[#e0eaee] bg-white px-4">
     <div className="h-11 w-11 shrink-0 rounded-xl bg-[#e0eaf0] motion-safe:animate-pulse"/>
     <div className="flex-1 space-y-2">
      <div className="h-4 w-2/3 rounded bg-[#e0eaf0] motion-safe:animate-pulse"/>
      <div className="h-3 w-1/2 rounded bg-[#e7eef1] motion-safe:animate-pulse"/>
     </div>
    </div>)}
   </div>
  </div>
  <span className="sr-only">Đang tải thông tin an toàn của đại biểu...</span>
 </div>;
}
