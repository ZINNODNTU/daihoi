"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {ImpersonateAccountButton} from "@/components/impersonate-account-button";
import {ArrowLeft,Check,FolderKey,LockKeyhole,Plus,RefreshCw,Save,Search,ShieldCheck,Trash2,Users} from "lucide-react";
import {ACCOUNT_PERMISSION_CAPABILITIES,canCongress} from "@/lib/congress-permissions";
import {baseManagedAbilities,editableGroupAbilities,RBAC_ABILITY_LABELS,RBAC_LABELS,
 type ManagedRole} from "@/lib/access-rbac";

type Membership={congressId:string;role:ManagedRole;groupId:string|null;isPrimary:boolean;
 denials:string[];permissionOverrides:{ability:string;allowed:boolean}[]};
type Account={userId:string;name:string;email:string;platformRole:string;createdAt:string;
 isSelf:boolean;memberships:Membership[]};
type Group={id:string;congress_id:string;role:ManagedRole;name:string;abilities:string[]};
type Congress={id:string;name:string;kind:string};
type Data={accounts:Account[];groups:Group[];congresses:Congress[];truncated:boolean};
const staffRole=(r:ManagedRole)=>r==="admin"||r==="checkin"||r==="secretary";
const chip="rounded-lg border border-[#dae4eb] bg-white px-3 py-2 text-[12px] font-semibold text-[#31556d]";
export function AccessControlClient({initialCongressId=""}:{initialCongressId?:string}={}){
 const params=useSearchParams();
 const router=useRouter();
 const pathname=usePathname();
 const [data,setData]=useState<Data|null>(null);
 const [congressId,setCongressId]=useState(initialCongressId||params.get("congressId")||"");
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [search,setSearch]=useState("");
 const [roleFilter,setRoleFilter]=useState("all");
 const [tab,setTab]=useState<"accounts"|"groups">("accounts");
 const [groupDraft,setGroupDraft]=useState<{id:string|null;role:ManagedRole;name:string;abilities:string[]}>({
  id:null,role:"delegate",name:"",abilities:baseManagedAbilities("delegate")});
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 function changeCongress(nextId:string){
  setCongressId(nextId);
  setNotice("");
  // Keep the administrative sidebar tied to the congress being inspected.
  // Global RBAC remains super-admin-only; changing the filter grants no rights.
  if(nextId&&pathname==="/dashboard/access")
   router.replace("/dashboard/access?congressId="+encodeURIComponent(nextId),{scroll:false});
  else if(nextId&&initialCongressId&&nextId!==initialCongressId)
   router.push("/congresses/"+encodeURIComponent(nextId)+"/permissions");
 }
 const selected=data?.accounts.find(a=>a.userId===selectedId)||null;
 const membership=selected?.memberships.find(m=>m.congressId===congressId)||null;
 const groups=data?.groups.filter(g=>g.congress_id===congressId)||[];
 const selectedGroup=membership?.groupId?groups.find(g=>g.id===membership.groupId)||null:null;
 const load=useCallback(async()=>{
  const res=await fetch("/api/admin/access",{credentials:"same-origin",cache:"no-store"});
  const body=await res.json();
  if(!res.ok)throw Error(body.error||"Không tải được danh sách tài khoản.");
  const next=body as Data;
  setData(next);
  setCongressId(old=>next.congresses.some(c=>c.id===old)?old:(next.congresses[0]?.id||""));
  setSelectedId(old=>old&&next.accounts.some(a=>a.userId===old)?old:(next.accounts[0]?.userId||null));
 },[]);
 useEffect(()=>{let active=true;(async()=>{try{await load();}
 catch(e){if(active)setError(e instanceof Error?e.message:"Lỗi truy cập RBAC.");}
 finally{if(active)setLoading(false);}})();return()=>{active=false;};},[load]);
 const visible=useMemo(()=>data?.accounts.filter(a=>{
  const matches=a.name.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi"))||
   a.email.toLowerCase().includes(search.toLowerCase());
  const role=congressId?a.memberships.find(m=>m.congressId===congressId)?.role:null;
  return matches&&(roleFilter==="all"||roleFilter==="super_admin"&&a.platformRole==="super_admin"||
   roleFilter===role||roleFilter==="unassigned"&&!role);
 })||[],[data,search,congressId,roleFilter]);
 async function mutate(payload:Record<string,unknown>,success:string){
  setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/admin/access",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,congressId})});
   const body=await res.json();
   if(!res.ok)throw Error(body.error||"Không thể cập nhật quyền.");
   await load();setNotice(success);
  }catch(e){setError(e instanceof Error?e.message:"Không lưu được RBAC.");}
  finally{setBusy(false);}
 }
 async function accountToggle(ability:string,enabled:boolean){
  if(!membership||!selected||selected.isSelf)return;
  if(ability==="portal.access"&&!enabled&&!confirm("Thu hồi quyền vào cổng Đại hội của tài khoản này?"))return;
  if(staffRole(membership.role)){
   setBusy(true);setError("");setNotice("");
   try{
    const res=await fetch("/api/congress-members/permissions",{
     method:"PUT",credentials:"same-origin",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({congressId,userId:selected.userId,changes:[{ability,allowed:enabled}]})
    });
    const body=await res.json();
    if(!res.ok)throw Error(body.error||"Không cập nhật được tài khoản BTC.");
    await load();setNotice("Đã lưu quyền riêng cho "+selected.name);
   }catch(e){setError(e instanceof Error?e.message:"Không lưu được quyền.");}
   finally{setBusy(false);}
  }else await mutate({action:"portalPermission",userId:selected.userId,ability,denied:!enabled},
   "Đã cập nhật quyền cá nhân của "+selected.name);
 }
 function openGroup(g?:Group){
  setGroupDraft(g?{id:g.id,role:g.role,name:g.name,abilities:[...g.abilities]}:{
   id:null,role:"delegate",name:"",abilities:baseManagedAbilities("delegate")});
  setTab("groups");
 }
 const draftAbilities=editableGroupAbilities(groupDraft.role);
 return <div className="mx-auto max-w-[1510px] space-y-5 pb-12">
  <header className="overflow-hidden rounded-2xl border border-[#d6e2ea] bg-white">
   <div className="flex flex-wrap items-start justify-between gap-4 bg-[linear-gradient(120deg,#e6f1f5,#fff_72%)] px-5 py-6 sm:px-7">
    <div>
     <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#34748d]"><ShieldCheck size={17}/> GLOBAL ACCESS CONTROL</p>
     <h1 className="mt-2 text-[clamp(24px,3vw,36px)] font-extrabold tracking-tight text-[#1c4058]">Quản lý RBAC toàn hệ thống</h1>
     <p className="mt-2 max-w-[850px] text-[12px] leading-6 text-[#627c8d]">
      Quản lý toàn bộ tài khoản, nhóm quyền và quyền riêng của từng Đại hội. Vai trò nền là giới hạn tối đa,
      nhóm quyền chỉ thu hẹp quyền, tuyệt đối không làm tăng thẩm quyền. Đóng vai tài khoản với phiên đăng nhập thật theo RBAC. Mọi thao tác có hiệu lực và lưu dấu Super Admin thực hiện.
     </p>
    </div>
    <button type="button" onClick={()=>{setLoading(true);void load().catch(e=>setError(String(e))).finally(()=>setLoading(false));}}
     disabled={busy} className="btn btn-secondary"><RefreshCw size={15}/> Đồng bộ</button>
   </div>
   <div className="flex flex-wrap items-center gap-3 border-t border-[#e4ebef] px-5 py-3 sm:px-7">
    <span className="text-[12px] font-bold text-[#426b81]">{data?.accounts.length??0} tài khoản</span>
    <span className="text-[12px] text-[#728b99]">{data?.groups.length??0} nhóm tùy chỉnh · {data?.congresses.length??0} Đại hội</span>
    {data?.truncated&&<span className="text-[11px] text-amber-700">Danh sách vượt 2.000 tài khoản; cần bổ sung phân trang.</span>}
   </div>
  </header>
  <div className="flex flex-wrap gap-2">
   <Link href={initialCongressId?"/congresses/"+initialCongressId:"/dashboard"} className={chip}>
    <ArrowLeft size={13} className="mr-1 inline"/> {initialCongressId?"Về Đại hội":"Quay về Admin"}</Link>
   <label className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#456679]">
    Đại hội <select className="field min-h-10 max-w-[min(70vw,470px)]" value={congressId}
     onChange={e=>changeCongress(e.target.value)} aria-label="Lọc theo Đại hội">
      {(data?.congresses||[]).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
    </select>
   </label>
   <button onClick={()=>setTab("accounts")} className={chip+" "+(tab==="accounts"?"!bg-[#dff1f8] !text-[#0d698f]":"")}>Tài khoản</button>
   <button onClick={()=>setTab("groups")} className={chip+" "+(tab==="groups"?"!bg-[#dff1f8] !text-[#0d698f]":"")}>Nhóm quyền</button>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>}
  {notice&&<p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-800">{notice}</p>}
  {loading?<div className="rounded-2xl border bg-white p-10 text-center text-[13px] text-[#648397]">Đang tải RBAC từ Supabase…</div>:
  tab==="accounts"?
  <div className="grid items-start gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
   <aside className="overflow-hidden rounded-xl border border-[#dae4eb] bg-white lg:sticky lg:top-5">
    <div className="space-y-3 border-b border-[#e1eaf0] p-4">
     <h2 className="text-[14px] font-bold text-[#28526b]">Danh bạ tài khoản</h2>
     <label className="relative block"><Search size={15} className="absolute left-3 top-3.5 text-[#819bac]"/>
      <input value={search} onChange={e=>setSearch(e.target.value)}
       aria-label="Tìm theo tên hoặc email" placeholder="Tìm tên, email..." className="field min-h-11 w-full !pl-9"/></label>
     <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}
      className="field w-full" aria-label="Lọc theo nhóm vai trò">
      <option value="all">Tất cả loại tài khoản</option>
      <option value="super_admin">Quản trị hệ thống</option>
      {(Object.keys(RBAC_LABELS) as ManagedRole[]).map(r=><option key={r} value={r}>{RBAC_LABELS[r]}</option>)}
      <option value="unassigned">Chưa tham gia Đại hội này</option>
     </select>
     <p className="text-[11px] text-[#8193a1]">{visible.length} tài khoản phù hợp</p>
    </div>
    <div className="max-h-[68vh] overflow-y-auto">
     {visible.map(a=>{
      const m=a.memberships.find(m=>m.congressId===congressId);
      return <button key={a.userId} onClick={()=>{setSelectedId(a.userId);setError("");setNotice("");}}
       aria-current={a.userId===selectedId?"true":undefined}
       className={"flex w-full gap-3 border-b border-[#edf2f5] px-4 py-3 text-left transition hover:bg-[#f2f7fa] "+
        (a.userId===selectedId?"bg-[#eaf5fa]":"")}>
       <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e7eff4] text-sm font-extrabold text-[#3a728d]">
        {a.name.charAt(0).toUpperCase()}</span>
       <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold text-[#27495e]">{a.name}</span>
        <span className="block truncate text-[10px] text-[#8095a2]">{a.email}</span>
        <span className="mt-1 block text-[10px] font-semibold text-[#4a849d]">{a.platformRole==="super_admin"?"Super Admin":m?RBAC_LABELS[m.role]:"Chưa tham gia Đại hội"}</span>
       </span>
       {a.userId===selectedId&&<Check size={15} className="mt-2 shrink-0 text-[#137fa9]"/>}
      </button>;
     })}
     {!visible.length&&<p className="p-5 text-[12px] text-[#8194a4]">Không tìm thấy tài khoản.</p>}
    </div>
   </aside>
   {selected?<div className="min-w-0 space-y-4">
    <section className="rounded-xl border border-[#dae5eb] bg-white p-5">
     <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#48809b]">HỒ SƠ & KIỂM TRA TRUY CẬP</p>
       <h2 className="mt-2 text-[23px] font-extrabold text-[#1e4056]">{selected.name}</h2>
       <p className="mt-1 break-all text-[12px] text-[#708a99]">{selected.email}</p>
       <p className="mt-2 text-[11px] text-[#627c8b]">ID: <code>{selected.userId}</code></p>
      </div>
      {membership&&!selected.isSelf&&selected.platformRole!=="super_admin"&&
       <ImpersonateAccountButton userId={selected.userId} congressId={congressId} name={selected.name}/>}
     </div>
     {selected.isSelf&&<p className="mt-4 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-800">Không thể tự sửa quyền của chính mình. Hãy dùng một tài khoản Super Admin khác để điều chỉnh.</p>}
     {membership?.isPrimary&&selected.platformRole!=="super_admin"&&
      <p className="mt-4 rounded-lg border border-[#cce2ef] bg-[#edf7fb] p-3 text-[12px] leading-6 text-[#2d6885]">
       <strong>Quản trị chính của Đại hội.</strong> Super Admin được chỉnh quyền nghiệp vụ của tài khoản này.
       Quyền vào Đại hội, quyền quản lý tài khoản, cấu hình và vai trò quản trị chính luôn được bảo vệ;
       không thể giới hạn bằng nhóm quyền hoặc tự chỉnh quyền của mình.
      </p>}
     {selected.platformRole==="super_admin"&&<p className="mt-4 rounded-lg border border-[#dbe8ee] bg-[#f2f7fa] p-3 text-[12px] text-[#3e6e84]">Quản trị hệ thống có quyền toàn cục. Không cấp hoặc thu hồi qua nhóm Đại hội.</p>}
     <div className="mt-4 border-t border-[#e6edf1] pt-4">
      <h3 className="text-[13px] font-bold text-[#2e536a]">Các Đại hội đã tham gia</h3>
      <div className="mt-2 flex flex-wrap gap-2">{selected.memberships.map(m=><button
       onClick={()=>changeCongress(m.congressId)} key={m.congressId}
       className={chip+" "+(m.congressId===congressId?"!border-[#78b6d2] !bg-[#eaf5fa]":"")}>
       {data?.congresses.find(c=>c.id===m.congressId)?.name||"Đại hội"} · {RBAC_LABELS[m.role]}</button>)}
       {!selected.memberships.length&&<span className="text-[12px] text-[#8197a4]">Chưa có vai trò theo Đại hội.</span>}
      </div>
     </div>
    </section>
    {membership&&selected.platformRole!=="super_admin"?<>
     <section className="rounded-xl border border-[#dae5eb] bg-white p-5">
      <div className="flex items-center gap-2 text-[#2d627c]"><FolderKey size={18}/><h3 className="text-[15px] font-bold">Nhóm quyền tại Đại hội</h3></div>
      <p className="mt-2 text-[12px] leading-6 text-[#788e9b]">Vai trò nền: {RBAC_LABELS[membership.role]}. Nhóm quyền là lớp giới hạn bổ sung, không được cấp quyền vượt vai trò.</p>
      <div className="mt-3 flex flex-wrap gap-2">
       <select value={membership.groupId||""} disabled={busy||selected.isSelf||membership.isPrimary} className="field min-w-[240px] flex-1"
        aria-label="Gán nhóm quyền" onChange={e=>void mutate({action:"assignGroup",userId:selected.userId,
         groupId:e.target.value||null},"Đã cập nhật nhóm quyền của "+selected.name)}>
        <option value="">Mặc định theo vai trò (không có nhóm)</option>
        {groups.filter(g=>g.role===membership.role).map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
       </select>
       <button onClick={()=>openGroup()} className={chip}><Plus size={14} className="mr-1 inline"/> Tạo nhóm</button>
      </div>
      {selectedGroup&&<p className="mt-2 text-[11px] text-[#6d8896]">Nhóm <strong>{selectedGroup.name}</strong> áp dụng ngay cả khi quyền cá nhân được bật.</p>}
     </section>
     <section className="rounded-xl border border-[#dae5eb] bg-white p-5">
      <div className="flex items-center gap-2"><LockKeyhole size={18} className="text-[#276f92]"/><h3 className="text-[15px] font-bold text-[#2a5369]">Ma trận quyền tài khoản</h3></div>
      <p className="mt-2 text-[12px] leading-6 text-[#7e919f]">Thay đổi được kiểm tra ở API và lưu nhật ký. Nhóm quyền hoặc quyền nền đã chặn thì tài khoản không thể sử dụng chức năng.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{editableGroupAbilities(membership.role).map(ability=>{
       // Individual setting is evaluated alongside role and group restrictions.
       const overrides=membership.permissionOverrides.find(o=>o.ability===ability);
       const personallyEnabled=staffRole(membership.role)?
         overrides?.allowed??canCongress(membership.role,ability as typeof ACCOUNT_PERMISSION_CAPABILITIES[number]):
         !membership.denials.includes(ability);
       const groupAllows=!selectedGroup||selectedGroup.abilities.includes(ability);
       const effective=personallyEnabled&&groupAllows;
       return <label key={ability} className={"flex items-center gap-3 rounded-lg border border-[#e2ebf0] p-3 "+(!groupAllows?"bg-[#f7f8fa]":"bg-white")}>
        <input type="checkbox" className="h-[18px] w-[18px] accent-[#14769a]" checked={personallyEnabled}
         disabled={busy||selected.isSelf||!groupAllows||selected.platformRole==="super_admin"||
          (membership.isPrimary&&ability==="workspace.view")||
          (staffRole(membership.role)&&!canCongress(membership.role,ability as typeof ACCOUNT_PERMISSION_CAPABILITIES[number])&&
           ability!=="ballots.read"&&ability!=="ballots.write")}
         onChange={e=>void accountToggle(ability,e.target.checked)} aria-label={RBAC_ABILITY_LABELS[ability]||ability}/>
        <span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-[#375c72]">{RBAC_ABILITY_LABELS[ability]||ability}</span>
         <span className={"mt-1 block text-[10px] "+(effective?"text-emerald-700":"text-amber-700")}>
          {effective?"Có hiệu lực":!groupAllows?"Nhóm đang hạn chế":"Không được cấp"}</span></span>
       </label>;
      })}</div>
      {staffRole(membership.role)&&<p className="mt-3 text-[11px] text-[#788f9d]">Chức năng cấu hình hệ thống và quản lý tài khoản luôn theo vai trò nền, không cấp riêng.</p>}
     </section>
    </>:<section className="rounded-xl border border-[#dae5eb] bg-white p-6 text-[12px] text-[#748c9b]">
     {selected.platformRole==="super_admin"?"Tài khoản quản trị hệ thống không cần nhóm Đại hội.":"Chọn một Đại hội đã có tài khoản tham gia để quản lý quyền."}
    </section>}
   </div>:null}
  </div>:
  <div className="grid items-start gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
   <aside className="rounded-xl border border-[#dae6eb] bg-white p-4">
    <div className="flex items-center justify-between gap-2"><h2 className="text-[14px] font-extrabold text-[#2b526b]">Nhóm quyền tùy chỉnh</h2>
     <button onClick={()=>openGroup()} className="inline-flex items-center gap-1 text-[12px] font-bold text-[#177da1]"><Plus size={15}/> Tạo</button></div>
    <p className="mt-1 text-[11px] text-[#7990a0]">Riêng cho từng Đại hội và vai trò.</p>
    <div className="mt-4 space-y-2">{groups.map(g=><button key={g.id} onClick={()=>openGroup(g)}
     className={"w-full rounded-lg border p-3 text-left "+(groupDraft.id===g.id?"border-[#6daaca] bg-[#eef7fa]":"border-[#e5edf1] hover:bg-[#f7fafb]")}>
     <span className="block text-[13px] font-bold text-[#28546d]">{g.name}</span>
     <span className="mt-1 block text-[11px] text-[#8193a0]">{RBAC_LABELS[g.role]} · {g.abilities.length} quyền</span>
    </button>)}
    {!groups.length&&<p className="text-[12px] text-[#8296a3]">Chưa có nhóm tùy chỉnh. Tài khoản đang dùng quyền theo vai trò nền.</p>}</div>
   </aside>
   <section className="rounded-xl border border-[#dae6eb] bg-white p-5 sm:p-6">
    <h2 className="text-[19px] font-extrabold text-[#1e4660]">{groupDraft.id?"Chỉnh sửa nhóm quyền":"Tạo nhóm quyền mới"}</h2>
    <p className="mt-1 text-[12px] text-[#758d9a]">Mọi thành viên được gán nhóm sẽ áp dụng các quyền đã bật, tối đa bằng vai trò nền.</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
     <label className="block text-[12px] font-bold text-[#456578]">Tên nhóm
      <input value={groupDraft.name} maxLength={80} onChange={e=>setGroupDraft(d=>({...d,name:e.target.value}))}
       className="field mt-2 w-full" placeholder="Ví dụ: Tổ hỗ trợ điểm danh"/></label>
     <label className="block text-[12px] font-bold text-[#456578]">Loại vai trò
      <select value={groupDraft.role} disabled={Boolean(groupDraft.id)} className="field mt-2 w-full"
       onChange={e=>{const role=e.target.value as ManagedRole;setGroupDraft(d=>({...d,role,
        abilities:baseManagedAbilities(role)}));}}>
       {(Object.keys(RBAC_LABELS) as ManagedRole[]).map(r=><option value={r} key={r}>{RBAC_LABELS[r]}</option>)}
      </select>
     </label>
    </div>
    <div className="mt-5 grid gap-2 sm:grid-cols-2">{draftAbilities.map(ability=><label
     className="flex items-center gap-2 rounded-lg border border-[#e2eaf0] px-3 py-3 text-[12px] text-[#355c70]" key={ability}>
     <input type="checkbox" checked={groupDraft.abilities.includes(ability)} className="h-4 w-4 accent-[#157b9b]"
      onChange={e=>setGroupDraft(d=>({...d,abilities:e.target.checked?[...d.abilities,ability]:d.abilities.filter(a=>a!==ability)}))}/>
     <span>{RBAC_ABILITY_LABELS[ability]||ability}</span>
    </label>)}</div>
    <div className="mt-6 flex flex-wrap gap-2">
     <button disabled={busy||groupDraft.name.trim().length<2} onClick={()=>void mutate({
      action:groupDraft.id?"updateGroup":"createGroup",groupId:groupDraft.id,
      role:groupDraft.role,name:groupDraft.name,abilities:groupDraft.abilities
     },"Đã lưu nhóm quyền "+groupDraft.name)}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#146d94] px-5 text-[12px] font-bold text-white disabled:opacity-50">
      <Save size={16}/> {busy?"Đang lưu…":"Lưu nhóm quyền"}</button>
     {groupDraft.id&&<button disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-200 px-4 text-[12px] font-bold text-red-700"
      onClick={()=>{if(confirm("Chỉ xóa được nhóm không còn thành viên. Tiếp tục?"))
       void mutate({action:"deleteGroup",groupId:groupDraft.id},"Đã xóa nhóm quyền.");}}><Trash2 size={15}/> Xóa nhóm</button>}
    </div>
   </section>
  </div>}
  <p className="flex items-center gap-2 text-[11px] leading-5 text-[#7a8d9a]"><Users size={15}/>
   Chế độ đóng vai sử dụng phiên Supabase của tài khoản đích. Thao tác ghi có hiệu lực theo RBAC và được ghi nhật ký người khởi tạo.</p>
 </div>;
}
