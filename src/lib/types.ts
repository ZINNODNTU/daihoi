export type Congress={
 id:string;organization_id:string;slug:string;name:string;kind:"doan"|"hoi_sinh_vien";
 term:string;venue:string;status:"preparing"|"live"|"completed";starts_at:string|null;ends_at:string|null;
};
export type Delegate={
 id:string;congress_id:string;code:string;full_name:string;unit:string;student_id:string|null;position:string;login_email:string|null;auth_user_id:string|null;photo_path?:string|null;
 delegate_type:"official"|"alternate"|"guest";gender:"male"|"female"|"other"|null;birth_date:string|null;qr_version:number;barcode_code:string;is_active:boolean;
};
export type AttendanceSession={
 id:string;congress_id:string;name:string;status:"open"|"closed";
 starts_at:string|null;ends_at:string|null;qr_policy:"fixed"|"session"|"both";seating_layout_id:string|null;
};
export type Checkin={
 id:string;congress_id:string;session_id:string;delegate_id:string;
 method:"qr"|"manual"|"barcode";qr_scope:"fixed"|"session"|null;checked_in_by:string;checked_in_at:string;note:string|null;
};
export type DocRow={id:string;congress_id:string;file_name:string;mime_type:string;byte_size:number;drive_file_id:string;created_at:string;delegate_visible?:boolean};
