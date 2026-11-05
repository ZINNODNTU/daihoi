import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
export async function POST(request:Request) {
 try {
  const {supabase,user}=await getAuth();
  if(!user) return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const body=await request.json();
  const congressId=String(body.congressId||"");
  if(!(await hasRole(supabase,user.id,congressId,"admin"))) return NextResponse.json({error:"Không có quyền quản lý đại biểu."},{status:403});
  const entries:Record<string,unknown>[]=Array.isArray(body.delegates)?body.delegates:[body];
  if(!entries.length||entries.length>250) return NextResponse.json({error:"Mỗi lần nhập tối đa 250 đại biểu."},{status:400});
  const rows=entries.map((item:Record<string,unknown>)=>({
    congress_id:congressId,
    code:String(item.code||"").trim().slice(0,40),
    full_name:String(item.full_name||"").trim().slice(0,160),
    unit:String(item.unit||"").trim().slice(0,200),
    delegate_type:["official","alternate","guest"].includes(String(item.delegate_type))?item.delegate_type:"official",
  }));
  if(rows.some(r=>!r.code||!r.full_name)) return NextResponse.json({error:"Mỗi đại biểu phải có mã và họ tên."},{status:400});
  if(new Set(rows.map(r=>r.code.toLowerCase())).size!==rows.length) return NextResponse.json({error:"Có mã đại biểu trùng trong danh sách."},{status:400});
  const {data,error}=await supabase.from("delegates").insert(rows).select("id,code,full_name");
  if(error) return NextResponse.json({error:error.code==="23505"?"Mã đại biểu đã tồn tại.": "Không lưu được danh sách đại biểu."},{status:error.code==="23505"?409:500});
  return NextResponse.json({ok:true,count:data?.length??0});
 } catch {return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:400});}
}
