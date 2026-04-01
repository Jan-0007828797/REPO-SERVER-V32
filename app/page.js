"use client";
import { useEffect, useState } from "react";
import { loadLastGameId, loadName, loadPlayerSession, saveName } from "../lib/storage";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socket";

export default function Home(){
  const [name,setName]=useState("");
  const [lastGame,setLastGame]=useState("");
  const [playerId,setPlayerId]=useState("");
  const r=useRouter();

  useEffect(()=>{
    setName(loadName());
    const last = loadLastGameId();
    setLastGame(last);
    const session = loadPlayerSession(last);
    setPlayerId(session.playerId || "");
    setReconnectToken(session.reconnectToken || "");
  },[]);

  const [reconnectToken,setReconnectToken]=useState("");
  const canResume = Boolean(lastGame && (playerId || reconnectToken));

  function resumeLast(){
    if(!lastGame || !(playerId || reconnectToken)) return;
    try{
      const s = getSocket();
      s.emit("reconnect_game", { gameId: lastGame, playerId, reconnectToken }, (res)=>{
        if(!res?.ok){
          r.push(`/lobby/${lastGame}`);
          return;
        }
        const status = res.gameStatus || res.status;
        if(status === "IN_PROGRESS"){
          r.push(`/game/${lastGame}`);
        }else{
          r.push(`/lobby/${lastGame}?role=${res.role==="GM"?"gm":"player"}`);
        }
      });
    }catch{
      r.push(`/lobby/${lastGame}`);
    }
  }

  return (
    <div className="container">
      <div className="header"><h1 className="brand">KRYPTOPOLY</h1></div>

      <div className="card">
        <div className="sectionLabel">Profil</div>
        <input
          className="bigInput"
          value={name}
          onChange={(e)=>{ setName(e.target.value); saveName(e.target.value); }}
          placeholder="Přezdívka (unikátní ve hře)"
        />

        {canResume ? (
          <div style={{marginTop:10}}>
            <button className="btn secondary" disabled={!name.trim()} onClick={resumeLast}>
              ↩ Vrátit se do poslední hry
            </button>
            <div className="hint" style={{marginTop:6}}>Tip: pokud se vracíš na jiném zařízení, naskenuj znovu QR kód hry.</div>
          </div>
        ) : null}

        <div className="row" style={{marginTop:12}}>
          <button className="btn" disabled={!name.trim()} onClick={()=>r.push("/create")}>🎩 Založ hru</button>
          <button className="btn secondary" disabled={!name.trim()} onClick={()=>r.push("/join")}>📷 Připoj se ke hře</button>
        </div>

        <div className="hint" style={{marginTop:10}}>
          Připojení do hry probíhá vždy přes QR kód. Přezdívka je povinná a musí být ve hře unikátní.
        </div>
      </div>
    </div>
  );
}
