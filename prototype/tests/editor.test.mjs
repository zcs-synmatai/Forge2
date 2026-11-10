import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor,initializeBlankWorkflow,connect,invalidate,check,orderNodes,canRunNode,makeNode,kinds,stages,migrateEditor,reportConclusion} from '../src/features/editor/model.js';
const workflow={id:'wf-test',name:'TIM 测试',type:'TIM 导热',nodeCount:4,definitionStatus:'可运行',latestRun:{id:'run-old',status:'成功',time:'2026-10-28 09:20'}};
test('TIM is a macro case within the same workflow system',()=>{
  const s=createEditor(workflow);
  assert.deepEqual(s.nodes.map(n=>n.type),stages);
  assert.deepEqual(Object.values(kinds),['开始','微观建模','微观物性计算','宏观建模','计算调度','结果呈现','结束']);
  assert.equal(s.nodes.find(n=>n.type==='macro').params.case,'tim');assert.equal(s.edges.length,6);
  assert.deepEqual(check(s),[]);assert.ok(canRunNode(s,s.nodes[1]));
});
for(const from of stages)for(const to of stages)test('stage direction: '+from+' → '+to,()=>{
  const s=createEditor(workflow);s.edges=[];const before=JSON.stringify(s);
  const result=connect(s,from,to);
  if(stages.indexOf(to)===stages.indexOf(from)+1){assert.equal(result,null);assert.equal(s.edges.length,1);}
  else {assert.ok(result);assert.equal(JSON.stringify(s),before);}
});
test('different macro cases use the same stage connections',()=>{
  for(const type of ['通用','TIM 导热','流动']){const s=createEditor({...workflow,type});assert.deepEqual(check(s),[]);assert.deepEqual(s.edges.map(e=>[e.from,e.to]),stages.slice(1).map((type,i)=>[stages[i],type]));}
});
test('one micro model supports multiple property calculations without replacing connections',()=>{
  const s=createEditor(workflow);s.nodes.push(makeNode('microCompute','property-2'));assert.equal(connect(s,'micro','property-2'),null);
  assert.equal(connect(s,'property-2','macro'),null);assert.equal(s.edges.filter(e=>e.to==='macro').length,2);
});
test('upstream change invalidates later stages and preserves the historical snapshot',()=>{
  const s=createEditor(workflow),snapshot=JSON.stringify(s.runs[0].snapshot);invalidate(s,'macro');
  assert.equal(s.nodes[0].status,'成功');assert.equal(s.nodes.at(-1).status,'已过期');
  assert.equal(JSON.stringify(s.runs[0].snapshot),snapshot);assert.equal(canRunNode(s,s.nodes[2]),false);
});
test('TIM-specific validation stays inside macro configuration',()=>{
  const s=createEditor(workflow);s.nodes.find(n=>n.type==='macro').params.filler='';
  assert.ok(check(s).some(i=>i.nodeId==='macro'&&i.field==='填料热导率'));
  const generic=createEditor({...workflow,type:'通用'});assert.deepEqual(check(generic),[]);
});
test('scheduler validates resource parameters',()=>{const s=createEditor(workflow);s.nodes.find(n=>n.type==='schedule').params.cores=0;assert.ok(check(s).some(i=>i.nodeId==='schedule'&&i.field==='并行核数'));});
test('execution order follows dependencies even when node array is reversed',()=>{const s=createEditor(workflow);s.nodes.reverse();assert.deepEqual(orderNodes(s).map(n=>n.type),stages);});
test('blank task starts with a connected scaffold but requires geometry and calculation configuration',()=>{
  const s=createEditor({...workflow,type:'通用',nodeCount:0,latestRun:null});
  assert.equal(s.selected,'macro');assert.deepEqual(s.nodes.map(n=>n.type),stages);assert.equal(s.edges.length,6);assert.equal(s.runs.length,0);
  const macro=s.nodes.find(n=>n.type==='macro');assert.equal(macro.params.blankGeometry,true);assert.deepEqual(macro.params.materials,[]);
  assert.ok(check(s).some(i=>i.field==='几何模型'));assert.ok(check(s).some(i=>i.field==='微观任务'));
  assert.equal(canRunNode(s,macro),false);
});
test('legacy empty tasks get a scaffold once without replacing subsequent edits',()=>{
  const s={nodes:[],edges:[],runs:[],revision:1};initializeBlankWorkflow(s);
  s.nodes.find(n=>n.type==='macro').params.modelName='我的模型';const before=JSON.stringify(s);initializeBlankWorkflow(s);assert.equal(JSON.stringify(s),before);
  assert.deepEqual(orderNodes(s).map(n=>n.type),stages);
});

test('missing microscopic task blocks downstream execution',()=>{const s=createEditor(workflow);s.nodes.find(n=>n.type==='microCompute').status='等待上游';assert.ok(check(s).some(i=>i.reason.includes('尚未完成')));});
test('legacy TIM definition migrates without losing geometry, parameters or run snapshots',()=>{
  const historical={nodes:[{id:'tim',type:'tim',params:{hot:95}}]};
  const s={workflowId:'legacy',name:'old',nodes:[{...makeNode('micro')},{id:'extract',type:'extract',params:{field:'thermal_conductivity'}},{id:'mapping',type:'mapping',params:{factor:2}},{id:'geometry',type:'geometry',params:{length:25,seed:99}},{id:'tim',type:'tim',name:'原 TIM 模型',version:3,params:{hot:95}},{id:'report',type:'report',params:{}}],edges:[{from:'micro',to:'extract'},{from:'extract',to:'mapping'},{from:'mapping',to:'tim'},{from:'geometry',to:'tim'},{from:'tim',to:'report'}],runs:[{snapshot:historical}],history:[],selected:'extract',revision:7};
  const original=structuredClone(s);migrateEditor(s);
  assert.deepEqual(s.nodes.map(n=>n.type).sort(),[...stages].sort());
  const macro=s.nodes.find(n=>n.type==='macro');assert.equal(macro.params.hot,95);assert.equal(macro.params.length,25);assert.equal(macro.params.seed,99);assert.equal(macro.params.binding.factor,2);
  assert.deepEqual(s.runs,original.runs);assert.deepEqual(s.legacyDefinition.nodes,original.nodes);
  assert.equal(s.edges.length,6);assert.equal(s.checkedRevision,null);assert.equal(s.selected,'tim');
  const once=structuredClone(s);migrateEditor(s);assert.deepEqual(s,once);
});
test('fresh nodes never assume TIM and obsolete case types cannot be created',()=>{assert.equal(makeNode('macro').params.case,'generic');assert.throws(()=>makeNode('tim'));});
test('generic report never inherits the TIM sample values',()=>{const s=createEditor({...workflow,type:'通用'});const text=reportConclusion(s.runs[0]);assert.doesNotMatch(text,/2\.46|18\.7|TIM/);assert.match(text,/通用工作流/);assert.match(reportConclusion(createEditor(workflow).runs[0]),/TIM/);assert.match(reportConclusion({snapshot:{nodes:[{type:'flow'}]}}),/圆管/);});
