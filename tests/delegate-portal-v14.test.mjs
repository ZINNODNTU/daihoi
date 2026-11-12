  import {test} from "node:test";
  import assert from "node:assert/strict";
  import {readFileSync} from "node:fs";
  const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");

  test("Quản lý đại biểu tách thành hai tab và chỉ admin được quản trị tài khoản",()=>{
   const tabs=read("../src/components/delegate-admin-tabs.tsx");
   assert.match(tabs,/Quản lý đại biểu/);
   assert.match(tabs,/Quản lý tài khoản đại biểu/);
   assert.match(tabs,/canManage/);
   const profile=read("../src/app/congresses/[id]/delegates/page.tsx");
   assert.match(profile,/DelegateAdminTabs/);
   const accounts=read("../src/app/congresses/[id]/delegates/accounts/page.tsx");
   assert.match(accounts,/hasRole\(supabase,user\.id,id,"admin"\)/);
   assert.match(accounts,/if\(!\(await hasRole/);
   const delegateUI=read("../src/components/delegates-client.tsx");
   assert.doesNotMatch(delegateUI,/provisionAccounts\(/);
  });

  test("Mật khẩu chỉ đặt lại sau khi xác minh quyền và tài khoản được liên kết đúng Đại hội",()=>{
   const api=read("../src/app/api/delegates/accounts/reset/route.ts");
   assert.match(api,/hasRole\(supabase,user\.id,congressId,"admin"\)/);
   assert.match(api,/\.eq\("congress_id",congressId\)/);
   assert.match(api,/\.eq\("id",delegateId\)/);
   assert.match(api,/auth\.admin\.updateUserById\(delegate\.auth_user_id,\{password\}\)/);
   assert.match(api,/profile\.data\?\.platform_role==="super_admin"/);
   assert.match(api,/\.in\("role",\["admin","checkin","secretary"\]\)/);
   assert.ok(api.includes('import {DEFAULT_DELEGATE_PASSWORD} from "@/lib/delegate-password-policy"'));
   assert.match(read("../src/lib/delegate-password-policy.ts"),/DEFAULT_DELEGATE_PASSWORD="Abc@123456"/);
   assert.match(api,/const password=DEFAULT_DELEGATE_PASSWORD/);
   assert.doesNotMatch(api,/randomBytes|body\?\.password.*updateUserById/);
   assert.match(api,/delegate\.password_reset/);
   assert.match(api,/Cache-Control":"private, no-store"/);
   assert.doesNotMatch(api,/console\.log\(password\)/);
  });

  test("Xuất Excel danh sách tài khoản không trả mật khẩu cũ; mật khẩu mới chỉ cung cấp một lần",()=>{
   const ui=read("../src/components/delegate-accounts-client.tsx");
   assert.match(ui,/write-excel-file\/browser/);
   assert.match(ui,/\.xlsx/);
   assert.match(ui,/Đã cấp/);
   assert.match(ui,/Mật khẩu vừa cấp\/reset/);
   assert.match(ui,/known\.get\(d\.id\)\|\|""/);
   assert.match(ui,/\[i\+1,d\.full_name,d\.student_id/);
   assert.doesNotMatch(ui,/localStorage|sessionStorage/);
   assert.match(ui,/setIssued\(\[\]\)/);
  });

  test("Đại biểu chỉ xem tài liệu do BTC công bố; chức năng chia sẻ cần admin",()=>{
   const migration=read("../supabase/upgrade-delegate-resources-v14.sql");
   assert.match(migration,/delegate_visible boolean NOT NULL DEFAULT false/);
   const page=read("../src/app/my-card/documents/page.tsx");
   assert.match(page,/getPortalCongressContext/);
   assert.match(page,/\.eq\("congress_id",congressId\)/);
   assert.match(page,/\.eq\("delegate_visible",true\)/);
   const download=read("../src/app/api/documents/[id]/route.ts");
   assert.match(download,/if\(!doc\.delegate_visible\)/);
   assert.match(download,/\.eq\("auth_user_id",user\.id\)/);
   assert.match(download,/\.eq\("is_active",true\)/);
   const toggle=read("../src/app/api/documents/visibility/route.ts");
   assert.match(toggle,/hasRole\(supabase,user\.id,congressId,"admin"\)/);
   assert.match(toggle,/\.eq\("id",documentId\)\.eq\("congress_id",congressId\)/);
   const ui=read("../src/components/documents-client.tsx");
   assert.match(ui,/Công bố tài liệu cho đại biểu/);
  });

  test("Nhân sự BCH hiển thị thẻ dọc có ảnh và vuốt ngang, không tiết lộ đại biểu khác",()=>{
   const page=read("../src/app/my-card/bch/page.tsx");
   assert.match(page,/getPortalCongressContext/);
   assert.match(page,/\.eq\("congress_id",congressId\)/);
   const ui=read("../src/components/delegate-bch-carousel.tsx");
   assert.match(ui,/@daformat\/react-swipeable-cards/);
  assert.match(ui,/SwipeableCards\.Root/);
  assert.match(ui,/SwipeableCards\.Cards/);
  assert.match(ui,/SwipeableCards\.CardWrapper/);
  assert.match(ui,/swipeDirections=/);
  assert.match(ui,/AdvanceWhenSwipeFinishes/);
  assert.match(ui,/SwipeableCards\.SwipeLeftButton/);
  assert.match(ui,/SwipeableCards\.SwipeRightButton/);
  assert.match(ui,/aria-label="Thẻ nhân sự trước"/);
  assert.match(ui,/aria-label="Thẻ nhân sự tiếp theo"/);
  assert.match(ui,/Trước/);
   assert.match(ui,/Tiếp/);
   assert.match(ui,/birth_year/);
   assert.match(ui,/hometown/);
   assert.match(ui,/ethnicity/);
   assert.match(ui,/education_level/);
   assert.match(ui,/union_join_year/);
   assert.match(ui,/current_position/);
   const photo=read("../src/app/api/bch-candidates/[id]/photo/route.ts");
   assert.match(photo,/\.eq\("auth_user_id",user\.id\)/);
   assert.match(photo,/\["delegate","guest"\]\.includes/);
 assert.match(photo,/hasCongressAbility\(supabase,user\.id,candidate\.congress_id,"bch.read"\)/);
  });

  test("Thẻ ID thiết kế premium, cổng đại biểu và trang chính dùng chung palette",()=>{
   const badge=read("../src/components/my-delegate-cards.tsx");
   assert.match(badge,/premium-delegate-id/);
   assert.match(badge,/premium-id-hologram/);
   assert.match(badge,/premium-id-watermark/);
   assert.doesNotMatch(badge,/QRCodeSVG|Thẻ đại biểu số/);
   assert.match(badge,/DelegateBarcode/);
   const shell=read("../src/components/delegate-shell.tsx");
   assert.match(shell,/delegate-portal/);
   for(const p of ["/my-card/documents","/my-card/bch","/my-card/history"])
    assert.ok(shell.includes(p));
   const css=read("../src/app/globals.css");
   assert.match(css,/--daihoi-navy:#17263f/);
   assert.match(css,/--daihoi-blue:#007fae/);
   assert.match(css,/premium-delegate-id::after/);
  });