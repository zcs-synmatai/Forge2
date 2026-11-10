import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedWheelPan as pan} from '../src/features/editor/canvas-runtime/wheel-bounds.js';
const bounds={x:-200,y:100,width:1200,height:300},area={x:16,y:14,width:900,height:250};
test('wheel movement freezes at all four edges while retaining visible workflow content',()=>{
 for(const [axis,size,strip]of [['x','width',96],['y','height',80]]){
  const current={x:30,y:20,zoom:.8},delta={x:0,y:0};delta[axis]=1e5;
  const lower=pan(current,delta,bounds,area);
  assert.equal(lower[axis]+(bounds[axis]+bounds[size])*lower.zoom,area[axis]+strip);
  assert.deepEqual(pan(lower,delta,bounds,area),lower);
  delta[axis]=-1e5;const upper=pan(current,delta,bounds,area);
  assert.equal(upper[axis]+bounds[axis]*upper.zoom,area[axis]+area[size]-strip);
  assert.deepEqual(pan(upper,delta,bounds,area),upper);
  delta[axis]=10;assert.ok(pan(upper,delta,bounds,area)[axis]<upper[axis]);
 }
});
test('already-lost legacy camera can scroll inward gradually without jumping',()=>{
 const current={x:0,y:-2000,zoom:1};assert.deepEqual(pan(current,{x:0,y:100},bounds,area),current);
 assert.equal(pan(current,{x:0,y:-30},bounds,area).y,-1970);
});
test('zoomed-out tiny content stays visible and empty canvas remains pannable',()=>{
 const tiny={x:20,y:10,width:30,height:20},camera={x:40,y:40,zoom:.2};const next=pan(camera,{x:-1e5,y:1e5},tiny,area);
 assert.equal(next.zoom,.2);assert.ok(next.y+tiny.y*.2>=area.y-1e-9);
 assert.deepEqual(pan(camera,{x:10,y:20},null,area),{x:30,y:20,zoom:.2});
});
