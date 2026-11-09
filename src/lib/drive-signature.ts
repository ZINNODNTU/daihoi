/**
 * Apps Script signs JavaScript strings differently for some non-ASCII input.
 * Sign a stable ASCII-only JSON representation while retaining the original
 * Unicode filename and metadata after JSON.parse on the Apps Script side.
 *
 * A JSON \uXXXX escape is equivalent to the original UTF-16 code unit.
 * Escaping both surrogate halves also preserves supplementary characters.
 */
export function serializeSignedPayload(value:unknown):string{
 const json=JSON.stringify(value);
 if(typeof json!=="string")throw new Error("Không thể mã hóa yêu cầu Google Drive.");
 return json.replace(/[\u007f-\uffff]/g,char=>
  "\\u"+char.charCodeAt(0).toString(16).padStart(4,"0"));
}
