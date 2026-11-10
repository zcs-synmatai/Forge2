export function rotateModelPoint([x,y,z],yaw,pitch){
 const u=x*Math.cos(yaw)-z*Math.sin(yaw),v=x*Math.sin(yaw)+z*Math.cos(yaw);
 return [u,y*Math.cos(pitch)-v*Math.sin(pitch),y*Math.sin(pitch)+v*Math.cos(pitch)];
}
export function coordinateBounds(vertices){
 if(!vertices.length)return {min:[-1,-1,-1],max:[1,1,1],center:[0,0,0]};
 const min=[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))),max=[0,1,2].map(i=>Math.max(...vertices.map(v=>v[i])));
 return {min,max,center:min.map((v,i)=>(v+max[i])/2)};
}
// Fit only the initial orientation. Rotation never changes this orthographic scale.
export function fixedModelView(vertices,width,height,initialOrientationOnly=false){
 const bounds=coordinateBounds(vertices),points=vertices.map(v=>rotateModelPoint(v.map((a,i)=>a-bounds.center[i]),-.55,.30));
 const screen=coordinateBounds(points.length?points:[[-1,-1,0],[1,1,0]]),radius=Math.max(.1,...vertices.map(v=>Math.hypot(...v.map((a,i)=>a-bounds.center[i]))));
 return {center:bounds.center,pixelsPerUnit:Math.max(1,Math.min((width-160)/Math.max(.1,screen.max[0]-screen.min[0]),(height-100)/Math.max(.1,screen.max[1]-screen.min[1]),initialOrientationOnly?Infinity:(Math.min(width,height)-100)/(2*radius)))};
}
export function coordinateTicks(min,max,targetCount=4){
 const range=max-min;if(!(range>0))return [min];
 const raw=range/targetCount,power=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].map(v=>v*power).find(v=>v>=raw);
 const ticks=[];for(let v=Math.ceil(min/step)*step;v<=max+step*1e-6;v+=step)ticks.push(Number(v.toPrecision(10)));
 return ticks;
}
export function drawModelCoordinates(ctx,{vertices,project,rotate,width,height,unit='mm',foreground=false}){
 if(!vertices.length)return;
 const bounds=coordinateBounds(vertices),min=[...bounds.min],max=[...bounds.max];
 for(const i of [1,2]){const extent=Math.max(Math.abs(min[i]),Math.abs(max[i]),1)*1.35;min[i]=-extent;max[i]=extent;}
 const far=[0,1,2].map(i=>rotate([i===0?1:0,i===1?1:0,i===2?1:0])[2]>=0?min[i]:max[i]);
 const ticks=[coordinateTicks(0,max[0]-min[0],8).map(v=>v+min[0]),coordinateTicks(min[1],max[1]),coordinateTicks(min[2],max[2])];
 const line=(a,b,color='#d4dde7',lineWidth=.65)=>{const p=project(a),q=project(b);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.stroke();};
 ctx.save();
 if(!foreground){
  for(let normal=0;normal<3;normal++){
   const [a,b]=[0,1,2].filter(i=>i!==normal),corner=[0,0,0];corner[normal]=far[normal];
   for(const i of [a,b])for(const value of ticks[i]){const start=[...corner],end=[...corner],other=i===a?b:a;start[i]=end[i]=value;start[other]=min[other];end[other]=max[other];line(start,end);}
   for(const i of [a,b])for(const side of [min[i],max[i]]){const start=[...corner],end=[...corner],other=i===a?b:a;start[i]=end[i]=side;start[other]=min[other];end[other]=max[other];line(start,end,'#b5c1d0',.8);}
  }
 }else{
  const middle=project(bounds.center),occupied=[];ctx.font='12px Segoe UI';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let axis=0;axis<3;axis++){
   const others=[0,1,2].filter(i=>i!==axis),candidates=[];for(const a of [min[others[0]],max[others[0]]])for(const b of [min[others[1]],max[others[1]]]){const point=[...far];point[others[0]]=a;point[others[1]]=b;point[axis]=(min[axis]+max[axis])/2;const screen=project(point);candidates.push({point,score:axis===0?screen[1]:axis===1?screen[0]:-screen[0]});}const base=candidates.sort((a,b)=>b.score-a.score)[0].point;const start=[...base],end=[...base];start[axis]=min[axis];end[axis]=max[axis];line(start,end,'#93a4b8',.8);
   for(const value of ticks[axis]){
    const at=[...base];at[axis]=value;const p=project(at),delta=[p[0]-middle[0],p[1]-middle[1]],length=Math.hypot(...delta)||1,offset=16;
    const x=p[0]+delta[0]/length*offset,y=p[1]+delta[1]/length*offset;
    ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+delta[0]/length*4,p[1]+delta[1]/length*4);ctx.strokeStyle='#73869c';ctx.lineWidth=1;ctx.stroke();if(x<14||x>width-14||y<12||y>height-12||occupied.some(q=>Math.abs(q[0]-x)<30&&Math.abs(q[1]-y)<16))continue;
    occupied.push([x,y]);ctx.fillStyle='#4b6079';ctx.fillText(String(Number((axis===0?value-min[0]:value).toPrecision(5))),x,y);
   }
   const at=[...base];at[axis]=max[axis];const p=project(at);ctx.fillStyle='#334b67';ctx.fillText(`${'XYZ'[axis]} (${unit})`,Math.min(width-36,Math.max(36,p[0]+10)),Math.min(height-14,Math.max(14,p[1]+30)));
  }
  const origin=[48,height-30];
  for(const [i,color]of ['#bd687b','#699672','#618bb9'].entries()){
   const d=rotate([i===0?1:0,i===1?1:0,i===2?1:0]),tip=[origin[0]+d[0]*30,origin[1]-d[1]*30],angle=Math.atan2(tip[1]-origin[1],tip[0]-origin[0]);
   ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(...tip);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(...tip);ctx.lineTo(tip[0]-7*Math.cos(angle-.4),tip[1]-7*Math.sin(angle-.4));ctx.lineTo(tip[0]-7*Math.cos(angle+.4),tip[1]-7*Math.sin(angle+.4));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.fillText('XYZ'[i],tip[0]+Math.cos(angle)*12,tip[1]+Math.sin(angle)*12);
  }
 }
 ctx.restore();
}
