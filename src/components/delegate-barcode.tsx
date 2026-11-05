"use client";
import {useEffect,useRef} from "react";
import JsBarcode from "jsbarcode";
/**
 * CODE 128 để quét tra cứu đại biểu khi QR không đọc được.
 * Barcode không tự chứng minh danh tính hoặc quyền điểm danh.
 */
export function DelegateBarcode({value,width=1.7,height=52}:{value:string;width?:number;height?:number}){
 const ref=useRef<SVGSVGElement>(null);
 useEffect(()=>{
  if(!ref.current||!value)return;
  JsBarcode(ref.current,value,{
   format:"CODE128",lineColor:"#10263d",background:"#ffffff",
   width,height,margin:5,fontSize:12,textMargin:5,displayValue:true
  });
 },[value,width,height]);
 return <div className="max-w-full overflow-x-auto flex justify-center"><svg ref={ref} role="img" aria-label={"Mã vạch dự phòng "+value} /></div>;
}
