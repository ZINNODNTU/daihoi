#Requires -RunAsAdministrator
# Chi mo cong Next.js 3000 cho cac thiet bi cung mang LAN Private.
# Khong mo mang Public va khong mo ra Internet.
$ErrorActionPreference = 'Stop'
$ruleName = 'DaiHoi LAN Dev TCP 3000'
$profiles = Get-NetConnectionProfile | Where-Object {
  $_.IPv4Connectivity -ne 'Disconnected' -and $_.NetworkCategory -eq 'Private'
}
if (-not $profiles) {
  throw 'Chua co mang Private dang hoat dong. Hay chon Wi-Fi tin cay va dat thanh Private truoc khi chay.'
}
$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($rule) {
  Set-NetFirewallRule -DisplayName $ruleName -Enabled True -Direction Inbound -Action Allow -Profile Private
  Get-NetFirewallRule -DisplayName $ruleName | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress LocalSubnet
  Write-Host 'Da cap nhat firewall rule LAN Private.'
} else {
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private -RemoteAddress LocalSubnet | Out-Null
  Write-Host 'Da tao firewall rule LAN Private.'
}
Write-Host 'Dia chi tren dien thoai / may tinh cung Wi-Fi:'
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -in $profiles.InterfaceAlias
} | ForEach-Object { Write-Host ('http://' + $_.IPAddress + ':3000/login') }
