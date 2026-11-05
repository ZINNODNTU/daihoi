export type Congress={
 id:string;organization_id:string;slug:string;name:string;kind:"doan"|"hoi_sinh_vien";
 term:string;venue:string;status:"preparing"|"live"|"completed";starts_at:string|null;ends_at:string|null;
};
export type Delegate={
 id:string;congress_id:string;code:string;full_name:string;unit:string;
 delegate_type:"official"|"alternate"|"guest";qr_version:number;barcode_code:string;is_active:boolean;
};
export type AttendanceSession={
 id:string;congress_id:string;name:string;status:"open"|"closed";
 starts_at:string|null;ends_at:string|null;qr_policy:"fixed"|"session"|"both";
};
export type Checkin={
 id:string;congress_id:string;session_id:string;delegate_id:string;
 method:"qr"|"manual"|"barcode";qr_scope:"fixed"|"session"|null;checked_in_by:string;checked_in_at:string;note:string|null;
};
export type DocRow={id:string;congress_id:string;file_name:string;mime_type:string;byte_size:number;drive_file_id:string;created_at:string};
