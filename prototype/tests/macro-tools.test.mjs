import test from 'node:test';
import assert from 'node:assert/strict';
import {macroMaterials,macroSettings,validateMaterials,validateMacroSettings,particleMaterial} from '../src/features/editor/macro-state.js';
import {createEditor,check} from '../src/features/editor/model.js';
import {ensureMaterialNodes,materialForNode} from '../src/features/editor/material-bindings.js';
const sample=()=>createEditor({id:'materials',type:'通用',definitionStatus:'可运行'});
test('material draft and settings do not mutate legacy configuration before applying',()=>{
 const s=sample(),n=s.nodes.find(n=>n.type==='macro'),before=structuredClone(n);
 const materials=structuredClone(macroMaterials(n));materials[0].name='draft';const settings=structuredClone(macroSettings(n));settings.length=20;
 assert.deepEqual(n,before);assert.equal(validateMaterials(macroMaterials(n)),null);assert.equal(validateMacroSettings(macroSettings(n)),null);
});
test('invalid domain assignments and material properties are rejected',()=>{
 const n=sample().nodes.find(n=>n.type==='macro'),materials=macroMaterials(n);
 materials[0].region='none';assert.match(validateMaterials(materials),/基体/);materials[0].region='matrix';materials[1].density=0;assert.match(validateMaterials(materials),/密度/);
 const v=macroSettings(n);v.hotFace=v.coldFace;assert.match(validateMacroSettings(v),/表面/);v.hotFace='X+';v.meshSize=100;assert.match(validateMacroSettings(v),/网格/);
});
test('additional assigned material has a separate modeling branch and particle group',()=>{
 const s=sample(),n=s.nodes.find(n=>n.type==='macro');n.params.materials=macroMaterials(n);n.params.materials.push({id:'bn',name:'氮化硼',color:'#d8b78c',region:'filler',density:2100,conductivity:60});
 ensureMaterialNodes(s);assert.equal(s.nodes.length,11);assert.deepEqual(check(s),[]);
 assert.equal(materialForNode(s,n.materialNodes.bn).material,'bn');assert.equal(particleMaterial(n.params.materials,0).id,'filler');assert.equal(particleMaterial(n.params.materials,1).id,'bn');
 n.params.materials.push({id:'unused',name:'待用',color:'#aabbcc',region:'none',density:1,conductivity:1});ensureMaterialNodes(s);assert.equal(n.materialNodes.unused,undefined);
});

test('adding material preserves every existing material modeling binding',()=>{
 const s=sample(),n=s.nodes.find(n=>n.type==='macro');ensureMaterialNodes(s);const previous={...n.materialNodes};n.params.materials=macroMaterials(n);n.params.materials.push({id:'extra',name:'新填料',color:'#aabbcc',region:'filler',density:1,conductivity:1});ensureMaterialNodes(s);assert.equal(n.materialNodes.matrix,previous.matrix);assert.equal(n.materialNodes.filler,previous.filler);assert.notEqual(n.materialNodes.extra,previous.matrix);
});
