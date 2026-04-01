"use client";
import { useEffect } from "react";
export function Modal({title,onClose,children,variant,modalClassName="", bodyClassName=""}){
  useEffect(()=>{ const onKey=(e)=>{ if(e.key==="Escape") onClose?.(); }; window.addEventListener("keydown", onKey); return ()=>window.removeEventListener("keydown", onKey); },[onClose]);
  return (
    <div className={"modalBackdrop"+(variant==="top"?" top":"")} onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose?.(); }}>
      <div className={["modal", modalClassName].filter(Boolean).join(" ")}>
        <div className="modalHeader">
          <div style={{fontWeight:900,fontSize:18}}>{title}</div>
          <button className="iconBtn" onClick={onClose}>✕</button>
        </div>
        <div style={{height:1,background:"rgba(255,255,255,.10)",margin:"12px 0"}}></div>
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
}
// Bottom bar is intentionally dumb: visual-only. Logic stays in pages (golden rule).
export function BottomBar({onTab, active}){
  return (
    <div className="bottomBar">
      <button className={"tabBtn"+(active==="accounting"?" active":"")} onClick={()=>onTab("accounting")} aria-label="Účetnictví / Finance">
        <span className="tabIcon tabChar" aria-hidden="true">$</span>
        <span className="tabLabel">Peněženka</span>
      </button>

      <button className={"tabBtn"+(active==="assets"?" active":"")} onClick={()=>onTab("assets")} aria-label="Karty">
        <span className="tabIcon" aria-hidden="true">
          <svg className="tabSvg" viewBox="0 0 64 64" role="img" aria-label="Karta s QR kódem">
            <rect x="10" y="12" width="44" height="40" rx="8" ry="8" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="18" y="20" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="36" y="20" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="4" />
            <rect x="18" y="38" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M36 38h10M36 48h10M46 38v10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="tabLabel">Karty</span>
      </button>

      <button className={"tabBtn"+(active==="trends"?" active":"")} onClick={()=>onTab("trends")} aria-label="Trendy">
        <span className="tabIcon" aria-hidden="true">
          <svg className="tabSvg" viewBox="0 0 64 64" role="img" aria-label="Zeměkoule">
            <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
            <path d="M12 32h40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M32 12c7 7 7 33 0 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            <path d="M32 12c-7 7-7 33 0 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="tabLabel">Trendy</span>
      </button>
    </div>
  );
}

// Minimal helper: lets screens temporarily disable interaction with the bottom bar
// (e.g., MOVE definitive confirmation modal). Visual stays the same.
export function BottomBarWrapper({ disabled, children }){
  return (
    <div className={"bottomBarWrap"+(disabled?" disabled":"")}><div className={bodyClassName}>{children}</div></div>
  );
}
