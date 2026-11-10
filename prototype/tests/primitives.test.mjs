import test from 'node:test';
import assert from 'node:assert/strict';
import {primitiveTypes,primitiveMesh,validatePrimitive} from '../src/features/editor/primitives.js';
for(const type of Object.keys(primitiveTypes))test(type+' produces finite indexed geometry at the configured position',()=>{
 const p={type,length:4,width:6,height:8,radius:3,tubeRadius:1,x:10,y:-2,z:4};
 assert.equal(validatePrimitive(p),null);const m=primitiveMesh(p);assert.ok(m.vertices.length>=8);assert.ok(m.faces.length>=6);
 assert.ok(m.vertices.every(v=>v.every(Number.isFinite)));assert.ok(m.faces.every(f=>f.every(i=>Number.isInteger(i)&&i>=0&&i<m.vertices.length)));
 const moved=primitiveMesh({...p,x:12});m.vertices.forEach((v,i)=>assert.ok(Math.abs(moved.vertices[i][0]-v[0]-2)<1e-10));
});
test('invalid dimensions and self intersecting torus dimensions are rejected',()=>{
 assert.ok(validatePrimitive({type:'sphere',radius:0,x:0,y:0,z:0}));assert.ok(validatePrimitive({type:'torus',radius:1,tubeRadius:2,x:0,y:0,z:0}));
});
