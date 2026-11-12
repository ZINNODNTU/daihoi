import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import type {ReportCheckin} from "@/lib/attendance-report";
export const dynamic="force-dynamic";
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function GET(request:Request){
 const {supabase,user}=await getAuth();
 if(!user)return NextResponse.json({error:"Chưa đăng nhập."},{status:401});
 const params=new URL(request.url).searchParams;
 const congressId=params.get("congressId")||"";
 const sessionId=params.get("sessionId")||"";
 if(!isUuid(congressId)||!isUuid(sessionId))
   return NextResponse.json({error:"Mã Đại hội hoặc phiên điểm danh không hợp lệ."},{status:400});
 if(!(await hasCongressAbility(supabase,user.id,congressId,"reports.read")))
   return NextResponse.json({error:"Bạn không có quyền xem báo cáo của Đại hội này."},{status:403});
 const {data:session,error:sessionError}=await supabase.from("attendance_sessions")
   .select("id,congress_id,name,status").eq("id",sessionId).eq("congress_id",congressId).maybeSingle();
 if(sessionError)return NextResponse.json({error:"Không tải được phiên điểm danh."},{status:500});
 if(!session)return NextResponse.json({error:"Phiên điểm danh không tồn tại trong Đại hội."},{status:404});
 // Supabase REST mặc định thường có giới hạn 1000 hàng/truy vấn.
 // Phân trang để báo cáo không bị cắt nếu tổ chức nhiều đại biểu.
 const rows:ReportCheckin[]=[];
 let page=0;
 while(page<20){
   const {data,error}=await supabase.from("checkins")
     .select("id,delegate_id,checked_in_at,checked_in_by,method,note")
     .eq("congress_id",congressId).eq("session_id",sessionId)
     .order("checked_in_at",{ascending:true})
     .range(page*500,(page+1)*500-1);
   if(error)return NextResponse.json({error:"Không tải được dữ liệu check-in."},{status:500});
   rows.push(...((data||[]) as ReportCheckin[]));
   if((data?.length||0)<500)break;
   page++;
 }
 if(rows.length>=10000)return NextResponse.json({error:"Dữ liệu vượt phạm vi báo cáo. Liên hệ quản trị hệ thống."},{status:413});
 return NextResponse.json({session,checkins:rows},{headers:{"Cache-Control":"private, no-store"}});
}