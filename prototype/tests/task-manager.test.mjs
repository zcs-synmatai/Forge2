import test from 'node:test';
import assert from 'node:assert/strict';
import {collectTasks,visibleTasks,taskCounts,loadRemovedTasks,saveRemovedTasks} from '../src/features/tasks/task-data.js';
test('task management combines independent microscopic demos, workflow runs and submitted microscopic nodes',()=>{
 const workflows=[{id:'wf',name:'挤出任务',type:'挤出模拟'}],snapshot={nodes:[{id:'micro',type:'microCompute',name:'整体材料计算',params:{temperature:300}}]},runs=[{id:'r1',time:'2026-11-10 10:00',status:'已阻塞',snapshot,tasks:{micro:{requested:true,status:'已阻塞',progress:40,reason:'服务不可用',logs:['阻塞']}}}];
 const before=structuredClone(runs),records=collectTasks(workflows,()=>({runs}));
 assert.ok(records.some(t=>t.type==='跨尺度模拟'&&t.runId==='r1'));
 assert.ok(records.some(t=>t.type==='微观模拟'&&t.nodeId==='micro'&&t.reason==='服务不可用'));
 assert.ok(records.some(t=>t.id==='J00087'));assert.deepEqual(runs,before);
 assert.equal(new Set(records.map(t=>t.key)).size,records.length);
});
test('query, task category, status and recoverable removal compose without changing source records',()=>{
 const records=[{key:'1',id:'a',name:'环氧材料',type:'微观模拟',status:'失败',source:'微观',property:'Tg'},{key:'2',id:'b',name:'TIM模型',type:'跨尺度模拟',status:'已完成',source:'任务',property:'TIM 导热'}],base={query:'',type:'全部',status:'全部'};
 assert.equal(visibleTasks(records,{...base,type:'微观模拟'}).length,1);
 assert.equal(visibleTasks(records,{...base,query:'TIM',status:'已完成'})[0].id,'b');
 assert.equal(visibleTasks(records,base,new Set(['1'])).length,1);
 assert.deepEqual(taskCounts(records),{total:2,running:0,completed:1,failed:1});assert.equal(records.length,2);
});
test('hidden task list is persistable and can be fully restored without deleting run data',()=>{
 const previous=global.localStorage,store=new Map();global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 try{saveRemovedTasks(new Set(['task1']));assert.deepEqual([...loadRemovedTasks()],['task1']);saveRemovedTasks(new Set());assert.equal(loadRemovedTasks().size,0);}finally{global.localStorage=previous;}
});
