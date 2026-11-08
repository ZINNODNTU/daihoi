/**
 * Địa chỉ @dntu.edu.vn dùng làm định danh hiển thị; không đòi quyền sở hữu hộp thư.
 * Account được cấp nội bộ dùng miền .invalid dành riêng cho phần mềm để tránh
 * đặt lại mật khẩu qua hộp thư thực mà người sử dụng không sở hữu.
 */
const LOGIN_DOMAIN="@dntu.edu.vn";
const INTERNAL_DOMAIN="@accounts.daihoi.invalid";

export function toSupabaseAuthEmail(loginEmail:string){
 const address=loginEmail.trim().toLowerCase();
 if(!address.endsWith(LOGIN_DOMAIN))return address;
 const name=address.slice(0,-LOGIN_DOMAIN.length);
 if(!/^[a-z0-9][a-z0-9._-]{3,31}$/.test(name))return address;
 return name+INTERNAL_DOMAIN;
}
