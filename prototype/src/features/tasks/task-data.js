import {algorithmName} from '../editor/algorithm-inputs.js';
export const microTaskExamples=[
 {id:'J00087',name:'环氧树脂 · Tg 计算',status:'失败',property:'Tg',method:'MD',time:'2026-11-10 09:08',duration:'3分12秒',reason:'平衡阶段未收敛，请检查温度范围与平衡设置。',params:{计算链数:5,开始温度:'100 K',结束温度:'600 K',平衡温度:'100 K',帧:200,间隔:1000}},
 {id:'J00085',name:'硅橡胶 · CTE 计算',status:'运行中',property:'CTE',method:'MD',time:'2026-11-10 09:02',progress:62,params:{计算链数:5,开始温度:'100 K',结束温度:'600 K'}},
 {id:'J00084',name:'氧化铝 · 分子结构计算',status:'失败',property:'结构优化',method:'DFT',time:'2026-11-10 08:50',duration:'1分46秒',reason:'计算资源分配失败，本次未产生有效结果。',params:{计算类型:'结构优化',泛函:'B3LYP',基组:'6-31g',方法:'RKS',分子电荷:0,未成对电子数:0}},
 {id:'J00083',name:'环氧树脂 · 光谱计算',status:'已完成',property:'紫外可见光谱',method:'DFT',time:'2026-11-10 08:35',duration:'6分18秒',params:{泛函:'B3LYP',基组:'6-31g',方法:'RKS',激发态数量:10}},
 {id:'J00082',name:'复合材料 · Tc 计算',status:'运行中',property:'Tc',method:'MD',time:'2026-11-10 08:30',progress:35,params:{计算链数:8,温度:'300 K',帧:300}},
 {id:'J00081',name:'硅橡胶 · Tg 计算',status:'失败',property:'Tg',method:'MD',time:'2026-11-09 17:20',duration:'2分05秒',reason:'输入分子结构存在未连接片段，请返回微观建模检查。',params:{计算链数:5,开始温度:'100 K',结束温度:'600 K'}},
 {id:'J00080',name:'环氧树脂 · CTE 计算',status:'已完成',property:'CTE',method:'MD',time:'2026-11-09 16:10',duration:'4分32秒',params:{计算链数:5,开始温度:'100 K',结束温度:'600 K'}},
];
export function taskStatus(value){return value==='成功'?'已完成':value==='未提交'||value==='待校验'?'待运行':value==='等待上游'?'等待上游':value||'待运行';}
export function collectTasks(workflows,loadEditor){
 const records=microTaskExamples.map(t=>({...t,duration:t.duration||'—',key:'micro:'+t.id,type:'微观模拟',source:'独立微观任务 · 演示',progress:t.status==='已完成'?100:t.progress||0,logs:[`${t.time} · 已提交${t.method}演示任务`,t.reason||'状态及参数为原型演示数据。']}));
 for(const workflow of workflows){let state;try{state=loadEditor(workflow);}catch{continue;}
  for(const run of state.runs||[]){
   records.push({key:`workflow:${workflow.id}:${run.id}`,id:run.id,name:run.definitionRef?.name||run.snapshot?.name||workflow.name,type:'跨尺度模拟',property:algorithmName(run.definitionRef?.algorithm||run.snapshot?.applicationType||workflow.type),definitionName:run.definitionRef?.name||run.snapshot?.name||workflow.name,definitionRevision:run.definitionRef?.revision??run.snapshot?.revision,definitionSnapshot:run.snapshot,status:taskStatus(run.status),time:run.time||'—',duration:'—',progress:run.progress||0,workflowId:workflow.id,runId:run.id,source:'关联建模：'+(run.definitionRef?.name||run.snapshot?.name||workflow.name),params:run.snapshot||{},logs:run.logs||[],reason:run.status==='失败'?run.logs?.at(-1)||workflow.latestRun?.reason||'本次计算失败，请查看日志。':run.status==='已阻塞'?'部分节点阻塞，请进入工作台处理后继续运行。':''});
   for(const node of run.snapshot?.nodes||[]){if(node.type!=='microCompute'||!run.tasks?.[node.id]?.requested)continue;const task=run.tasks[node.id];records.push({key:`node:${workflow.id}:${run.id}:${node.id}`,id:`${run.id} / ${node.id}`,name:node.name,type:'微观模拟',property:'物性计算',status:taskStatus(task.status),method:node.params?.method||'微观计算',time:task.startedAt||run.time||'—',duration:'—',progress:task.progress||0,workflowId:workflow.id,runId:run.id,nodeId:node.id,source:workflow.name,params:task.completedInput||task.input||node.params,logs:task.logs||[],reason:task.reason||''});}
  }
 }
 return records.sort((a,b)=>b.time.localeCompare(a.time)||a.key.localeCompare(b.key));
}
export function visibleTasks(records,view,removed=new Set()){
 const q=view.query.trim().toLowerCase();return records.filter(t=>!removed.has(t.key)&&(!q||`${t.id} ${t.name} ${t.source} ${t.property}`.toLowerCase().includes(q))&&(view.type==='全部'||t.type===view.type)&&(view.status==='全部'||t.status===view.status));
}
export function taskCounts(records){return {total:records.length,running:records.filter(t=>t.status==='运行中').length,completed:records.filter(t=>t.status==='已完成').length,failed:records.filter(t=>t.status==='失败').length};}
const removedKey='forge-task-list-hidden-v1';
export function loadRemovedTasks(){try{return new Set(JSON.parse(localStorage.getItem(removedKey)||'[]'));}catch{return new Set();}}
export function saveRemovedTasks(ids){localStorage.setItem(removedKey,JSON.stringify([...ids]));}
