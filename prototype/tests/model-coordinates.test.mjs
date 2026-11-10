import test from 'node:test';
import assert from 'node:assert/strict';
import {fixedModelView,rotateModelPoint,coordinateTicks,coordinateBounds} from '../src/features/editor/model-coordinates.js';

test('orthographic rotation preserves world distances and keeps the fit scale independent of angle',()=>{
 const points=[[-160,-20,-20],[160,20,20]],view=fixedModelView(points,900,420);
 for(const [yaw,pitch]of [[0,0],[1.2,.6],[-2,-.8]]){
  const rotated=points.map(p=>rotateModelPoint(p,yaw,pitch));
  assert.ok(Math.abs(Math.hypot(...rotated[0].map((v,i)=>v-rotated[1][i]))-Math.hypot(320,40,40))<1e-9);
  assert.equal(fixedModelView(points,900,420).pixelsPerUnit,view.pixelsPerUnit);for(const p of rotated){assert.ok(Math.abs(p[0]*view.pixelsPerUnit)<=400);assert.ok(Math.abs(p[1]*view.pixelsPerUnit)<=160);}
 }
});
test('coordinate labels use real axis values and move with the same rotation as the model',()=>{
 assert.deepEqual(coordinateTicks(0,320),[0,100,200,300]);assert.deepEqual(coordinateTicks(-26,26),[-20,0,20]);
 assert.deepEqual(coordinateBounds([[0,-20,-5],[320,20,5]]).center,[160,0,0]);
 const initial=rotateModelPoint([320,0,0],0,0),rotated=rotateModelPoint([320,0,0],Math.PI/2,0);assert.ok(Math.abs(initial[0]-320)<1e-9);assert.ok(Math.abs(rotated[0])<1e-9);assert.ok(Math.abs(rotated[2]-320)<1e-9);
});
