import test from 'node:test';
import assert from 'node:assert/strict';
import {compositeParticles,pickFiller} from '../src/features/editor/composite-preview.js';
test('filler particles are separated and contained inside the block',()=>{const particles=compositeParticles();assert.equal(particles.length,18);for(const p of particles)for(const key of ['x','y','z'])assert.ok(Math.abs(p[key])+p.r<1.1);for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){const a=particles[i],b=particles[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>a.r+b.r);}});
test('picking overlapping projected particles selects the front particle',()=>{const points=[{id:0,x:50,y:60,radius:12,depth:-1},{id:1,x:50,y:60,radius:12,depth:1}];assert.equal(pickFiller(points,52,62).id,1);assert.equal(pickFiller(points,120,120),null);});
