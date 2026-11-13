import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {
 BarChart3,CakeSlice,CalendarDays,ClipboardCheck,Info,
 RefreshCw,Users,VenusAndMars
} from "lucide-react";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {calculateDelegateQuality,type DemographicPerson} from "@/lib/delegate-demographics";
import {loadQualitySource} from "@/lib/delegate-quality-source";


export const dynamic="force-dynamic";

function dateInVietnam(){
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric"})
  .formatToParts(new Date());
 const read=(type:string)=>parts.find(p=>p.type===type)?.value||"";
 return `${read("year")}-${read("month")}-${read("day")}`;
}
function percent(count:number,total:number){return total?(count*100/total).toFixed(1)+"%":"0%";}
function birthLabel(value:string|null){if(!value)return "Chưa có";const [y,m,d]=value.split("-");return `${d}/${m}/${y}`;}
function humanType(value:DemographicPerson["delegate_type"]){
 return value==="official"?"Chính thức":value==="alternate"?"Dự khuyết":value==="guest"?"Khách mời":"Khác";
}

export default async function DelegateQualityPage({params,searchParams}:{
 params:Promise<{id:string}>;searchParams:Promise<{sessionId?:string}>
}){
 const {id}=await params,{sessionId:requestedSessionId}=await searchParams;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 if(!(await hasCongressAbility(supabase,user.id,id,"quality.read")))notFound();
 const db=createAdminClient();
 const [congressResult,sessionsResult]=await Promise.all([
  db.from("congresses").select("name").eq("id",id).maybeSingle(),
  db.from("attendance_sessions").select("id,name,status,starts_at").eq("congress_id",id)
   .order("created_at",{ascending:false}).limit(300)
 ]);
 if(congressResult.error||!congressResult.data)notFound();
 const sessions=sessionsResult.data||[];
 const selectedSessionId=requestedSessionId==="all"?"all":
  sessions.some(session=>session.id===requestedSessionId)?requestedSessionId:
  sessions[0]?.id||"all";
 const source=await loadQualitySource(db,id,selectedSessionId);
 const issue=source.error||(sessionsResult.error?"read_failed":null);
 const quality=issue?null:calculateDelegateQuality(
  source.delegates,source.checkins,dateInVietnam()
 );
 const typeBreakdown=quality?[
  {label:"Chính thức",count:quality.people.filter(p=>p.delegate_type==="official").length},
  {label:"Dự khuyết",count:quality.people.filter(p=>p.delegate_type==="alternate").length},

 ]:[];
 const genderBreakdown=quality?[
  {label:"Nam",count:quality.men,color:"#1c79ad"},
  {label:"Nữ",count:quality.women,color:"#db7295"},
  {label:"Khác",count:quality.other,color:"#8e7bb6"},
  {label:"Chưa cung cấp",count:quality.missingGender,color:"#9caaba"}
 ]:[];
 const session=sessions.find(s=>s.id===selectedSessionId);

 return <div className="space-y-6">

  <header className="flex flex-wrap items-start justify-between gap-4 rounded-[18px] border border-[#d7e5ef] bg-white p-5 shadow-sm sm:p-7">
   <div>
    <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#007fae]">
     PHÂN TÍCH CHẤT LƯỢNG ĐẠI BIỂU
    </p>
    <h1 className="page-title mt-2">Cơ cấu đại biểu tham dự</h1>
    <p className="page-description mt-2">
     {congressResult.data.name} · Chỉ tính đại biểu chính thức và dự khuyết đã điểm danh; không tính khách mời.
    </p>
   </div>
   <div className="flex flex-wrap gap-2">
    <Link href={`/congresses/${id}/delegates`} className="btn btn-secondary">Quản lý hồ sơ</Link>
    <Link href={`/congresses/${id}/quality?sessionId=${selectedSessionId}`}
     className="btn btn-primary"><RefreshCw size={17}/> Làm mới số liệu</Link>
   </div>
  </header>
  <div className="rounded-2xl border border-[#d7e5ef] bg-white p-4 shadow-sm sm:p-5">
   <label htmlFor="quality-session" className="mb-2 block text-[12px] font-extrabold text-[#385b74]">
    <CalendarDays size={17} className="mr-2 inline-block"/>Phạm vi phân tích
   </label>
   <form action={`/congresses/${id}/quality`} method="GET"
    className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <select id="quality-session" name="sessionId" defaultValue={selectedSessionId}
     className="field min-h-12 w-full sm:max-w-[600px]">
     <option value="all">Toàn Đại hội — mỗi người điểm danh tính một lần</option>
     {sessions.map(s=><option key={s.id} value={s.id}>{s.name}{s.status==="open"?" · Đang mở":""}</option>)}
    </select>
    <button type="submit" className="btn btn-primary min-h-12">Xem thống kê</button>
   </form>
   <p className="mt-3 flex items-start gap-2 text-xs leading-6 text-[#698195]">
    <Info size={17} className="mt-1 shrink-0 text-[#4387aa]"/>
    {selectedSessionId==="all"?
     "Toàn Đại hội: một đại biểu dù điểm danh ở nhiều phiên cũng chỉ được tính một lần.":
     `${session?.name||"Phiên đã chọn"}: chỉ tính đại biểu có lượt điểm danh trong phiên này.`}
    {" "}Độ tuổi được tính theo ngày hiện tại (giờ Việt Nam).
   </p>
  </div>
  {issue||!quality?
   <div role="alert" className="rounded-xl border border-[#f0d6c7] bg-[#fff9f4] p-5 text-sm leading-6 text-[#9d5334]">
    {issue==="migration_missing"?<>
     Supabase chưa có trường giới tính hoặc ngày sinh. Quản trị cần chạy
     <code className="mx-1">upgrade-delegate-demographics-v15.sql</code> trong đúng dự án.
    </>:issue==="data_limit"?
     "Dữ liệu vượt ngưỡng 1.200 đại biểu hoặc 10.000 lượt điểm danh. Hãy giới hạn theo phiên hoặc liên hệ quản trị.":
     "Không đọc được dữ liệu điểm danh. Hãy tải lại trang; nếu vẫn lỗi, kiểm tra kết nối Supabase và nhật ký máy chủ."}
   </div>:
   <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
     {[
      {label:"Đại biểu đã điểm danh",value:quality.total,icon:ClipboardCheck},
      {label:"Đại biểu nam",value:quality.men,icon:Users},
      {label:"Đại biểu nữ",value:quality.women,icon:Users},
      {label:"Tuổi trung bình",value:quality.averageAge===null?"—":quality.averageAge,icon:CakeSlice}
     ].map(metric=><div key={metric.label} className="rounded-[16px] border border-[#d8e5ed] bg-white px-5 py-5 shadow-sm">
      <div className="flex items-center justify-between">
       <p className="text-[12px] font-semibold text-[#6e8699]">{metric.label}</p>
       <metric.icon size={21} className="text-[#3886aa]"/>
      </div>
      <p className="mt-3 text-[30px] font-extrabold tabular-nums tracking-tight text-[#1b3f5f]">{metric.value}</p>
      {metric.label==="Đại biểu nam"||metric.label==="Đại biểu nữ"?
       <p className="mt-1 text-[11px] font-bold text-[#7a92a3]">
        {percent(Number(metric.value),quality.total)} trên số đã điểm danh
       </p>:null}
     </div>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
     <section className="rounded-[18px] border border-[#d8e5ed] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-[#24465f]">
       <VenusAndMars size={21} className="text-[#3985aa]"/> Cơ cấu giới tính
      </h2>
      <p className="mt-1 text-xs text-[#7d91a2]">Trong {quality.total} đại biểu đã điểm danh</p>
      <div className="mt-6 space-y-5">
       {genderBreakdown.map(group=><div key={group.label}>
        <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
         <span className="font-bold text-[#4e6d80]">{group.label}</span>
         <span className="font-extrabold tabular-nums text-[#2b506b]">{group.count} · {percent(group.count,quality.total)}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f6]">
         <div className="h-full rounded-full" style={{width:percent(group.count,quality.total),background:group.color}}/>
        </div>
       </div>)}
      </div>
     </section>
     <section className="rounded-[18px] border border-[#d8e5ed] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-[#24465f]">
       <BarChart3 size={21} className="text-[#3985aa]"/> Cơ cấu độ tuổi
      </h2>
      <p className="mt-1 text-xs text-[#7d91a2]">Có ngày sinh: {quality.ageKnown} / {quality.total} đại biểu</p>
      <div className="mt-5 space-y-3">
       {quality.ageGroups.map(group=><div key={group.label} className="grid grid-cols-[70px_1fr_40px] items-center gap-3 text-[12px]">
        <span className="font-bold text-[#557386]">{group.label}</span>
        <div className="h-3 overflow-hidden rounded-full bg-[#edf3f6]">
         <div className="h-full rounded-full bg-[#2785b1]" style={{width:percent(group.count,quality.ageKnown)}}/>
        </div>
        <span className="text-right font-extrabold tabular-nums text-[#2a526a]">{group.count}</span>
       </div>)}
      </div>
     </section>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
     {[
      {label:"Đại biểu cao tuổi nhất",people:quality.oldest,age:quality.maxAge},
      {label:"Đại biểu trẻ tuổi nhất",people:quality.youngest,age:quality.minAge}
     ].map(group=><section key={group.label} className="rounded-[18px] border border-[#d8e5ed] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <h2 className="text-[17px] font-extrabold text-[#24465f]">{group.label}</h2>
       <span className="rounded-lg bg-[#edf5fa] px-3 py-2 text-[14px] font-extrabold text-[#177bac]">
        {group.age===null?"Chưa có dữ liệu":group.age+" tuổi"}
       </span>
      </div>
      {group.people.length?<div className="mt-4 space-y-3">
       {group.people.map(person=><div key={person.id} className="rounded-xl border border-[#e0e9ef] bg-[#f9fbfd] px-4 py-3">
        <p className="text-[15px] font-extrabold text-[#264d69]">{person.full_name}</p>
        <p className="mt-1 text-[12px] leading-5 text-[#728da0]">{person.unit||"Chưa có đơn vị"}</p>
        <p className="mt-2 text-[12px] font-semibold text-[#426e87]">
         Ngày sinh: {birthLabel(person.birth_date)}
        </p>
       </div>)}
      </div>:<p className="mt-6 text-xs leading-6 text-[#8599a7]">
       Chưa có đại biểu đã điểm danh được cập nhật ngày sinh.
      </p>}
     </section>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
     <section className="rounded-[18px] border border-[#d8e5ed] bg-white p-5 shadow-sm">
      <h2 className="text-[16px] font-extrabold text-[#254c65]">Loại đại biểu được phân tích</h2>
      <div className="mt-4 space-y-3">
       {typeBreakdown.map(group=><div key={group.label} className="flex justify-between gap-2 border-b border-[#e8eff4] pb-3 text-[12px]">
        <span className="font-semibold text-[#5e7c8f]">{group.label}</span>
        <span className="font-extrabold tabular-nums text-[#2e5672]">{group.count} · {percent(group.count,quality.total)}</span>
       </div>)}
      </div>
     </section>
     <section className="rounded-[18px] border border-[#e7d9ba] bg-[#fffbf3] p-5 shadow-sm">
      <h2 className="text-[16px] font-extrabold text-[#755927]">Độ đầy đủ thông tin</h2>
      <p className="mt-3 text-[12px] leading-6 text-[#866c3c]">
       {quality.missingGender} đại biểu chưa cung cấp giới tính; {quality.missingBirthDate} đại biểu chưa có ngày sinh hợp lệ.
       Các trường chưa có dữ liệu không được suy đoán khi thống kê.
      </p>
      <Link href={`/congresses/${id}/delegates`}
       className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#e3d0a5] bg-white px-4 text-[12px] font-bold text-[#8b6e30]">
       Cập nhật hồ sơ đại biểu
      </Link>
     </section>
    </div>
    <section className="overflow-hidden rounded-[18px] border border-[#d8e5ed] bg-white shadow-sm">
     <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eef3] p-5">
      <div>
       <h2 className="text-[17px] font-extrabold text-[#254c65]">Danh sách đại biểu đã điểm danh</h2>
       <p className="mt-1 text-[12px] text-[#7e94a4]">Dữ liệu nền để đối chiếu các chỉ số chất lượng</p>
      </div>
      <span className="rounded-lg bg-[#ecf5fa] px-3 py-2 text-[12px] font-extrabold text-[#177ca9]">{quality.people.length} người</span>
     </div>
     <div className="max-h-[520px] overflow-auto">
      <table className="w-full min-w-[600px] border-collapse text-left text-[12px]">
       <thead className="sticky top-0 bg-[#f1f7fa] text-[#517389]">
        <tr>{["Họ tên","Đơn vị","Loại","Giới tính","Ngày sinh","Tuổi"].map(h=>
         <th key={h} scope="col" className="border-b border-[#dce8ef] px-4 py-3 font-extrabold">{h}</th>)}</tr>
       </thead>
       <tbody className="divide-y divide-[#edf2f5]">
        {quality.people.map(p=><tr key={p.id} className="text-[#3d6177]">
         <td className="px-4 py-3 font-bold">{p.full_name}</td>
         <td className="px-4 py-3">{p.unit||"—"}</td>
         <td className="px-4 py-3">{humanType(p.delegate_type)}</td>
         <td className="px-4 py-3">{p.gender==="male"?"Nam":p.gender==="female"?"Nữ":p.gender==="other"?"Khác":"Chưa cập nhật"}</td>
         <td className="px-4 py-3 tabular-nums">{birthLabel(p.birth_date)}</td>
         <td className="px-4 py-3 font-extrabold tabular-nums">{p.age===null?"—":p.age}</td>
        </tr>)}
       </tbody>
      </table>
      {!quality.people.length&&<p className="px-5 py-10 text-center text-[13px] text-[#7f96a7]">
       Chưa có lượt điểm danh trong phạm vi đã chọn, vì vậy chưa thể phân tích chất lượng đại biểu.
      </p>}
     </div>
    </section>
   </>}
 </div>;
}