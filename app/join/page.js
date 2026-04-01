"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { ConsentGate } from "../consent";
import { playClock } from "../../lib/audio";

function pickBackCamera(devices = []) {
  const byLabel = devices.find((d) => /back|rear|environment/i.test(d.label || ""));
  if (byLabel) return byLabel;
  return devices[devices.length - 1] || null;
}

// QR může obsahovat buď gameId, nebo celou URL /join/<gameId>
function extractGameId(scannedText) {
  const raw = String(scannedText || "").trim();
  if (!raw) return "";
  const m = raw.match(/\/join\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}
export default function Join(){
  const r=useRouter();
  const [stage,setStage]=useState("consent");
  const [err,setErr]=useState("");
  const videoRef=useRef(null);
  const codeReader=useMemo(()=>new BrowserMultiFormatReader(),[]);
  useEffect(()=>{
    if(stage!=="scan") return;
    let active=true;
    (async ()=>{
      try{
        // preferuj zadní kameru (mobil)
        try{
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
          stream.getTracks().forEach(t=>t.stop());
        }catch{}

        const devices=await BrowserMultiFormatReader.listVideoInputDevices();
        if(!devices?.length) throw new Error("Kamera nenalezena");
        const back = pickBackCamera(devices);
        const deviceId = back?.deviceId || devices[0].deviceId;
        await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result)=>{
          if(!active) return;
          if(result){
            const gameId = extractGameId(result.getText());
            if(gameId){
              active=false;
              try{ codeReader.reset(); }catch{}
              r.push(`/join/${gameId}`);
            }
          }
        });
      }catch(e){ setErr(String(e?.message||e)); }
    })();
    return ()=>{ active=false; try{codeReader.reset();}catch{} };
  },[stage, codeReader, r]);
  return (
    <div className="container">
      <div className="header"><h1 className="brand">KRYPTOPOLY</h1><button className="iconBtn" onClick={()=>r.push("/")}>←</button></div>
      {stage==="consent" ? <ConsentGate onDone={()=>{ playClock(); setStage("scan"); }} /> : (
        <div className="card">
          {err ? <div className="notice">{err}</div> : null}
          <div style={{borderRadius:18,overflow:"hidden",border:"1px solid rgba(0,240,255,.22)"}}><video ref={videoRef} style={{width:"100%"}} /></div>
        </div>
      )}
    </div>
  );
}
