/**
 * Next.js official instrumentation hook. Captures uncaught server/render
 * exceptions not covered by explicit route handlers. Never serializes raw
 * request URLs, headers, errors, stacks, payloads, or user credentials.
 * The Next.js onRequestError hook is available since Next 15.
 */
export async function onRequestError(
 error:Error,
 request:{path:string;method:string},
 context:{routePath:string;routeType:string}
){
 if(process.env.NEXT_RUNTIME==="edge"){
  console.error(JSON.stringify({type:"unhandled_next_error",runtime:"edge"}));
  return;
 }
 try{
  const {writeSystemLog}=await import("@/lib/system-log");
  const name=/^[A-Za-z]{1,40}$/.test(error.name)?error.name:"Error";
  const route=/^\/[a-zA-Z0-9_./[\]-]{0,160}$/.test(context.routePath)
   ?context.routePath:"/unknown";
  const method=/^(GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)$/.test(request.method)
   ?request.method:"UNKNOWN";
  await writeSystemLog({
   level:"error",source:"api",
   event:context.routeType==="route"?"api.unhandled_exception":"api.render_exception",
   message:"Next.js phát hiện lỗi server chưa được xử lý.",
   statusCode:500,
   context:{operation:"next.onRequestError",errorName:name,endpoint:route,httpMethod:method}
  });
 }catch{
  console.error(JSON.stringify({type:"unhandled_next_error",telemetry:"unavailable"}));
 }
}
