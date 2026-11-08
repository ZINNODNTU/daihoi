import type {NextConfig} from "next";
import {networkInterfaces} from "node:os";

// Next.js 16 chặn assets/HMR trong dev khi thiết bị khác truy cập qua IP LAN.
// Chỉ cho phép các địa chỉ IPv4 private của chính máy chủ, không mở origin công khai.
function privateIpv4(address:string){
 const octets=address.split(".").map(Number);
 if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 return octets[0]===10||
  (octets[0]===172&&octets[1]>=16&&octets[1]<=31)||
  (octets[0]===192&&octets[1]===168);
}
const lanDevHosts=process.env.NODE_ENV==="development"
 ? [...new Set(Object.values(networkInterfaces()).flatMap(entries=>entries||[])
   .filter(entry=>entry.family==="IPv4"&&!entry.internal&&privateIpv4(entry.address))
   .map(entry=>entry.address))]
 : [];

const nextConfig:NextConfig={
 allowedDevOrigins:lanDevHosts,
 turbopack:{
  rules:{
   "*.css":{
    loaders:["@tailwindcss/turbopack"],
    as:"*.css"
   }
  }
 }
};
export default nextConfig;
