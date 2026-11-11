import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const React=require("react");
const {renderToStaticMarkup}=require("react-dom/server");
const source=readFileSync(new URL("../src/components/delegate-bch-carousel.tsx",import.meta.url),"utf8");
const page=readFileSync(new URL("../src/app/my-card/bch/page.tsx",import.meta.url),"utf8");
const id=(value)=>value.toString().padStart(12,"0");
const candidate=(num,name,congress="a")=>({
 id:"abcdabcd-aaaa-4aaa-aaaa-"+id(num),congress_id:congress,congressName:"Đại hội mẫu",
 full_name:name,birth_year:2001,hometown:"Đồng Nai",ethnicity:"Kinh",
 education_level:"Đại học",union_join_year:2019,current_position:"Bí thư Đoàn khoa",
 photo_path:null,display_order:num,created_at:"2026-01-01",updated_at:"2026-01-01"
});
function render(items){
 const js=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true
 }}).outputText;
 const mockButton=(p)=>React.createElement("button",{type:"button"},p.children);
 const swipes={
  Root:(p)=>React.createElement("div",{},p.children),
  Cards:()=>null,CardWrapper:(p)=>React.createElement("div",{},p.children),
  SwipeLeftButton:mockButton,SwipeRightButton:mockButton,
  useSwipeableCardsStack:()=>[],
  useSwipeableCardsContext:()=>({dragStateRef:{current:{}}})
 };
 const icon=()=>React.createElement("span");
 const icons=new Proxy({}, {get:()=>icon});
 const mod={exports:{}};
 new Function("require","module","exports",js)((name)=>{
  if(name==="react/jsx-runtime")return require("react/jsx-runtime");
  if(name==="react")return React;
  if(name==="next/image")return {default:(p)=>React.createElement("img",{
   src:p.src,alt:p.alt,loading:p.loading,width:p.width,height:p.height
  })};
  if(name==="lucide-react")return icons;
  if(name==="@daformat/react-swipeable-cards")return {SwipeableCards:swipes};
  throw new Error("Unexpected import "+name);
 },mod,mod.exports);
 return renderToStaticMarkup(React.createElement(mod.exports.DelegateBchCarousel,{items,initialCongressId:"a"}));
}

test("Desktop BCH grid renders every matching candidate, preserving order and full details",()=>{
 const html=render([candidate(1,"Phan Lê Duy"),candidate(2,"Nguyễn Thị Thu Hằng"),candidate(3,"Nguyễn Thành Nhân")]);
 assert.match(html,/hidden lg:block/);
 assert.match(html,/grid-cols-1 items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-3/);
 assert.match(html,/Toàn bộ 3 ứng viên BCH/);
 assert.equal((html.match(/aria-label="Hồ sơ /g)||[]).length,3);
 assert.equal((html.match(/Năm vào Đoàn/g)||[]).length,3);
 const positions=["Phan Lê Duy","Nguyễn Thị Thu Hằng","Nguyễn Thành Nhân"].map(name=>html.indexOf('aria-label="Hồ sơ '+name+'"'));
 assert.ok(positions.every(n=>n>=0));
 assert.ok(positions[0]<positions[1]&&positions[1]<positions[2]);
 assert.match(html,/HỒ SƠ 01/);
 assert.match(html,/HỒ SƠ 03/);
 assert.match(html,/Đồng Nai/);
});

test("Desktop grid uses lazily loaded photos; mobile swipe remains a separate region",()=>{
 assert.match(source,/lg:hidden"><BchCandidateSlides/);
 assert.match(source,/hidden lg:block"><BchCandidateGrid/);
 assert.match(source,/items.map\(\(candidate,index\)=>/);
 assert.match(source,/CandidateProfile candidate=\{candidate\} foreground=\{false\}/);
 assert.match(source,/foreground\?"eager":"lazy"/);
 assert.match(source,/SwipeableCards\.Root/);
 assert.match(source,/visibleStackLength=\{2\}/);
 assert.match(page,/\.order\("display_order"\)/);
 assert.match(page,/\.eq\("congress_id",congressId\)/);
});
