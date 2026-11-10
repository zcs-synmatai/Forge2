import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor,check,makeNode,connect} from '../src/features/editor/model.js';
import {ensureMaterialNodes} from '../src/features/editor/material-bindings.js';
import {reflowPipe} from '../src/features/editor/application-models.js';
import {primitiveMesh,validatePrimitive} from '../src/features/editor/primitives.js';
import {hasCompositeGeometry} from '../src/features/editor/macro-state.js';
const task=applicationType=>({id:'application-'+applicationType,name:'应用任务',applicationType,type:'通用',nodeCount:applicationType==='blank'?0:9,definitionStatus:'草稿'});
test('four application types initialize distinct geometry and matching structure branches',()=>{
 const extrusion=createEditor(task('extrusion'));ensureMaterialNodes(extrusion);const p=extrusion.nodes.find(n=>n.type==='macro').params;
 assert.deepEqual(p.modeling.primitives.map(p=>p.type),['cylinder','cone','cylinder','cone']);assert.equal(p.materials.length,1);assert.equal(extrusion.nodes.filter(n=>n.type==='micro').length,1);assert.deepEqual(check(extrusion),[]);
 const flow=createEditor(task('flow'));ensureMaterialNodes(flow);const macro=flow.nodes.find(n=>n.type==='macro');assert.equal(macro.params.modeling.primitives.length,1);assert.equal(macro.params.materials.length,1);assert.equal(hasCompositeGeometry(macro),false);assert.deepEqual(check(flow),[]);
 const blank=createEditor(task('blank'));ensureMaterialNodes(blank);assert.deepEqual(blank.nodes.find(n=>n.type==='macro').params.materials,[]);
 const tim=createEditor(task('tim'));ensureMaterialNodes(tim);assert.equal(hasCompositeGeometry(tim.nodes.find(n=>n.type==='macro')),true);
});
test('editing pipe segment lengths and radii keeps all interfaces connected',()=>{
 const settings=createEditor(task('extrusion')).nodes.find(n=>n.type==='macro').params.modeling;
 const cone=settings.primitives[1];cone.height=90;cone.radius=25;cone.endRadius=12;reflowPipe(settings,cone.id);
 const parts=settings.primitives;
 for(let i=1;i<parts.length;i++){assert.equal(parts[i-1].x+parts[i-1].height/2,parts[i].x-parts[i].height/2);assert.equal(parts[i-1].type==='cylinder'?parts[i-1].radius:parts[i-1].endRadius,parts[i].radius);}
 assert.equal(parts[0].radius,25);assert.equal(parts[2].radius,12);assert.equal(parts[3].radius,12);
 for(const part of parts){assert.equal(validatePrimitive(part),null);const mesh=primitiveMesh(part);assert.equal(Math.min(...mesh.vertices.map(v=>v[0])),part.x-part.height/2);assert.equal(Math.max(...mesh.vertices.map(v=>v[0])),part.x+part.height/2);assert.ok(mesh.vertices.flat().every(Number.isFinite));}
 const snapshot=JSON.stringify(settings);const restored=JSON.parse(snapshot);reflowPipe(restored);assert.equal(JSON.stringify(restored),snapshot);
});

test('legacy extrusion branches merge into one material while geometry and history stay intact',()=>{
 const state=createEditor(task('extrusion')),macro=state.nodes.find(n=>n.type==='macro'),source=macro.params.materials[0],geometry=JSON.stringify(macro.params.modeling);
 macro.params.materials=macro.params.modeling.primitives.map((p,i)=>({...structuredClone(source),id:'old-material-'+i,name:p.name,structureName:p.name,geometryId:p.id,shape:p.type}));delete macro.params.extrusionMaterialVersion;delete macro.params.materialScope;
 macro.materialNodes={};
 for(let i=0;i<4;i++){const micro=i?makeNode('micro','old-micro-'+i):state.nodes.find(n=>n.type==='micro'),calc=i?makeNode('microCompute','old-calc-'+i):state.nodes.find(n=>n.type==='microCompute');if(i){state.nodes.push(micro,calc);connect(state,'start',micro.id);connect(state,micro.id,calc.id);connect(state,calc.id,macro.id);}macro.materialNodes['old-material-'+i]=micro.id;}
 state.runs=[{snapshot:structuredClone({nodes:state.nodes,edges:state.edges})}];const snapshot=JSON.stringify(state.runs);
 ensureMaterialNodes(state);assert.equal(state.nodes.filter(n=>n.type==='microCompute').length,1);assert.equal(state.nodes.filter(n=>n.type==='micro').length,1);assert.equal(macro.params.materials.length,1);assert.equal(JSON.stringify(state.runs),snapshot);assert.equal(macro.extrusionMigrationBackup.nodes.length,6);
 const original=JSON.parse(geometry);assert.deepEqual(macro.params.modeling,original);assert.equal(macro.params.materialScope,'whole-model');assert.deepEqual(check(state),[]);
 const once=JSON.stringify(state);ensureMaterialNodes(state);assert.equal(JSON.stringify(state),once);
});
