// QR trên màn chiếu chứa đường dẫn phiên, tuyệt đối không chứa mã đại biểu.
export type ParsedSessionCode={sessionId:string;token:string};
const SESSION=/^\/checkin\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;
const TOKEN=/^(?:se2\.[A-Za-z0-9_-]{22}|se1\.[0-9a-z]{5,8}\.[A-Za-z0-9_-]{22})$/;
export function parseSessionCheckinCode(value:string):ParsedSessionCode|null{
 const text=value.trim();
 if(!text||text.length>2048)return null;
 if(!/^https?:\/\//i.test(text)&&!text.startsWith("/checkin/s/"))return null;
 try{
  const url=new URL(text,"https://internal.invalid");
  if(!["http:","https:"].includes(url.protocol)||url.username||url.password)return null;
  const session=SESSION.exec(url.pathname);
  const token=url.searchParams.get("t");
  if(!session||!token||!TOKEN.test(token))return null;
  return {sessionId:session[1].toLowerCase(),token};
 }catch{return null;}
}
