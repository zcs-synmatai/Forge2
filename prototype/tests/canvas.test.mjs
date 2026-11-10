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
