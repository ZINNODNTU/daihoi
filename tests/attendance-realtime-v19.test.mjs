import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");

test("Realtime events have deduped FIFO display and incremental fallback",()=>{
 const hook=file("../src/components/use-attendance-live.ts");
 const api=file("../src/app/api/attendance/live/route.ts");
 const screen=file("../src/components/session-qr-screen.tsx");
 const migration=file("../supabase/upgrade-attendance-realtime-v19.sql");
 assert.match(hook,/postgres_changes/);
 assert.match(hook,/event:"INSERT"/);
 assert.match(hook,/const queue:LiveCheckin\[\]=\[\]/);
 assert.match(hook,/seen\.add\(row\.id\)/);
 assert.match(hook,/WELCOME_MS=6200/);
 assert.match(api,/q\.get\("mode"\)==="updates"/);
 assert.match(api,/\.gte\("checked_in_at"/);
 assert.match(api,/await hasRole\(supabase,user\.id,congressId,"checkin"\)/);
 assert.match(screen,/ProjectionArrivalQueue data=\{liveData\} waiting=\{waiting\}/);
 assert.match(migration,/ALTER PUBLICATION supabase_realtime ADD TABLE public\.checkins/);
});
test("Delegate document listing does not load seats or checkin history",()=>{
 const docs=file("../src/app/my-card/documents/page.tsx");
 assert.doesNotMatch(docs,/getMyDelegateData|loadDelegatePortal/);
 assert.match(docs,/getPortalCongressContext/);
 assert.match(docs,/\.eq\("congress_id",congressId\)/);
 assert.match(file("../src/components/delegate-documents-list.tsx"),/\/api\/documents\//);
});
test("Photos use private uploaded thumbnails and QR decoder is lazy",()=>{
 const photos=file("../src/app/api/delegates/[id]/photo/route.ts");
 const staff=file("../src/components/attendance-client.tsx");
 const delegate=file("../src/components/delegate-checkin-scanner.tsx");
 assert.match(photos,/\[96,160\]\.map/);
 assert.match(photos,/storage\.download\(sizePath\)/);
 assert.match(photos,/await authorize\(id,"viewer"\)/);
 assert.match(staff,/await import\("@zxing\/browser"\)/);
 assert.match(delegate,/await import\("@zxing\/browser"\)/);
});
