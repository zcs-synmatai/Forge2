import test from 'node:test';
import assert from 'node:assert/strict';
import {pipeApplication,reflowPipe,createPipeSegment} from '../src/features/editor/application-models.js';
import {primitiveMesh,validatePrimitive} from '../src/features/editor/primitives.js';
test('rectangular pipe endpoints use all four dimensions and length along the pipe axis',()=>{
 const p={id:'rect',type:'cone',crossSection:'rectangle',pipeSegment:true,axis:'x',height:60,inletLength:40,inletWidth:30,outletLength:20,outletWidth:10,x:0,y:0,z:0};
 assert.equal(validatePrimitive(p),null);const {vertices}=primitiveMesh(p);
 assert.deepEqual(vertices[0],[-30,-20,-15]);assert.deepEqual(vertices[6],[30,10,5]);
 assert.ok(validatePrimitive({...p,outletWidth:0}));
 const settings={primitives:[p],meshSize:1};reflowPipe(settings);assert.equal(settings.width,40);assert.equal(settings.height,30);assert.equal(settings.length,60);
 assert.deepEqual(primitiveMesh(JSON.parse(JSON.stringify(p))),primitiveMesh(p));
});
test('rectangular interfaces stay aligned and new segments inherit outlet shape after deletion',()=>{
 const settings=pipeApplication('extrusion').modeling;settings.primitives.splice(1,1);reflowPipe(settings);
 const last=settings.primitives.at(-1);Object.assign(last,{crossSection:'rectangle',inletLength:20,inletWidth:16,outletLength:12,outletWidth:8});
 const added=createPipeSegment(settings);assert.equal(added.crossSection,'rectangle');assert.equal(added.inletLength,12);assert.equal(added.inletWidth,8);assert.equal(added.order,3);
 settings.primitives.push(added);reflowPipe(settings,added.id);
 assert.equal(last.x+last.height/2,added.x-added.height/2);assert.deepEqual(settings.primitives.map(p=>p.order),[0,1,2,3]);
 settings.primitives=[];const first=createPipeSegment(settings);assert.equal(first.order,0);assert.equal(validatePrimitive(first),null);
});
