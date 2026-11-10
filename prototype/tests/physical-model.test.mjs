import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor} from '../src/features/editor-v1/model.js';
import {createMolecule} from '../src/features/editor/molecule.js';
import {createPhysicalModel,checkPhysicalModel,updateMaterial,materialRoute,loadPhysicalModel,savePhysicalModel,physicalKey} from '../src/features/physical-model/model.js';

const workflow={id:'physical-test',name:'材料建模测试',type:'TIM 导热',nodeCount:4,definitionStatus:'可运行'};
test('physical model derives geometry and materials without mutating the V1 definition',()=>{
  const legacy=createEditor(workflow);legacy.nodes[1].params.matrix=.47;legacy.nodes[0].params.molecule=createMolecule('ethanol');
  const before=structuredClone(legacy),model=createPhysicalModel(workflow,legacy);
  assert.equal(model.materials[0].conductivity,.47);assert.equal(model.materials[0].molecule.name,'乙醇');assert.equal(model.materials[1].region,'颗粒区域');
  updateMaterial(model,'matrix',{conductivity:.8,molecule:createMolecule('benzene')});model.geometry.length=22;
  assert.deepEqual(legacy,before);assert.equal(model.materials[1].conductivity,30);
});
test('material changes invalidate only the new model check and record a change',()=>{
  const model=createPhysicalModel(workflow);model.checkedRevision=model.revision;
  updateMaterial(model,'matrix',{name:'新的基体',density:1200});assert.equal(model.checkedRevision,null);assert.equal(model.revision,2);assert.match(model.history[0].text,/新的基体/);
  assert.throws(()=>updateMaterial(model,'missing',{name:'invalid'}),/不存在/);
});
test('unassigned material regions and invalid physical properties are reported',()=>{
  const model=createPhysicalModel(workflow);assert.deepEqual(checkPhysicalModel(model),[]);
  model.materials[0].region='未分配';model.materials[0].conductivity=0;
  assert.ok(checkPhysicalModel(model).some(e=>e.includes('绑定')));assert.ok(checkPhysicalModel(model).some(e=>e.includes('热导率')));
});
test('generic model starts with no assumed TIM geometry or material assignments',()=>{
  const model=createPhysicalModel({...workflow,type:'通用',nodeCount:0});assert.equal(model.case,'generic');assert.equal(model.materials.length,0);assert.ok(checkPhysicalModel(model).some(e=>e.includes('创建几何')));
});
test('material window route survives identifiers requiring URL encoding',()=>{
  const path=materialRoute('模型 1','材料/2'),parts=new URL(path,'http://localhost').pathname.split('/');assert.equal(decodeURIComponent(parts[3]),'模型 1');assert.equal(decodeURIComponent(parts[6]),'材料/2');
});
test('V1 editor and physical model use independent persisted drafts',async()=>{
  const previous=globalThis.localStorage,storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
  try{
    const source=createEditor({...workflow,id:'isolated-case'}),old=JSON.stringify(source);storage.set('forge-editor-v1:isolated-case',old);
    const {loadEditor:loadV1}=await import('../src/features/editor-v1/workbench.js');const v1=loadV1({...workflow,id:'isolated-case'}),physical=loadPhysicalModel({...workflow,id:'isolated-case'});
    updateMaterial(physical,'matrix',{conductivity:1.25});savePhysicalModel(physical);
    assert.equal(storage.get('forge-editor-v1:isolated-case'),old);assert.equal(v1.nodes[1].params.matrix,.24);assert.equal(JSON.parse(storage.get(physicalKey('isolated-case'))).materials[0].conductivity,1.25);
  }finally{globalThis.localStorage=previous;}
});
