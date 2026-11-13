import test from 'node:test';
import assert from 'node:assert/strict';
import {FlowCanvasModel as M} from '../src/features/editor/canvas-runtime/canvas-model.js';

test('source camera preserves the world point under pointer during zoom',()=>{
  const camera={x:-700,y:120,zoom:.8},pointer={x:680,y:300};
  const before=M.worldPoint(camera,pointer),after=M.worldPoint(M.zoomAt(camera,1.4,pointer),pointer);
  assert.ok(Math.abs(before.x-after.x)<1e-9);assert.ok(Math.abs(before.y-after.y)<1e-9);
});
test('canvas coordinates extend into negative space',()=>{
  assert.deepEqual(M.worldPoint({x:400,y:300,zoom:1},{x:100,y:100}),{x:-300,y:-200});
  const pos=M.newNodePosition([],[],{}, {},{width:244,height:118},{x:-200,y:-300},true);
  assert.deepEqual(pos,{x:-200,y:-300});
});
test('rectangle selection handles reverse drag and multiple nodes',()=>{
  const positions={a:{x:0,y:0},b:{x:200,y:0},c:{x:800,y:500}},sizes={a:{width:100,height:80},b:{width:100,height:80},c:{width:100,height:80}};
  assert.deepEqual(M.nodesWithin({x:320,y:100,width:-340,height:-120},positions,sizes),['a','b']);
  assert.deepEqual(M.selectionBounds(['a','b'],positions,sizes),{x:0,y:0,width:300,height:80});
});
test('four-sided cubic links keep actual endpoint direction',()=>{
  const a={x:100,y:100,width:244,height:118},b={x:500,y:400,width:244,height:118};
  const curve=M.curve(a,b,'bottom','top');
  assert.deepEqual(curve.points[0],{x:222,y:218});assert.deepEqual(curve.points.at(-1),{x:622,y:400});
  assert.ok(curve.points[1].y>218);assert.ok(curve.points[2].y<400);
});
test('source layout places dependencies left to right and keeps isolated nodes',()=>{
  const tasks=['a','b','c','independent'].map(id=>({id,name:id}));const positions=M.forwardPositions(tasks,[['a','b'],['b','c']]);
  assert.ok(positions.a.x<positions.b.x&&positions.b.x<positions.c.x);assert.ok(positions.independent.y>positions.a.y);
});
test('snap threshold scales with the canvas zoom',()=>{
  const positions={a:{x:0,y:0},b:{x:108,y:0}},sizes={a:{width:100,height:80},b:{width:100,height:80}};
  const snap=M.snapMove(['a'],{a:positions.a},{x:0,y:10},positions,sizes,.5);
  assert.equal(snap.delta.x,8);assert.ok(snap.guides.some(g=>g.axis==='x'));
});

const branchedGraph=()=>{
 const ids=['start','m1','base','m2','factor','cbase','c2','c1','macro','schedule','end'];
 const tasks=ids.map(id=>({id,name:id})),edges=[['start','m1'],['start','base'],['start','m2'],['m1','factor'],['factor','c1'],['base','cbase'],['m2','c2'],['c1','macro'],['cbase','macro'],['c2','macro'],['macro','schedule'],['schedule','end']];
 const sizes=Object.fromEntries(ids.map(id=>[id,{width:196,height:['start','end'].includes(id)?44:126}]));return {tasks,edges,sizes};
};
test('unequal material branches retain horizontal lanes through factor design',()=>{
 const {tasks,edges,sizes}=branchedGraph(),p=M.forwardPositions(tasks,edges,sizes),center=id=>p[id].y+sizes[id].height/2;
 for(const branch of [['m1','factor','c1'],['base','cbase'],['m2','c2'],['macro','schedule','end']])for(const id of branch)assert.ok(Math.abs(center(id)-center(branch[0]))<.01);
 assert.ok(center('m1')<center('base')&&center('base')<center('m2'));assert.ok(Math.abs(center('macro')-center('base'))<.01);
 for(const [from,to]of edges)assert.ok(p[from].x+sizes[from].width<p[to].x);
 assert.deepEqual(M.forwardPositions(tasks,edges,sizes),p);
});
test('automatic routing avoids node bodies across short and long branches',()=>{
 const {tasks,edges,sizes}=branchedGraph(),p=M.forwardPositions(tasks,edges,sizes),rect=id=>({...p[id],...sizes[id]});
 for(const [from,to]of edges){const ports=M.bestPorts(rect(from),rect(to),[],true);assert.deepEqual(ports,{fromPort:'right',toPort:'left'});const q=M.curve(rect(from),rect(to),ports.fromPort,ports.toPort).points;
 for(let i=1;i<100;i++){const t=i/100,u=1-t,point={x:u**3*q[0].x+3*u*u*t*q[1].x+3*u*t*t*q[2].x+t**3*q[3].x,y:u**3*q[0].y+3*u*u*t*q[1].y+3*u*t*t*q[2].y+t**3*q[3].y};for(const n of tasks.filter(n=>n.id!==from&&n.id!==to)){const r=rect(n.id);assert.ok(!(point.x>r.x&&point.x<r.x+r.width&&point.y>r.y&&point.y<r.y+r.height),from+' → '+to+' crosses '+n.id);}}}
});
test('layered layout handles empty and cyclic graphs without mutating inputs',()=>{
 assert.deepEqual(M.forwardPositions([],[]),{});const tasks=[{id:'a'},{id:'b'}],edges=[['a','b'],['b','a']];assert.throws(()=>M.forwardPositions(tasks,edges),/循环/);assert.deepEqual(tasks,[{id:'a'},{id:'b'}]);
});

test('long merge links stay in their branch lane until the final corridor',()=>{const a={x:0,y:500,width:196,height:126},b={x:900,y:200,width:196,height:126},c=M.forwardCurve(a,b);assert.ok(c.d.includes(' L'));assert.equal(c.points[1].y,c.points[0].y);assert.ok(c.points[1].x>b.x-200);assert.deepEqual(c.points.at(-1),M.port(b,'left'));});
