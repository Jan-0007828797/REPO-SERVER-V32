"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { getSocket } from "../../../lib/socket";
import { loadPlayerIdForGame } from "../../../lib/storage";
import { getBasePriceForYear } from "../../../lib/game-config";
import { playClock, stopClock, playRing, stopRing } from "../../../lib/audio";
import { BottomBar, BottomBarWrapper, Modal } from "../../ui";

// Helper: get current player object from public game state
// (server uses `playerId` as the stable identifier)
function getMe(gs, playerId){
  return (gs?.players || []).find(p => p.playerId === playerId) || null;
}

function SuperTopModal({ title, onClose, children, hideClose=false }){
  // Same behavior/markup as Modal, but guaranteed above other modals.
  useEffect(()=>{ const onKey=(e)=>{ if(e.key==="Escape") onClose?.(); }; window.addEventListener("keydown", onKey); return ()=>window.removeEventListener("keydown", onKey); },[onClose]);
  const hasTitle = !!(title && String(title).trim().length);
  return (
    <div className="modalBackdrop top superTop" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose?.(); }}>
      <div className="modal modalSafe">
        {hasTitle ? (
          <>
            <div className="modalHeader">
              <div style={{fontWeight:900,fontSize:18}}>{title}</div>
              {!hideClose ? <button className="iconBtn" onClick={onClose}>✕</button> : null}
            </div>
            <div style={{height:1,background:"rgba(255,255,255,.10)",margin:"12px 0"}}></div>
          </>
        ) : (
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            {!hideClose ? <button className="iconBtn" onClick={onClose}>✕</button> : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function GMTopModal({ title, onClose, children }){
  // Absolute priority above everything; blocks the game from getting stuck.
  useEffect(()=>{ const onKey=(e)=>{ if(e.key==="Escape") onClose?.(); }; window.addEventListener("keydown", onKey); return ()=>window.removeEventListener("keydown", onKey); },[onClose]);
  return (
    <div className="modalBackdrop gmTop" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose?.(); }}>
      <div className="modal modalSafe">
        <div className="modalHeader">
          <div style={{fontWeight:900,fontSize:18}}>{title}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <div style={{height:1,background:"rgba(255,255,255,.10)",margin:"12px 0"}}></div>
        {children}
      </div>
    </div>
  );
}

function MonoIcon({ name, size=28, className="" }){
  // Monochrome, bold icons (not emoji) – consistent across the whole app.
  const s = Number(size)||28;
  const common = { viewBox:"0 0 64 64", width:s, height:s, fill:"none", stroke:"currentColor", strokeWidth:5, strokeLinecap:"round", strokeLinejoin:"round" };
  if(name==="crown"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M10 44l6-22 16 14 16-14 6 22" />
        <path d="M14 44h36" />
        <path d="M18 52h28" />
      </svg>
    );
  }
  if(name==="pin"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M32 58s16-14 16-30a16 16 0 10-32 0c0 16 16 30 16 30z" />
        <circle cx="32" cy="28" r="6" />
      </svg>
    );
  }
  if(name==="envelope"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <rect x="10" y="18" width="44" height="28" rx="6" />
        <path d="M12 20l20 16 20-16" />
      </svg>
    );
  }
  if(name==="camera"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M20 20l4-6h16l4 6" />
        <rect x="12" y="20" width="40" height="30" rx="8" />
        <circle cx="32" cy="35" r="9" />
      </svg>
    );
  }
  if(name==="btc"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M26 12v40" />
        <path d="M38 12v40" />
        <path d="M22 18h16a8 8 0 010 16H22" />
        <path d="M22 34h18a7 7 0 010 14H22" />
      </svg>
    );
  }
  if(name==="receipt"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M18 10h28v44l-4-3-4 3-4-3-4 3-4-3-4 3V10z" />
        <path d="M24 22h16" />
        <path d="M24 30h16" />
        <path d="M24 38h12" />
      </svg>
    );
  }
  // Investment type marks (monochrome). Color is carried by the background/border.
  if(name==="agri"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M22 50V18" />
        <path d="M32 50V14" />
        <path d="M42 50V18" />
        <path d="M22 26c6 0 10-4 10-10" />
        <path d="M42 26c-6 0-10-4-10-10" />
        <path d="M22 36c6 0 10-4 10-10" />
        <path d="M42 36c-6 0-10-4-10-10" />
      </svg>
    );
  }
  if(name==="mining"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M14 44l14-14 8 8 14-14" />
        <path d="M10 48h44" />
        <path d="M26 22l6-6 6 6" />
      </svg>
    );
  }
  if(name==="industry"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M14 50V30l14 8V30l14 8V22l8 6v22H14z" />
        <path d="M22 50V40" />
        <path d="M30 50V40" />
        <path d="M38 50V40" />
      </svg>
    );
  }
  // Global trends + continents (monochrome)
  if(name==="bolt"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M34 6L16 34h16l-2 24 18-30H32z" />
      </svg>
    );
  }
  if(name==="crash"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M12 18v28h40" />
        <path d="M18 22l10 10 8-8 10 10" />
        <path d="M46 14l6 6" />
        <path d="M52 14l-6 6" />
      </svg>
    );
  }
  if(name==="pickaxe"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M16 18c10-10 22-10 32 0" />
        <path d="M28 24l-8 8" />
        <path d="M36 32L18 50" />
        <path d="M14 54l8-8" />
      </svg>
    );
  }
  if(name==="bank"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M12 24l20-10 20 10" />
        <path d="M16 24v22" />
        <path d="M26 24v22" />
        <path d="M38 24v22" />
        <path d="M48 24v22" />
        <path d="M12 46h40" />
        <path d="M18 54h28" />
      </svg>
    );
  }
  if(name==="factoryOff"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M12 50V30l14 8V30l14 8V22h12v28" />
        <path d="M12 50h40" />
        <path d="M14 14l36 36" />
      </svg>
    );
  }
  if(name==="wheatOff"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M32 54V12" />
        <path d="M32 18c-8 0-10 6-10 10 6 0 10-2 10-10z" />
        <path d="M32 28c8 0 10 6 10 10-6 0-10-2-10-10z" />
        <path d="M18 14l28 36" />
      </svg>
    );
  }
  if(name==="chartUp"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M12 48V16" />
        <path d="M12 48h40" />
        <path d="M18 38l10-10 8 8 14-16" />
        <path d="M46 20h8v8" />
      </svg>
    );
  }
  if(name==="gavel"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M14 28l18-18 12 12-18 18" />
        <path d="M34 34L18 50" />
        <path d="M12 54h28" />
      </svg>
    );
  }
  if(name==="stopwatch"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M26 10h12" />
        <path d="M32 18a18 18 0 1018 18 18 18 0 00-18-18z" />
        <path d="M32 36l8-6" />
      </svg>
    );
  }
  if(name==="bankDown"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M12 24l20-10 20 10" />
        <path d="M16 24v18" />
        <path d="M26 24v18" />
        <path d="M38 24v18" />
        <path d="M48 24v18" />
        <path d="M12 42h40" />
        <path d="M18 54l10-10 8 8 10-10" />
      </svg>
    );
  }
  if(name==="fork"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M32 10v44" />
        <path d="M32 26c-10 0-16-6-16-16" />
        <path d="M32 26c10 0 16-6 16-16" />
      </svg>
    );
  }
  if(name==="doubleUp"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M20 44V20" />
        <path d="M20 20l-8 8" />
        <path d="M20 20l8 8" />
        <path d="M44 44V20" />
        <path d="M44 20l-8 8" />
        <path d="M44 20l8 8" />
      </svg>
    );
  }
  if(name==="virus"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <circle cx="32" cy="32" r="12" />
        <path d="M32 6v8" />
        <path d="M32 50v8" />
        <path d="M6 32h8" />
        <path d="M50 32h8" />
        <path d="M14 14l6 6" />
        <path d="M44 44l6 6" />
        <path d="M50 14l-6 6" />
        <path d="M14 50l6-6" />
      </svg>
    );
  }
  if(name==="inflation"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M20 44V18" />
        <path d="M20 18l-8 8" />
        <path d="M20 18l8 8" />
        <path d="M36 50c8 0 14-6 14-14s-6-14-14-14-14 6-14 14 6 14 14 14z" />
        <path d="M32 36h8" />
        <path d="M36 30v12" />
      </svg>
    );
  }
  if(name==="cap"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M12 26l20-10 20 10-20 10-20-10z" />
        <path d="M20 32v8c0 4 6 8 12 8s12-4 12-8v-8" />
        <path d="M52 28v14" />
      </svg>
    );
  }
  if(name==="shield"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M32 10l16 6v12c0 12-7 20-16 26-9-6-16-14-16-26V16l16-6z" />
      </svg>
    );
  }
  if(name==="coins"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <ellipse cx="32" cy="18" rx="14" ry="6" />
        <path d="M18 18v10c0 3 6 6 14 6s14-3 14-6V18" />
        <path d="M18 28v10c0 3 6 6 14 6s14-3 14-6V28" />
        <path d="M18 38v8c0 3 6 6 14 6s14-3 14-6v-8" />
      </svg>
    );
  }
  if(name==="europe"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M20 16l10-4 12 6 4 10-6 14-14 8-10-6-4-12z" />
      </svg>
    );
  }
  if(name==="asia"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M14 20l12-8 18 6 6 12-10 14-20 8-10-10z" />
      </svg>
    );
  }
  if(name==="africa"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M30 10l10 8 6 14-6 18-14 6-10-10 2-18z" />
      </svg>
    );
  }
  if(name==="n_america"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M16 20l10-10 18 4 6 14-8 12-16 8-10-8z" />
      </svg>
    );
  }
  if(name==="s_america"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M30 12l12 10-4 16-10 16-10-10 4-14z" />
      </svg>
    );
  }
  if(name==="oceania"){
    return (
      <svg {...common} className={className} aria-hidden="true">
        <path d="M18 26l10-8 14 2 6 10-6 10-16 4-8-8z" />
      </svg>
    );
  }
  return null;
}

function globalIconName(t){
  const id = Number(t?.trendId ?? t?.id);
  if(id===1) return "bolt";
  if(id===2) return "crash";
  if(id===3) return "pickaxe";
  if(id===4) return "bank";
  if(id===5) return "factoryOff";
  if(id===6) return "wheatOff";
  if(id===7) return "chartUp";
  if(id===8) return "gavel";
  if(id===9) return "doubleUp";
  if(id===10) return "stopwatch";
  if(id===11) return "bankDown";
  if(id===12) return "fork";
  if(id===13) return "fork";
  if(id===14) return "doubleUp";
  if(id===15) return "virus";
  if(id===16) return "inflation";
  return "pin";
}

function regionalTrendIconName(t){
  const k = String(t?.key||"");
  const n = String(t?.name||"").toLowerCase();
  if(k.includes("REG_INVESTMENT_BOOM") || n.includes("boom")) return "chartUp";
  if(k.includes("REG_HIGH_EDUCATION") || n.includes("vzdělan") || n.includes("vzdelan")) return "cap";
  if(k.includes("REG_STABILITY") || n.includes("stabil")) return "shield";
  if(k.includes("REG_TAXES") || n.includes("dan")) return "coins";
  return "pin";
}

function badgeFor(kind){
  if(kind==="ML") return { icon:"crown", label:"MARKET LEADER" };
  if(kind==="AUCTION") return { icon:"envelope", label:"DRAŽBA – OBÁLKA" };
  if(kind==="CRYPTO") return { icon:"btc", label:"KRYPTOTRANSAKCE" };
  if(kind==="SETTLE") return { icon:"receipt", label:"AUDIT" };
  return { icon:null, label:"" };
}

