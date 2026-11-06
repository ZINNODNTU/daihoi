import Link from "next/link";
import {
  ArrowRight,ArrowUpRight,Armchair,BarChart3,CheckCircle2,
  FileText,LayoutGrid,QrCode,ShieldCheck,Users
} from "lucide-react";

const features=[
  {number:"01",icon:Users,title:"Quản lý đại biểu",detail:"Hồ sơ tập trung, nhập danh sách bằng Excel, mã định danh QR và barcode cho từng đại biểu."},
  {number:"02",icon:QrCode,title:"Điểm danh theo phiên",detail:"Quét mã bằng camera, kiểm tra trạng thái từng phiên và xử lý điểm danh thủ công khi cần."},
  {number:"03",icon:Armchair,title:"Sơ đồ chỗ ngồi",detail:"Thiết kế khu vực, bố trí hàng ghế và phân công vị trí trực tiếp hoặc bằng Excel."},
  {number:"04",icon:BarChart3,title:"Báo cáo điều hành",detail:"Tổng hợp lượt tham dự theo phiên, theo đơn vị và xuất dữ liệu phục vụ công tác tổ chức."},
  {number:"05",icon:FileText,title:"Tài liệu Đại hội",detail:"Quản lý tài liệu theo từng Đại hội với cơ chế quyền truy cập nội bộ."},
  {number:"06",icon:ShieldCheck,title:"Phân quyền rõ ràng",detail:"Tách biệt dữ liệu từng Đại hội và giới hạn thao tác theo vai trò thành viên BTC."}
];
const steps=[
  {number:"01",title:"Chuẩn bị",text:"Tạo Đại hội, phân quyền BTC và nhập danh sách đại biểu."},
  {number:"02",title:"Điều hành",text:"Mở phiên điểm danh, quản lý vị trí ngồi và theo dõi hiện diện."},
  {number:"03",title:"Tổng hợp",text:"Đối chiếu số liệu, xuất báo cáo và lưu tài liệu Đại hội."}
];

