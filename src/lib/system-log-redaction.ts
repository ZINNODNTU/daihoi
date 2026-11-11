/** Pure, testable redaction for technical telemetry.
 * Do not call it on request bodies: only whitelisted diagnostic strings.
 */
export function redactLogText(value:unknown,limit=160):string{
 if(typeof value!=="string")return "";
 return value
  .replace(/https?:\/\/[^\s]+/gi,"[URL]")
  .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi,"[EMAIL]")
  .replace(/\b(?:Bearer\s+)[A-Za-z0-9._~+/-]+/gi,"[TOKEN]")
  .replace(/\b(?:sb_secret_|sb_publishable_)[A-Za-z0-9_-]+/gi,"[KEY]")
  .replace(/\b(?:eyJ)[A-Za-z0-9._~-]{24,}/g,"[TOKEN]")
  .replace(/(?:password|token|secret|api[_-]?key|cookie)\s*[:=]\s*[^,\s;]+/gi,"[REDACTED]")
  .replace(/[\x00-\x1f\x7f]/g," ")
  .slice(0,limit);
}
