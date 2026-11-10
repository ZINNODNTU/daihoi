"use client";



export type TrackingBox={x:number;y:number;width:number;height:number};
export type ScanningControl={stop():void};

/** A single camera ownership boundary for delegate and BTC scanners.
 * Prefer native BarcodeDetector on supported phones; fall back to ZXing.
 * Every asynchronous start is cancelable, including permission prompts.
 */
export async function startTrackedScanner(options:{
 video:HTMLVideoElement;deviceId?:string;allowBarcode?:boolean;
 onResult:(value:string)=>void;onTrack?:(box:TrackingBox|null)=>void;
}):Promise<ScanningControl>{
 const {video,deviceId,allowBarcode=false,onResult,onTrack}=options;
 let stopped=false;
 let stream:MediaStream|null=null;
 let controls:ScanningControl|null=null;
 let timer:ReturnType<typeof setTimeout>|null=null;
 let fallbackTimer:ReturnType<typeof setTimeout>|null=null;
 let scanning=false;
 let lastValue="",lastTime=0;
 const deliver=(value:string,box:TrackingBox|null)=>{
  if(stopped||!value)return;
  onTrack?.(box);
  // Hardware detectors can report the same code on every video frame.
  if(value===lastValue&&Date.now()-lastTime<900)return;
  lastValue=value;lastTime=Date.now();
  onResult(value);
 };
 const stopStream=()=>{
  if(timer)clearTimeout(timer);
  if(fallbackTimer)clearTimeout(fallbackTimer);
  timer=null;fallbackTimer=null;
  stream?.getTracks().forEach(t=>t.stop());stream=null;
  if(video.srcObject)video.srcObject=null;
 };
 const stop=()=>{stopped=true;controls?.stop();controls=null;stopStream();onTrack?.(null);};
 const fallback=async()=>{
  if(stopped)return;
  stopStream();
  // Load the software decoder only when native hardware detection is unavailable.
  const [{BrowserMultiFormatReader,BrowserQRCodeReader},{BarcodeFormat,DecodeHintType}]=await Promise.all([
   import("@zxing/browser"),import("@zxing/library")
  ]);
  if(stopped)return;
  const hints=new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS,allowBarcode?
   [BarcodeFormat.QR_CODE,BarcodeFormat.CODE_128]:[BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER,true);
  const settings={delayBetweenScanAttempts:90,delayBetweenScanSuccess:220};
  const reader=allowBarcode?
   new BrowserMultiFormatReader(hints,settings):new BrowserQRCodeReader(hints,settings);
  const onDecode=(result:{getText():string;getResultPoints?():{getX():number;getY():number}[]}|undefined|null)=>{
   if(!result||stopped)return;
   const points=result.getResultPoints?.()||[];
   if(points.length){
    const xs=points.map(p=>p.getX()),ys=points.map(p=>p.getY());
    const x=Math.min(...xs),y=Math.min(...ys);
    const width=Math.max(...xs)-x,height=Math.max(...ys)-y;
    deliver(result.getText(),{x:x/(video.videoWidth||1),y:y/(video.videoHeight||1),
     width:Math.max(.08,width/(video.videoWidth||1)),height:Math.max(.08,height/(video.videoHeight||1))});
   }else deliver(result.getText(),null);
  };
  const constraints:MediaStreamConstraints={
   audio:false,video:deviceId?{deviceId:{exact:deviceId},width:{ideal:1280},height:{ideal:720}}:
    {facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}
  };
  const created=await reader.decodeFromConstraints(constraints,video,onDecode);
  if(stopped)created.stop();
  else {
   controls=created;
   void improveFocus(video);
  }
 };
 const NativeDetector=(globalThis as typeof globalThis & {BarcodeDetector?:{
  new(config:{formats:string[]}):{detect(input:HTMLVideoElement):Promise<Array<{
   rawValue:string;boundingBox:{x:number;y:number;width:number;height:number}
  }>>};
  getSupportedFormats?:()=>Promise<string[]>;
 }}).BarcodeDetector;
 if(!NativeDetector){await fallback();return {stop};}
 try{
  const supported=await NativeDetector.getSupportedFormats?.();
  if(stopped)return {stop};
  if(supported&&!supported.includes("qr_code")){await fallback();return {stop};}
  const formats=allowBarcode&&supported?.includes("code_128")?["qr_code","code_128"]:["qr_code"];
  const detector=new NativeDetector({formats});
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:deviceId?
   {deviceId:{exact:deviceId},width:{ideal:1280},height:{ideal:720}}:
   {facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}}});
  if(stopped){stopStream();return {stop};}
  video.srcObject=stream;await video.play();
  void improveFocus(video);
  // If hardware detection struggles, switch to ZXing without user interaction.
  fallbackTimer=setTimeout(()=>{if(!lastValue&&!stopped)void fallback().catch(()=>{});},4800);
  const tick=async()=>{
   if(stopped||!stream)return;
   if(!scanning&&video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA){
    scanning=true;
    try{
     const results=await detector.detect(video);
     if(results.length){
      const item=results[0],box=item.boundingBox;
      deliver(item.rawValue,{x:box.x/(video.videoWidth||1),y:box.y/(video.videoHeight||1),
       width:box.width/(video.videoWidth||1),height:box.height/(video.videoHeight||1)});
      if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=null;}
     }
    }catch{if(!stopped)void fallback().catch(()=>{});return;}
    finally{scanning=false;}
   }
   if(!stopped&&stream)timer=setTimeout(()=>void tick(),100);
  };
  void tick();
 }catch{
  stopStream();
  if(!stopped)await fallback();
 }
 return {stop};
}

/** Convert decoder-space coordinates into the visible CSS object-cover frame. */
export function trackedBoxStyle(box:TrackingBox,video:HTMLVideoElement|null){
 const width=video?.clientWidth||0,height=video?.clientHeight||0;
 const sourceWidth=video?.videoWidth||0,sourceHeight=video?.videoHeight||0;
 const percent=(value:number,total:number)=>Math.min(100,Math.max(0,value/total*100));
 if(!video||!width||!height||!sourceWidth||!sourceHeight)
  return {left:(box.x*100)+"%",top:(box.y*100)+"%",width:(box.width*100)+"%",height:(box.height*100)+"%"};
 const fit=getComputedStyle(video).objectFit;
 const scale=fit==="contain"?Math.min(width/sourceWidth,height/sourceHeight):
  Math.max(width/sourceWidth,height/sourceHeight);
 const offsetX=(width-sourceWidth*scale)/2,offsetY=(height-sourceHeight*scale)/2;
 const x=percent(offsetX+box.x*sourceWidth*scale,width);
 const y=percent(offsetY+box.y*sourceHeight*scale,height);
 return {
  left:x+"%",top:y+"%",
  width:Math.max(0,Math.min(100-x,box.width*sourceWidth*scale/width*100))+"%",
  height:Math.max(0,Math.min(100-y,box.height*sourceHeight*scale/height*100))+"%"
 };
}

async function improveFocus(video:HTMLVideoElement){
 try{
  const track=(video.srcObject as MediaStream|null)?.getVideoTracks()[0];
  if(!track)return;
  const capabilities=track.getCapabilities?.() as MediaTrackCapabilities & {focusMode?:string[]};
  if(capabilities?.focusMode?.includes("continuous"))
   await track.applyConstraints({advanced:[{focusMode:"continuous"} as MediaTrackConstraintSet]});
 }catch{/* Optional hardware setting: camera scanning works without it. */}
}
