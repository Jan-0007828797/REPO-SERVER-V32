"use client";
import { useState } from "react";
import { unlockAudio } from "../lib/audio";
export function ConsentGate({onDone}){
  const [cam,setCam]=useState(false);
  const [aud,setAud]=useState(false);
  async function askCam(){ try{ await navigator.mediaDevices.getUserMedia({ video:true }); setCam(true);}catch{ setCam(false);} }
  function askAud(){ unlockAudio(); setAud(true); }
  return (
    <div className="card">
      <div className="row">
        <button className="btn secondary" onClick={askCam}>{cam?"✅ Kamera":"📷 Kamera"}</button>
        <button className="btn secondary" onClick={askAud}>{aud?"✅ Zvuk":"🔊 Zvuk"}</button>
      </div>
      <button className="btn" disabled={!(cam&&aud)} onClick={onDone}>Pokračovat</button>
    </div>
  );
}
