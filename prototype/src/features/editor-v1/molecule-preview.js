import {esc} from './model.js';
import {moleculeFormula} from './molecule.js';

const colors={C:['#a3a6ac','#646770','#33363f'],H:['#ffffff','#d3d6dd','#a5aab4'],O:['#ffb1a9','#df6259','#9f302d'],N:['#b6c9ff','#6f8bdd','#354d98'],S:['#fff0ae','#e2c34f','#9b7e22'],P:['#ffd4a0','#e39a4b','#9c5d22'],F:['#c9f0cc','#77bb7b','#367942'],Cl:['#b9e6ae','#72aa58','#3c7230']};
export function renderMolecule(container,initial,{onEdit}={}){
  let molecule=initial,yaw=.32,pitch=-.18,zoom=1.4,labels=false,drag=null;
  container.innerHTML='<div class="molecule-summary"></div><canvas tabindex="0" aria-label="分子模型，可拖动旋转，方向键旋转，滚轮缩放"></canvas><div class="preview-controls"><button type="button" data-mol-view="in" aria-label="放大分子">＋</button><button type="button" data-mol-view="out" aria-label="缩小分子">−</button><button type="button" data-mol-view="reset">重置视角</button><button type="button" data-mol-view="labels" aria-pressed="false">显示标签</button>'+(onEdit?'<button type="button" class="molecule-edit-btn" data-mol-view="edit">修改分子</button>':'')+'</div><div class="model-caption">拖动旋转 · 滚轮缩放 · 球棍模型（原型示意）</div>';
  const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d');
  function draw(){
    const w=container.clientWidth||460,h=310,dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    container.querySelector('.molecule-summary').innerHTML='<strong>'+esc(molecule.name)+'</strong><span>'+esc(moleculeFormula(molecule))+' · '+molecule.atoms.length+' 个原子 · '+molecule.bonds.length+' 个键</span>';
    if(!molecule.atoms.length)return;
    const center=['x','y','z'].map(k=>molecule.atoms.reduce((sum,a)=>sum+(Number.isFinite(a[k])?a[k]:0),0)/molecule.atoms.length);
    const radius=Math.max(1,...molecule.atoms.map(a=>Math.hypot(a.x-center[0],a.y-center[1],a.z-center[2]))),size=Math.min(w*.4,h*.38)/Math.max(1,radius+.4)*zoom;
    const points=molecule.atoms.map((a,index)=>{const [x,y,z]=[a.x-center[0],a.y-center[1],a.z-center[2]],u=x*Math.cos(yaw)-z*Math.sin(yaw),v=x*Math.sin(yaw)+z*Math.cos(yaw);return {index,element:a.element,x:w/2+u*size,y:h/2-(y*Math.cos(pitch)-v*Math.sin(pitch))*size,z:y*Math.sin(pitch)+v*Math.cos(pitch),r:(a.element==='H'?.20:.37)*size};});
    for(const b of [...molecule.bonds].sort((a,b)=>(points[a.from]?.z||0)+(points[a.to]?.z||0)-(points[b.from]?.z||0)-(points[b.to]?.z||0))){const a=points[b.from],c=points[b.to];if(!a||!c)continue;const dx=c.x-a.x,dy=c.y-a.y,length=Math.hypot(dx,dy)||1;for(let j=0;j<b.order;j++){const offset=(j-(b.order-1)/2)*Math.max(3,size*.10),ox=-dy/length*offset,oy=dx/length*offset;ctx.beginPath();ctx.moveTo(a.x+ox,a.y+oy);ctx.lineTo(c.x+ox,c.y+oy);ctx.strokeStyle='#a0a4ad';ctx.lineCap='round';ctx.lineWidth=Math.max(2,size*.16/(b.order>1?1.5:1));ctx.stroke();ctx.beginPath();ctx.moveTo(a.x+ox-1,a.y+oy-1);ctx.lineTo(c.x+ox-1,c.y+oy-1);ctx.strokeStyle='#bec1c8';ctx.lineWidth=Math.max(1,size*.045);ctx.stroke();}}
    for(const a of points.sort((a,b)=>a.z-b.z)){if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||!Number.isFinite(a.r))continue;const c=colors[a.element]||colors.C,g=ctx.createRadialGradient(a.x-a.r*.35,a.y-a.r*.4,a.r*.05,a.x,a.y,a.r);g.addColorStop(0,c[0]);g.addColorStop(.5,c[1]);g.addColorStop(1,c[2]);ctx.beginPath();ctx.arc(a.x,a.y,a.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();if(labels){ctx.font='600 11px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=a.element==='H'?'#4b5362':'#fff';ctx.fillText(a.element+(a.index+1),a.x,a.y);}}
  }
  canvas.onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.012;pitch+=(e.clientY-drag.y)*.012;drag={x:e.clientX,y:e.clientY};draw();};
  canvas.onpointerup=canvas.onpointercancel=e=>{drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
  const wheel=e=>{e.preventDefault();zoom=Math.max(.4,Math.min(2.4,zoom*Math.exp(-e.deltaY*.001)));draw();};canvas.addEventListener('wheel',wheel,{passive:false});
  canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();yaw+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;pitch+=e.key==='ArrowUp'?.12:e.key==='ArrowDown'?-.12:0;draw();}};
  const click=e=>{const action=e.target.closest('[data-mol-view]')?.dataset.molView;if(!action)return;if(action==='edit'){onEdit?.();return;}if(action==='in')zoom=Math.min(2.4,zoom*1.2);if(action==='out')zoom=Math.max(.4,zoom/1.2);if(action==='reset'){yaw=.32;pitch=-.18;zoom=1.4;}if(action==='labels'){labels=!labels;e.target.textContent=labels?'隐藏标签':'显示标签';e.target.setAttribute('aria-pressed',String(labels));}draw();};container.addEventListener('click',click);
  const observer=new ResizeObserver(draw);observer.observe(container);draw();
  return {update(next){molecule=next;draw();},destroy(){observer.disconnect();canvas.removeEventListener('wheel',wheel);container.removeEventListener('click',click);canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onkeydown=null;}};
}
