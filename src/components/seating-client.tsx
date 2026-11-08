"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {
  Armchair,ArrowDown,ArrowLeft,ArrowRight,ArrowUp,Check,CheckCircle2,
  CircleAlert,Copy,Download,FileSpreadsheet,Grid3X3,Layers3,LoaderCircle,
  LockKeyhole,MousePointer2,Move,Plus,RefreshCw,Save,Search,Trash2,UnlockKeyhole,
  Users,ZoomIn,ZoomOut
} from "lucide-react";
import {
  generateSection,parseSeatImport,validateImport,validateSeatDrafts,
  seatGridCellIndex,seatGridPattern,seatGridSizeValid,setSeatGridCells,
  type SeatDraft,type SeatAssignment,type SeatingDelegate,type SeatingLayout,
  type SeatingSession,type ImportEntry,type ImportIssue,type SeatGridPreset,type SeatType,type SeatGridSize
} from "@/lib/seating";
import {SeatGridCanvas} from "@/components/seat-grid-canvas";

type SeatingResponse={
  layouts:SeatingLayout[];layout:SeatingLayout|null;seats:SeatDraft[];
  assignments:SeatAssignment[];delegates:SeatingDelegate[];sessions:SeatingSession[];
  selectedSessionId:string;checkedInDelegateIds:string[];
};
type SeatMove={id:string;startX:number;startY:number;seatX:number;seatY:number;moved:boolean};
type Props={congressId:string;canManage:boolean};
function cleanSearch(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");}
function header(s:string){return cleanSearch(s).trim().replace(/\s+/g," ");}
function bounded(v:number){return Math.max(0,Math.min(4000,Math.round(v)));}
const MAX_FILE_BYTES=2*1024*1024;
async function postSeat(payload:Record<string,unknown>){
  const response=await fetch("/api/seating",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify(payload),cache:"no-store"
  });
  const data=await response.json() as {ok?:boolean;error?:string;version?:number};
  if(!response.ok)throw new Error(data.error||"Không thể lưu dữ liệu.");
  return data;
}
export function SeatingClient({congressId,canManage}:Props){
  const [data,setData]=useState<SeatingResponse|null>(null);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [layoutId,setLayoutId]=useState("");
  const [title,setTitle]=useState("");
  const [stageLabel,setStageLabel]=useState("SÂN KHẤU");
  const [gridRows,setGridRows]=useState(10);
  const [gridColumns,setGridColumns]=useState(20);
  const [seats,setSeats]=useState<SeatDraft[]>([]);
  const [dirty,setDirty]=useState(false);
  const [mode,setMode]=useState<"assign"|"edit">("assign");
  const [designSurface,setDesignSurface]=useState<"grid"|"free">("grid");
  const [selectedSeatId,setSelectedSeatId]=useState("");
  const [delegateQuery,setDelegateQuery]=useState("");
  const [zoom,setZoom]=useState(1);
  const [sessionId,setSessionId]=useState("");
  const [importEntries,setImportEntries]=useState<ImportEntry[]>([]);
  const [importIssues,setImportIssues]=useState<ImportIssue[]>([]);
  const [importMode,setImportMode]=useState<"merge"|"replace">("merge");
  const [section,setSection]=useState({
    zone:"A",startRow:"A",rowCount:8,seatsPerRow:12,startX:105,startY:190,aisleAfter:6
  });
  const drag=useRef<SeatMove|null>(null);
  const draggedClick=useRef("");
  const seatsSnapshot=useRef<SeatDraft[]>([]);
  useEffect(()=>{seatsSnapshot.current=seats;},[seats]);

  const load=useCallback(async(requestedLayoutId?:string,requestedSessionId?:string)=>{
    setLoading(true);setError("");
    try{
      const params=new URLSearchParams({congressId});
      if(requestedLayoutId)params.set("layoutId",requestedLayoutId);
      if(requestedSessionId)params.set("sessionId",requestedSessionId);
      const response=await fetch("/api/seating?"+params.toString(),{cache:"no-store"});
      const next=await response.json() as SeatingResponse & {error?:string};
      if(!response.ok)throw new Error(next.error||"Không tải được sơ đồ.");
      setData(next);setLayoutId(next.layout?.id||"");
      setTitle(next.layout?.title||"");setStageLabel(next.layout?.stage_label||"SÂN KHẤU");
      const nextSize={rows:next.layout?.grid_rows??10,columns:next.layout?.grid_columns??20};
      setGridRows(seatGridSizeValid(nextSize)?nextSize.rows:10);
      setGridColumns(seatGridSizeValid(nextSize)?nextSize.columns:20);
      seatsSnapshot.current=next.seats;setSeats(next.seats);setSessionId(next.selectedSessionId||"");
      setDesignSurface(!next.seats.length||next.seats.some(s=>seatGridCellIndex(s,nextSize)!==null)?"grid":"free");
      setDirty(false);setImportEntries([]);setImportIssues([]);
    }catch(reason){setError(reason instanceof Error?reason.message:"Không thể tải sơ đồ.");}
    finally{setLoading(false);}
  },[congressId]);
  useEffect(()=>{void Promise.resolve().then(()=>load());},[load]);

  const activeAssignments=useMemo(()=>data?.layout?.id===layoutId?data.assignments:[],[data,layoutId]);
  const assignments=useMemo(()=>new Map(activeAssignments.map(a=>[a.seat_id,a.delegate_id])),[activeAssignments]);
  const delegatesById=useMemo(()=>new Map((data?.delegates||[]).map(d=>[d.id,d])),[data?.delegates]);
  const seatsByCode=useMemo(()=>new Map(seats.map(s=>[s.code.toUpperCase(),s])),[seats]);
  const occupiedByDelegate=useMemo(()=>new Map(activeAssignments.map(a=>[a.delegate_id,a.seat_id])),[activeAssignments]);
  const checkedIn=useMemo(()=>new Set(data?.checkedInDelegateIds||[]),[data?.checkedInDelegateIds]);
  const selectedSeat=seats.find(s=>s.id===selectedSeatId)||null;
  const gridSize:SeatGridSize={rows:gridRows,columns:gridColumns};
  const selectedDelegate=selectedSeat?delegatesById.get(assignments.get(selectedSeat.id)||""):null;
  const assignedCount=activeAssignments.length;
  const assignedSeatIds=useMemo(()=>new Set(activeAssignments.map(a=>a.seat_id)),[activeAssignments]);
  const blockedCount=seats.filter(s=>s.blocked).length;
  const boardWidth=Math.max(940,...seats.map(s=>s.x+105));
  const boardHeight=Math.max(500,...seats.map(s=>s.y+95));
  const occupiedPresent=activeAssignments.filter(a=>checkedIn.has(a.delegate_id)).length;
  const filteredDelegates=(data?.delegates||[]).filter(d=>
    d.is_active&&(!selectedSeat||((selectedSeat.seatType==="guest")===(d.delegate_type==="guest")))&&
    cleanSearch(d.code+" "+d.full_name+" "+d.unit).includes(cleanSearch(delegateQuery))
  ).slice(0,60);
  function ensureCanChange(){
    if(!canManage)return false;
    if(dirty&&!window.confirm("Sơ đồ có thay đổi chưa lưu. Bỏ các thay đổi đó?"))return false;
    return true;
  }
  function chooseLayout(id:string){
    if(working||!ensureCanChange())return;
    setSelectedSeatId("");setNotice("");setImportEntries([]);
    void load(id,sessionId);
  }
  function createNew(copy=false){
    if(working||!ensureCanChange())return;
    const fresh=crypto.randomUUID();
    setLayoutId(fresh);
    setTitle(copy?(title||"Sơ đồ hội trường")+" (bản sao)":"Sơ đồ hội trường");
    setStageLabel(copy?stageLabel:"SÂN KHẤU");
    setGridRows(copy?gridRows:10);setGridColumns(copy?gridColumns:20);
    const freshSeats=copy?seats.map(s=>({...s,id:crypto.randomUUID()})):[];
    seatsSnapshot.current=freshSeats;setSeats(freshSeats);
    setDesignSurface(copy?designSurface:"grid");
    setDirty(true);setMode("edit");setSelectedSeatId("");setImportEntries([]);
    setNotice(copy?"Đã sao chép phần bố trí; danh sách phân ghế không được sao chép. Hãy lưu sơ đồ mới.":"Tạo khu vực và các hàng ghế, sau đó nhấn Lưu sơ đồ.");
    setError("");
  }
  function updateSeat(id:string,patch:Partial<SeatDraft>){
    const updated=seatsSnapshot.current.map(s=>s.id===id?{...s,...patch}:s);
    seatsSnapshot.current=updated;setSeats(updated);
    setDirty(true);setImportEntries([]);
  }
  function addSection(){
    try{
      const generated=generateSection(section,seats,()=>crypto.randomUUID());
      generated.forEach(seat=>{seat.seatType="delegate";});
      const updated=[...seatsSnapshot.current,...generated];
      seatsSnapshot.current=updated;setSeats(updated);setDirty(true);setError("");setImportEntries([]);
      setNotice("Đã tạo "+generated.length+" ghế. Nhấn Lưu sơ đồ để ghi vào Supabase.");
      const largestY=Math.max(...generated.map(s=>s.y));
      setSection(previous=>({...previous,zone:String.fromCharCode(Math.min(90,previous.zone.toUpperCase().charCodeAt(0)+1)),
        startX:105,startY:Math.min(3500,largestY+110)}));
    }catch(reason){setError(reason instanceof Error?reason.message:"Không thể tạo khu vực.");}
  }
  function patchGrid(row:number,column:number,present:boolean,seatType:SeatType){
    if(!canManage||working||!layoutId)return;
    const original=seatsSnapshot.current;
    const target=new Set(original.map(seat=>seatGridCellIndex(seat,gridSize)).filter((index):index is number=>index!==null));
    const index=row*gridColumns+column;
    const current=original.find(seat=>seatGridCellIndex(seat,gridSize)===index);
    if(present&&current){
      if(current.seatType===seatType||(current.seatType===undefined&&seatType==="delegate"))return;
      if(assignedSeatIds.has(current.id)){setError("Bỏ phân công người ngồi trước khi đổi loại ghế.");return;}
      updateSeat(current.id,{seatType});setError("");return;
    }
    if(!present&&!current)return;
    if(present)target.add(index);else target.delete(index);
    const result=setSeatGridCells(original,target,assignedSeatIds,()=>crypto.randomUUID(),gridSize,seatType);
    if(result.error){setError(result.error);return;}
    seatsSnapshot.current=result.seats;
    setSeats(result.seats);setDirty(true);setError("");setNotice("");setImportEntries([]);
    if(present)setSelectedSeatId(result.seats.find(seat=>seatGridCellIndex(seat,gridSize)===index)?.id||"");
    if(selectedSeatId&&!result.seats.some(seat=>seat.id===selectedSeatId))setSelectedSeatId("");
  }
  function useGridPreset(preset:SeatGridPreset,seatType:SeatType){
    if(!canManage||working||!layoutId)return;
    const original=seatsSnapshot.current;
    const next=seatGridPattern(preset,gridSize);
    const previous=new Set(original.map(seat=>seatGridCellIndex(seat,gridSize)).filter((index):index is number=>index!==null));
    if(next.size===previous.size&&[...next].every(index=>previous.has(index)))return;
    const removed=[...previous].filter(index=>!next.has(index)).length;
    if(removed&&!window.confirm(
      "Mẫu bố trí sẽ bỏ "+removed+" ghế trên lưới. Ghế đã có đại biểu sẽ được bảo vệ. Tiếp tục?"
    ))return;
    const result=setSeatGridCells(original,next,assignedSeatIds,()=>crypto.randomUUID(),gridSize,seatType);
    if(result.error){setError(result.error);return;}
    seatsSnapshot.current=result.seats;
    setSeats(result.seats);setDirty(true);setError("");
    setSelectedSeatId("");setImportEntries([]);
    setNotice("Đã áp dụng mẫu "+(preset==="full"?"lấp đầy canvas":preset==="center-aisle"?"lối đi giữa":"lưới trống")+
      ". Nhấn Lưu sơ đồ để ghi vào Supabase.");
  }
  function resizeGrid(size:SeatGridSize){
    if(!seatGridSizeValid(size)){setError("Canvas tối đa 500 ô, 25 hàng và 30 cột.");return;}
    if(gridRows===size.rows&&gridColumns===size.columns)return;
    setGridRows(size.rows);setGridColumns(size.columns);setDirty(true);
    setSelectedSeatId("");setError("");setImportEntries([]);
    setNotice("Đã đổi canvas thành "+size.rows+" hàng × "+size.columns+" cột. Ghế ngoài vùng mới được giữ lại.");
  }
  async function saveLayout(){
    const problem=validateSeatDrafts(seats);
    if(problem){setError(problem);return;}
    if(!seats.length){setError("Hãy tạo ít nhất một ghế trước khi lưu.");return;}
    setWorking(true);setError("");setNotice("");
    try{
      await postSeat({action:"save-layout",congressId,layoutId,
        expectedVersion:data?.layout?.id===layoutId?data.layout.version:0,
        title,stageLabel,gridRows,gridColumns,
        seats:seats.map(s=>({...s,seatType:s.seatType||"delegate"}))});
      await load(layoutId,sessionId);
      setNotice("Đã lưu sơ đồ và vị trí ghế thành công.");
    }catch(reason){setError(reason instanceof Error?reason.message:"Không lưu được sơ đồ.");}
    finally{setWorking(false);}
  }
  async function applyAssignments(items:{seatId:string;delegateId:string|null}[],assignMode:"merge"|"replace"="merge"){
    if(dirty||!data?.layout||data.layout.id!==layoutId){
      setError("Hãy lưu sơ đồ trước khi chọn người ngồi.");return;
    }
    setWorking(true);setError("");setNotice("");
    try{
      await postSeat({action:"assign",congressId,layoutId,expectedVersion:data.layout.version,
        mode:assignMode,items});
      await load(layoutId,sessionId);
      setNotice("Đã cập nhật phân công chỗ ngồi.");
    }catch(reason){setError(reason instanceof Error?reason.message:"Không phân công được ghế.");}
    finally{setWorking(false);}
  }
  async function assignOne(personId:string|null){
    if(!selectedSeat||selectedSeat.blocked)return;
    if(personId){
      const person=delegatesById.get(personId);
      if(!person||((selectedSeat.seatType==="guest")!==(person.delegate_type==="guest"))){
        setError("Loại ghế không phù hợp: ghế khách mời chỉ dành cho khách mời.");return;
      }
    }
    const previous=personId?occupiedByDelegate.get(personId):undefined;
    if(previous&&previous!==selectedSeat.id&&!window.confirm("Đại biểu đang có chỗ ngồi khác. Chuyển sang "+selectedSeat.code+"?"))return;
    const occupant=assignments.get(selectedSeat.id);
    if(occupant&&personId&&occupant!==personId&&!window.confirm("Ghế đang có người. Thay thế phân công hiện tại?"))return;
    await applyAssignments([{seatId:selectedSeat.id,delegateId:personId}]);
    setDelegateQuery("");
  }
  function pointerDown(event:React.PointerEvent<HTMLButtonElement>,seat:SeatDraft){
    if(mode!=="edit"||!canManage)return;
    drag.current={id:seat.id,startX:event.clientX,startY:event.clientY,seatX:seat.x,seatY:seat.y,moved:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event:React.PointerEvent<HTMLButtonElement>,id:string){
    const gesture=drag.current;
    if(!gesture||gesture.id!==id||mode!=="edit")return;
    const diffX=(event.clientX-gesture.startX)/zoom;
    const diffY=(event.clientY-gesture.startY)/zoom;
    if(Math.abs(diffX)+Math.abs(diffY)<3&&!gesture.moved)return;
    gesture.moved=true;
    updateSeat(id,{x:bounded(gesture.seatX+diffX),y:bounded(gesture.seatY+diffY)});
  }
  function pointerUp(event:React.PointerEvent<HTMLButtonElement>,id:string){
    if(drag.current?.id===id){
      if(drag.current.moved)draggedClick.current=id;
      drag.current=null;
    }
    if(event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function chooseSeat(id:string){
    if(draggedClick.current===id){draggedClick.current="";return;}
    setSelectedSeatId(id);setDelegateQuery("");setNotice("");
  }
  async function exportExcel(){
    if(!data?.layout||dirty){setError("Hãy lưu sơ đồ trước khi tải mẫu Excel.");return;}
    setWorking(true);setError("");
    try{
      const {default:writeExcelFile}=await import("write-excel-file/browser");
      const assignmentsBySeat=new Map(activeAssignments.map(a=>[a.seat_id,a.delegate_id]));
      const seatRows: (string|number)[][]=[
        ["Mã ghế","Loại ghế","Khu vực","Hàng","Số ghế","Mã đại biểu","Họ tên (tham khảo)","Đơn vị (tham khảo)","ID sơ đồ","Phiên bản"]
      ];
      for(const s of seats){
        const d=delegatesById.get(assignmentsBySeat.get(s.id)||"");
        seatRows.push([s.code,s.seatType==="guest"?"Khách mời":"Đại biểu",s.zone,s.rowLabel,s.seatNumber,d?.code||"",d?.full_name||"",d?.unit||"",layoutId,data.layout.version]);
      }
      const delegateRows:(string|number)[][]=[["Mã đại biểu","Họ và tên","Đơn vị","Trạng thái"]];
      for(const d of data.delegates){
        delegateRows.push([d.code,d.full_name,d.unit,d.is_active?"Hoạt động":"Ngừng hoạt động"]);
      }
      await writeExcelFile([
        {sheet:"Phan ghe",data:seatRows,stickyRowsCount:1},
        {sheet:"Danh sach dai bieu",data:delegateRows,stickyRowsCount:1}
      ]).toFile("so-do-phan-ghe-"+layoutId.slice(0,8)+".xlsx");
      setNotice("Đã tạo file Excel với danh sách ghế và mã đại biểu.");
    }catch(reason){setError(reason instanceof Error?reason.message:"Không xuất được Excel.");}
    finally{setWorking(false);}
  }
  async function readExcel(file:File|undefined){
    if(!file)return;
    setImportEntries([]);setImportIssues([]);setError("");setNotice("");
    if(!data?.layout||dirty){setError("Vui lòng lưu sơ đồ trước khi nhập Excel.");return;}
    if(!file.name.toLowerCase().endsWith(".xlsx")||file.size>MAX_FILE_BYTES){
      setError("Chọn file .xlsx tối đa 2 MB.");return;
    }
    setWorking(true);
    try{
      const {readSheet}=await import("read-excel-file/browser");
      const matrix=(await readSheet(file)).map(row=>row.map(cell=>cell===null?null:String(cell)));
      const heads=matrix[0].map(c=>header(String(c??"")));
      const layoutColumn=heads.indexOf("id so do"),versionColumn=heads.indexOf("phien ban");
      if(layoutColumn<0||versionColumn<0)
        throw new Error("Vui lòng dùng file Excel mẫu tải từ sơ đồ này (cần cột ID sơ đồ và Phiên bản).");
      const firstDataRow=matrix[1]||[];
      const sourceLayout=String(firstDataRow[layoutColumn]||"").trim();
      const sourceVersion=Number(firstDataRow[versionColumn]);
      if(sourceLayout!==layoutId||sourceVersion!==data.layout.version)
        throw new Error("File Excel thuộc sơ đồ khác hoặc phiên bản cũ. Hãy tải lại file mẫu mới nhất.");
      const entries=parseSeatImport(matrix);
      if(!entries.length)throw new Error("Không có hàng nào để nhập.");
      const issues=validateImport(entries,seats,data.delegates);
      setImportEntries(entries);setImportIssues(issues);
      setNotice(issues.length?"Đã đọc Excel, cần sửa "+issues.length+" lỗi trước khi lưu.":"Excel hợp lệ. Kiểm tra chế độ nhập rồi xác nhận lưu.");
    }catch(reason){setError(reason instanceof Error?reason.message:"Không đọc được Excel.");}
    finally{setWorking(false);}
  }
  async function importExcel(){
    if(!importEntries.length||importIssues.length||!data?.layout)return;
    const items=importEntries.map(entry=>({
      seatId:seatsByCode.get(entry.seatCode.toUpperCase())!.id,
      delegateId:entry.delegateCode?data.delegates.find(d=>d.code.toUpperCase()===entry.delegateCode.toUpperCase())!.id:null
    }));
    if(importMode==="replace"&&!window.confirm("THAY THẾ toàn bộ phân công hiện tại của sơ đồ này? Ghế không có trong Excel sẽ bị bỏ phân công."))return;
    await applyAssignments(items,importMode);
  }
  const heading=data?.layout?.id===layoutId?data.layout.title:("Sơ đồ mới (chưa lưu)");
  return <div className="seating-studio space-y-6 pb-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow">Quản lý chỗ ngồi đại biểu</p>
        <h1 className="page-title mt-1">Sơ đồ hội trường</h1>
        <p className="page-description">Thiết kế từng hội trường từ lưới 200 ô vuông; chọn vị trí ghế, chừa lối đi, gán đại biểu hoặc nhập Excel. Mỗi Đại hội lưu nhiều sơ đồ.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" disabled={working||loading} onClick={()=>{if(ensureCanChange())void load(layoutId||undefined,sessionId);}}>
          <RefreshCw size={17}/> Làm mới
        </button>
        {canManage&&<button type="button" className="btn btn-primary" disabled={working||loading} onClick={()=>createNew(false)}>
          <Plus size={18}/> Tạo sơ đồ
        </button>}
      </div>
    </header>

    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
      <CircleAlert size={18} className="mr-2 inline"/>{error}
    </div>}
    {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
      <CheckCircle2 size={18} className="mr-2 inline"/>{notice}
    </div>}
    {loading&&<div role="status" className="card flex min-h-40 items-center justify-center gap-3 text-[#557083]">
      <LoaderCircle className="animate-spin" size={20}/> Đang tải sơ đồ...
    </div>}

    {!loading&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        {label:"Tổng ghế",value:seats.length,icon:Armchair},
        {label:"Đã phân công",value:assignedCount,icon:Users},
        {label:"Ghế trống",value:Math.max(0,seats.length-blockedCount-assignedCount),icon:Grid3X3},
        {label:"Đã điểm danh",value:occupiedPresent,icon:CheckCircle2}
      ].map(({label,value,icon:Icon})=><div className="metric-card" key={label}>
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#62798a]">{label}<Icon size={17} className="text-[#0e8988]"/></div>
        <p className="mt-3 text-3xl font-bold text-[#173047]">{value}</p>
      </div>)}
    </div>}

    {!loading&&<>
      <section className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[190px] flex-1">
            <span className="label">Chọn sơ đồ</span>
            <select className="field" value={data?.layout?.id===layoutId?layoutId:"draft"} onChange={e=>chooseLayout(e.target.value)} disabled={working}>
              {(data?.layouts||[]).map(l=><option key={l.id} value={l.id}>{l.title}</option>)}
              {(!data?.layout||data.layout.id!==layoutId)&&<option value="draft">Sơ đồ mới (chưa lưu)</option>}
              {!data?.layouts.length&&<option value="draft">Chưa có sơ đồ</option>}
            </select>
          </label>
          <label className="min-w-[170px] flex-1">
            <span className="label">Đối chiếu điểm danh phiên</span>
            <select className="field" value={sessionId} onChange={e=>{
              if(dirty&&!window.confirm("Đổi phiên sẽ tải lại sơ đồ và bỏ thay đổi chưa lưu."))return;
              void load(data?.layout?.id||undefined,e.target.value);
            }} disabled={working||!data?.sessions.length}>
              {!data?.sessions.length&&<option value="">Chưa có phiên</option>}
              {data?.sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          {canManage&&<div className="flex flex-wrap gap-2">
            {data?.layout&&<button className="btn btn-secondary" onClick={()=>createNew(true)} disabled={working} type="button"><Copy size={16}/> Sao chép</button>}
            {dirty&&<button className="btn btn-primary" onClick={()=>void saveLayout()} disabled={working} type="button">
              <Save size={17}/> {working?"Đang lưu...":"Lưu sơ đồ"}
            </button>}
          </div>}
        </div>
        {canManage&&(layoutId||data?.layout)&&<div className="grid gap-3 sm:grid-cols-2">
          <label><span className="label">Tên sơ đồ</span>
            <input className="field" maxLength={120} value={title} disabled={working} onChange={e=>{setTitle(e.target.value);setDirty(true);}}/>
          </label>
          <label><span className="label">Tên khu vực sân khấu</span>
            <input className="field" maxLength={120} value={stageLabel} disabled={working} onChange={e=>{setStageLabel(e.target.value);setDirty(true);}}/>
          </label>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-gray"><Layers3 size={13} className="mr-1"/> {heading}</span>
            {dirty&&<span className="badge badge-yellow">Chưa lưu thay đổi</span>}
            {data?.layout&&<span className="badge badge-gray">Phiên bản {data.layout.version}</span>}
          </div>
          {canManage&&<div className="flex gap-2" role="group" aria-label="Chế độ sơ đồ">
            <button type="button" aria-pressed={mode==="assign"} onClick={()=>setMode("assign")} className={"btn "+(mode==="assign"?"btn-primary":"btn-secondary")}><MousePointer2 size={16}/> Phân ghế</button>
            <button type="button" aria-pressed={mode==="edit"} onClick={()=>setMode("edit")} className={"btn "+(mode==="edit"?"btn-primary":"btn-secondary")}><Move size={16}/> Thiết kế</button>
          </div>}
        </div>
        {canManage&&<div className="flex w-full flex-wrap items-center gap-2 border-t border-[#edf1f5] pt-3">
          <span className="mr-1 text-[11px] font-bold text-[#73889b]">Mặt bằng thiết kế</span>
          <div role="group" aria-label="Kiểu canvas thiết kế" className="inline-flex flex-wrap gap-1 rounded-lg bg-[#f1f5f8] p-1">
            <button type="button" aria-pressed={designSurface==="grid"} onClick={()=>setDesignSurface("grid")}
              className={"inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold "+
                (designSurface==="grid"?"bg-white text-[#075d88] shadow-sm":"text-[#6e8496] hover:text-[#1b506a]")}>
              <Grid3X3 size={15}/> Canvas linh hoạt
            </button>
            <button type="button" aria-pressed={designSurface==="free"} onClick={()=>setDesignSurface("free")}
              className={"inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold "+
                (designSurface==="free"?"bg-white text-[#075d88] shadow-sm":"text-[#6e8496] hover:text-[#1b506a]")}>
              <Move size={15}/> Canvas tự do
            </button>
          </div>
          {dirty&&<span className="ml-auto text-[11px] font-semibold text-[#c48a35]">Có thay đổi chưa lưu</span>}
        </div>}
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_345px]">
        <section className="card min-w-0 overflow-hidden" aria-label="Sơ đồ chỗ ngồi">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5eef1] p-4">
            <div><h2 className="text-base font-semibold">Vị trí trong hội trường</h2>
              <p className="helper">{mode==="edit"&&canManage?(designSurface==="grid"?"Chọn ô vuông để đặt hoặc xóa ghế; giữ chuột để vẽ nhiều ô.":"Kéo ghế để thay đổi vị trí; nhấn ghế để chỉnh sửa thông tin."):"Chọn ghế để xem hoặc phân công đại biểu."}</p>
            </div>
            {designSurface!=="grid"&&<div className="flex gap-1">
              <button type="button" className="btn btn-secondary !px-3" onClick={()=>setZoom(z=>Math.max(.6,+(z-.1).toFixed(2)))} aria-label="Thu nhỏ" disabled={zoom<=.6}><ZoomOut size={17}/></button>
              <span className="flex min-w-12 items-center justify-center text-sm font-semibold">{Math.round(zoom*100)}%</span>
              <button type="button" className="btn btn-secondary !px-3" onClick={()=>setZoom(z=>Math.min(1.5,+(z+.1).toFixed(2)))} aria-label="Phóng to" disabled={zoom>=1.5}><ZoomIn size={17}/></button>
            </div>}
          </div>
          {designSurface==="grid"
            ?<SeatGridCanvas key={layoutId} seats={seats} assignedSeatIds={assignedSeatIds}
                stageLabel={stageLabel} selectedSeatId={selectedSeatId}
                rows={gridRows} columns={gridColumns} onResize={resizeGrid}
                editable={canManage&&mode==="edit"&&!working&&!!layoutId}
                onPaint={patchGrid} onSelect={chooseSeat} onPreset={useGridPreset}/>
            :<>
          <div className="overflow-x-auto overflow-y-auto bg-[#f4f8fb] p-3 sm:p-4" style={{maxHeight:"690px"}} tabIndex={0} aria-label="Cuộn để xem các khu vực ghế">
            <div className="seat-map-board relative overflow-hidden rounded-xl border border-[#d9e5ec] bg-white shadow-sm" style={{width:boardWidth*zoom,height:boardHeight*zoom}}>
              <div className="seat-map-stage absolute left-[18%] top-[22px] w-[64%] rounded-b-[8px] border border-[#3b5576] bg-[#105879] px-3 py-4 text-center font-semibold tracking-[.14em] text-white"
                   style={{fontSize:Math.max(11,15*zoom),top:22*zoom}}>
                {stageLabel||"SÂN KHẤU"}
              </div>
              <div className="absolute left-0 top-0 p-3 text-xs font-bold text-[#8a9daf]">SƠ ĐỒ 2D</div>
              {seats.map(s=>{
                const personId=assignments.get(s.id);
                const isPresent=!!personId&&checkedIn.has(personId);
                const isSelected=selectedSeatId===s.id;
                return <button
                  key={s.id} type="button" title={s.code+" — "+(s.blocked?"Khóa":personId?delegatesById.get(personId)?.full_name||"Đã phân":"Trống")}
                  aria-label={"Ghế "+s.code+", "+(s.blocked?"đã khóa":personId?("đã gán "+(delegatesById.get(personId)?.full_name||"đại biểu")):"chưa gán")}
                  aria-pressed={isSelected} onClick={()=>chooseSeat(s.id)}
                  onPointerDown={e=>pointerDown(e,s)} onPointerMove={e=>pointerMove(e,s.id)}
                  onPointerUp={e=>pointerUp(e,s.id)} onPointerCancel={e=>pointerUp(e,s.id)}
                  className={"seat-map-button absolute flex items-center justify-center rounded-[6px] border-2 font-semibold transition-colors "+
                    (isSelected?"z-10 !border-[#d9911c] !bg-[#fff0c4] !text-[#784913] ring-[3px] ring-[#f3c76a] ":
                    s.blocked?"border-[#ced7df] bg-[#e9eef2] text-[#8b9dad] ":
                    isPresent?"border-[#66cfa7] bg-[#dff8ec] text-[#126543] ":
                    personId?"border-[#74b4d9] bg-[#e0f0fc] text-[#155d89] ":
                     s.seatType==="guest"?"border-[#ad91d6] bg-[#eee6fb] text-[#744fa2] ":
                    "border-[#cad8e1] bg-white text-[#527087] hover:border-[#0e8c8c] hover:bg-[#e6f7f3] ")+
                    (mode==="edit"&&canManage?"cursor-grab active:cursor-grabbing touch-none":"")}
                  style={{left:s.x*zoom,top:s.y*zoom,width:47*zoom,height:42*zoom,fontSize:Math.max(9,11*zoom)}}>
                  {s.blocked?<LockKeyhole size={15*zoom}/>:s.code.split("-").slice(-1)[0]}
                </button>;
              })}
              {!seats.length&&<div className="absolute inset-x-0 top-[44%] px-6 text-center text-sm font-semibold text-[#728b9f]">
                Chưa có ghế nào. Chuyển sang Thiết kế để tạo khu vực đầu tiên.
              </div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#e5eef1] p-4 text-xs font-semibold text-[#567086]">
            {[
              {text:"Chưa phân",style:"bg-white border-[#cad8e1]"},
              {text:"Đã phân",style:"bg-[#e0f0fc] border-[#74b4d9]"},
               {text:"Ghế khách mời",style:"bg-[#eee6fb] border-[#ad91d6]"},
              {text:"Đã điểm danh",style:"bg-[#dff8ec] border-[#66cfa7]"},
              {text:"Đã khóa",style:"bg-[#e9eef2] border-[#ced7df]"}
            ].map(l=><span key={l.text} className="inline-flex items-center gap-2">
              <span className={"h-4 w-4 rounded border "+l.style}/>{l.text}
            </span>)}
          </div>
          </>}
        </section>

        <aside className="min-w-0 space-y-4">
          {canManage&&mode==="edit"&&designSurface==="grid"&&
            <section className="rounded-xl border border-[#cfe6f2] bg-[#f0f8fc] p-4">
              <p className="text-[13px] font-bold text-[#175878]">Bố trí theo từng hội trường</p>
              <p className="mt-2 text-[12px] leading-6 text-[#57778e]">
                Chọn ô trống để tạo ghế hoặc bỏ ô để chừa lối đi. Chuyển sang công cụ
                <strong> Chi tiết ghế</strong> rồi nhấn ghế để chỉnh sửa mã, khóa ghế.
                Dùng <strong>Canvas tự do</strong> nếu cần kéo ghế tới vị trí khác.
              </p>
            </section>}
          {canManage&&mode==="edit"&&designSurface==="free"&&<section className="card space-y-3 p-4 sm:p-5">
            <div className="flex items-center gap-2"><Grid3X3 size={20} className="text-[#007eb8]"/><h2 className="text-base font-semibold">Tạo khu vực ghế</h2></div>
            <p className="helper">Nhập số hàng và ghế; hệ thống tự sinh mã. Có thể thêm nhiều khu vực cho một sơ đồ.</p>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="label">Mã khu</span><input className="field" value={section.zone} maxLength={12} onChange={e=>setSection(v=>({...v,zone:e.target.value}))}/></label>
              <label><span className="label">Hàng đầu</span><input className="field" value={section.startRow} maxLength={2} onChange={e=>setSection(v=>({...v,startRow:e.target.value}))}/></label>
              <label><span className="label">Số hàng</span><input className="field" type="number" min={1} max={25} value={section.rowCount} onChange={e=>setSection(v=>({...v,rowCount:Number(e.target.value)}))}/></label>
              <label><span className="label">Ghế / hàng</span><input className="field" type="number" min={1} max={30} value={section.seatsPerRow} onChange={e=>setSection(v=>({...v,seatsPerRow:Number(e.target.value)}))}/></label>
              <label><span className="label">Chừa lối sau ghế</span><input className="field" type="number" min={0} max={29} value={section.aisleAfter} onChange={e=>setSection(v=>({...v,aisleAfter:Number(e.target.value)}))}/></label>
              <label><span className="label">Cách mép trái (px)</span><input className="field" type="number" min={30} max={3500} value={section.startX} onChange={e=>setSection(v=>({...v,startX:Number(e.target.value)}))}/></label>
              <label className="col-span-2"><span className="label">Cách sân khấu (px)</span><input className="field" type="number" min={120} max={3500} value={section.startY} onChange={e=>setSection(v=>({...v,startY:Number(e.target.value)}))}/></label>
            </div>
            <button type="button" className="btn btn-primary w-full" disabled={working} onClick={addSection}><Plus size={17}/> Sinh hàng ghế</button>
          </section>}

          <section className="card p-4 sm:p-5">
            <div className="flex items-center gap-2"><Armchair size={20} className="text-[#007eb8]"/><h2 className="text-base font-semibold">Thông tin ghế</h2></div>
            {!selectedSeat?<p className="helper mt-3">Chọn một ghế trên sơ đồ để xem thông tin và chỉnh sửa phân công.</p>:<>
              <div className="mt-4 rounded-xl border border-[#dcebf1] bg-[#f4f9fb] p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-xl font-bold">{selectedSeat.code}</p><span className={"badge "+(selectedSeat.blocked?"badge-gray":selectedDelegate?"badge-green":"badge-yellow")}>
                  {selectedSeat.blocked?"Khóa":selectedDelegate?"Đã phân":"Ghế trống"}
                </span></div>
                <p className="helper mt-1">{selectedSeat.zone} · Hàng {selectedSeat.rowLabel} · Vị trí {selectedSeat.seatNumber} · {selectedSeat.seatType==="guest"?"Ghế khách mời":"Ghế đại biểu"}</p>
                {selectedDelegate&&<div className="mt-3 border-t border-[#e0eaef] pt-3 text-sm font-semibold">
                  {selectedDelegate.full_name}<p className="helper">{selectedDelegate.code} · {selectedDelegate.unit}</p>
                  {checkedIn.has(selectedDelegate.id)&&<span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check size={15}/> Đã điểm danh phiên chọn</span>}
                </div>}
              </div>
              {canManage&&mode==="edit"&&<div className="mt-4 space-y-3">
                <label><span className="label">Loại ghế</span>
                   <select className="field" value={selectedSeat.seatType||"delegate"} disabled={!!selectedDelegate}
                     onChange={e=>updateSeat(selectedSeat.id,{seatType:e.target.value as SeatType})}>
                     <option value="delegate">Ghế đại biểu</option><option value="guest">Ghế khách mời</option>
                   </select>
                 </label>
                 <label><span className="label">Mã ghế</span>
                  <input className="field" maxLength={36} value={selectedSeat.code} onChange={e=>updateSeat(selectedSeat.id,{code:e.target.value.toUpperCase().trim()})}/>
                </label>
                <label><span className="label">Khu vực</span>
                  <input className="field" maxLength={40} value={selectedSeat.zone} onChange={e=>updateSeat(selectedSeat.id,{zone:e.target.value})}/>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="label">Hàng</span><input className="field" maxLength={12} value={selectedSeat.rowLabel} onChange={e=>updateSeat(selectedSeat.id,{rowLabel:e.target.value})}/></label>
                  <label><span className="label">Số ghế</span><input className="field" type="number" min={1} max={10000} value={selectedSeat.seatNumber} onChange={e=>updateSeat(selectedSeat.id,{seatNumber:Number(e.target.value)})}/></label>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="helper">Di chuyển tinh chỉnh</span>
                  <div className="flex gap-1">
                    {[
                      {icon:ArrowLeft,dx:-5,dy:0,label:"Trái"},
                      {icon:ArrowUp,dx:0,dy:-5,label:"Lên"},
                      {icon:ArrowDown,dx:0,dy:5,label:"Xuống"},
                      {icon:ArrowRight,dx:5,dy:0,label:"Phải"}
                    ].map(({icon:Icon,dx,dy,label})=><button key={label} aria-label={"Dịch "+label}
                      type="button" className="btn btn-secondary !px-2.5" onClick={()=>updateSeat(selectedSeat.id,{x:bounded(selectedSeat.x+dx),y:bounded(selectedSeat.y+dy)})}>
                      <Icon size={16}/></button>)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-secondary flex-1" type="button"
                    disabled={!!selectedDelegate} onClick={()=>updateSeat(selectedSeat.id,{blocked:!selectedSeat.blocked})}>
                    {selectedSeat.blocked?<UnlockKeyhole size={16}/>:<LockKeyhole size={16}/>}
                    {selectedSeat.blocked?"Mở khóa ghế":"Khóa ghế"}
                  </button>
                  <button type="button" className="btn btn-danger" disabled={!!selectedDelegate} onClick={()=>{
                    if(!window.confirm("Xóa ghế "+selectedSeat.code+"?"))return;
                    const remaining=seatsSnapshot.current.filter(s=>s.id!==selectedSeat.id);
                     seatsSnapshot.current=remaining;setSeats(remaining);setSelectedSeatId("");setDirty(true);
                  }}><Trash2 size={17}/> Xóa</button>
                </div>
                {selectedDelegate&&<p className="helper">Muốn khóa hoặc xóa ghế, hãy bỏ phân công đại biểu trước.</p>}
              </div>}{canManage&&!selectedSeat.blocked&&<div className="mt-4 border-t border-[#e2ebf1] pt-4">
                {!data?.layout||dirty?<p className="helper">Hãy lưu sơ đồ trước khi chọn người ngồi.</p>:<>
                  <label><span className="label">Chọn {selectedSeat.seatType==="guest"?"khách mời":"đại biểu"} ngồi tại ghế</span>
                    <div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-[#8297a6]"/>
                      <input className="field pl-10" placeholder="Tên, mã hoặc đơn vị..." value={delegateQuery}
                        onChange={e=>setDelegateQuery(e.target.value)}/></div>
                  </label>
                  <div className="mt-3 max-h-52 space-y-1 overflow-auto rounded-xl border border-[#e0ecf1] p-1">
                    {!filteredDelegates.length&&<div className="p-3">
                      <p className="helper">Không tìm thấy người phù hợp với loại ghế.</p>
                      <Link href={"/congresses/"+congressId+"/delegates"}
                        className="mt-2 inline-flex text-xs font-bold text-[#0876aa] hover:underline">
                        Mở danh sách đại biểu để bổ sung hồ sơ
                      </Link>
                    </div>}
                    {filteredDelegates.map(d=><button key={d.id} type="button" disabled={working} onClick={()=>void assignOne(d.id)}
                      className={"flex w-full items-start justify-between gap-2 rounded-lg p-2.5 text-left text-sm hover:bg-[#eaf6f4] "+(selectedDelegate?.id===d.id?"bg-[#e2f6f1]":"")}>
                      <span className="min-w-0"><strong className="block truncate">{d.full_name}</strong><span className="block truncate text-xs text-[#6d8797]">{d.code} · {d.unit}</span></span>
                      {occupiedByDelegate.has(d.id)&&<span className="shrink-0 rounded bg-[#e7f0f6] px-2 py-1 text-[10px] font-bold text-[#2c6d88]">Đã có ghế</span>}
                    </button>)}
                  </div>
                  {selectedDelegate&&<button type="button" className="btn btn-danger mt-3 w-full" disabled={working} onClick={()=>void assignOne(null)}>
                    <Trash2 size={16}/> Bỏ phân công ghế này
                  </button>}
                </>}
              </div>}{selectedSeat.blocked&&<p className="helper mt-3">Ghế đã khóa, không thể phân công.</p>}
            </>}
          </section>
        </aside>
      </div>

      <section className="card space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><FileSpreadsheet size={21} className="text-[#128778]"/><h2 className="section-title">Phân ghế bằng Excel</h2></div>
            <p className="helper mt-2">Tải mẫu theo sơ đồ hiện tại, điền <strong>Mã đại biểu</strong>, rồi nhập lại. Hệ thống kiểm tra toàn bộ trước khi ghi.</p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={()=>void exportExcel()} disabled={working||dirty||!data?.layout}>
            <Download size={17}/> Tải Excel mẫu
          </button>
        </div>
        {canManage?<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_210px]">
          <div>
            <label className="label" htmlFor="seat-import-file">Tải Excel phân ghế (.xlsx)</label>
            <input id="seat-import-file" className="field file:mr-3 file:rounded-md file:border-0 file:bg-[#e6f5f2] file:px-2 file:py-1 file:text-[#176c6c]"
              type="file" accept=".xlsx" disabled={working||!data?.layout||dirty} onChange={e=>{
                const file=e.target.files?.[0];e.target.value="";void readExcel(file);
              }}/>
            <p className="helper mt-1">Tối đa 2 MB; chỉ hỗ trợ file xuất từ sơ đồ đang chọn.</p>
          </div>
          <label><span className="label">Cách nhập</span>
            <select className="field" value={importMode} onChange={e=>setImportMode(e.target.value as "merge"|"replace")}>
              <option value="merge">Gộp / di chuyển ghế</option>
              <option value="replace">Thay thế toàn bộ</option>
            </select>
          </label>
        </div>:<p className="helper">Chỉ quản trị viên Đại hội được nhập và thay đổi phân ghế.</p>}
        {!!importEntries.length&&<div className="space-y-3 rounded-xl border border-[#d9e9ef] bg-[#f8fbfc] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold">Đã đọc {importEntries.length} dòng</p>
              <p className="helper">{importIssues.length?importIssues.length+" lỗi cần sửa":"Không phát hiện lỗi mã ghế, mã đại biểu hoặc trùng phân công."}</p>
            </div>
            <button className="btn btn-primary" type="button" disabled={working||!!importIssues.length||!canManage}
              onClick={()=>void importExcel()}><Check size={17}/> Xác nhận nhập Excel</button>
          </div>
          {!!importIssues.length&&<ul className="max-h-44 space-y-1 overflow-auto text-sm text-red-700" role="alert">
            {importIssues.slice(0,40).map((item,i)=><li key={i}>Dòng {item.line}: {item.message}</li>)}
          </ul>}
          {!importIssues.length&&<div className="table-wrap"><table className="data">
            <thead><tr><th>Mã ghế</th><th>Mã đại biểu</th></tr></thead>
            <tbody>{importEntries.slice(0,8).map((r,i)=><tr key={i}><td>{r.seatCode}</td><td>{r.delegateCode||"Bỏ phân"}</td></tr>)}</tbody>
          </table></div>}
        </div>}
      </section>

      <section className="card p-4 sm:p-6">
        <h2 className="section-title">Danh sách phân công</h2>
        <p className="helper mt-1">Đối chiếu nhanh khi chuẩn bị sơ đồ và đón đại biểu.</p>
        {!activeAssignments.length?<p className="helper mt-4">Chưa phân công đại biểu vào ghế nào.</p>:
        <div className="table-wrap mt-4"><table className="data"><thead><tr><th>Ghế</th><th>Loại ghế</th><th>Người ngồi</th><th>Đơn vị</th><th>Điểm danh</th></tr></thead>
          <tbody>{activeAssignments.map(a=>{
            const s=seats.find(s=>s.id===a.seat_id);const d=delegatesById.get(a.delegate_id);
            return <tr key={a.seat_id}><td className="font-semibold">{s?.code||"—"}</td>
               <td>{s?.seatType==="guest"?"Khách mời":"Đại biểu"}</td>
              <td>{d?.full_name||"—"} <span className="text-[#7a91a0]">({d?.code})</span></td>
              <td>{d?.unit||"—"}</td>
              <td><span className={"badge "+(checkedIn.has(a.delegate_id)?"badge-green":"badge-gray")}>
                {checkedIn.has(a.delegate_id)?"Đã điểm danh":"Chưa điểm danh"}</span></td>
            </tr>;
          })}</tbody></table></div>}
      </section>
    </>}
  </div>;
}
