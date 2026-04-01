"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { getSocket } from "../../../lib/socket";
import { loadPlayerIdForGame } from "../../../lib/storage";

function seatLabel(p){
  if(p?.role==="GM") return "GM";
  if(typeof p?.seatIndex==="number") return `Hráč ${p.seatIndex}`;
  return "Hráč";
}

export default function Lobby(){
  const { gameId } = useParams();
  const sp = useSearchParams();
  const isGM = (sp.get("role")||"player")==="gm";
  const r=useRouter();
  const [players,setPlayers]=useState([]);
  const [cfg,setCfg]=useState(null);
  const [qr,setQr]=useState("");
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(()=>{
    if (!gameId || typeof window === "undefined") return;
    setJoinUrl(`${window.location.origin}/join/${gameId}`);
  },[gameId]);

  useEffect(()=>{ (async ()=>{ if(!joinUrl) return; setQr(await QRCode.toDataURL(joinUrl,{margin:2,width:420,errorCorrectionLevel:'H'})); })(); },[joinUrl]);

  useEffect(()=>{
    const s=getSocket();
    const playerId = loadPlayerIdForGame(gameId);
    s.emit("watch_lobby",{gameId, playerId},()=>{});
    // Keep listening to full game state too (refresh-safe)
    s.emit("watch_game",{gameId, playerId},()=>{});

    const onUpd=(p)=>{ if(p?.gameId!==gameId) return; setPlayers(p.players||[]); setCfg(p.config||null); };
    const onStarted=()=>r.push(`/game/${gameId}`);
    const onState=(gs)=>{
      if(gs?.gameId!==gameId) return;
      if(gs?.status==="IN_PROGRESS"){
        r.push(`/game/${gameId}`);
        return;
      }
      if(gs?.players) setPlayers(gs.players);
      if(gs?.config) setCfg(gs.config);
    };

    s.on("lobby_update", onUpd);
    s.on("game_state", onState);
    s.on("game_started", onStarted);

    const t = setInterval(()=>{ 
      s.emit("watch_lobby",{gameId, playerId},()=>{});
      s.emit("watch_game",{gameId, playerId},()=>{});
    }, 2000);

    return ()=>{ clearInterval(t); s.off("lobby_update", onUpd); s.off("game_state", onState); s.off("game_started", onStarted); };
  },[gameId,r]);

  function start(){ const s=getSocket(); s.emit("start_game",{gameId},()=>{}); }
  // Golden rule: keep max players unchanged; allow test mode where only GM plays.
  const canStart = isGM && cfg && players.length>=1; // GM alone is allowed

  return (
    <div className="container">
      <div className="header"><h1 className="brand">KRYPTOPOLY</h1><button className="iconBtn" onClick={()=>r.push("/")}>⌂</button></div>
      <div className="card">
        <div className="row">
          <div style={{flex:"1 1 220px"}}>
            {qr ? <img src={qr} alt="QR" style={{width:"100%",maxWidth:280,borderRadius:16,background:"rgba(255,255,255,.92)",padding:10}}/> : null}
            <div className="hint" style={{marginTop:8}}>Naskenuj QR kód pro připojení.</div>
          </div>

          <div style={{flex:"2 1 240px"}}>
            {cfg ? <div className="pills"><span className="pill">🗓️ {cfg.yearsTotal}</span><span className="pill">👥 max {cfg.maxPlayers}</span></div> : null}
            <div className="sectionLabel">Lobby</div>

            <ul className="list">
              {players.length===0 ? (
                <li><span>Čekám na hráče…</span><span className="badge">Lobby</span></li>
              ) : players.map(p=>(
                <li key={p.playerId}>
                  <span>{p.name}</span>
                  <span className="badge">{seatLabel(p)}</span>
                  <span className={"badge "+(p.connected?"ok":"muted")}>{p.connected?"● Připojen":"○ Odpojen"}</span>
                </li>
              ))}
            </ul>

            {isGM ? (
              <button className="btn" disabled={!canStart} onClick={start}>▶ Spustit hru</button>
            ) : (
              <div className="hint" style={{marginTop:10}}>Počkej, až GM spustí hru.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
