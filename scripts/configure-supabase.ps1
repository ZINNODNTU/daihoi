# Chạy ở thư mục dự án: npm run setup:supabase
# Giá trị chỉ nhập trên máy local; KHÔNG dán Secret Key vào chat hoặc commit lên Git.
$ErrorActionPreference="Stop"
$expectedUrl="https://pnxdxdagpeyqarucdphk.supabase.co"
$file=Join-Path (Get-Location) ".env.local"
$enc=New-Object System.Text.UTF8Encoding($false)

Write-Host "CẤU HÌNH SUPABASE CHO DỰ ÁN ĐẠI HỘI SỐ" -ForegroundColor Cyan
Write-Host "Chỉ dùng project: pnxdxdagpeyqarucdphk"
Write-Host "Supabase Dashboard > Project Settings > API Keys"
$pub=(Read-Host "Publishable Key (sb_publishable_...) hoặc legacy anon key").Trim()
if($pub -notmatch '^(sb_publishable_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9._-]{30,})$') {
 throw "Publishable/anon key không đúng định dạng. Không thay đổi file."
}
$secure=Read-Host "Secret Key (sb_secret_...) hoặc legacy service_role (nhập ẩn)" -AsSecureString
$ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try{$secret=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)}
finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
if($secret -notmatch '^(sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9._-]{30,})$') {
 throw "Secret/service_role key không đúng định dạng. Không thay đổi file."
}
$lines=if(Test-Path $file){[System.Collections.Generic.List[string]]@(Get-Content -LiteralPath $file -Encoding UTF8)}else{[System.Collections.Generic.List[string]]::new()}
$vars=[ordered]@{
 "NEXT_PUBLIC_SUPABASE_URL"=$expectedUrl;
 "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"=$pub;
 "SUPABASE_SECRET_KEY"=$secret
}
foreach($name in $vars.Keys) {
 $line="$name=$($vars[$name])"
 $found=$false
 for($i=0;$i -lt $lines.Count;$i++){
  if($lines[$i] -match ('^'+[regex]::Escape($name)+'=')){$lines[$i]=$line;$found=$true;break}
 }
 if(-not $found){$lines.Add($line)}
}
[System.IO.File]::WriteAllLines($file,$lines,$enc)
$secret=$null
Write-Host "[OK] Đã cập nhật .env.local trên máy (không in khóa)." -ForegroundColor Green
Write-Host "Hãy dừng/khởi chạy lại npm run dev và chạy npm run check:supabase để kiểm tra."
