 import {test} from "node:test";
 import assert from "node:assert/strict";
 import {readFileSync} from "node:fs";
 const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");

 test("Thẻ đại biểu mobile ưu tiên điểm danh, ghế, tài liệu, BCH và lịch sử theo Đại hội đang chọn",()=>{
  const ui=read("../src/components/my-delegate-cards.tsx");
  assert.match(ui,/aria-label="Thao tác nhanh đại biểu"/);
  assert.match(ui,/const selectedCongressId=currentDelegate\?\.congressId/);
  assert.match(ui,/selectedQuery="\?congressId="/);
  for(const href of ["/my-card/checkin","/my-card/seats","/my-card/documents","/my-card/bch","/my-card/history"])
   assert.ok(ui.includes(href),href);
  assert.match(ui,/lg:hidden print:hidden/);
  assert.match(ui,/leading-\[1\.3\] tracking-\[-\.018em\]/);
 });
 test("Tài liệu được lọc nhanh theo Đại hội và tìm không dấu, mở đúng API đã phân quyền",()=>{
  const page=read("../src/app/my-card/documents/page.tsx");
  const ui=read("../src/components/delegate-documents-list.tsx");
  assert.match(page,/\.eq\("delegate_visible",true\)/);
  assert.match(page,/getPortalCongressContext/);
  assert.match(page,/\.eq\("congress_id",congressId\)/);
  assert.match(ui,/value\.normalize\("NFD"\)/);
  assert.match(ui,/doc\.congress_id===congressId/);
  assert.match(ui,/\/api\/documents\//);
  assert.match(ui,/target="_blank"/);
  assert.match(ui,/visible\.slice\(0,limit\)/);
  assert.match(ui,/Xóa bộ lọc/);
 });
 test("Ứng viên BCH lọc theo tên, chức vụ và Đại hội; không tạo 500 nút chỉ mục trên mobile",()=>{
  const ui=read("../src/components/delegate-bch-carousel.tsx");
  const page=read("../src/app/my-card/bch/page.tsx");
  assert.match(ui,/aria-label="Lọc danh sách nhân sự"/);
  assert.match(ui,/item\.congress_id===congressId/);
  assert.match(ui,/item\.full_name\+" "\+item\.current_position/);
  assert.match(ui,/items\.length>8/);
  assert.match(ui,/Chuyển nhanh đến nhân sự/);
  assert.match(page,/getPortalCongressContext/);
  assert.match(page,/\.eq\("congress_id",congressId\)/);
 });
 test("Lịch sử điểm danh có bộ lọc theo Đại hội và tải thêm từng phần",()=>{
  const ui=read("../src/components/delegate-history-list.tsx");
  const page=read("../src/app/my-card/history/page.tsx");
  assert.match(ui,/item\.congressId===congressId/);
  assert.match(ui,/visible\.slice\(0,limit\)/);
  assert.match(ui,/setLimit\(n=>n\+20\)/);
  assert.match(page,/loadDelegateHistory\(user\.id\)/);
 });
 test("Trang đổi ảnh, điểm danh và sơ đồ ghế giữ thao tác chính rõ trên điện thoại",()=>{
  const profile=read("../src/components/delegate-profile-editor.tsx");
  const scanner=read("../src/components/delegate-checkin-scanner.tsx");
  const seating=read("../src/components/delegate-seat-hall.tsx");
  assert.match(profile,/h-\[144px\] w-\[108px\]/);
  assert.match(profile,/!min-h-12 w-full justify-center/);
  assert.match(scanner,/<details className="mb-4/);
  assert.match(scanner,/Tùy chọn camera/);
  assert.match(scanner,/Xem lịch sử điểm danh/);
  assert.match(seating,/h-\[min\(55dvh,530px\)\]/);
  assert.match(seating,/<span>Tìm ghế<\/span>/);
 });