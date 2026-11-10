export const clampSplit=value=>Math.min(70,Math.max(30,Number(value)||55));
export function mountWorkspaceSplit(container,onResize){
 const handle=container.querySelector('.workspace-splitter');let dragging=false,frame=0;
 const key='forge-model-workflow-split';
 function set(value){const percent=clampSplit(value);container.style.setProperty('--model-width',percent+'%');handle.setAttribute('aria-valuenow',String(Math.round(percent)));return percent;}
 try{set(localStorage.getItem(key));}catch{set(55);}
 const finish=()=>{if(!dragging)return;dragging=false;container.classList.remove('is-resizing');try{localStorage.setItem(key,handle.getAttribute('aria-valuenow'));}catch{}onResize();};
 const move=e=>{if(!dragging)return;const box=container.getBoundingClientRect();set((e.clientX-box.left)/box.width*100);cancelAnimationFrame(frame);frame=requestAnimationFrame(onResize);};
 const down=e=>{if(e.button!==0)return;e.preventDefault();dragging=true;handle.setPointerCapture(e.pointerId);container.classList.add('is-resizing');};
 const keyboard=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=Number(handle.getAttribute('aria-valuenow'));set(e.key==='Home'?30:e.key==='End'?70:current+(e.key==='ArrowLeft'?-2:2));try{localStorage.setItem(key,handle.getAttribute('aria-valuenow'));}catch{}onResize();};
 handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('lostpointercapture',finish);handle.addEventListener('keydown',keyboard);
 return ()=>{cancelAnimationFrame(frame);handle.removeEventListener('pointerdown',down);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);handle.removeEventListener('lostpointercapture',finish);handle.removeEventListener('keydown',keyboard);};
}
