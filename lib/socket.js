import { io } from "socket.io-client";
let sock=null;
export function getSocket(){
  if(sock) return sock;
  const url=(process.env.NEXT_PUBLIC_SERVER_URL||"").trim().replace(/\s+/g,"");
  if(!url) throw new Error("NEXT_PUBLIC_SERVER_URL missing");
  sock=io(url,{transports:["websocket","polling"]});
  return sock;
}
export function resetSocket(){ try{sock?.disconnect();}catch{} sock=null; }
