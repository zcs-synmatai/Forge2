import test from 'node:test';
import assert from 'node:assert/strict';
import {modelStructures,assignStructureMaterial,materialLibrary,validateMaterials} from '../src/features/editor/macro-state.js';
test('structures can share library data while keeping independent shape and color',()=>{
 const before=structuredClone(materialLibrary),n={params:{}},structures=structuredClone(modelStructures(n));
 assignStructureMaterial(structures[0],'epoxy');assignStructureMaterial(structures[1],'epoxy');
 structures[1].shape='platelet';structures[1].color='#bbaaee';
 assert.notEqual(structures[0].material,structures[1].material);
 assert.equal(structures[0].material.libraryId,structures[1].material.libraryId);
 assert.equal(structures[0].name,'基底');assert.equal(structures[1].name,'材料1');
 assert.deepEqual(materialLibrary,before);assert.equal(n.params.materials,undefined);assert.equal(validateMaterials(structures),null);
});
test('unassigned structures cannot be applied and material reassignment keeps structure identity',()=>{
 const structures=structuredClone(modelStructures({params:{}})),filler=structures[1],id=filler.id,name=filler.name;
 filler.material=null;assert.match(validateMaterials(structures),/选择/);
 assignStructureMaterial(filler,'bn');assert.equal(filler.id,id);assert.equal(filler.name,name);assert.equal(filler.material.name,'氮化硼');assert.equal(validateMaterials(structures),null);
});
test('legacy custom material identity and properties survive structure migration',()=>{
 const s=modelStructures({params:{materials:[{id:'custom',name:'用户配方A',region:'matrix',color:'#aabbcc',density:1550,conductivity:2.5}]}});
 assert.equal(s[0].name,'基底');assert.equal(s[0].material.name,'用户配方A');assert.equal(s[0].material.density,1550);assert.equal(s[0].id,'custom');
});

test('blank tasks show assigned structures immediately and on reload without preset geometry',async()=>{
 const {hasCompositeGeometry,libraryAssignment}=await import('../src/features/editor/macro-state.js');
 const {createEditor,check}=await import('../src/features/editor/model.js');
 const s=createEditor({id:'blank-materials',name:'空白任务',nodeCount:0,type:'通用',definitionStatus:'草稿'}),macro=s.nodes.find(n=>n.type==='macro');
 assert.equal(hasCompositeGeometry(macro),false);
 macro.params.materials=[{id:'base',name:'基底',region:'matrix',color:'#a8bdd7',density:1200,conductivity:.24,material:libraryAssignment('epoxy')},{id:'filler',name:'材料1',region:'filler',shape:'sphere',color:'#b394dc',density:3950,conductivity:30,material:libraryAssignment('alumina')},{id:'plate',name:'材料2',region:'filler',shape:'platelet',color:'#8daebc',density:2100,conductivity:60,material:libraryAssignment('bn')}];
 assert.equal(hasCompositeGeometry(macro),true);assert.equal(check(s).some(i=>i.field==='几何模型'),false);
 assert.equal(hasCompositeGeometry(JSON.parse(JSON.stringify(macro))),true);
 macro.params.materials=[];assert.equal(hasCompositeGeometry(macro),false);
});
