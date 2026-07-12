import dns from "node:dns/promises";
import net from "node:net";

function privateIp(ip){
 if(net.isIPv4(ip)){const [a,b]=ip.split(".").map(Number);return a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168);}
 return ip==="::1"||ip.startsWith("fc")||ip.startsWith("fd")||ip.startsWith("fe80");
}
export async function assertPublicUrl(value){
 const url=new URL(value);if(!["http:","https:"].includes(url.protocol))throw new Error("Only HTTP(S) sources are supported.");
 if(url.username||url.password)throw new Error("Source URLs cannot contain credentials.");
 const records=await dns.lookup(url.hostname,{all:true});if(!records.length||records.some(x=>privateIp(x.address)))throw new Error("Private network addresses are blocked.");
 return url;
}
