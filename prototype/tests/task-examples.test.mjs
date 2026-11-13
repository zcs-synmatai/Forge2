import test from 'node:test';
import assert from 'node:assert/strict';
import {multiscaleExampleDefinitions as definitions,createExampleDefinition} from '../src/features/editor/task-examples.js';
import {editLockReason,beginExecution,advanceExecution,executionOf,retryExecutionTask} from '../src/features/editor/execution.js';
import {collectTasks} from '../src/features/tasks/task-data.js';
const load=w=>createExampleDefinition(w);
const context=s=>({...s,...structuredClone(s.runs[0].workingDefinition),viewMode:'execution',activeRunId:s.runs[0].id});
test('default task list includes four distinct cross-scale examples with snapshots and model references',()=>{
 const records=collectTasks(definitions,load),cross=records.filter(t=>t.type==='跨尺度模拟');assert.equal(cross.length,4);assert.deepEqual(new Set(cross.map(t=>t.status)),new Set(['运行中','已阻塞','部分完成','已完成']));
 assert.ok(cross.every(t=>t.workflowId&&t.runId&&t.definitionSnapshot.nodes.length>=7));assert.ok(records.slice(0,5).some(t=>t.type==='跨尺度模拟'));
});
test('completed example locks both task and source nodes',()=>{
 const s=load(definitions.find(w=>w.exampleScenario==='全部完成')),c=context(s);assert.ok(c.nodes.every(n=>editLockReason(c,n.id)));assert.ok(s.nodes.every(n=>editLockReason(s,n.id)));
});
test('running example locks completed nodes but leaves the unfinished macro parameters editable',()=>{
 const c=context(load(definitions.find(w=>w.exampleScenario==='全部运行')));assert.equal(executionOf(c).status,'运行中');assert.equal(c.nodes.find(n=>n.type==='macro').status,'运行中');assert.equal(editLockReason(c,c.nodes.find(n=>n.type==='macro').id),'');assert.ok(editLockReason(c,c.nodes.find(n=>n.type==='microCompute').id));
});
test('blocked example resumes without recomputing completed inputs or changing its original snapshot',()=>{
 const c=context(load(definitions.find(w=>w.exampleScenario==='节点阻塞'))),r=executionOf(c),snapshot=structuredClone(r.snapshot),blocked=Object.values(r.tasks).find(t=>t.status==='已阻塞'),done=Object.values(r.tasks).filter(t=>t.status==='已完成').map(t=>[t.nodeId,t.attempts]);retryExecutionTask(c,blocked.nodeId);beginExecution(c);for(let i=0;i<50;i++)advanceExecution(c);assert.equal(r.status,'成功');assert.deepEqual(r.snapshot,snapshot);for(const [id,attempts]of done)assert.equal(r.tasks[id].attempts,attempts);
});
