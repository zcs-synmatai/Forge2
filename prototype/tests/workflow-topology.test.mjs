import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor,makeNode,connect,check,migrateEditor} from '../src/features/editor/model.js';
const sample=()=>createEditor({id:'dag',name:'dag',type:'通用',definitionStatus:'可运行'});
test('disconnected branch and missing end block the full workflow',()=>{
  const s=sample();s.nodes.push(makeNode('microCompute','isolated'));
  assert.ok(check(s).some(i=>i.nodeId==='isolated'&&i.field==='开始路径'));
  assert.ok(check(s).some(i=>i.nodeId==='isolated'&&i.field==='结束路径'));
  s.nodes=s.nodes.filter(n=>n.type!=='end');s.edges=s.edges.filter(e=>e.to!=='end');
  assert.ok(check(s).some(i=>i.field==='结束'));
});
test('multiple property computations share one model and each reaches the end',()=>{
  const s=sample();s.nodes.push(makeNode('microCompute','density'));
  s.nodes.at(-1).params.property='density';
  assert.equal(connect(s,'micro','density'),null);assert.equal(connect(s,'density','macro'),null);
  assert.deepEqual(check(s),[]);
  s.edges=s.edges.filter(e=>!(e.from==='density'&&e.to==='macro'));
  assert.ok(check(s).some(i=>i.nodeId==='density'&&i.field==='结束路径'));
});
test('cycles and duplicate terminals block execution even in imported data',()=>{
  const s=sample();s.edges.push({from:'macro',to:'micro',input:'start'});
  assert.ok(check(s).some(i=>i.field==='依赖'&&i.reason.includes('循环')));
  s.nodes.push(makeNode('start','start-duplicate'));
  assert.ok(check(s).some(i=>i.reason==='只能保留一个开始节点'));
  assert.ok(connect(s,'end','start'));
});
test('old four-stage data splits computations and gains terminals without changing snapshots',()=>{
  const s=sample();s.schemaVersion=3;s.nodes=s.nodes.filter(n=>!['start','end','microCompute'].includes(n.type));s.nodes.find(n=>n.type==='micro').params.task='saved-task';
  s.edges=[{from:'micro',to:'macro',input:'microData'},{from:'macro',to:'schedule',input:'model'},{from:'schedule',to:'result',input:'execution'}];
  s.runs=[{snapshot:structuredClone({nodes:s.nodes,edges:s.edges})}];const runs=structuredClone(s.runs);
  migrateEditor(s);
  assert.equal(s.schemaVersion,5);assert.deepEqual(check(s),[]);
  assert.equal(s.nodes.find(n=>n.type==='microCompute').params.task,'saved-task');
  assert.deepEqual(s.runs,runs);const once=structuredClone(s);migrateEditor(s);assert.deepEqual(s,once);
});