export default function Home(){
  return <main className="public-page min-h-dvh overflow-x-hidden">
    <nav aria-label="Điều hướng trang chủ" className="public-nav">
      <div className="public-container flex h-full items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Trang chủ Đại hội số">
          <span className="brand-icon">ĐH</span>
          <span className="text-[17px] font-bold tracking-[-.035em] text-[#1a283c]">Đại hội số</span>
          <span className="ml-2 hidden border-l border-[#dce2e9] pl-4 text-[11px] font-medium text-[#7b8696] md:block">Nền tảng điều hành Đại hội</span>
        </Link>
        <Link href="/login" className="btn btn-secondary group">Đăng nhập
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5"/>
        </Link>
      </div>
    </nav>

    <section className="public-container grid min-h-[665px] items-center gap-12 pb-16 pt-16 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,.98fr)] lg:gap-16 lg:pb-20 lg:pt-20">
      <div className="min-w-0">
        <div className="page-kicker">PHẦN MỀM DÀNH CHO BAN TỔ CHỨC</div>
        <h1 className="public-display mt-6">Mọi công việc<br/>Đại hội.<br/><em>Một nơi điều hành.</em></h1>
        <p className="mt-7 max-w-[540px] text-[15px] leading-[1.85] text-[#637083] sm:text-[16px]">
          Từ chuẩn bị danh sách đại biểu, sắp xếp chỗ ngồi đến điểm danh theo phiên và tổng hợp báo cáo — được tổ chức trong một hệ thống rõ ràng, dễ sử dụng.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/login" className="btn btn-primary min-h-[46px] px-5">Vào hệ thống <ArrowRight size={17}/></Link>
          <a href="#tinh-nang" className="btn btn-secondary min-h-[46px] px-5">Xem chức năng <ArrowUpRight size={16}/></a>
        </div>
        <div className="mt-12 grid max-w-[490px] gap-3 border-t border-[#e0e5ec] pt-5 text-[12px] font-medium text-[#637184] sm:grid-cols-2">
          <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#46699e]"/> Phân quyền từng Đại hội</span>
          <span className="flex items-center gap-2"><LayoutGrid size={16} className="text-[#46699e]"/> Phù hợp desktop & mobile</span>
        </div>
      </div>
      <div className="min-w-0 lg:py-8">
        <div className="product-preview">
          <div className="product-preview-top">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="product-preview-dot"/><span className="product-preview-dot"/><span className="product-preview-dot"/>
            </div>
            <span className="text-[10px] font-semibold tracking-[.04em] text-[#8a95a5]">MINH HỌA GIAO DIỆN</span>
            <span className="text-[#b3bdc9]">•••</span>
          </div>
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.10em] text-[#8390a4]">Bảng điều hành / Phiên làm việc</p>
                <h2 className="mt-2 text-[19px] font-bold tracking-[-.035em] text-[#253248]">Tổng quan điểm danh</h2>
              </div>
              <span className="badge badge-green"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#21855a]"/> Đang mở</span>
            </div>
            <div className="mt-6 grid grid-cols-3 border-y border-[#e8ecf2]">
              {[["200","Đại biểu"],["184","Đã có mặt"],["92%","Tỷ lệ"]].map(([value,label])=>
                <div className="product-preview-cell" key={label}>
                  <p className="product-preview-value">{value}</p>
                  <p className="product-preview-caption">{label}</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-[12px]">
                <span className="font-semibold text-[#40516a]">Tiến độ điểm danh</span>
                <span className="font-bold text-[#2456c9]">92%</span>
              </div>
              <div className="progress-track mt-3"><div className="progress-fill w-[92%]"/></div>
            </div>
            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-bold text-[#354158]">Ghi nhận gần đây</p>
                <span className="text-[10px] text-[#8d97a7]">Phiên chính thức</span>
              </div>
              <div className="overflow-hidden rounded-[9px] border border-[#e9ecf1]">
                {[
                  ["NA","Nguyễn Văn A","Khoa CNTT","QR"],
                  ["TB","Trần Thị B","Khoa Kinh tế","Thủ công"],
                  ["LC","Lê Văn C","Khoa Ngoại ngữ","QR"]
                ].map(([initial,name,unit,method])=>
                  <div key={initial} className="flex items-center gap-3 border-b border-[#edf0f4] px-3 py-3 last:border-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2f8] text-[10px] font-bold text-[#506684]">{initial}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-[#344155]">{name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#9aa4b1]">{unit}</p>
                    </div>
                    <span className="text-[10px] font-medium text-[#758296]">{method}</span>
                    <CheckCircle2 size={16} className="text-[#2a956d]"/>
                  </div>
                )}
              </div>
            </div>
            <p className="mt-4 text-[10px] text-[#9ba4b2]">* Dữ liệu giả lập để giới thiệu bố cục.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="tinh-nang" className="border-y border-[#e5e9ef] bg-white">
      <div className="public-container public-section">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="page-kicker">CÁC MODULE NGHIỆP VỤ</p>
            <h2 className="mt-4 max-w-2xl text-[30px] font-bold leading-tight tracking-[-.05em] text-[#1e2b3f] sm:text-[38px]">
              Một luồng làm việc nhất quán,<br/>từ chuẩn bị đến tổng kết.
            </h2>
          </div>
          <p className="max-w-[300px] text-[13px] leading-7 text-[#748093]">Thiết kế tập trung vào thao tác của BTC, giảm thời gian tìm kiếm thông tin khi Đại hội đang diễn ra.</p>
        </div>
        <div className="mt-10 grid border-t border-[#e6eaf0] md:grid-cols-2">
          {features.map(({number,icon:Icon,title,detail},index)=>
            <div key={number} className={"flex gap-4 border-b border-[#e6eaf0] py-6 sm:gap-5 sm:py-7 "+(index%2===0?"md:pr-9":"md:border-l md:pl-9")}>
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0f4fa] text-[#415d88]"><Icon size={19}/></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><h3 className="text-[15px] font-bold text-[#27364b]">{title}</h3><span className="text-[11px] font-semibold text-[#c3cad4]">{number}</span></div>
                <p className="mt-2 text-[13px] leading-7 text-[#728092]">{detail}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>

    <section className="public-container public-section">
      <div className="section-header">
        <div><p className="page-kicker">QUY TRÌNH VẬN HÀNH</p><h2 className="mt-4 text-[28px] font-bold tracking-[-.045em] text-[#1f2d40] sm:text-[36px]">Đơn giản trong từng giai đoạn.</h2></div>
      </div>
      <div className="mt-9 grid gap-4 md:grid-cols-3">
        {steps.map(step=>
          <article key={step.number} className="rounded-[11px] border border-[#e3e8ef] bg-white p-6 sm:p-7">
            <span className="text-[13px] font-bold text-[#3361b7]">{step.number} / 03</span>
            <h3 className="mt-7 text-[19px] font-bold tracking-[-.035em] text-[#29384b]">{step.title}</h3>
            <p className="mt-3 text-[13px] leading-7 text-[#728094]">{step.text}</p>
          </article>
        )}
      </div>
    </section>

    <section className="public-container pb-16 sm:pb-20">
      <div className="flex flex-col items-start justify-between gap-5 rounded-[12px] bg-[#1e2d46] px-6 py-9 text-white sm:px-10 lg:flex-row lg:items-center lg:py-11">
        <div><p className="text-[10px] font-bold tracking-[.12em] text-[#9fb6e6]">DÀNH CHO BAN TỔ CHỨC</p>
          <h2 className="mt-3 text-[23px] font-bold tracking-[-.04em] sm:text-[29px]">Sẵn sàng cho kỳ Đại hội tiếp theo.</h2>
          <p className="mt-2 max-w-lg text-[13px] leading-7 text-[#c0cad9]">Truy cập bằng tài khoản được phân quyền để bắt đầu công việc điều hành.</p>
        </div>
        <Link href="/login" className="btn shrink-0 border border-white bg-white px-5 text-[#1d2d46] hover:bg-[#edf1f8]">Đăng nhập hệ thống <ArrowRight size={17}/></Link>
      </div>
    </section>

    <footer className="border-t border-[#e7eaf0] bg-white">
      <div className="public-container flex flex-col items-start justify-between gap-2 py-7 text-[11px] text-[#8792a1] sm:flex-row sm:items-center">
        <span className="font-semibold text-[#4f5e72]">Đại hội số</span>
        <span>Không gian quản lý và điều hành Đại hội Đoàn – Hội</span>
      </div>
    </footer>
  </main>;
}
