import test from 'node:test';
import assert from 'node:assert/strict';
import {modelingRecords,renderModelingPage,moleculeThumbnail,macroThumbnail,moleculeRecordsKey} from '../src/features/modeling/modeling-page.js';
import {createEditor} from '../src/features/editor/model.js';
import {createMolecule} from '../src/features/editor/molecule.js';
test('modeling page combines saved molecular records and reusable models with distinct navigation',()=>{
 const records=[{id:'m1',name:'独立模型',molecule:createMolecule('benzene'),time:'2026-11-11'}];global.localStorage={getItem:key=>key===moleculeRecordsKey?JSON.stringify(records):null};
 const w={id:'cross',name:'挤出模型',type:'挤出模拟',nodeCount:7,updatedAt:'2026-11-11',definitionStatus:'草稿'},s=createEditor(w),get=()=>s;
 const data=modelingRecords([w],get);assert.equal(data.cross.length,1);assert.equal(data.molecular.length,8);assert.equal(data.molecular[0].local,true);
 const html=renderModelingPage([w],get);assert.ok(html.includes('data-model-molecule="m1"'));assert.ok(html.includes('data-id="cross"'));assert.ok(html.includes('data-model-new="molecule"'));assert.ok(html.includes('data-model-new="tim"'));assert.ok(html.includes('data-model-new="extrusion"'));assert.ok(html.includes('跨尺度建模记录'));assert.ok(!html.includes('data-run-id'));delete global.localStorage;
});
test('thumbnail variants cover molecules, blank geometry and extrusion without external assets',()=>{
 assert.match(moleculeThumbnail(createMolecule('ethanol')),/分子模型缩略图/);
 assert.match(macroThumbnail({params:{blankGeometry:true}}),/stroke-dasharray/);
 assert.match(macroThumbnail({params:{case:'extrusion'}}),/ellipse/);
});

test('molecular samples provide distinct valid structures without replacing saved models',async()=>{const {localMoleculeRecords}=await import('../src/features/modeling/modeling-page.js');const {validateMolecule,moleculeFormula}=await import('../src/features/editor/molecule.js');global.localStorage={getItem:()=>null};const records=localMoleculeRecords();assert.equal(records.length,6);assert.equal(new Set(records.map(r=>moleculeFormula(r.molecule))).size,6);for(const r of records)assert.equal(validateMolecule(r.molecule),null);const edited={...records[0],name:'我的修改',molecule:createMolecule('water')};global.localStorage={getItem:()=>JSON.stringify([edited])};assert.equal(localMoleculeRecords().find(r=>r.id===edited.id).name,'我的修改');delete global.localStorage;});

test('deleted molecular examples and linked records stay deleted after reload',async()=>{const {deleteMolecularRecord,localMoleculeRecords}=await import('../src/features/modeling/modeling-page.js');const store=new Map();global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};try{const id=localMoleculeRecords()[0].id;deleteMolecularRecord(id);assert.ok(!localMoleculeRecords().some(r=>r.id===id));const w={id:'delete-source',name:'source',type:'TIM 导热',definitionStatus:'草稿',nodeCount:7},state=createEditor(w),micro=state.nodes.find(n=>n.type==='micro'),recordId=w.id+':'+micro.id;deleteMolecularRecord(recordId);assert.ok(!modelingRecords([w],()=>state).molecular.some(r=>r.id===recordId));assert.ok(state.nodes.includes(micro));const html=renderModelingPage([w],()=>state);assert.ok(html.includes('data-delete-cross-model'));assert.ok(html.includes('data-delete-molecule'));}finally{delete global.localStorage;}});
