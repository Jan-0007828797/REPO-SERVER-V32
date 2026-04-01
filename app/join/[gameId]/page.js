"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadLastGameId, loadName, loadPlayerSession, saveLastGameId, saveName, savePlayerSession } from "../../../lib/storage";
import { getSocket } from "../../../lib/socket";

export default function JoinConfirm(){
  const { gameId } = useParams();
  const r=useRouter();
  const [name,setName]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);

  useEffect(()=>setName(loadName()),[]);

  // Pokud se vracíme do stejné hry a máme playerId, zkus reconnect automaticky.
  useEffect(()=>{
    const last = loadLastGameId();
    const session = loadPlayerSession(gameId);
    const pid = session.playerId || "";
    const reconnectToken = session.reconnectToken || "";
    if(!gameId || (!(pid || reconnectToken)) || last!==gameId) return;
    setBusy(true);
    const s=getSocket();
    s.emit("reconnect_game",{ gameId, playerId: pid, reconnectToken },(res)=>{
      setBusy(false);
      if(res?.ok){
        savePlayerSession(gameId, { playerId: res.playerId, role: res.role || "PLAYER", reconnectToken: res.reconnectToken || session.reconnectToken || "" });
        saveLastGameId(gameId);
        const status = res.gameStatus || res.status;
        if(status === "IN_PROGRESS"){
          r.push(`/game/${gameId}`);
        }else{
          r.push(`/lobby/${gameId}?role=${res.role==="GM"?"gm":"player"}`);
        }
      }
      // pokud reconnect selže, nech hráče připojit se znovu
    });
  },[gameId,r]);

  function join(){
    setErr("");
    const n=name.trim();
    if(!n){ setErr("Zadej přezdívku."); return; }
    setBusy(true);
    const s=getSocket();
    s.emit("join_game",{gameId,name:n},(res)=>{
      setBusy(false);
      if(!res?.ok){ setErr(res?.error||"Chyba"); return; }
      saveName(n);
      savePlayerSession(gameId, { playerId: res.playerId, role: "PLAYER", reconnectToken: res.reconnectToken || "" });
      saveLastGameId(gameId);
      r.push(`/lobby/${gameId}?role=player`);
    });
  }

  return (
    <div className="container">
      <div className="header"><h1 className="brand">KRYPTOPOLY</h1><button className="iconBtn" onClick={()=>r.push("/")}>←</button></div>
      <div className="card">
        <div className="sectionLabel">Přezdívka</div>
        <input className="bigInput" value={name} onChange={(e)=>{setName(e.target.value); saveName(e.target.value);}} placeholder="Unikátní ve hře" />
        {err ? <div className="notice">{err}</div> : null}
        <button className="btn" disabled={!name.trim()||busy} onClick={join}>{busy?"Připojuji…":"Připojit"}</button>
        <div className="hint" style={{marginTop:10}}>
          Připojení je přes QR. Pokud už ve hře jsi, použij návrat na úvodní stránce nebo naskenuj QR znovu.
        </div>
      </div>
    </div>
  );
}
