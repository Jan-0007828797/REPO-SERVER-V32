"use client";
import { useEffect, useState } from "react";
import { loadName, saveName, saveLastGameId, savePlayerSession } from "../../lib/storage";
import { getSocket } from "../../lib/socket";
import { useRouter } from "next/navigation";
import { ConsentGate } from "../consent";
import { playClock, stopClock } from "../../lib/audio";

export default function Create(){
  const r=useRouter();
  const [stage,setStage]=useState("consent");
  const [name,setName]=useState("");
  const [yearsTotal,setYears]=useState(4);
  const [err,setErr]=useState("");

  useEffect(()=>{ setName(loadName()); },[]);

  function createGame(){
    setErr("");
    const s=getSocket();
    s.emit("create_game",{ name:name.trim(), yearsTotal:Number(yearsTotal), maxPlayers:6 },(res)=>{
      if(!res?.ok){ setErr(res?.error||"Chyba"); return; }
      savePlayerSession(res.gameId, { playerId: res.playerId, role: "GM", reconnectToken: res.reconnectToken || "" });
      saveLastGameId(res.gameId);
      stopClock();
      r.push(`/lobby/${res.gameId}?role=gm`);
    });
  }

  return (
    <div className="container">
      <div className="header"><h1 className="brand">KRYPTOPOLY</h1><button className="iconBtn" onClick={()=>r.push("/")}>←</button></div>
      {stage==="consent" ? (
        <ConsentGate onDone={()=>{ playClock(); setStage("form"); }} />
      ) : (
        <div className="card">
          <div className="sectionLabel">GM profil</div>
          <input className="bigInput" value={name} onChange={(e)=>{setName(e.target.value); saveName(e.target.value);}} placeholder="Přezdívka GM" />
          <div className="row">
            <select value={yearsTotal} onChange={(e)=>setYears(Number(e.target.value))}>
              <option value={4}>4 roky</option>
              <option value={5}>5 let</option>
            </select>
            <div className="pill" style={{alignSelf:"center"}}>👥 max 6 (včetně GM)</div>
          </div>
          {err ? <div className="notice">{err}</div> : null}
          <button className="btn" disabled={!name.trim()} onClick={createGame}>Vytvořit hru</button>
        </div>
      )}
    </div>
  );
}
