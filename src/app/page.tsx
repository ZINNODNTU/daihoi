import Link from "next/link";
import {ArrowRight,BarChart3,CheckCircle2,Layers3,QrCode,ShieldCheck,Users} from "lucide-react";
const cards=[
 {icon:Layers3,title:"Nhiều Đại hội",text:"Mỗi Đại hội có dữ liệu, phiên làm việc và người quản trị riêng."},
 {icon:Users,title:"Quản lý đại biểu",text:"Nhập danh sách đại biểu, phân loại và cấp QR định danh."},
 {icon:QrCode,title:"Điểm danh linh hoạt",text:"BTC quét QR hoặc tìm kiếm và xác nhận thủ công khi cần."},
 {icon:BarChart3,title:"Thống kê theo phiên",text:"Theo dõi số lượng có mặt và báo cáo trực quan."},
];
export default function Home(){
 return <main className="min-h-screen overflow-hidden">
   <div className="bg-[#0c2f4d] text-white relative overflow-hidden">
    <div className="absolute top-[-200px] right-[-100px] h-[550px] w-[550px] rounded-full bg-[#0c8ba6]/20 blur-3xl"/>
    <nav className="relative mx-auto max-w-7xl flex items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3 font-extrabold tracking-wide text-xl"><div className="rounded-xl bg-white/15 p-2"><Layers3 size={24}/></div>ĐẠI HỘI <span className="text-[#55e0db]">SỐ</span></div>
      <Link className="btn bg-white/10 border border-white/15 text-white hover:bg-white/20" href="/login">Đăng nhập <ArrowRight size={17}/></Link>
    </nav>
    <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-26 lg:pt-28 lg:pb-36 grid gap-12 lg:grid-cols-2 items-center">
      <div>
        <div className="inline-flex gap-2 items-center rounded-full border border-[#61d9d3]/35 bg-white/5 px-4 py-2 text-sm text-[#b8f2ed] mb-7"><CheckCircle2 size={16}/> Dành cho Đại hội Đoàn & Hội Sinh viên</div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.13]">Điều hành đại hội<br/><span className="text-[#5ee3d5]">đơn giản và chính xác.</span></h1>
        <p className="mt-7 text-lg text-[#b7cbdb] max-w-lg leading-relaxed">Một nền tảng tập trung để quản lý nhiều kỳ đại hội, đại biểu, điểm danh QR và thống kê theo từng phiên làm việc.</p>
        <div className="mt-9 flex gap-3 flex-wrap"><Link href="/login" className="btn bg-[#4dd4cf] text-[#0d3850] hover:bg-white font-extrabold">Vào hệ thống <ArrowRight size={19}/></Link><a href="#tinh-nang" className="btn border border-white/25 text-white">Khám phá tính năng</a></div>
        <div className="flex gap-7 mt-10 text-sm text-[#a4c4d8]"><span className="flex gap-2 items-center"><ShieldCheck size={17}/> Phân quyền theo đại hội</span><span className="flex gap-2 items-center"><QrCode size={17}/> Check-in QR</span></div>
      </div>
      <div className="relative">
       <div className="absolute inset-0 bg-[#0cc6c0]/20 blur-[90px] rounded-full"/>
       <div className="relative card p-6 md:p-7 text-[#0e2441] shadow-[0_35px_90px_rgba(0,5,20,.3)]">
        <div className="flex justify-between items-center pb-4 border-b border-[#e2ebf2]"><div><div className="text-xs text-[#7892a9] font-bold tracking-wider">BẢNG ĐIỀU HÀNH</div><div className="font-extrabold text-xl mt-1">Phiên làm việc chính thức</div></div><span className="badge badge-green">● Minh họa</span></div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[[ "200","Đại biểu"],["184","Có mặt"],["92%","Tỷ lệ" ]].map(([n,label])=><div key={label} className="rounded-2xl bg-[#f1f8fc] p-4"><div className="text-3xl font-extrabold">{n}</div><div className="text-xs text-[#6a8195] mt-2">{label}</div></div>)}
        </div>
        <div className="flex justify-between text-sm mt-7 mb-3"><span className="font-bold">Tiến độ điểm danh</span><span className="font-bold text-[#1c9588]">92%</span></div>
        <div className="w-full h-3 bg-[#e6eff3] rounded-full overflow-hidden"><div className="h-3 bg-gradient-to-r from-[#167ba9] to-[#19bda9] w-[92%] rounded-full"/></div>
        <div className="mt-7 space-y-3">
          {[["Nguyễn Văn A","Quét QR"],["Trần Thị B","Thủ công"],["Lê Văn C","Quét QR"]].map(([name,method],i)=><div key={name} className="flex items-center justify-between bg-[#f8fbfd] rounded-xl px-4 py-3"><div className="flex gap-3 items-center"><span className="bg-[#e1f1f6] rounded-full h-9 w-9 flex items-center justify-center text-[#136e89] font-bold">{i+1}</span><span className="font-semibold text-sm">{name}</span></div><span className="badge badge-green">{method}</span></div>)}
        </div>
        <div className="text-[11px] text-[#7a8b9d] mt-5">Số liệu mẫu dùng để minh họa giao diện.</div>
       </div>
      </div>
    </div>
   </div>
   <section id="tinh-nang" className="mx-auto max-w-7xl px-6 py-20">
    <div className="text-sm font-bold tracking-widest text-[#0d969b]">NỀN TẢNG THỐNG NHẤT</div>
    <h2 className="text-4xl font-extrabold mt-3 tracking-tight">Mọi công việc điều hành, trong một nơi.</h2>
    <p className="mt-4 text-[#6d8297] max-w-xl">Thiết kế cho các Ban Tổ chức cần sự rõ ràng, nhanh chóng và khả năng truy vết thao tác.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{cards.map(x=><div className="card p-6" key={x.title}><div className="bg-[#eaf9f8] w-fit p-3 rounded-xl text-[#159c9d]"><x.icon size={25}/></div><h3 className="text-lg font-extrabold mt-5">{x.title}</h3><p className="mt-3 text-[#73889a] leading-relaxed text-sm">{x.text}</p></div>)}</div>
   </section>
   <footer className="border-t border-[#e1e9f0] px-6 py-7 text-center text-xs text-[#71879c]">ĐẠI HỘI SỐ • Nền tảng quản lý và điều hành Đại hội Đoàn – Hội</footer>
 </main>
}
