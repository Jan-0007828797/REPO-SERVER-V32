let clockEl=null; let ringEl=null;
function ensure(el, src){ if(!el){ el=new Audio(src); el.preload="auto"; } return el; }
export function unlockAudio(){ const a=new Audio(); a.play().then(()=>a.pause()).catch(()=>{}); }
export function playClock(){ clockEl=ensure(clockEl,"/sounds/grand_clock_loop.wav"); clockEl.loop=true; clockEl.volume=0.6; clockEl.play().catch(()=>{}); }
export function stopClock(){ if(!clockEl) return; clockEl.pause(); clockEl.currentTime=0; }
export function playRing(){ ringEl=ensure(ringEl,"/sounds/phone_ring.wav"); ringEl.loop=true; ringEl.volume=0.75; ringEl.play().catch(()=>{}); }
export function stopRing(){ if(!ringEl) return; ringEl.pause(); ringEl.currentTime=0; }
