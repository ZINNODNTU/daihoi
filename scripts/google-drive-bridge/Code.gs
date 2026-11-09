/**
 * Đại hội số — cầu nối Google Drive qua Apps Script.
 *
 * Script Properties (Project Settings -> Script properties):
 *   ROOT_FOLDER_ID = ID thư mục Google Drive "DAI_HOI_SO"
 *   BRIDGE_SECRET  = cùng khóa GOOGLE_APPS_SCRIPT_SECRET trên Vercel (>= 32 ký tự)
 *
 * Deploy -> New deployment -> Web app:
 *   Execute as: Me
 *   Who has access: Anyone (nếu Workspace cho phép)
 *
 * Web app chỉ nhận POST đã ký HMAC, không xuất tệp hoặc khóa bí mật.
 * Phía Next.js luôn xác thực tài khoản BTC trước khi gọi Script.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("missing_request");
    var message = JSON.parse(e.postData.contents);
    var data = verifyRequest_(message);
    var result = dispatch_(data);
    return respond_(Object.assign({ok: true}, result));
  } catch (err) {
    var code = err && err.message ? String(err.message).slice(0, 120) : "unexpected_error";
    // Never send secrets, stacks or full Google exception details to callers.
    if (/^(missing_request|invalid_signature|request_expired|replay_detected|invalid_action|invalid_congress|invalid_file|unauthorized_file|missing_config|invalid_payload|file_too_large|sharing_blocked|root_not_found|lock_busy)$/.test(code))
      return respond_({ok:false, code:code, error:friendlyError_(code)});
    console.error("Bridge error category:", /permission|access|sharing/i.test(code)?"permissions":"drive-operation");
    return respond_({ok:false, code:"drive_error", error:"Google Drive không thực hiện được yêu cầu. Kiểm tra quyền thư mục hoặc cài đặt chia sẻ."});
  }
}
function doGet() {
  return respond_({ok:false,code:"method_not_allowed",error:"Chỉ chấp nhận yêu cầu xác thực từ website Đại hội số."});
}
function respond_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function friendlyError_(code) {
  var messages = {
    missing_request:"Thiếu nội dung yêu cầu.",invalid_signature:"Chữ ký không hợp lệ.",
    request_expired:"Yêu cầu đã hết hạn.",replay_detected:"Yêu cầu đã được sử dụng.",
    invalid_action:"Thao tác không được hỗ trợ.",invalid_congress:"Mã Đại hội không hợp lệ.",
    invalid_file:"Mã file không hợp lệ.",unauthorized_file:"Tệp không thuộc thư mục của Đại hội.",
    missing_config:"Chưa thiết lập Script Properties.",invalid_payload:"Dữ liệu tải lên không hợp lệ.",
    file_too_large:"Tệp vượt quá giới hạn 4 MB.",sharing_blocked:"Tài khoản Google không cho phép chia sẻ bằng liên kết.",
    root_not_found:"Không truy cập được thư mục Drive gốc.",lock_busy:"Hệ thống đang xử lý yêu cầu khác."
  };
  return messages[code] || "Lỗi Google Drive.";
}
function verifyRequest_(message) {
  var settings = PropertiesService.getScriptProperties();
  var secret = settings.getProperty("BRIDGE_SECRET");
  if (!secret || secret.length < 32 || !settings.getProperty("ROOT_FOLDER_ID"))throw new Error("missing_config");
  if (!message || !Number.isFinite(message.time) ||
      Math.abs(Date.now()-message.time) > 5*60*1000)throw new Error("request_expired");
  if (typeof message.nonce !== "string" || !/^[a-z0-9-]{36}$/.test(message.nonce) ||
      typeof message.payload !== "string" || message.payload.length > 6500000 ||
      typeof message.signature !== "string")throw new Error("invalid_signature");
  var signed = String(message.time)+"."+message.nonce+"."+message.payload;
  var expected = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(signed,secret)).replace(/=+$/,"");
  if (message.signature.length !== expected.length)throw new Error("invalid_signature");
  var mismatch = 0;
  for (var i=0;i<expected.length;i++)
    mismatch |= expected.charCodeAt(i)^message.signature.charCodeAt(i);
  if (mismatch)throw new Error("invalid_signature");

  // Stop replayed signed requests. Lock makes check-and-set atomic.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000))throw new Error("lock_busy");
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get("nonce_"+message.nonce))throw new Error("replay_detected");
    cache.put("nonce_"+message.nonce,"1",300);
  } finally {lock.releaseLock();}
  var data=JSON.parse(message.payload);
  if (!data || typeof data.congressId!=="string" ||
      !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(data.congressId))throw new Error("invalid_congress");
  return data;
}
function rootFolder_() {
  try {
    return DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ROOT_FOLDER_ID"));
  } catch (e) {throw new Error("root_not_found");}
}
function congressFolder_(congressId,createIfMissing) {
  var root=rootFolder_();
  var folders=root.getFoldersByName("DAI_HOI_"+congressId);
  if (folders.hasNext())return folders.next();
  if (!createIfMissing)throw new Error("unauthorized_file");
  return root.createFolder("DAI_HOI_"+congressId);
}
function ownFile_(congressId,fileId) {
  if (typeof fileId!=="string"||!/^[A-Za-z0-9_-]{12,200}$/.test(fileId))
    throw new Error("invalid_file");
  var folder=congressFolder_(congressId,false);
  var file;
  try{file=DriveApp.getFileById(fileId);}catch(e){throw new Error("invalid_file");}
  var parents=file.getParents();
  while (parents.hasNext())if (parents.next().getId()===folder.getId())return file;
  throw new Error("unauthorized_file");
}
function dispatch_(data) {
  switch(data.action){
    case "status": {
      var root=rootFolder_();
      return {rootName:root.getName()};
    }
    case "upload": {
      if (typeof data.name!=="string" || !data.name.trim() || data.name.length>180 ||
          typeof data.mimeType!=="string" || !/^[-\w.+]+\/[-\w.+]+$/.test(data.mimeType) ||
          typeof data.base64!=="string" || data.base64.length>5600000)
        throw new Error("invalid_payload");
      var bytes=Utilities.base64Decode(data.base64);
      if (bytes.length===0||bytes.length>4*1024*1024)throw new Error("file_too_large");
      var folder=congressFolder_(data.congressId,true);
      var blob=Utilities.newBlob(bytes,data.mimeType,data.name);
      var newFile=folder.createFile(blob);
      return {id:newFile.getId(),name:newFile.getName(),url:newFile.getUrl()};
    }
    case "sharing": {
      var file=ownFile_(data.congressId,data.fileId);
      if(typeof data.visible!=="boolean")throw new Error("invalid_payload");
      try{
        file.setSharing(data.visible?DriveApp.Access.ANYONE_WITH_LINK:DriveApp.Access.PRIVATE,
          DriveApp.Permission.VIEW);
      }catch(e){throw new Error("sharing_blocked");}
      return {id:file.getId(),visible:data.visible};
    }
    case "delete": {
      ownFile_(data.congressId,data.fileId).setTrashed(true);
      return {deleted:true};
    }
    default:throw new Error("invalid_action");
  }
}
