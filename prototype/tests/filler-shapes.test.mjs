import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor,check} from '../src/features/editor/model.js';
import {macroMaterials,addPlateletMaterial} from '../src/features/editor/macro-state.js';
import {ensureMaterialNodes} from '../src/features/editor/material-bindings.js';
import {pickFiller} from '../src/features/editor/composite-preview.js';
test('TIM starts with one filler and adds an independent platelet branch',()=>{
 const s=createEditor({id:'tim-fillers',type:'TIM 导热',definitionStatus:'可运行'}),n=s.nodes.find(n=>n.type==='macro');ensureMaterialNodes(s);assert.equal(macroMaterials(n).filter(m=>m.region==='filler').length,1);assert.equal(s.nodes.length,9);addPlateletMaterial(n);ensureMaterialNodes(s);
 assert.equal(macroMaterials(n).length,3);assert.deepEqual(macroMaterials(n).filter(m=>m.region==='filler').map(m=>m.shape),['sphere','platelet']);
 assert.equal(s.nodes.filter(n=>n.type==='micro').length,3);assert.equal(s.nodes.filter(n=>n.type==='microCompute').length,3);assert.equal(s.nodes.length,11);assert.deepEqual(check(s),[]);
 const previous=structuredClone(s);ensureMaterialNodes(s);assert.deepEqual(s,previous);
});
test('plate picking respects its polygon instead of the surrounding circle',()=>{
 const p={id:1,depth:1,x:5,y:5,radius:10,polygon:[[0,0],[10,0],[10,2],[0,2]]};assert.equal(pickFiller([p],5,1),p);assert.equal(pickFiller([p],5,6),null);
});

test('old dual-filler demo becomes single filler once without changing run snapshots',()=>{
 const s=createEditor({id:'old-demo',type:'TIM 导热',definitionStatus:'可运行'}),n=s.nodes.find(n=>n.type==='macro');ensureMaterialNodes(s);addPlateletMaterial(n);ensureMaterialNodes(s);n.params.fillerShapesVersion=1;s.runs=[{snapshot:structuredClone({nodes:s.nodes,edges:s.edges})}];const runs=structuredClone(s.runs);ensureMaterialNodes(s);assert.equal(s.nodes.length,9);assert.deepEqual(s.runs,runs);addPlateletMaterial(n);ensureMaterialNodes(s);assert.equal(s.nodes.length,11);const again=structuredClone(s);ensureMaterialNodes(s);assert.deepEqual(s,again);
});
