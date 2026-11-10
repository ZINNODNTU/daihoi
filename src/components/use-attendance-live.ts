"use client";

import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/browser";
import type {LiveCheckin,LiveDashboardData} from "@/lib/attendance-live";

type Connection="connecting"|"realtime"|"fallback";
const WELCOME_MS=6200;
const SORT_NEWEST=(a:LiveCheckin,b:LiveCheckin)=>
 b.checked_in_at.localeCompare(a.checked_in_at)||b.id.localeCompare(a.id);

/**
 * One full snapshot on entry. A protected Supabase INSERT subscription displays
 * arrivals immediately; a lightweight cursor query catches dropped events,
 * disconnected clients and any migration not yet enabled on production.
 * Existing check-ins never flood the greeting queue when a screen first opens.
 */
export function useAttendanceLive(congressId:string,sessionId:string){
 const [data,setData]=useState<LiveDashboardData|null>(null);
 const [featured,setFeatured]=useState<LiveCheckin|null>(null);
 const [waiting,setWaiting]=useState<LiveCheckin[]>([]);
 const [error,setError]=useState("");
 const [connection,setConnection]=useState<Connection>("connecting");

 useEffect(()=>{
  let active=true;
  let syncBusy=false;
  let realtimeReady=false;
  let lastPoll=0;
  let welcomeTimer:ReturnType<typeof setTimeout>|null=null;
  let cursor="";
  let snapshot:LiveDashboardData|null=null;
  let channel:ReturnType<ReturnType<typeof createClient>["channel"]>|null=null;
  const seen=new Set<string>();
  const queue:LiveCheckin[]=[];
  const warmed=new Set<string>();
  const preload=(rows:LiveCheckin[])=>{
   if(!snapshot)return;
   for(const row of rows.slice(0,5)){
    const person=snapshot.delegates.find(x=>x.id===row.delegate_id);
    if(!person?.photo_path||warmed.has(person.id))continue;
    warmed.add(person.id);
    const img=new window.Image();
    img.src="/api/delegates/"+encodeURIComponent(person.id)+"/photo?w=160";
    if(warmed.size>40)warmed.delete(warmed.values().next().value!);
   }
  };
  const realtimeConfigured=process.env.NEXT_PUBLIC_ATTENDANCE_REALTIME_ENABLED==="true";
  const base=new URLSearchParams({congressId,sessionId});
  function nextWelcome(){
   if(!active||welcomeTimer||document.visibilityState==="hidden")return;
   const next=queue.shift();
   setWaiting([...queue]);
   if(!next)return;
   setFeatured(next);
   welcomeTimer=setTimeout(()=>{
    welcomeTimer=null;
    nextWelcome();
   },WELCOME_MS);
  }
  function accept(rows:LiveCheckin[]){
   if(!active||!snapshot)return;
   const fresh=rows.filter(row=>row.id&&!seen.has(row.id));
   if(!fresh.length)return;
   fresh.forEach(row=>{
    seen.add(row.id);
    if(row.checked_in_at>cursor)cursor=row.checked_in_at;
   });
   const ordered=[...fresh].sort((a,b)=>
    a.checked_in_at.localeCompare(b.checked_in_at)||a.id.localeCompare(b.id));
   const previous=snapshot;
   snapshot={...previous,checkins:[...fresh,...previous.checkins]
    .sort(SORT_NEWEST).slice(0,1000),refreshedAt:new Date().toISOString()};
   setData(snapshot);
   preload(ordered);
   queue.push(...ordered);
   queue.sort((a,b)=>a.checked_in_at.localeCompare(b.checked_in_at)||a.id.localeCompare(b.id));
   setWaiting([...queue]);
   nextWelcome();
  }
  async function full(initial=false){
   if(!active||!sessionId)return;
   const response=await fetch("/api/attendance/live?"+base.toString(),{
    cache:"no-store",credentials:"same-origin"
   });
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không đồng bộ được bảng điểm danh.");
   if(!active)return;
   const next=body as LiveDashboardData;
   if(initial||!snapshot){
    snapshot=next;
    seen.clear();
    for(const row of next.checkins){
     seen.add(row.id);
     if(row.checked_in_at>cursor)cursor=row.checked_in_at;
    }
    cursor=cursor||next.refreshedAt;
    setFeatured(next.checkins[0]||null);
    preload(next.checkins.slice(0,2));
    setData(next);
   }else{
    accept(next.checkins);
    // Preserve arrivals that reached Realtime after the full query began.
    const combined=new Map(next.checkins.map(row=>[row.id,row]));
    for(const row of snapshot.checkins)combined.set(row.id,row);
    snapshot={...next,checkins:[...combined.values()].sort(SORT_NEWEST).slice(0,1000)};
    setData(snapshot);
   }
   setError("");
  }
  async function updates(){
   if(!active||!snapshot||!sessionId||syncBusy||document.visibilityState==="hidden")return;
   syncBusy=true;
   try{
    const q=new URLSearchParams(base);
    q.set("mode","updates");
    // One-second overlap makes equal-timestamp inserts safe; IDs deduplicate.
    const since=Date.parse(cursor);
    q.set("after",new Date(Number.isFinite(since)?Math.max(Date.now()-86400000+2000,since-1000):Date.now()-60000).toISOString());
    const response=await fetch("/api/attendance/live?"+q.toString(),{
     cache:"no-store",credentials:"same-origin"
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Không đồng bộ được lượt mới.");
    accept((result.checkins||[]) as LiveCheckin[]);
    if(active)setError("");
   }catch(e){
    if(active)setError(e instanceof Error?e.message:"Mất kết nối đồng bộ điểm danh.");
   }finally{syncBusy=false;lastPoll=Date.now();}
  }
  queueMicrotask(()=>{
   if(!active)return;
   setData(null);setFeatured(null);setWaiting([]);setError("");setConnection("connecting");
  });
  async function start(){
   try{
    await full(true);
    if(!active)return;
    const client=createClient();
    channel=client.channel("attendance-checkins:"+congressId+":"+sessionId)
     .on("postgres_changes",{
      event:"INSERT",schema:"public",table:"checkins",
      filter:"session_id=eq."+sessionId
     },payload=>{
      const row=payload.new as LiveCheckin & {congress_id?:string};
      if(row.congress_id!==congressId||!row.id||!row.delegate_id||!row.checked_in_at)return;
      accept([row]);
     })
     .subscribe(status=>{
      if(!active)return;
      if(status==="SUBSCRIBED"){
       realtimeReady=realtimeConfigured;setConnection(realtimeConfigured?"realtime":"fallback");
       void updates(); // close the snapshot-to-subscription race
      }else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
       realtimeReady=false;setConnection("fallback");
      }
     });
    // Catch anything between the initial snapshot and subscription.
    void updates();
   }catch(e){
    if(active){setConnection("fallback");setError(e instanceof Error?e.message:"Không tải được điểm danh.");}
   }
  }
  if(sessionId)void start();
  const timer=setInterval(()=>{
   if(!active||document.visibilityState==="hidden")return;
   // When realtime is healthy, cheap reconciliation every ~15s; otherwise 3s.
   if(!realtimeReady||Date.now()-lastPoll>=15000)void updates();
  },3000);
  const snapshotTimer=setInterval(()=>{
   if(active&&document.visibilityState!=="hidden"&&snapshot)
    void full().catch(e=>setError(e instanceof Error?e.message:"Không tải được sơ đồ mới."));
  },10000);
  const visible=()=>{
   if(document.visibilityState==="visible"){
    nextWelcome(); // Do not skip greetings while projector tab was hidden.
    void updates();
    if(!realtimeReady)setConnection("fallback");
   }
  };
  document.addEventListener("visibilitychange",visible);
  return ()=>{
   active=false;
   clearInterval(timer);clearInterval(snapshotTimer);
   if(welcomeTimer)clearTimeout(welcomeTimer);
   document.removeEventListener("visibilitychange",visible);
   if(channel)void createClient().removeChannel(channel);
  };
 },[congressId,sessionId]);
 return {data,featured,waiting,error,connection};
}
