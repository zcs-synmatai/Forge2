// Geometry-only software preview. Particle positions are deterministic and separated.
export function renderPreview(container, params, {flow=false,highlight='geometry'}={}) {
  let yaw=-.55,pitch=.35,scale=1,mesh=false,drag=null;
  container.innerHTML='<canvas aria-label="几何模型预览，可拖动旋转" tabindex="0"></canvas><div class="preview-controls"><button type="button" data-view="in" aria-label="放大模型">＋</button><button type="button" data-view="out" aria-label="缩小模型">−</button><button type="button" data-view="reset">重置视角</button><button type="button" data-view="mesh">显示网格</button></div><div class="model-caption">拖动旋转 · 滚轮缩放 · 几何示意（原型演示）</div>';
  const canvas=container.querySelector('canvas'),ctx=canvas.getContext('2d');
  const project=([x,y,z])=>{const a=x*Math.cos(yaw)-z*Math.sin(yaw),b=x*Math.sin(yaw)+z*Math.cos(yaw);return [a,y*Math.cos(pitch)-b*Math.sin(pitch),y*Math.sin(pitch)+b*Math.cos(pitch)];};
  function draw(){
    const w=container.clientWidth||460,h=330,dpr=devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const size=Math.min(w*.28,110)*scale,center=[w/2,h/2+6];
    const pt=v=>{const p=project(v);return [center[0]+p[0]*size,center[1]-p[1]*size,p[2]];};
    const line=(a,b,color='#a7b0c2')=>{ctx.beginPath();ctx.moveTo(...pt(a).slice(0,2));ctx.lineTo(...pt(b).slice(0,2));ctx.strokeStyle=color;ctx.lineWidth=1;ctx.stroke();};
    const poly=(vertices,fill)=>{ctx.beginPath();vertices.map(pt).forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='#95a3ba';ctx.stroke();};
    if(flow){
      const ends=[-1.35,1.35],rings=ends.map(x=>Array.from({length:40},(_,i)=>[x,Math.sin(i/40*Math.PI*2)*.45,Math.cos(i/40*Math.PI*2)*.45]));
      for(let i=0;i<40;i++){const j=(i+1)%40;poly([rings[0][i],rings[0][j],rings[1][j],rings[1][i]],'rgba(159,182,213,.17)');}
      rings.forEach((r,i)=>poly(r,i?'rgba(100,145,210,.35)':'rgba(220,143,111,.35)'));
      ctx.fillStyle='#53647b';ctx.font='12px Segoe UI';ctx.fillText('入口',...pt([-1.6,.65,0]).slice(0,2));ctx.fillText('出口',...pt([1.1,.65,0]).slice(0,2));
    }else{
      const max=Math.max(Number(params.length)||10,Number(params.width)||10,Number(params.height)||2),a=Math.max(.5,(Number(params.length)||10)/max)*1.2,b=Math.max(.35,(Number(params.height)||2)/max)*1.2,c=Math.max(.5,(Number(params.width)||10)/max)*1.2;
      const corners=[[-a,-b,-c],[a,-b,-c],[a,b,-c],[-a,b,-c],[-a,-b,c],[a,-b,c],[a,b,c],[-a,b,c]];
      poly([corners[0],corners[1],corners[2],corners[3]],'rgba(176,195,219,.18)');
      const particles=[];for(let x=0;x<4;x++)for(let z=0;z<4;z++)for(let y=0;y<2;y++){
        const jitter=params.distribution==='随机'?Math.sin((x*17+z*7+y+Number(params.seed))*2.4)*.035:0;
        particles.push(pt([(-.73+x*.49)*a+jitter,(-.44+y*.88)*b,(-.73+z*.49)*c-jitter]));
      }
      particles.sort((a,b)=>a[2]-b[2]).forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],Math.min(a*.13,b*.30,c*.13)*size,0,Math.PI*2);ctx.fillStyle=highlight==='materials'?'#a58be9':'#a5b1cb';ctx.fill();ctx.strokeStyle='#8392af';ctx.stroke();});
      poly([corners[4],corners[5],corners[6],corners[7]],'rgba(192,207,227,.13)');
      [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([i,j])=>line(corners[i],corners[j]));
      if(highlight==='boundary'){poly([corners[2],corners[3],corners[7],corners[6]],'rgba(221,141,113,.30)');poly([corners[0],corners[1],corners[5],corners[4]],'rgba(115,162,213,.30)');}
      if(mesh)for(let t=-.75;t<1;t+=.25){line([t*a,b,-c],[t*a,b,c],'#c6b9e5');line([-a,b,t*c],[a,b,t*c],'#c6b9e5');}
      ctx.font='12px Segoe UI';ctx.fillStyle='#a66147';ctx.fillText(`热端 ${params.hot??80} °C`,...pt([-.3,b+.27,0]).slice(0,2));ctx.fillStyle='#4678a6';ctx.fillText(`冷端 ${params.cold??20} °C`,...pt([-.3,-b-.35,0]).slice(0,2));
    }
    const axisOrigin=[-1.45,-.85,1.15];[['X',[.45,0,0],'#a46762'],['Y',[0,0,.45],'#538c78'],['Z',[0,.45,0],'#6a72ac']].forEach(([name,v,color])=>{const end=axisOrigin.map((n,i)=>n+v[i]);line(axisOrigin,end,color);const p=pt(end);ctx.fillStyle=color;ctx.font='11px Segoe UI';ctx.fillText(name,p[0]+3,p[1]);});
  }
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.008;pitch+=(e.clientY-drag[1])*.008;drag=[e.clientX,e.clientY];draw();});
  canvas.addEventListener('pointerup',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.5,Math.min(2,scale-e.deltaY*.001));draw();},{passive:false});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();yaw+=e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0;pitch+=e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0;draw();}});
  container.addEventListener('click',e=>{const action=e.target.dataset.view;if(action==='in')scale=Math.min(2,scale+.15);if(action==='out')scale=Math.max(.5,scale-.15);if(action==='reset'){yaw=-.55;pitch=.35;scale=1;}if(action==='mesh'){mesh=!mesh;e.target.textContent=mesh?'隐藏网格':'显示网格';}if(action)draw();});
  const observer=new ResizeObserver(draw);observer.observe(container);draw();return ()=>observer.disconnect();
}