function PhaseBar({ phase, bizStep }){
  const phases = [
    { key:"ML_BID", label:"Market Leader", icon:"crown" },
    { key:"MOVE", label:"Výběr trhu", icon:"pin" },
    { key:"AUCTION_ENVELOPE", label:"Dražba", icon:"envelope" },
    { key:"ACQUIRE", label:"Akvizice", icon:"camera" },
    { key:"CRYPTO", label:"Kryptoburza", icon:"btc" },
    { key:"SETTLE", label:"Audit", icon:"receipt" },
  ];

  const activeKey = (()=>{
    if(phase==="BIZ") return bizStep;
    if(phase==="CRYPTO") return "CRYPTO";
    if(phase==="SETTLE") return "SETTLE";
    return null;
  })();

  const rowRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(()=>{
    if(!activeRef.current) return;
    activeRef.current.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
  }, [activeKey]);

  return (
    <div className="stepRow" aria-label="Fáze hry" ref={rowRef}>
      {phases.map((p, idx)=>{
        const active = p.key===activeKey;
        const done = !!activeKey && phases.findIndex(x=>x.key===activeKey) > idx;
        return (
          <div key={p.key} ref={active ? activeRef : null} className={"stepChip"+(active?" active":"")+(done?" done":"")}>
            <span className="stepIcon" aria-hidden="true"><MonoIcon name={p.icon} size={36} /></span>
            <span className="stepText">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PrivacyCard({ kind, mode, amountText, onReveal, onHide }){
  const b = badgeFor(kind);
  if(mode==="edit") return null;
  return (
    <div className="privacyBackdrop">
      <div className="privacyFull">
        <div className="privacyBadge">
          {b.icon ? <span className="privacyEmoji" aria-hidden="true"><MonoIcon name={b.icon} size={30} /></span> : null}
          <span className="privacyLabel">{b.label}</span>
        </div>

        {mode==="hidden" ? (
          <>
            <div className="privacyHidden">🔒</div>
            <button className="primaryBtn big full" onClick={onReveal}>ODKRÝT</button>
          </>
        ) : (
          <>
            <div className="privacyAmount">{amountText}</div>
            <button className="secondaryBtn big full" onClick={onHide}>SKRÝT</button>
          </>
        )}
      </div>
    </div>
  );
}

function pickBackCamera(devices = []) {
  const byLabel = devices.find((d) => /back|rear|environment/i.test(d.label || ""));
  if (byLabel) return byLabel;
  return devices[devices.length - 1] || null;
}

export default function GamePage(){
  const { gameId } = useParams();
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  // Socket must be initialized before any hooks that reference it (dependency arrays are evaluated during render).
  const s = useMemo(()=> getSocket(), []);
  const [gs, setGs] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState(null);
  const [gmPanelOpen, setGmPanelOpen] = useState(false);
  const [trendModal, setTrendModal] = useState(null); // {name, icon, desc}
  const [regionalModal, setRegionalModal] = useState(null); // {continent, name, icon, desc}
  const [mlTrendIntroOpen, setMlTrendIntroOpen] = useState(false);

  // local privacy modes
  const [mlPrivacy, setMlPrivacy] = useState("edit");       // edit|hidden|reveal
  const [aucPrivacy, setAucPrivacy] = useState("edit");
  const [cryptoPrivacy, setCryptoPrivacy] = useState("edit");
  const [settlePrivacy, setSettlePrivacy] = useState("edit");

  // Privacy overlays are hard-lock (cannot be dismissed; disappear on phase change)

  // inputs
  const [mlBid, setMlBid] = useState("");
  const [aucBid, setAucBid] = useState("");
  const [useLobby, setUseLobby] = useState(false);
  const [aucFinalBid, setAucFinalBid] = useState("");

  const [cryptoD, setCryptoD] = useState({ BTC:0, ETH:0, LTC:0, SIA:0 });

  // Audit (SETTLE) UX state
  const [auditPreview, setAuditPreview] = useState(null); // {settlementUsd, breakdown}
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(()=>{
    if (!gameId || typeof window === "undefined") return;
    setPlayerId(loadPlayerIdForGame(gameId) || "");
  }, [gameId]);
  const [auditDetailOpen, setAuditDetailOpen] = useState(false);
  // V33.1: Finální audit popup (privacy-first)
  const [auditPopupOpen, setAuditPopupOpen] = useState(false);
  const [auditPopupRevealed, setAuditPopupRevealed] = useState(false);
  const [expertsOpen, setExpertsOpen] = useState(false);
  const [expertPick, setExpertPick] = useState(null); // expert card
  const [expertTarget, setExpertTarget] = useState(null); // playerId
  const [expertCard, setExpertCard] = useState(null); // target investment cardId

  // Acquisition (scan) UI
  const [scanOn, setScanOn] = useState(false);
  const [scanErr, setScanErr] = useState("");
  const [scanPreview, setScanPreview] = useState(null); // {card}
  const [acqMoreOpen, setAcqMoreOpen] = useState(false);
  const [acqHadAny, setAcqHadAny] = useState(false);
  const [acqNoScanLocal, setAcqNoScanLocal] = useState(false); // instant UX feedback
  const videoRef = useRef(null);
  const codeReader = useMemo(()=> new BrowserMultiFormatReader(), []);

  useEffect(()=>{

    s.emit("watch_game", { gameId, playerId }, (res)=>{
      if(!res?.ok) setErr(res?.error || "Nelze načíst hru.");
    });
    const onState = (state)=>{
      if(state?.gameId!==gameId) return;
      setGs(state);
    };
    s.on("game_state", onState);
    return ()=> s.off("game_state", onState);
  }, [gameId]);

  const me = gs?.players?.find(p=>p.playerId===playerId) || null;
  const isGM = me?.role==="GM";

  const uiLocked = (gs?.phase==="BIZ" && gs?.bizStep==="MOVE" && !!gs?.biz?.move?.[playerId]?.committed);
  const setTabSafe = (t)=>{ if(!uiLocked) setTab(t); };

  // Sound logic: clock during interactive steps (except Trends)
  useEffect(()=>{
    stopRing();
    const phase = gs?.phase;
    const bizStep = gs?.bizStep;
    if(!phase) { stopClock(); return; }

    const shouldClock =
      (phase==="BIZ" && bizStep) ||
      (phase==="CRYPTO") ||
      (phase==="SETTLE");

    if(shouldClock) playClock(); else stopClock();

    // lobbyist ringing for users who used lobbyist and need final bid
    if(phase==="BIZ" && bizStep==="AUCTION_ENVELOPE"){
      const entry = gs?.biz?.auction?.entries?.[playerId];
      const active = !!gs?.biz?.auction?.lobbyistPhaseActive;
      if(active && entry?.usedLobbyist && !entry?.finalCommitted){
        playRing();
      }else{
        stopRing();
      }
    }
  }, [gs, playerId]);

  // Load preview when entering SETTLE and not yet committed
  useEffect(()=>{
    if(gs?.phase!=="SETTLE") return;
    const committed = !!gs?.settle?.entries?.[playerId]?.committed;
    if(committed) return;
    setAuditLoading(true);
    s.emit("preview_audit", { gameId, playerId }, (res)=>{
      setAuditLoading(false);
      if(!res?.ok) setAuditPreview({ error: res?.error || "Chyba" });
      else setAuditPreview({ settlementUsd: res.settlementUsd, breakdown: res.breakdown||[] });
    });
  }, [gs?.phase, gameId, playerId]);

  // Reset local states on step changes (so UX is clean)
  useEffect(()=>{
    const phase = gs?.phase;
    const step = gs?.bizStep;
    if(phase==="BIZ" && step==="ML_BID"){
      const committed = !!gs?.biz?.mlBids?.[playerId]?.committed;
      setMlPrivacy(committed ? "hidden" : "edit");
      setMlTrendIntroOpen(true);
    }
    if(phase==="BIZ" && step==="AUCTION_ENVELOPE"){
      const committed = !!gs?.biz?.auction?.entries?.[playerId]?.committed;
      setAucPrivacy(committed ? "hidden" : "edit");
    }
    if(phase==="CRYPTO"){
      const committed = !!gs?.crypto?.entries?.[playerId]?.committed;
      setCryptoPrivacy(committed ? "hidden" : "edit");
    }
    if(phase==="SETTLE"){
      const committed = !!gs?.settle?.entries?.[playerId]?.committed;
      setSettlePrivacy(committed ? "hidden" : "edit");
    }

    // Acquisition step: default scanner OFF, clear preview
    if(phase==="BIZ" && step==="ACQUIRE"){
      setScanOn(false);
      setScanErr("");
      setScanPreview(null);
      setAcqMoreOpen(false);
      setAcqHadAny(false);
    }
  }, [gs?.phase, gs?.bizStep, gs?.year]);

  // Close audit popup when leaving SETTLE (golden rule: screens are phase-driven)
  useEffect(()=>{
    if(gs?.phase!=="SETTLE"){
      setAuditPopupOpen(false);
      setAuditPopupRevealed(false);
    }
  }, [gs?.phase]);

  // Acquisition scanner lifecycle
  useEffect(()=>{
    const phase = gs?.phase;
    const step = gs?.bizStep;
    if(!(phase==="BIZ" && step==="ACQUIRE" && scanOn)){
      try{ codeReader.reset(); }catch{}
      return;
    }
    let active = true;
    setScanErr("");
    (async ()=>{
      try{
        // Prefer back camera
        try{
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
          stream.getTracks().forEach(t=>t.stop());
        }catch{}

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if(!devices?.length) throw new Error("Kamera nenalezena");
        const back = pickBackCamera(devices);
        const deviceId = back?.deviceId || devices[0].deviceId;

        // Higher resolution helps with small QR codes.
        const constraints = {
          audio: false,
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: { ideal: "environment" },
            advanced: [
              // Not all browsers/devices support this, but it's safe to request.
              { focusMode: "continuous" }
            ]
          }
        };

        await codeReader.decodeFromConstraints(constraints, videoRef.current, (result)=>{
          if(!active) return;
          if(result){
            const raw = String(result.getText()||"").trim();
            if(!raw) return;
            // Pause scanning while we confirm
            try{ codeReader.reset(); }catch{}
            active = false;
            // Ask server for preview (does NOT claim)
            s.emit("scan_preview", { gameId, playerId, cardQr: raw }, (res)=>{
              if(!res?.ok){
                setScanErr(res?.error || "Neznámá karta");
                // Resume scanning
                setScanOn(false);
                setTimeout(()=>{ setScanOn(true); }, 250);
                return;
              }
              setScanPreview({ card: res.card });
            });
          }
        });
      }catch(e){
        setScanErr(String(e?.message||e));
      }
    })();
    return ()=>{ active = false; try{ codeReader.reset(); }catch{} };
  }, [gs?.phase, gs?.bizStep, scanOn, codeReader, s, gameId, playerId]);


  function gmNext(){ s.emit("gm_next", { gameId, playerId }, (res)=>{ if(!res?.ok) setErr(res?.error||""); }); }
  function gmBack(){ s.emit("gm_back", { gameId, playerId }, (res)=>{ if(!res?.ok) setErr(res?.error||""); }); }

  // Readiness signal for GM button (GM is also counted as a player)
  const readiness = useMemo(()=>{
    const players = gs?.players || [];
    if(!players.length) return { ready:0, total:0, isGreen:false };

    const pidList = players.map(p=>p.playerId);

    const phase = gs?.phase;
    const step = gs?.bizStep;

    function committedFor(pid){
      if(phase==="BIZ" && step==="ML_BID") return !!gs?.biz?.mlBids?.[pid]?.committed;
      if(phase==="BIZ" && step==="MOVE") return !!gs?.biz?.move?.[pid]?.committed;
      if(phase==="BIZ" && step==="AUCTION_ENVELOPE"){
        const e = gs?.biz?.auction?.entries?.[pid];
        if(!gs?.biz?.auction?.lobbyistPhaseActive) return !!e?.committed;
        // lobbyist final wave: only lobbyists are required
        if(!e?.usedLobbyist) return true;
        return !!e?.finalCommitted;
      }
      if(phase==="BIZ" && step==="ACQUIRE") return !!gs?.biz?.acquire?.entries?.[pid]?.committed;
      if(phase==="CRYPTO") return !!gs?.crypto?.entries?.[pid]?.committed;
      if(phase==="SETTLE") return !!gs?.settle?.entries?.[pid]?.committed;
      return false;
    }

    // Total count in lobbyist subphase = only lobbyists (everyone else is auto-ready)
    let totalIds = pidList;
    if(phase==="BIZ" && step==="AUCTION_ENVELOPE" && gs?.biz?.auction?.lobbyistPhaseActive){
      const entries = gs?.biz?.auction?.entries || {};
      totalIds = pidList.filter(pid=>!!entries[pid]?.usedLobbyist);
      if(totalIds.length===0) totalIds = pidList; // safety
    }

    const ready = totalIds.filter(pid=>committedFor(pid)).length;
    const total = totalIds.length;
    return { ready, total, isGreen: total>0 && ready===total };
  }, [gs, playerId]);

  function commitML(amount){
    s.emit("commit_ml_bid", { gameId, playerId, amountUsd: amount }, (res)=>{
      if(!res?.ok) return setErr(res?.error||"Chyba");
      setMlPrivacy("hidden"); // auto hide after commit
    });
  }

  function commitAuction(bid, usedLobbyist){
    // UX rule: all USD inputs are min 1000 and in multiples of 1000 (unless null)
    if(bid!=null){
      const v = Number(bid);
      if(!Number.isFinite(v) || v<1000 || (v%1000)!==0){
        return setErr("Nabídka musí být minimálně 1000 USD a v násobcích 1000.");
      }
    }
    s.emit("commit_auction_bid", { gameId, playerId, bidUsd: bid, usedLobbyist }, (res)=>{
      if(!res?.ok) return setErr(res?.error||"Chyba");
      setAucPrivacy("hidden"); // auto hide after commit
    });
  }

  function commitFinalAuction(finalBid){
    if(finalBid!=null){
      const v = Number(finalBid);
      if(!Number.isFinite(v) || v<1000 || (v%1000)!==0){
        return setErr("Nabídka musí být minimálně 1000 USD a v násobcích 1000.");
      }
    }
    s.emit("commit_auction_final_bid", { gameId, playerId, finalBidUsd: finalBid }, (res)=>{
      if(!res?.ok) return setErr(res?.error||"Chyba");
      setAucPrivacy("hidden");
    });
  }

  function pickMarket(marketId){
    s.emit("pick_market", { gameId, playerId, marketId }, (res)=>{
      if(!res?.ok) setErr(res?.error || "Nelze vybrat trh");
    });
  }

  function commitCrypto(){
    s.emit("commit_crypto", { gameId, playerId, deltas: cryptoD }, (res)=>{
      if(!res?.ok) return setErr(res?.error||"Chyba");
      setCryptoPrivacy("hidden");
    });
  }

  function commitSettle(){
    // Immediate UX feedback: open the privacy popup instantly.
    setAuditPopupOpen(true);
    setAuditPopupRevealed(false);
    s.emit("commit_settlement_ready", { gameId, playerId }, (res)=>{
      if(!res?.ok) return setErr(res?.error||"Chyba");
      setSettlePrivacy("hidden");
    });
  }

  function commitAcquire({ gotCard }){
    s.emit("commit_acquire", { gameId, playerId, gotCard: !!gotCard }, (res)=>{
      if(!res?.ok) setErr(res?.error||"Chyba");
    });
  }

  function acceptScannedCard(cardId){
    s.emit("claim_card", { gameId, playerId, cardId }, (res)=>{
      if(!res?.ok) return setErr(res?.error||"Chyba");
      setScanPreview(null);
      setAcqHadAny(true);
      setScanOn(false);
      setAcqMoreOpen(true);
    });
  }

  function rejectScannedCard(){
    setScanPreview(null);
    // back to scanner immediately
    setScanOn(false);
    setTimeout(()=>{ setScanOn(true); }, 200);
  }

  // derived display amounts
  const mlAmount = gs?.biz?.mlBids?.[playerId]?.amountUsd;
  const aucEntry = gs?.biz?.auction?.entries?.[playerId] || null;
  const aucShownBid = (aucEntry?.usedLobbyist && aucEntry?.finalCommitted) ? aucEntry?.finalBidUsd : aucEntry?.bidUsd;
  const cryptoDelta = gs?.crypto?.entries?.[playerId]?.deltaUsd;
  const settleAmount = gs?.settle?.entries?.[playerId]?.settlementUsd;

  // Golden rule / UX: Remove redundant phase text under the brand.

  const markets = gs?.catalog?.markets || [];
  const locks = gs?.biz?.marketLocks || {};
  const myMove = gs?.biz?.move?.[playerId];
  const acqEntry = gs?.biz?.acquire?.entries?.[playerId] || null;
  const acqNoScanCommitted = !!acqEntry?.committed && acqEntry?.gotCard===false;

  // Tabs content data
  const myInv = gs?.inventory?.[playerId] || { investments:[], miningFarms:[], experts:[] };
  const myReveals = gs?.reveals?.[playerId] || { globalYearsRevealed:[], cryptoYearsRevealed:[] };

  if(err){
    // keep minimal
  }

  return (
    <div className="screen">
      <div className="topHeader">
        <div className="topHeaderRow">
          <div>
            <div className="brand">KRYPTOPOLY</div>
            {gs?.year ? (
              <div className="brandSub">Rok {gs.year} — Základní cena {getBasePriceForYear(gs.year)} USD</div>
            ) : null}
          </div>
          <div className="topHeaderRight">
            {/* intentionally empty: frees the top-right corner for GM and other critical controls */}
          </div>
        </div>
        <PhaseBar phase={gs?.phase} bizStep={gs?.bizStep} />
      </div>

      {isGM && gs?.status==="IN_PROGRESS" ? (
        <div className="gmFabFixed">
          <button
            className={"gmFab "+(readiness.isGreen?"gmGreen":"gmRed")}
            onClick={()=>{
              if(readiness.isGreen){
                gmNext();
              }else{
                setGmPanelOpen(true);
              }
            }}
            aria-label="GM – další fáze"
          >
            GM <span className="gmCount">{readiness.ready}/{readiness.total}</span>
          </button>
        </div>
      ) : null}

      {err ? <div className="toast" onClick={()=>setErr("")}>{err}</div> : null}

      <div className="content">
        {!gs ? (
          <div className="card"><div className="muted">Načítám hru…</div></div>
        ) : gs.status==="GAME_OVER" ? (
          <div className="card center">
            <div style={{fontSize:28, fontWeight:900}}>Konec hry</div>
            <div className="muted">Díky za testování.</div>
          </div>
        ) : gs.phase==="BIZ" && gs.bizStep==="ML_BID" ? (
          <div className="card phaseCard">
            <div className="phaseHeader">
              <div className="phaseLeft">
                <div className="phaseIcon" aria-hidden="true"><MonoIcon name="crown" size={48} /></div>
                <div>
                  <div className="phaseTitle">Market Leader</div>
                  <div className="phaseSub">Zadej nabídku v USD. Po potvrzení se displej automaticky skryje.</div>
                </div>
              </div>
            </div>

            {/* golden rule: keep button styling (classes) identical; only change layout */}
            <div className="formRow stackConfirm">
              <input
                className="inputBig"
                inputMode="numeric"
                placeholder="0"
                maxLength={8}
                value={mlBid}
                onChange={(e)=>setMlBid(e.target.value.replace(/[^\d]/g,""))}
              />
              <button className="primaryBtn big full" onClick={()=>commitML(mlBid===""?0:Number(mlBid))}>Potvrdit</button>
              <button className="secondaryBtn big full" onClick={()=>commitML(null)}>Nechci být ML</button>
            </div>
          </div>
        ) : gs.phase==="BIZ" && gs.bizStep==="MOVE" ? (
          <div className="card phaseCard">
            <div className="phaseHeader">
              <div className="phaseLeft">
                <div className="phaseIcon" aria-hidden="true"><MonoIcon name="pin" size={48} /></div>
                <div>
                  <div className="phaseTitle">Výběr trhu</div>
                  <div className="phaseSub">Vyber trh. Jakmile klikneš, trh zmizí ostatním. Volba je definitivní.</div>
                </div>
              </div>
            </div>
            {(() => {
              const year = Number(gs?.year || 1);
              const myMarketId = getMe(gs, playerId)?.marketId || null;

              const CONT_LABEL = (c)=>{
                if(c==="N_AMERICA") return ["Sev.","Amerika"];
                if(c==="S_AMERICA") return ["Již.","Amerika"];
                if(c==="EUROPE") return ["Evropa"];
                if(c==="AFRICA") return ["Afrika"];
                if(c==="ASIA") return ["Asie"];
                if(c==="OCEANIA") return ["Austrálie"];
                return [String(c||"")];
              };

              // Variant A: continent has exactly 2 market types (Bible mapping)
              const CONT_TYPES = {
                N_AMERICA: ["INDUSTRY","MINING"],
                S_AMERICA: ["MINING","AGRO"],
                EUROPE: ["INDUSTRY","AGRO"],
                AFRICA: ["MINING","AGRO"],
                ASIA: ["INDUSTRY","MINING"],
                OCEANIA: ["INDUSTRY","AGRO"],
              };

              const TYPE_UI = (t)=>{
                const x = String(t||"").toUpperCase();
                if(x==="INDUSTRY") return { key:"industry", icon:"industry" };
                if(x==="MINING") return { key:"mining", icon:"mining" };
                if(x==="AGRO") return { key:"agri", icon:"agri" };
                return { key:"industry", icon:"industry" };
              };

              const mkMarketId = (continent, type)=> `${continent}_${type}`;

              const parseMy = ()=>{
                const id = String(myMarketId||"");
                if(id.startsWith("FARM_")) return { kind:"FARM", slot: Number(id.split("_")[1]||0) };
                const parts = id.split("_");
                if(parts.length>=2){
                  const continent = parts.slice(0, parts.length-1).join("_");
                  const type = parts[parts.length-1];
                  return { kind:"MARKET", continent, type };
                }
                return { kind:"UNKNOWN" };
              };
              const myParsed = parseMy();

              // Pandemic filtering (global trend 15 / key PANDEMIC_CONTINENT_LOCK)
              const yKey = String(year);
              const globals = gs?.trends?.byYear?.[yKey]?.globals || [];
              const pandemic = globals.some(t => t?.key==="PANDEMIC_CONTINENT_LOCK");
              const pandemicProtected = !!gs?.lawyer?.protections?.[playerId]?.[year]?.["PANDEMIC_CONTINENT_LOCK"];

              const myContinent = (myParsed.kind==="MARKET") ? myParsed.continent : null;
              const otherOnMyContinent = myContinent ? (gs.players||[]).some(p=>{
                if(p.playerId===playerId) return false;
                const mid = String(p.marketId||"");
                return mid.startsWith(myContinent+"_");
              }) : false;

              const canChooseOutsideContinent = !(pandemic && !pandemicProtected);
              const mustStaySameMarket = (pandemic && !pandemicProtected && otherOnMyContinent);

              const continentOrder = ["N_AMERICA","S_AMERICA","EUROPE","AFRICA","ASIA","OCEANIA"];

              const isLockedByOther = (marketId)=>{
                // Live locks (disappear immediately when someone picks)
                const lockedBy = locks?.[marketId] || null;
                if(!!lockedBy && lockedBy !== playerId) return true;
                return false;
              };

              const isMinePosition = (marketId)=> String(myMarketId||"")===String(marketId||"");

              const pickIfAllowed = (marketId)=>{
                if(!!myMove?.committed) return;
                pickMarket(marketId);
              };

              const renderSquare = ({ marketId, uiKey, icon, aria })=>{
                if(isLockedByOther(marketId) && !isMinePosition(marketId)) return null; // must disappear for others
                const disabled = !!myMove?.committed || (isLockedByOther(marketId) && !isMinePosition(marketId));
                return (
                  <button
                    key={marketId}
                    className={"moveSquare "+uiKey}
                    disabled={disabled}
                    onClick={()=>pickIfAllowed(marketId)}
                    aria-label={aria}
                    title={aria}
                  >
                    <MonoIcon name={icon} size={34} />
                  </button>
                );
              };

              return (
                <div className="moveTable">
                  {continentOrder.map(cont=>{
                    const parts = CONT_LABEL(cont);
                    // Pandemic: without lawyer, show only own continent.
                    if(!canChooseOutsideContinent && myContinent && cont!==myContinent) return null;

                    const types = (CONT_TYPES[cont]||[]).slice();
                    // keep left-to-right order Industry -> Mining -> Agri
                    const order = { INDUSTRY:0, MINING:1, AGRO:2 };
                    types.sort((a,b)=>(order[a]??9)-(order[b]??9));

                    let allowedTypes = types;
                    if(mustStaySameMarket && cont===myContinent && myParsed.kind==="MARKET"){
                      // Only current market is allowed if another player is on the same continent (pandemic, no lawyer)
                      allowedTypes = types.filter(t => mkMarketId(cont,t)===myMarketId);
                    }

                    const squares = allowedTypes.map(t=>{
                      const mid = mkMarketId(cont, t);
                      const ui = TYPE_UI(t);
                      return renderSquare({ marketId: mid, uiKey: ui.key, icon: ui.icon, aria: `${parts.join(" ")} – ${t}` });
                    }).filter(Boolean);

                    return (
                      <div key={cont} className="moveRow">
                        <div className="moveContinent" aria-label={parts.join(" ")}>
                          {parts[0]}{parts[1]?<><br/>{parts[1]}</>:null}
                        </div>
                        <div className="moveSquares">
                          {squares}
                        </div>
                      </div>
                    );
                  })}

                  {/* Mining farms row (only in MOVE, always visible). */}
                  <div className="moveRow">
                    <div className="moveContinent" aria-label="Farmy">Farmy</div>
                    <div className="moveSquares">
                      {[1,2,3].map(slot=>{
                        const mid = `FARM_${slot}`;
                        if(isLockedByOther(mid) && !isMinePosition(mid)) return null;
                        const disabled = !!myMove?.committed || (isLockedByOther(mid) && !isMinePosition(mid));
                        return (
                          <button
                            key={mid}
                            className="moveSquare farm"
                            disabled={disabled}
                            onClick={()=>pickIfAllowed(mid)}
                            aria-label={`Mining farma ${slot}`}
                            title={`Mining farma ${slot}`}
                          >
                            <div className="farmInner">
                              <MonoIcon name="btc" size={30} />
                              <div className="farmNum">{slot}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
})()}
          </div>
        ) : gs.phase==="BIZ" && gs.bizStep==="AUCTION_ENVELOPE" ? (
          <div className="card phaseCard">
            <div className="phaseHeader">
              <div className="phaseLeft">
                <div className="phaseIcon" aria-hidden="true"><MonoIcon name="envelope" size={48} /></div>
                <div>
                  <div className="phaseTitle">Dražba – obálka</div>
                  <div className="phaseSub">Zadej nabídku v USD, nebo zvol neúčast. Pokud máš lobbistu, můžeš získat „poslední šanci“.</div>
                </div>
              </div>
            </div>

            {gs?.biz?.auction?.result ? (
              <div className="auditBlock" style={{marginBottom:12}}>
                <div className="auditHeadline">
                  <div className="auditHint">Výsledek dražby</div>
                  <div className="auditSum pos">{gs.biz.auction.result.winnerPlayerId ? `${(gs.players||[]).find(p=>p.playerId===gs.biz.auction.result.winnerPlayerId)?.name || 'Hráč'} vyhrál` : 'Nikdo nedražil'}</div>
                </div>
                {gs.biz.auction.result.winnerPlayerId ? (
                  <div className="muted" style={{marginTop:8}}>Vítězná nabídka: <b>{gs.biz.auction.result.amountUsd} USD</b>. Při shodě rozhodl dřívější čas zadání.</div>
                ) : null}
              </div>
            ) : null}

            {!aucEntry?.committed ? (
              <>
                <div className="formRow stackConfirm">
                  <input
                    className="inputBig"
                    inputMode="numeric"
                    placeholder="1000"
                    maxLength={9}
                    value={aucBid}
                    onChange={(e)=>setAucBid(e.target.value.replace(/[^\d]/g,""))}
                  />
                  <button className="primaryBtn big full" onClick={()=>commitAuction(aucBid===""?null:Number(aucBid), false)}>Potvrdit</button>
                </div>

                <button className="secondaryBtn big full" onClick={()=>commitAuction(null, false)}>Nechci dražit</button>

                {(()=>{
                  const hasLobbyist = (myInv?.experts||[]).some(e=>e.functionKey==="LOBBY_LASTCALL");
                  return (
                    <button
                      className={"secondaryBtn big full"+(hasLobbyist?"":" disabled")}
                      disabled={!hasLobbyist}
                      style={hasLobbyist?{background:"#7a0f0f",borderColor:"#ff2a2a"}:{}}
                      onClick={()=>commitAuction(null, true)}
                    >
                      {hasLobbyist?"Lobbista podá nabídku":"Nemáš lobbistu"}
                    </button>
                  );
                })()}
              </>
            ) : (
              <>
                {gs.biz.auction.lobbyistPhaseActive && aucEntry?.usedLobbyist && !aucEntry?.finalCommitted ? (
                  <div className="cardInner">
                    <div className="muted"><b>Lobbista</b> – vidíš výsledky 1. kola. Nyní zvol finální rozhodnutí.</div>

                    <div className="auditTable" style={{marginTop:12}}>
                      {(gs.players||[]).map(p=>{
                        const e = gs.biz.auction.entries?.[p.playerId];
                        const txt = e?.usedLobbyist ? "Použit Lobbista" : (e?.bidUsd==null ? "Nechci dražit" : `${e.bidUsd} USD`);
                        return (
                          <div key={p.playerId} className="auditRow">
                            <div className="auditLbl">{p.name}</div>
                            <div className="auditVal neu">{txt}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="formRow" style={{marginTop:12}}>
                      <input className="inputBig" inputMode="numeric" placeholder="0" maxLength={8} value={aucFinalBid} onChange={(e)=>setAucFinalBid(e.target.value.replace(/[^\d]/g,""))} />
                      <button className="primaryBtn big" onClick={()=>commitFinalAuction(aucFinalBid===""?0:Number(aucFinalBid))}>Potvrdit</button>
                    </div>
                    <button className="secondaryBtn big full" onClick={()=>commitFinalAuction(null)} style={{marginTop:10}}>Nechci dražit</button>
                  </div>
                ) : (
                  <div className="muted">Obálka odeslána. (Telefon je skrytý – můžeš odkryt ručně.)</div>
                )}
              </>
            )}
          </div>
        ) : gs.phase==="BIZ" && gs.bizStep==="ACQUIRE" ? (
          <div className="card phaseCard">
            <div className="phaseHeader">
              <div className="phaseLeft">
                <div className="phaseIcon" aria-hidden="true"><MonoIcon name="camera" size={48} /></div>
                <div>
                  <div className="phaseTitle">Akvizice</div>
                  <div className="phaseSub">Definitivně potvrď, zda jsi získal kartu. Pokud ano, naskenuj QR kód (můžeš vícekrát).</div>
                </div>
              </div>
            </div>

            <div className="ctaRow" style={{marginTop:10}}>
              {(!acqNoScanCommitted && !acqNoScanLocal) ? (
                <button className="primaryBtn big full" onClick={()=>{ setScanErr(""); setScanOn(true); }}>
                  Získat kartu
                </button>
              ) : null}

              {(!acqNoScanCommitted && !acqNoScanLocal) ? (
                <button className="secondaryBtn big full" onClick={()=>{ setAcqNoScanLocal(true); setScanOn(false); setScanPreview(null); commitAcquire({ gotCard:false }); }}>
                  Nebudu skenovat
                </button>
              ) : (
                <button className="secondaryBtn big full" disabled>
                  Čekám na ostatní hráče
                </button>
              )}
            </div>

            {acqHadAny ? (
              <div className="muted" style={{marginTop:10}}>✅ Alespoň jedna karta byla naskenována. Dokonči akvizice odpovědí „NE“ v dotazu „Máš toho víc?“.</div>
            ) : (
              <div className="muted" style={{marginTop:10}}>Pokud jsi získal kartu, klikni na „Získal jsem kartu“ a naskenuj QR kód.</div>
            )}
          </div>
        ) : gs.phase==="CRYPTO" ? (
          <div className="card phaseCard">
            <div className="phaseHeader">
              <div className="phaseLeft">
                <div className="phaseIcon" aria-hidden="true"><MonoIcon name="btc" size={48} /></div>
                <div>
                  <div className="phaseTitle">Kryptoburza</div>
                  <div className="phaseSub">Naklikej změny v kusech. Pak potvrď. Ukazovací režim skryje detaily.</div>
                </div>
              </div>
            </div>
            {/* UX: confirm + total must be visible before the table */}
            <button className="primaryBtn full" onClick={commitCrypto}>Potvrdit transakci</button>
            <div className="cryptoTotal" style={{marginTop:10}}>
              {(()=>{
                const total = ["BTC","ETH","LTC","SIA"].reduce((acc,sym)=> acc + (-(cryptoD[sym]||0) * (gs.crypto?.rates?.[sym]||0)), 0);
                const cls = total>0?"pos":total<0?"neg":"neu";
                const txt = total>0?`+${total} USD`:total<0?`${total} USD`:`0 USD`;
                return <div className={"cryptoTotalVal "+cls}>Celkem: {txt}</div>;
              })()}
            </div>

            <div className="cryptoList" style={{marginTop:12}}>
              {["BTC","ETH","LTC","SIA"].map(sym=>{
                const rate = gs.crypto?.rates?.[sym] || 0;
                const val = cryptoD[sym] || 0;
                const owned = me?.wallet?.crypto?.[sym] ?? 0;
                const lineUsd = -val * rate; // positive = gain (sell), negative = cost (buy)
                return (
                  <div key={sym} className="cryptoRow">
                    <div className="cryptoMeta">
                      <div className="cryptoSym">{sym}</div>
                      <div className="cryptoMetaLine">
                        <div className="muted">{rate} USD/ks</div>
                        <div className="cryptoOwnedWrap">
                          <div className="cryptoOwnedLabel">Vlastním</div>
                          <div className="cryptoOwned">{owned}</div>
                        </div>
                      </div>
                    </div>
                    <div className="cryptoCtrls">
                      <button
                        className="ghostBtn"
                        onClick={()=>{
                          const next = val-1;
                          // selling (negative) cannot exceed owned
                          if(next < 0 && Math.abs(next) > owned) return;
                          setCryptoD({...cryptoD, [sym]: next});
                        }}
                      >−</button>
                      <div className="cryptoVal">{val}</div>
                      <button
                        className="ghostBtn"
                        onClick={()=>{
                          const next = val+1;
                          setCryptoD({...cryptoD, [sym]: next});
                        }}
                      >+</button>
                    </div>
                    <div className={"cryptoLineUsd "+(lineUsd>0?"pos":lineUsd<0?"neg":"neu")}>
                      {lineUsd>0?`+${lineUsd} USD`:lineUsd<0?`${lineUsd} USD`:`0 USD`}
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="ghostBtn full" onClick={()=>{ setCryptoD({BTC:0,ETH:0,LTC:0,SIA:0}); commitCrypto(); }}>Neobchoduji</button>
          </div>
        ) : gs.phase==="SETTLE" ? (
          <div className="card phaseCard">
            <div className="phaseHeader">
              <div className="phaseLeft">
                <div className="phaseIcon" aria-hidden="true"><MonoIcon name="receipt" size={48} /></div>
                <div>
                  {/* Spec: remove the word "Audit" from the screen title */}
                  <div className="phaseTitle">Finální vyúčtování</div>
                  <div className="phaseSub">Nejdřív potvrď vyúčtování. Pak můžeš povolat experty. Detail je důvěrný a odkrývá se až na vyžádání.</div>
                </div>
              </div>
              <button className="ghostBtn" onClick={()=>setTab("accounting")}>Účetnictví</button>
            </div>

            {(() => {
              const entry = gs?.settle?.entries?.[playerId];
              const committed = !!entry?.committed;
              const activePlayers = (gs?.players||[]).filter(p=>p.role!=="GM");
              const allCommitted = activePlayers.length ? activePlayers.every(p=>gs?.settle?.entries?.[p.playerId]?.committed) : false;
              const view = committed ? entry : auditPreview;
              const sum = view?.settlementUsd;
              const breakdown = view?.breakdown || [];
              const inv = gs?.inventory?.[playerId] || { experts:[] };
              const usable = (inv.experts||[]).filter(e=>!e.used && (e.functionKey==="STEAL_BASE_PROD" || e.functionKey==="LAWYER_TRENDS"));

              return (
                <>
                  <div className="auditBlock">
                    {auditLoading && !committed ? (
                      <div className="muted">Počítám…</div>
                    ) : view?.error ? (
                      <div className="muted">{view.error}</div>
                    ) : (
                      <>
                        <div className="auditHeadline">
                          <div className="auditHint">Souhrn (USD)</div>
                          <div className={"auditSum "+((sum||0)>=0?"pos":"neg")}>{(sum||0)>=0?"+":""}{sum||0} USD</div>
                        </div>
                        <div className="auditTable">
                          {breakdown.length ? breakdown.map((b,idx)=> (
                            <div key={idx} className="auditRow">
                              <div className="auditLbl">{b.label}</div>
                              <div className={"auditVal "+(b.usd>0?"pos":b.usd<0?"neg":"neu")}>{b.usd>=0?"+":""}{b.usd} USD</div>
                            </div>
                          )) : <div className="muted">Rozpad není k dispozici.</div>}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="auditBlock" style={{marginTop:12}}>
                    <div className="auditHint">Veřejná částka vůči bance</div>
                    <div className="auditTable" style={{marginTop:8}}>
                      {activePlayers.map(p=>{
                        const publicEntry = gs?.settle?.entries?.[p.playerId];
                        const val = Number(publicEntry?.settlementUsd || 0);
                        return (
                          <div key={p.playerId} className="auditRow">
                            <div className="auditLbl">{p.name}</div>
                            <div className={"auditVal "+(publicEntry?.committed ? (val>0?"pos":val<0?"neg":"neu") : "neu")}>
                              {publicEntry?.committed ? `${val>=0?"+":""}${val} USD` : "Čeká se"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!committed ? (
                    <div className="ctaRow">
                      <button className="primaryBtn big full" onClick={commitSettle}>Zahájit audit</button>
                      {usable.length ? (
                        <button className="secondaryBtn big full" onClick={()=>setExpertsOpen(true)}>Povolat experty</button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="ctaRow">
                      <button className="primaryBtn big full" onClick={()=>setAuditPopupOpen(true)}>Finální vyúčtování</button>
                      {usable.length ? (
                        <button className="secondaryBtn big full" onClick={()=>setExpertsOpen(true)}>Povolat experty</button>
                      ) : null}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="card">
            <div className="muted">Čekám na GM…</div>
          </div>
        )}
      </div>

      <BottomBarWrapper disabled={uiLocked}>
        <BottomBar onTab={setTabSafe} active={tab} />
      </BottomBarWrapper>

      {gmPanelOpen && isGM && gs?.status==="IN_PROGRESS" ? (
        <GMTopModal title="GM potvrzení" onClose={()=>setGmPanelOpen(false)}>
          <div className="gmPanel">
            <div className="muted" style={{marginBottom:12}}>
              Tlačítko je červené: ne všichni hráči potvrdili definitivní rozhodnutí.
              <br/><b>Stav:</b> {readiness.ready}/{readiness.total}
              {gs?.phase==="BIZ" && gs?.bizStep==="MOVE" ? (
                <>
                  <br/><b>Pozor:</b> Ve fázi Výběr trhu by se nemělo pokračovat, dokud nejsou všichni hotovo.
                </>
              ) : null}
            </div>
            <div className="ctaRow">
              <button className="secondaryBtn big full" onClick={()=>{ gmBack(); setGmPanelOpen(false); }}>← Zpět</button>
              <button className="primaryBtn big full gmNextBtn" onClick={()=>{ gmNext(); setGmPanelOpen(false); }}>Přesto pokračovat →</button>
            </div>
          </div>
        </GMTopModal>
      ) : null}

      {/* Acquisition: scanner (small QR-friendly) */}
      {scanOn && gs?.phase==="BIZ" && gs?.bizStep==="ACQUIRE" ? (
        <SuperTopModal title="Skener QR" onClose={()=>{ setScanOn(false); setScanErr(""); }}>
          {scanErr ? <div className="notice">{scanErr}</div> : null}
          <div className="scanFrame">
            <video ref={videoRef} className="scanVideo" playsInline />
            <div className="scanHint">Zaměř malý QR kód</div>
          </div>
          <div className="muted" style={{marginTop:10}}>Tip: přibliž telefon k QR a drž ho chvíli v klidu (ostření).</div>
          <button className="ghostBtn full" style={{marginTop:12}} onClick={()=>{ setScanOn(false); setScanErr(""); }}>Zavřít skener</button>
        </SuperTopModal>
      ) : null}

      {/* Acquisition: "Máš toho víc" loop */}
      {acqMoreOpen && gs?.phase==="BIZ" && gs?.bizStep==="ACQUIRE" ? (
        <Modal title="Máš toho víc?" onClose={()=>setAcqMoreOpen(false)}>
          <div className="muted">Pokud máš další kartu, dej ANO a pokračuj ve skenování. Pokud už ne, dej NE – to je definitivní rozhodnutí.</div>
          <div className="ctaRow" style={{marginTop:12}}>
            <button className="secondaryBtn big full" onClick={()=>{ setAcqMoreOpen(false); setScanErr(""); setScanOn(true); }}>ANO</button>
            <button className="primaryBtn big full" onClick={()=>{ setAcqMoreOpen(false); commitAcquire({ gotCard:true }); }}>NE</button>
          </div>
        </Modal>
      ) : null}

      {/* Acquisition: scanned card confirmation (always top) */}
      {scanPreview?.card ? (
        <SuperTopModal
          title={scanPreview.card.kind==="INVESTMENT" ? "Tradiční investice" : scanPreview.card.kind==="MINING_FARM" ? "Mining farma" : "Expert"}
          onClose={()=>{ setScanPreview(null); setScanOn(false); }}
        >
          <div style={{display:"grid",gap:10}}>
            <div className="cardInner">
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:900,fontSize:18}}>{scanPreview.card.name}</div>
                  <div className="muted">ID: {scanPreview.card.cardId}</div>
                </div>
                <div className="pill">{scanPreview.card.kind.replace("_"," ")}</div>
              </div>
              {scanPreview.card.kind==="INVESTMENT" ? (
                <div className="muted" style={{marginTop:8}}>
                  Kontinent: <b>{scanPreview.card.continent}</b> • Trh: <b>{scanPreview.card.market}</b> • Typ: <b>{scanPreview.card.type}</b>
                  <br/>Základní produkce: <b>+{scanPreview.card.usdProduction} USD</b>
                </div>
              ) : scanPreview.card.kind==="MINING_FARM" ? (
                <div className="muted" style={{marginTop:8}}>
                  Krypto: <b>{scanPreview.card.crypto}</b> • Produkce: <b>+{scanPreview.card.cryptoProduction} ks/rok</b>
                  <br/>Elektřina: <b>-{scanPreview.card.electricityUSD} USD</b>
                </div>
              ) : (
                <div className="muted" style={{marginTop:8}}>
                  Funkce: <b>{scanPreview.card.functionLabel}</b>
                  <br/>{scanPreview.card.functionDesc}
                </div>
              )}
            </div>

            <div className="ctaRow">
              <button className="primaryBtn full" onClick={()=>acceptScannedCard(scanPreview.card.cardId)}>✅ Ano, to je moje</button>
              <button className="ghostBtn full" onClick={rejectScannedCard}>✖ Ne, chyba</button>
            </div>
          </div>
        </SuperTopModal>
      ) : null}


      {/* NOTE: trend/regional detail overlays are rendered at the very end (superTop) so they always stay above other modals. */}

      {/* MOVE: definitive confirmation (cannot be closed; disappears on phase change) */}
      {uiLocked ? (()=>{
        const marketId = gs?.biz?.move?.[playerId]?.marketId;
        const m = (gs?.catalog?.markets||[]).find(x=>x.marketId===marketId) || null;
        const contLabel = (c)=>{
          const x = String(c||"");
          if(x==="N_AMERICA") return "Severní Amerika";
          if(x==="S_AMERICA") return "Jižní Amerika";
          if(x==="EUROPE") return "Evropa";
          if(x==="AFRICA") return "Afrika";
          if(x==="ASIA") return "Asie";
          if(x==="OCEANIA") return "Austrálie";
          return x;
        };
        const contIcon = (c)=>{
          const x = String(c||"");
          if(x==="N_AMERICA") return "n_america";
          if(x==="S_AMERICA") return "s_america";
          if(x==="EUROPE") return "europe";
          if(x==="AFRICA") return "africa";
          if(x==="ASIA") return "asia";
          if(x==="OCEANIA") return "oceania";
          return "pin";
        };
        const kindOf = ()=>{
          const t = `${m?.type || ""} ${m?.name || ""}`.toLowerCase();
          if(t.includes("průmys") || t.includes("prumys") || t.includes("industry")) return "industry";
          if(t.includes("těž") || t.includes("tez") || t.includes("mining") || t.includes("těža")) return "mining";
          if(t.includes("země") || t.includes("zeme") || t.includes("agri") || t.includes("agriculture")) return "agri";
          return "industry";
        };
        const typeLabel = (k)=> k==="industry" ? "Průmysl" : k==="mining" ? "Těžba" : "Zemědělství";
        const k = kindOf();
        return (
          <div className="lockBackdrop" aria-label="Definitivní výběr trhu">
            <div className="lockModal">
              <div className="lockTitle">Definitivní výběr trhu</div>
              <div className="lockSub">Ukaž tento displej ostatním hráčům. Okno se zavře až při posunu do další fáze.</div>
              <div className="lockChoice">{`${contLabel(m?.continent)} – ${typeLabel(k)}`}</div>

              <div className="lockArt" aria-hidden="true">
                <div className="lockContinent">
                  <MonoIcon name={contIcon(m?.continent)} size={168} className="lockContinentSvg" />
                </div>
                <div className={"lockBadgeSquare "+k}>
                  <MonoIcon name={k} size={64} />
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {/* privacy overlays */}
      <PrivacyCard
        kind="ML"
        mode={(gs?.phase==="BIZ" && gs?.bizStep==="ML_BID" && gs?.biz?.mlBids?.[playerId]?.committed) ? mlPrivacy : "edit"}
        amountText={(mlAmount==null) ? "NECHCI" : `${mlAmount} USD`}
        onReveal={()=>setMlPrivacy("reveal")}
        onHide={()=>setMlPrivacy("hidden")}
      />
      <PrivacyCard
        kind="AUCTION"
        mode={(() => {
          const committed = !!gs?.biz?.auction?.entries?.[playerId]?.committed;
          const isLobbyistFinal = !!gs?.biz?.auction?.lobbyistPhaseActive && !!gs?.biz?.auction?.entries?.[playerId]?.usedLobbyist && !gs?.biz?.auction?.entries?.[playerId]?.finalCommitted;
          if(gs?.phase==="BIZ" && gs?.bizStep==="AUCTION_ENVELOPE" && committed && !isLobbyistFinal) return aucPrivacy;
          return "edit";
        })()}
        amountText={(aucShownBid==null) ? "NECHCI" : `${aucShownBid} USD`}
        onReveal={()=>setAucPrivacy("reveal")}
        onHide={()=>setAucPrivacy("hidden")}
      />
      <PrivacyCard
        kind="CRYPTO"
        mode={(gs?.phase==="CRYPTO" && gs?.crypto?.entries?.[playerId]?.committed) ? cryptoPrivacy : "edit"}
        amountText={`${cryptoDelta>0?"+":""}${cryptoDelta||0} USD`}
        onReveal={()=>setCryptoPrivacy("reveal")}
        onHide={()=>setCryptoPrivacy("hidden")}
      />

      {/* Tabs */}
      {tab==="trends" ? (
        <Modal title="Trendy" onClose={()=>setTab(null)}>
          <TrendsPanel gs={gs} playerId={playerId} onOpenTrend={(t)=>setTrendModal(t)} onOpenRegional={(t)=>setRegionalModal(t)} onRevealGlobal={()=>s.emit("reveal_global_next_year",{gameId,playerId},()=>{})} onRevealCrypto={()=>s.emit("reveal_crypto_next_year",{gameId,playerId},()=>{})} />
        </Modal>
      ) : null}

      {tab==="assets" ? (
        <Modal title="Karty" onClose={()=>setTab(null)}>
          <CardsPanel inv={myInv} />
        </Modal>
      ) : null}

      {tab==="accounting" ? (
        <Modal title="Peněženka" onClose={()=>setTab(null)}>
          <AccountingPanel gs={gs} playerId={playerId} gameId={gameId} />
        </Modal>
      ) : null}

      {/* V33.1: Audit popup (privacy-first) */}
      {gs?.phase==="SETTLE" && auditPopupOpen ? (
        <SuperTopModal title="" onClose={()=>setAuditPopupOpen(false)}>
          {(() => {
            const entry = gs?.settle?.entries?.[playerId];
            const committed = !!entry?.committed;
            const activePlayers = (gs?.players||[]).filter(p=>p.role!=="GM");
            const allCommitted = activePlayers.length ? activePlayers.every(p=>gs?.settle?.entries?.[p.playerId]?.committed) : false;

            const canReveal = allCommitted;
            const sum = entry?.settlementUsd ?? 0;

            return (
              <div className="auditPopupWrap">
                <div
                  className={"auditPopupPanel "+(allCommitted?"ready":"waiting")}
                  onClick={()=>{ if(allCommitted) setAuditDetailOpen(true); }}
                  role={allCommitted?"button":undefined}
                  tabIndex={allCommitted?0:undefined}
                >
                  {allCommitted ? (
                    <div className="auditPopupIcon" aria-hidden="true">
                      <MonoIcon name="receipt" size={144} className="auditPopupIconRed" />
                    </div>
                  ) : null}

                  <div className="auditPopupText">
                    <div className="auditPopupHeadline">
                      {allCommitted ? "Detailní vyúčtování – důvěrné" : "Čeká se na audit ostatních hráčů"}
                    </div>

                    {allCommitted && auditPopupRevealed ? (
                      <div className="auditPopupAmount">{sum>=0?"+":""}{sum} USD</div>
                    ) : null}
                  </div>
                </div>

                                <div className="ctaRow" style={{marginTop:12}}>
                  {allCommitted && auditPopupRevealed ? (
                    <button
                      className="secondaryBtn big full"
                      onClick={()=>{ setAuditPopupRevealed(false); }}
                      title="Skrýt"
                    >
                      Skrýt
                    </button>
                  ) : (
                    <button
                      className={"primaryBtn big full"+(canReveal?"":" disabled")}
                      onClick={()=>{ if(!canReveal) return; setAuditPopupRevealed(true); }}
                      disabled={!canReveal}
                      title={!canReveal ? "Čekám na audit ostatních hráčů" : "Odkrýt"}
                    >
                      Odkrýt
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </SuperTopModal>
      ) : null}

      {auditDetailOpen && gs?.phase==="SETTLE" ? (
        <SuperTopModal title="Detailní vyúčtování – důvěrné" onClose={()=>setAuditDetailOpen(false)}>
          {(() => {
            const entry = gs?.settle?.entries?.[playerId];
            const sum = entry?.settlementUsd ?? 0;
            const breakdown = entry?.breakdown || [];
            const inv = gs?.inventory?.[playerId] || { investments:[], miningFarms:[], experts:[] };

            // Crypto production summary
            const prod = { BTC:0, ETH:0, LTC:0, SIA:0 };
            for(const mf of (inv.miningFarms||[])){
              const sym = mf.crypto;
              if(sym && prod[sym]!=null) prod[sym] += Number(mf.cryptoProduction||0);
            }
            const hasFarms = (inv.miningFarms||[]).length>0;
            const rates = gs?.crypto?.rates || {};

            return (
              <div style={{display:"grid",gap:14}}>
                <div className={"bigNumber "+(sum>=0?"pos":"neg")}>{sum>=0?"+":""}{sum} USD</div>

                <div className="secTitle">USD</div>
                <div className="list">
                  {breakdown.length ? breakdown.map((b, idx)=> (
                    <div key={idx} className="listItem" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>{b.label}</div>
                      <div style={{fontWeight:900}}>{b.usd>=0?"+":""}{b.usd} USD</div>
                    </div>
                  )) : <div className="muted">Rozpad není k dispozici.</div>}
                </div>

                <div className="secTitle">Krypto</div>
                {!hasFarms ? (
                  <div className="muted">Nemáš mining farmy</div>
                ) : (
                  <div className="list">
                    {(["BTC","ETH","LTC","SIA"]).map(sym=>{
                      const units = prod[sym]||0;
                      const usd = units * Number(rates?.[sym]||0);
                      return (
                        <div key={sym} className="listItem" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>{sym}: +{units} ks</div>
                          <div style={{fontWeight:900}}>{usd>=0?"+":""}{usd} USD</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </SuperTopModal>
      ) : null}

      {expertsOpen && gs?.phase==="SETTLE" ? (
        <SuperTopModal title="Povolat experty" onClose={()=>{ setExpertsOpen(false); setExpertPick(null); setExpertTarget(null); setExpertCard(null); }}>
          {(() => {
            const inv = gs?.inventory?.[playerId] || { experts:[] };
            const usable = (inv.experts||[]).filter(e=>!e.used && (e.functionKey==="STEAL_BASE_PROD" || e.functionKey==="LAWYER_TRENDS"));
            const others = (gs?.players||[]).filter(p=>p.playerId!==playerId && p.role!=="GM");

            function applyLobbyist(action){
              s.emit("apply_audit_lobbyist", { gameId, playerId, action, targetPlayerId: expertTarget }, (res)=>{
                if(!res?.ok) alert(res?.error || "Chyba");
                else {
                  setExpertsOpen(false);
                  setExpertPick(null); setExpertTarget(null); setExpertCard(null);
                }
              });
            }

            function activateShield(){
              s.emit("activate_audit_shield", { gameId, playerId }, (res)=>{
                if(!res?.ok) alert(res?.error || "Chyba");
                else {
                  setExpertsOpen(false);
                  setExpertPick(null); setExpertTarget(null); setExpertCard(null);
                }
              });
            }

            const step = !expertPick ? 1 : (!expertTarget ? 2 : 3);

            return (
              <div className="expertModal">
                {!usable.length ? (
                  <div className="muted">Nemáš žádného použitelného experta.</div>
                ) : null}

                {!expertPick ? (
                  <div className="cardsGrid" style={{marginTop:6}}>
                    {usable.map(e=>{
                      const icon = e.functionKey==="STEAL_BASE_PROD" ? "🕴️" : "⚖️";
                      return (
                        <button key={e.cardId} className="expertPickTile" onClick={()=>setExpertPick(e)}>
                          <div className="tileIcon">{icon}</div>
                          <div className="tileMeta">
                            <div className="tileTitle">{e.functionLabel}</div>
                            <div className="tileSub">{e.functionDesc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : expertPick.functionKey==="LAWYER_TRENDS" ? (
                  <div className="cardInner">
                    <div className="secTitle">Právník</div>
                    <div className="muted" style={{marginTop:6}}>Štít se aktivuje před zahájením auditu a chrání proti největší škodě od lobbistů v tomto auditu.</div>
                    <button className="primaryBtn big full" style={{marginTop:12}} onClick={activateShield}>Aktivovat štít</button>
                    <button className="secondaryBtn big full" onClick={()=>{ setExpertPick(null); }} style={{marginTop:10}}>Zpět</button>
                  </div>
                ) : (
                  <>
                    <div className="secTitle">{expertPick.functionLabel}</div>
                    <div className="muted" style={{marginTop:6}}>Vyber hráče a zvol akci lobbisty. Efekt se započítá do finálního auditu.</div>

                    {!expertTarget ? (
                      <div className="list" style={{marginTop:10}}>
                        {others.length ? others.map(p=>(
                          <button key={p.playerId} className="listItem clickable" onClick={()=>setExpertTarget(p.playerId)}>
                            <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                              <div><b>{p.name||"Hráč"}</b></div>
                              <div className="pill">vybrat</div>
                            </div>
                          </button>
                        )) : <div className="muted">Žádní další hráči.</div>}
                      </div>
                    ) : (
                      <div className="cardInner" style={{marginTop:10}}>
                        <div className="secTitle">Akce lobbisty</div>
                        <div className="muted" style={{marginTop:6}}>Jeden lobbista lze použít jen jednou: buď sabotér (−50 % produkce z tradičních investic), nebo zloděj (ukradne hodnotu nejvyšší základní produkce).</div>
                        <div className="ctaRow" style={{marginTop:12}}>
                          <button className="primaryBtn big full" onClick={()=>applyLobbyist("AUDIT_LOBBYIST_SABOTAGE")}>Sabotér</button>
                          <button className="primaryBtn big full" onClick={()=>applyLobbyist("AUDIT_LOBBYIST_STEAL")}>Zloděj</button>
                        </div>
                        <button className="secondaryBtn big full" onClick={()=>{ setExpertTarget(null); }} style={{marginTop:10}}>Změnit hráče</button>
                        <button className="secondaryBtn big full" onClick={()=>{ setExpertPick(null); setExpertTarget(null); setExpertCard(null); }} style={{marginTop:10}}>Zrušit</button>
                      </div>
                    )}
                  </>
                )}

                {expertPick ? (<div className="muted" style={{marginTop:10}}>Krok {step}/3</div>) : null}
              </div>
            );
          })()}
        </SuperTopModal>
      ) : null}

      {tab==="status" ? (
        <Modal title="Stav hry" onClose={()=>setTab(null)}>
          <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(gs, null, 2)}</pre>
        </Modal>
      ) : null}

      {mlTrendIntroOpen && gs?.phase==="BIZ" && gs?.bizStep==="ML_BID" ? (
        <SuperTopModal
          title="Nové trendy"
          onClose={()=>setMlTrendIntroOpen(false)}
          hideClose={true}
        >
          <NewTrendsMini
            gs={gs}
            onOpenTrend={(t)=>setTrendModal(t)}
            onOpenRegional={(t)=>setRegionalModal(t)}
            onClose={()=>setMlTrendIntroOpen(false)}
          />
        </SuperTopModal>
      ) : null}

      {trendModal ? (
        <SuperTopModal title={`${trendModal.icon||"🌐"} ${trendModal.name||"Trend"}`} onClose={()=>setTrendModal(null)}>
          <div className="modalText">
            {trendModal.desc ? trendModal.desc : "Detail trendu není k dispozici."}
          </div>

          {(() => {
            const inv = gs?.inventory?.[playerId] || { experts: [] };
            const lawyerLeft = (inv.experts||[]).filter(e=>e.functionKey==="LAWYER_TRENDS" && !e.used).length;
            const allowed = !!trendModal?.lawyer?.allowed;
            const req = trendModal?.lawyer?.phase;
            const phase = gs?.phase;
            const biz = gs?.bizStep;

            const canNow =
              allowed && (
                (req==="BIZ_TRENDS_ONLY" && phase==="BIZ" && biz==="ML_BID") ||
                (req==="BIZ_MOVE_ONLY" && phase==="BIZ" && biz==="MOVE") ||
                (req==="AUDIT_ANYTIME_BEFORE_CLOSE" && phase==="SETTLE")
              );

            const y = String(gs?.year||1);
            const protectedNow = !!gs?.lawyer?.protections?.[playerId]?.[y]?.[trendModal.key];

            function useLawyer(){
              const s = getSocket();
              s.emit("use_lawyer_on_trend", { gameId, playerId, trendKey: trendModal.key }, (res)=>{
                if(!res?.ok) alert(res?.error || "Chyba");
              });
            }

            const phaseHint =
              req==="BIZ_TRENDS_ONLY" ? "Právníka lze použít na začátku roku ve fázi Market Leader." :
              req==="BIZ_MOVE_ONLY" ? "Právníka lze použít pouze ve fázi Investice (pohyb)." :
              req==="AUDIT_ANYTIME_BEFORE_CLOSE" ? "Právníka lze použít kdykoliv před uzavřením Auditu." :
              "Právníka nelze použít.";

            return (
              <div className="lawyerBox">
                <div className="secTitle" style={{marginTop:12}}>Právník</div>

                {!allowed ? (
                  <div className="muted">Na tento trend nelze použít Právníka.</div>
                ) : protectedNow ? (
                  <div className="pill" style={{display:"inline-flex"}}>✅ Ochráněno (tento rok)</div>
                ) : lawyerLeft<1 ? (
                  <div className="muted">Právník není k dispozici.</div>
                ) : (
                  <>
                    <div className="muted">{phaseHint}</div>
                    <button className={"primaryBtn full"+(canNow? "":" disabled")} disabled={!canNow} onClick={useLawyer}>
                      Použít právníka
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </SuperTopModal>
      ) : null}

      {regionalModal ? (
        <SuperTopModal title={`${regionalModal.icon||"📍"} ${regionalModal.continent||"Kontinent"}`} onClose={()=>setRegionalModal(null)}>
          <div className="secTitle">{regionalModal.name||"Regionální trend"}</div>
          <div className="modalText" style={{marginTop:6}}>{regionalModal.desc || "Detail není k dispozici."}</div>
        </SuperTopModal>
      ) : null}
    </div>
  );
}

function TrendsPanel({ gs, playerId, onOpenTrend, onOpenRegional, onRevealGlobal, onRevealCrypto }){
  if(!gs?.trends) return <div className="muted">Trendy nejsou načtené.</div>;
  const yearsTotal = gs.config?.yearsTotal || 4;
  const currentYear = gs.year || 1;
  const byYear = gs.trends.byYear || {};
  const reveals = gs.reveals?.[playerId] || { globalYearsRevealed:[], cryptoYearsRevealed:[] };
  const gSet = new Set(reveals.globalYearsRevealed||[]);
  const cSet = new Set(reveals.cryptoYearsRevealed||[]);
  const inv = gs.inventory?.[playerId] || { experts:[] };
  const analystLeft = inv.experts.filter(e=>e.functionKey==="ANALYST" && !e.used).length;
  const guruLeft = inv.experts.filter(e=>e.functionKey==="CRYPTOGURU" && !e.used).length;

  const regCls = (t)=>{
    const k = String(t?.key||"");
    const n = String(t?.name||"").toLowerCase();
    if(k.includes("REG_INVESTMENT_BOOM") || n.includes("boom")) return "reg boom";
    if(k.includes("REG_HIGH_EDUCATION") || n.includes("vzdělan") || n.includes("vzdelan") ) return "reg edu";
    if(k.includes("REG_STABILITY") || n.includes("stabil")) return "reg stable";
    if(k.includes("REG_TAXES") || n.includes("dan")) return "reg tax";
    return "reg";
  };

  return (
    <div>
      <div className="muted" style={{marginBottom:10}}>
        Scrolluj doprava. Aktuální rok je odkrytý. Budoucí roky jsou rubem (❓). Odkrytí je jen pro tebe.
      </div>

      <div className="revealBar">
        <div className="revealChip">Analytik: <b>{analystLeft}</b></div>
        <button className={"primaryBtn"+(analystLeft<1?" disabled":"")} disabled={analystLeft<1} onClick={onRevealGlobal}>Odemkni Globální trendy</button>
        <div style={{width:12}}></div>
        <div className="revealChip">Kryptoguru: <b>{guruLeft}</b></div>
        <button className={"primaryBtn"+(guruLeft<1?" disabled":"")} disabled={guruLeft<1} onClick={onRevealCrypto}>Odemkni Kryptotrendy</button>
      </div>

      <div className="yearsScroller">
        {Array.from({length:yearsTotal}, (_,i)=>i+1).map(y=>{
          const data = byYear[String(y)];
          const isCurrentOrPast = y<=currentYear;
          const gRevealed = isCurrentOrPast || gSet.has(y);
          const cRevealed = isCurrentOrPast || cSet.has(y);

          return (
            <div key={y} className="yearCol">
              <div className="yearTitle">Rok {y}</div>

              <div className="secTitle">Globální trendy</div>
              <div className="cardRow">
                {data?.globals?.map((t)=>(
                  <TrendCard
                    key={t.trendId}
                    revealed={gRevealed}
                    title={t.name}
                    icon={<MonoIcon name={globalIconName(t)} size={34} />}
                    clickable={gRevealed}
                    onClick={()=> onOpenTrend && onOpenTrend(t)}
                  />
                ))}
              </div>

              <div className="secTitle">Kryptotrendy</div>
              <div className="cardRow">
                <CryptoTrendCard revealed={cRevealed} crypto={data?.crypto} />
              </div>

              <div className="secTitle">Regionální trendy</div>
              <div>
                {Object.values(data?.regional||{}).map((t)=>{
                  const rRevealed = isCurrentOrPast; // future regional trends are hidden (like global trends)
                  return (
                    <div key={t.trendId} className={"regRow"+(rRevealed?"":" back")}
                      role={rRevealed ? undefined : "presentation"}
                    >
                      <div className="regMeta">
                        <div className="regName">{t.continent}</div>
                        <div className={"regCont "+(rRevealed?"muted":"muted")}>{rRevealed ? t.name : "Skryté"}</div>
                      </div>
                      <button
                        className={"regSymBtn "+regCls(t)+(rRevealed?"":" disabled")}
                        disabled={!rRevealed}
                        onClick={rRevealed ? ()=>onOpenRegional && onOpenRegional(t) : undefined}
                        aria-label="Detail regionálního trendu"
                      >
                        <span className="regSymIcon">{rRevealed ? (t.icon || "📍") : "❓"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendsPreviewCard({ gs, onOpen, onOpenTrend, onOpenRegional }){
  const y = gs?.year || 1;
  const data = gs?.trends?.byYear?.[String(y)];

  const regCls = (t)=>{
    const k = String(t?.key||"");
    const n = String(t?.name||"").toLowerCase();
    if(k.includes("REG_INVESTMENT_BOOM") || n.includes("boom")) return "reg boom";
    if(k.includes("REG_HIGH_EDUCATION") || n.includes("vzdělan") || n.includes("vzdelan")) return "reg edu";
    if(k.includes("REG_STABILITY") || n.includes("stabil")) return "reg stable";
    if(k.includes("REG_TAXES") || n.includes("dan")) return "reg tax";
    return "reg";
  };
  return (
    <div className="card">
      <div className="titleRow">
        <div>
          <div className="title">Trendy • Rok {y}</div>
          <div className="muted">nové aktivní trendy</div>
        </div>
        <button className="ghostBtn" onClick={onOpen}>Všechny trendy</button>
      </div>

      <div className="trendPreview">
        <div className="trendPreviewBlock">
          <div className="secTitle">Globální trendy</div>
          <div className="previewRow">
            {(data?.globals||[]).map(t=>(
              <div key={t.trendId} className="previewCard clickable" onClick={()=>onOpenTrend && onOpenTrend(t)} role="button" tabIndex={0}>
                <div className="previewIcon"><MonoIcon name={globalIconName(t)} size={34} /></div>
                <div className="previewName">{t.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="trendPreviewBlock">
          <div className="secTitle">Kryptotrendy</div>
          <div className="previewRow">
            <CryptoTrendPreview crypto={data?.crypto} />
          </div>
        </div>

        <div className="trendPreviewBlock">
          <div className="secTitle">Regionální trendy</div>
          <div className="regionalMini">
            {Object.values(data?.regional||{}).map(t=>(
              <div key={t.trendId} className="regionalDot">
                <span>{t.continent}</span>
                <button className={"regSymBtn "+regCls(t)} onClick={()=>onOpenRegional && onOpenRegional(t)} aria-label="Detail regionálního trendu">
                  <span className="regSymIcon">{t.icon || "📍"}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTrendsMini({ gs, onOpenAll, onOpenTrend, onOpenRegional }){
  const y = gs?.year || 1;
  const data = gs?.trends?.byYear?.[String(y)];
  const globals = data?.globals || [];
  const crypto = data?.crypto || null;
  const regional = data?.regional || {};

  const regCls = (t)=>{
    const k = String(t?.key||"");
    const n = String(t?.name||"").toLowerCase();
    if(k.includes("REG_INVESTMENT_BOOM") || n.includes("boom")) return "reg boom";
    if(k.includes("REG_HIGH_EDUCATION") || n.includes("vzdělan") || n.includes("vzdelan")) return "reg edu";
    if(k.includes("REG_STABILITY") || n.includes("stabil")) return "reg stable";
    if(k.includes("REG_TAXES") || n.includes("dan")) return "reg tax";
    return "reg";
  };

  return (
    <div>
      <div className="muted" style={{marginTop:-6}}>Aktivní trendy pro tento rok (detail kdykoliv v záložce Trendy).</div>

      <div style={{marginTop:12}}>
        <div className="secTitle">Globální trendy</div>
        <div className="cardRow" style={{marginTop:10}}>
          {globals.length ? globals.map(t=>(
            <TrendCard
              key={t.trendId||t.key}
              revealed={true}
              title={t.name}
              icon={<MonoIcon name={globalIconName(t)} size={34} />}
              clickable={true}
              onClick={()=>onOpenTrend && onOpenTrend(t)}
            />
          )) : <div className="muted">—</div>}
        </div>
      </div>

      <div style={{marginTop:14}}>
        <div className="secTitle">Kryptotrendy</div>
        <div className="cardRow" style={{marginTop:10}}>
          <CryptoTrendCard revealed={true} crypto={crypto} />
        </div>
      </div>

      <div style={{marginTop:14}}>
        <div className="secTitle">Regionální trendy</div>
        <div style={{marginTop:8}}>
          {Object.values(regional).map(t=>(
            <div key={t.trendId||t.key} className="regRow">
              <div className="regMeta">
                <div className="regName">{t.continent}</div>
                <div className="regCont muted">{t.name}</div>
              </div>
              <button className={"regSymBtn "+regCls(t)} onClick={()=>onOpenRegional && onOpenRegional(t)} aria-label="Detail regionálního trendu">
                <span className="regSymIcon">{t.icon || "📍"}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      <button className="ghostBtn full" style={{marginTop:14}} onClick={onOpenAll}>Všechny trendy</button>
    </div>
  );
}

function globalSentiment(t){
  // 1..16 mapping per Kryptopoly UX bible
  const id = Number(t?.trendId ?? t?.id);
  // 🔴 negative
  if([1,2,4,5,6,8,11,15,16].includes(id)) return "neg";
  // 🟢 positive
  if([3,7,12,13].includes(id)) return "pos";
  // 🔵 depends
  return "mix";
}

function GlobalTrendTile({ t, onClick }){
  const s = globalSentiment(t);
  return (
    <button className={"gtTile "+s} onClick={onClick} aria-label={`Detail trendu: ${t?.name||"Trend"}`}>
      <div className="gtIconBox" aria-hidden="true">
        <MonoIcon name={globalIconName(t)} size={40} className="gtIcon" />
      </div>
      <div className="gtName">{t?.name || "Trend"}</div>
    </button>
  );
}

function CryptoInlineRow({ crypto }){
  const coeff = crypto?.coeff || {};
  const coins = ["BTC","ETH","LTC","SIA"];
  return (
    <div className="cryptoInlineRow">
      {coins.map(c=>{
        const k = Number(coeff[c] ?? 1);
        const a = arrowForCoeff(k);
        return (
          <div key={c} className={"cryptoInlineCell "+a.cls}>
            <div className="coin">{c}</div>
            <div className="arrow" aria-label={a.label}>{a.sym}</div>
          </div>
        );
      })}
    </div>
  );
}

function NewTrendsMini({ gs, onOpenTrend, onOpenRegional, onClose }){
  const y = gs?.year || 1;
  const data = gs?.trends?.byYear?.[String(y)];
  const globals = data?.globals || [];
  const crypto = data?.crypto || null;
  const regional = data?.regional || {};
  const orderedContinents = [
    "Severní Amerika",
    "Evropa",
    "Asie",
    "Jižní Amerika",
    "Afrika",
    "Austrálie",
  ];
  const regByCont = {};
  for(const t of Object.values(regional||{})){
    if(t?.continent) regByCont[t.continent] = t;
  }
  const regCls = (t)=>{
    const k = String(t?.key||"");
    const n = String(t?.name||"").toLowerCase();
    if(k.includes("REG_INVESTMENT_BOOM") || n.includes("boom")) return "boom";
    if(k.includes("REG_HIGH_EDUCATION") || n.includes("vzdělan") || n.includes("vzdelan")) return "edu";
    if(k.includes("REG_STABILITY") || n.includes("stabil")) return "stable";
    if(k.includes("REG_TAXES") || n.includes("dan")) return "tax";
    return "reg";
  };

  return (
    <div className="newTrendsWrap">
      <button className="primaryBtn big full" onClick={onClose}>Nový rok</button>

      <div style={{marginTop:6}}>
        <div className="secTitle">Globální trendy</div>
        <div className="gtGrid" style={{marginTop:10}}>
          {(globals.length?globals:[{name:"—"},{name:"—"},{name:"—"}]).slice(0,3).map((t,idx)=> (
            <GlobalTrendTile key={t?.trendId||t?.key||idx} t={t} onClick={t?.trendId ? ()=>onOpenTrend && onOpenTrend(t) : undefined} />
          ))}
        </div>
      </div>

      <div style={{marginTop:16}}>
        <div className="secTitle">Kryptotrendy</div>
        <div style={{marginTop:10}}>
          <CryptoInlineRow crypto={crypto} />
        </div>
      </div>

      <div style={{marginTop:16}}>
        <div className="secTitle">Regionální trendy</div>
        <div className="regGrid" style={{marginTop:10}}>
          {orderedContinents.map((c)=>{
            const t = regByCont[c];
            const cls = regCls(t);
            return (
              <button
                key={c}
                className={"regCell "+cls}
                onClick={t ? ()=>onOpenRegional && onOpenRegional(t) : undefined}
                disabled={!t}
                aria-label={t ? `Detail regionálního trendu: ${c}` : `Regionální trend: ${c} (není k dispozici)`}
              >
                <div className="regCellIcon" aria-hidden="true">
                  {t ? <MonoIcon name={regionalTrendIconName(t)} size={34} /> : "—"}
                </div>
                <div className="regCellName">{c}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="muted" style={{marginTop:8,textAlign:"center"}}>Detail trendů kdykoliv v záložce Trendy.</div>
    </div>
  );
}


function arrowForCoeff(k){
  // Use text arrows so we can color them via CSS.
  if(k>1) return { sym:"▲", cls:"up", label:"roste" };
  if(k<1) return { sym:"▼", cls:"down", label:"klesá" };
  return { sym:"→", cls:"flat", label:"beze změny" };
}

function CryptoTrendCard({ revealed, crypto }){
  if(!revealed){
    return (
      <div className="trendCard wide back">
        <div className="trendBack">❓</div>
      </div>
    );
  }
  const coeff = crypto?.coeff || {};
  const coins = ["BTC","ETH","LTC","SIA"];
  return (
    <div className="trendCard wide cryptoCard">
      <div className="trendTop">
        <div className="trendIcon" aria-hidden="true"><MonoIcon name="btc" size={38} /></div>
        <div className="trendTitle">{crypto?.name || "Kryptotrend"}</div>
      </div>
      <div className="cryptoGrid">
        {coins.map(c=>{
          const k = Number(coeff[c] ?? 1);
          const a = arrowForCoeff(k);
          return (
            <div key={c} className={"cryptoRow "+a.cls}>
              <div className="coin">{c}</div>
              <div className="arrow">{a.sym}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CryptoTrendPreview({ crypto }){
  const coeff = crypto?.coeff || {};
  const coins = ["BTC","ETH","LTC","SIA"];
  return (
    <div className="previewCard wide cryptoPreview">
      <div className="previewName">{crypto?.name || "Kryptotrend"}</div>
      <div className="cryptoMiniGrid">
        {coins.map(c=>{
          const k = Number(coeff[c] ?? 1);
          const a = arrowForCoeff(k);
          return (
            <div key={c} className={"cryptoMini "+a.cls}>
              <span className="coin">{c}</span>
              <span className="arrow">{a.sym}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrendCard({ revealed, title, icon, wide, onClick, clickable }){
  return (
    <div className={"trendCard"+(wide?" wide":"")+(revealed?"":" back")+(clickable?" clickable":"")} onClick={revealed && clickable ? onClick : undefined} role={revealed && clickable ? "button" : undefined} tabIndex={revealed && clickable ? 0 : undefined}>
      {revealed ? (
        <>
          <div className="trendIcon">{icon}</div>
          <div className="trendName">{title}</div>
        </>
      ) : (
        <>
          <div className="trendIcon">❓</div>
          <div className="trendName muted">Skryté</div>
        </>
      )}
    </div>
  );
}

function AssetsPanel({ inv }){
  const tiKind = (item) => {
    const t = String(item?.type||"").toUpperCase();
    if(t.includes("AGRO") || t.includes("ZEM")) return "agri";
    if(t.includes("MINING") || t.includes("TEZ") || t.includes("TĚŽ")) return "mining";
    if(t.includes("INDUSTRY") || t.includes("PRUM") || t.includes("PRŮM")) return "industry";
    return "industry";
  };
  return (
    <div>
      <div className="secTitle">Tradiční investice</div>
      <div className="list">
        {inv.investments.length? inv.investments.map(c=>(
          <div key={c.cardId} className="listItem">
            <div className="listLine">
              <span className={"tiDot " + tiKind(c)} aria-hidden="true"></span>
              <b>{c.cardId}</b> • {c.name}
            </div>
            <div className="muted">{c.continent} • {c.type} • +{c.usdProduction} USD/rok</div>
          </div>
        )) : <div className="muted">Zatím žádné.</div>}
      </div>

      <div className="secTitle" style={{marginTop:16}}>Mining farmy</div>
      <div className="list">
        {inv.miningFarms.length? inv.miningFarms.map(c=>(
          <div key={c.cardId} className="listItem">
            <div><b>{c.cardId}</b> • {c.name}</div>
            <div className="muted">{c.crypto} • +{c.cryptoProduction} ks/rok • elektřina {c.electricityUSD} USD</div>
          </div>
        )) : <div className="muted">Zatím žádné.</div>}
      </div>
    </div>
  );
}

function CardsPanel({ inv }){
  const investments = inv?.investments || [];
  const miningFarms = inv?.miningFarms || [];
  const experts = inv?.experts || [];

  const tiKind = (item) => {
    const t = String(item?.type||"").toUpperCase();
    if(t.includes("AGRO") || t.includes("ZEM")) return "agri";
    if(t.includes("MINING") || t.includes("TEZ") || t.includes("TĚŽ")) return "mining";
    if(t.includes("INDUSTRY") || t.includes("PRUM") || t.includes("PRŮM")) return "industry";
    return "industry";
  };

  const TypeBadge = ({ kind }) => {
    return (
      <div className={"tiBadge " + kind} aria-hidden="true">
        <MonoIcon name={kind} size={44} className="tiBadgeIcon" />
      </div>
    );
  };

  const iconFor = (kind, item) => {
    if(kind==="MINING_FARM") return "⚙️";
    if(kind==="EXPERT"){
      const k = String(item?.functionKey||"");
      if(k.includes("LAWYER")) return "⚖️";
      if(k.includes("LOBBY") || k.includes("STEAL")) return "🕴️";
      if(k.includes("ANALYST")) return "🔎";
      if(k.includes("CRYPTO")) return "🧬";
      return "🧑‍💼";
    }
    return "🃏";
  };

  return (
    <div className="cardsPanel">
      <div className="cardsSection">
        <div className="secTitle">Tradiční investice</div>
        <div className="cardsGrid">
          {investments.length ? investments.map(c=> (
            <div key={c.cardId} className="cardTile">
              <div className="tileTop">
                <div className="tileIcon"><TypeBadge kind={tiKind(c)} /></div>
                <div className="tileMeta">
                  <div className="tileTitle">{c.name}</div>
                  <div className="tileSub">{c.continent} • {c.type}</div>
                </div>
              </div>
              <div className="tileBottom">
                <div className="tileId">{c.cardId}</div>
                <div className="tileVal">+{c.usdProduction} USD/rok</div>
              </div>
            </div>
          )) : <div className="muted">Zatím žádné.</div>}
        </div>
      </div>

      <div className="cardsSection">
        <div className="secTitle">Mining farmy</div>
        <div className="cardsGrid">
          {miningFarms.length ? miningFarms.map(c=> (
            <div key={c.cardId} className="cardTile">
              <div className="tileTop">
                <div className="tileIcon">{iconFor("MINING_FARM", c)}</div>
                <div className="tileMeta">
                  <div className="tileTitle">{c.name}</div>
                  <div className="tileSub">{c.crypto} • +{c.cryptoProduction} ks/rok</div>
                </div>
              </div>
              <div className="tileBottom">
                <div className="tileId">{c.cardId}</div>
                <div className="tileVal neg">−{c.electricityUSD} USD elektřina</div>
              </div>
            </div>
          )) : <div className="muted">Zatím žádné.</div>}
        </div>
      </div>

      <div className="cardsSection">
        <div className="secTitle">Experti</div>
        <div className="cardsGrid">
          {experts.length ? experts.map(e=> (
            <div key={e.cardId} className={"cardTile"+(e.used?" used":"")}> 
              <div className="tileTop">
                <div className="tileIcon">{iconFor("EXPERT", e)}</div>
                <div className="tileMeta">
                  <div className="tileTitle">{e.functionLabel}</div>
                  <div className="tileSub">{e.functionDesc}</div>
                </div>
              </div>
              <div className="tileBottom">
                <div className="tileId">{e.cardId}</div>
                <div className={"pill"+(e.used?" dim":"")}>{e.used?"použito":"k dispozici"}</div>
              </div>
            </div>
          )) : <div className="muted">Zatím žádní.</div>}
        </div>
      </div>
    </div>
  );
}

function ExpertsPanel({ inv }){
  return (
    <div className="list">
      {inv.experts.length? inv.experts.map(e=>(
        <div key={e.cardId} className="listItem">
          <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
            <div><b>{e.cardId}</b> • {e.functionLabel}</div>
            <div className={"pill"+(e.used?" dim":"")}>{e.used?"použito":"k dispozici"}</div>
          </div>
          <div className="muted">{e.functionDesc}</div>
        </div>
      )) : <div className="muted">Zatím žádné.</div>}
    </div>
  );
}

function AccountingPanel({ gs, playerId, gameId }){
  const s = useMemo(()=> getSocket(), []);
  const inv = gs?.inventory?.[playerId] || { investments:[], miningFarms:[], experts:[] };
  const me = (gs?.players||[]).find(p=>p.playerId===playerId) || {};

  const cryptoProd = { BTC:0, ETH:0, LTC:0, SIA:0 };
  for(const mf of (inv.miningFarms||[])){
    const sym = mf.crypto;
    if(sym && cryptoProd[sym]!=null) cryptoProd[sym] += Number(mf.cryptoProduction||0);
  }

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailType, setDetailType] = useState(null); // traditional | mining

  useEffect(()=>{
    let alive = true;
    setLoading(true);
    s.emit("preview_audit", { gameId, playerId }, (res)=>{
      if(!alive) return;
      if(!res?.ok) setPreview({ error: res?.error || "Chyba" });
      else setPreview({ settlementUsd: Number(res.settlementUsd||0), breakdown: res.breakdown||[] });
      setLoading(false);
    });
    return ()=>{ alive = false; };
  }, [s, gameId, playerId, gs?.year, gs?.phase, gs?.bizStep, gs?.settle?.effects]);

  const rates = gs?.crypto?.rates || {};
  const miningUsd = (["BTC","ETH","LTC","SIA"]).reduce((sum, sym)=> sum + (Number(cryptoProd[sym]||0) * Number(rates?.[sym]||0)), 0);
  const traditionalUsd = useMemo(()=>{
    const rows = preview?.breakdown || [];
    return rows.reduce((sum, row)=>{
      const label = String(row?.label||"").toLowerCase();
      if(label.includes("elektř")) return sum;
      return sum + Number(row?.usd||0);
    }, 0);
  }, [preview]);
  const totalUsd = traditionalUsd + miningUsd;

  const miningLines = (["BTC","ETH","LTC","SIA"]).map(sym=>{
    const owned = Number(me?.wallet?.crypto?.[sym] || 0);
    const rate = Number(rates?.[sym] || 0);
    const produced = Number(cryptoProd[sym] || 0);
    return { sym, owned, rate, produced, producedUsd: produced * rate, trail: recentCryptoTrendTrail(gs, sym, playerId) };
  });

  const traditionalBreakdown = (preview?.breakdown || []).filter(row => !String(row?.label||"").toLowerCase().includes("elektř"));
  const electricityLines = (preview?.breakdown || []).filter(row => String(row?.label||"").toLowerCase().includes("elektř"));

  return (
    <div className="walletSimple">
      <div className="walletHero">
        <div className="walletEyebrow">Očekávaný výsledek auditu</div>
        <div className={"walletTotal "+(totalUsd>=0?"pos":"neg")}>{loading ? "…" : `${totalUsd>=0?"+":""}${totalUsd} USD`}</div>
      </div>

      <div className="walletSummaryList">
        <button className="walletSummaryRow" onClick={()=>setDetailType("traditional")} type="button">
          <span className="walletSummaryLabel">Investice</span>
          <span className={"walletSummaryValue "+(traditionalUsd>=0?"pos":"neg")}>{loading ? "…" : `${traditionalUsd>=0?"+":""}${traditionalUsd} USD`}</span>
          <span className="walletSummaryChevron">›</span>
        </button>

        <button className="walletSummaryRow" onClick={()=>setDetailType("mining")} type="button">
          <span className="walletSummaryLabel">Krypto (těžba)</span>
          <span className={"walletSummaryValue "+(miningUsd>=0?"pos":"neg")}>{loading ? "…" : `${miningUsd>=0?"+":""}${miningUsd} USD`}</span>
          <span className="walletSummaryChevron">›</span>
        </button>
      </div>

      <div className="walletPortfolio">
        <div className="secTitle">Krypto portfolio</div>
        <div className="walletPortfolioList">
          {miningLines.map(line=>(
            <div key={line.sym} className="walletCoinRow">
              <div className="walletCoinLeft">
                <div className="walletCoinName">{line.sym}</div>
                <div className="walletCoinMeta">{line.owned} ks · {line.rate} USD</div>
              </div>
              <div className="walletTrendTrail" aria-label={`Trend ${line.sym}`}>
                {line.trail.map(item => (
                  <span key={item.key} className={"trendMini "+(item.arrow==="↑"?"up":item.arrow==="↓"?"down":"flat")+(item.future?" future":"")}>{item.arrow}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailType==="traditional" ? (
        <SuperTopModal title="Investice – detail" onClose={()=>setDetailType(null)}>
          {loading ? (
            <div className="muted">Počítám…</div>
          ) : preview?.error ? (
            <div className="muted">{preview.error}</div>
          ) : (
            <div className="walletDetail">
              <div className={"walletDetailTotal "+(traditionalUsd>=0?"pos":"neg")}>{traditionalUsd>=0?"+":""}{traditionalUsd} USD</div>
              <div className="list">
                {traditionalBreakdown.map((row, idx)=>(
                  <div key={idx} className="listItem walletListItem">
                    <div>{row.label}</div>
                    <div className={Number(row.usd)>=0?"pos":"neg"}>{Number(row.usd)>=0?"+":""}{row.usd} USD</div>
                  </div>
                ))}
                {!traditionalBreakdown.length ? <div className="muted">Bez detailu.</div> : null}
              </div>
            </div>
          )}
        </SuperTopModal>
      ) : null}

      {detailType==="mining" ? (
        <SuperTopModal title="Krypto (těžba) – detail" onClose={()=>setDetailType(null)}>
          <div className="walletDetail">
            <div className={"walletDetailTotal "+(miningUsd>=0?"pos":"neg")}>{miningUsd>=0?"+":""}{miningUsd} USD</div>
            <div className="list">
              {miningLines.map((line)=>(
                <div key={line.sym} className="listItem walletListItem stack">
                  <div className="walletMineTop">
                    <div className="walletMineName">{line.sym}</div>
                    <div className={line.producedUsd>=0?"pos":"neg"}>{line.producedUsd>=0?"+":""}{line.producedUsd} USD</div>
                  </div>
                  <div className="walletMineSub">{line.produced} ks × {line.rate} USD</div>
                  <div className="walletMineSub light">Máš {line.owned} ks</div>
                </div>
              ))}
              {electricityLines.length ? electricityLines.map((row, idx)=>(
                <div key={`el-${idx}`} className="listItem walletListItem">
                  <div>{row.label}</div>
                  <div className="neg">{row.usd} USD</div>
                </div>
              )) : null}
            </div>
          </div>
        </SuperTopModal>
      ) : null}
    </div>
  );
}
