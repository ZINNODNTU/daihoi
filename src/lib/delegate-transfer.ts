import type {Delegate} from "@/lib/types";

export const DELEGATE_IMPORT_COLUMNS=[
 "MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò","Giới tính","Ngày sinh"
] as const;
export const DELEGATE_IMPORT_BATCH_SIZE=250;
type ExportableDelegate=Pick<Delegate,
 "id"|"student_id"|"full_name"|"unit"|"position"|"delegate_type"|"gender"|"birth_date">;

const roleLabel:Record<Delegate["delegate_type"],string>={
 official:"Chính thức",alternate:"Dự khuyết",guest:"Khách mời"
};
const genderLabel:Record<NonNullable<Delegate["gender"]>,string>={
 male:"Nam",female:"Nữ",other:"Khác"
};

/** Export exactly the importer template, with no auth IDs/passwords/QR tokens,
 * seat allocations, Storage paths or account metadata. All cells are text to
 * preserve leading zeroes in student IDs and Vietnamese names.
 */
export function delegateImportRow(delegate:ExportableDelegate):string[]{
 const birth=delegate.birth_date||"";
 const yyyyMmDd=/^(\d{4})-(\d{2})-(\d{2})$/.exec(birth);
 return [
  delegate.student_id||"",delegate.full_name,delegate.unit||"",
  delegate.position||"",roleLabel[delegate.delegate_type],
  delegate.gender?genderLabel[delegate.gender]:"",
  yyyyMmDd?yyyyMmDd[3]+"/"+yyyyMmDd[2]+"/"+yyyyMmDd[1]:birth
 ];
}
export function splitDelegateImportBatches<T extends ExportableDelegate>(
 delegates:readonly T[]
):T[][]{
 const batches:T[][]=[];
 for(let i=0;i<delegates.length;i+=DELEGATE_IMPORT_BATCH_SIZE){
  batches.push(delegates.slice(i,i+DELEGATE_IMPORT_BATCH_SIZE));
 }
 return batches;
}
export function selectDelegateTransfer<T extends ExportableDelegate>(
 delegates:readonly T[],selectedIds:ReadonlySet<string>|null
):T[]{
 const chosen=selectedIds?delegates.filter(item=>selectedIds.has(item.id)):[...delegates];
 return chosen;
}
