import {ensureWorkflowTasks} from './workflow-tasks.js';
import {childTasks,groupInput,groupSnapshot} from './factor-groups.js';
import {batchCombinations} from './batch-parameters.js';
import {orderNodes,timeNow,check} from './model.js';

export const executionOf=s=>{if(s.viewMode==='definition')return null;const r=s.activeRunId?s.runs.find(r=>r.id===s.activeRunId):s.runs.at(-1);return r?.executionVersion===1?r:null;};
const completed=t=>t?.status==='已完成';
export function relatedIds(s,ids,reverse=false){const found=new Set(ids),pending=[...ids];while(pending.length){const id=pending.pop();for(const e of s.edges)if((reverse?e.to:e.from)===id){const next=reverse?e.from:e.to;if(!found.has(next)){found.add(next);pending.push(next);}}}return found;}
export function editLockReason(s,id){if(s.viewMode==='execution'&&!executionOf(s))return '历史任务快照仅供查看；请打开关联建模修改并提交新的任务。';const r=executionOf(s)||(s.viewMode==='definition'?s.runs.find(r=>r.executionVersion===1):null);if(!r)return '';if(r.tasks[id]?.children?.some(completed)||completed(r.tasks[id]))return '此节点已完成，输入与结果已锁定。需要重新计算时请新增节点或复制整个建模。';if([...relatedIds(s,[id])].some(key=>completed(r.tasks[key])||r.tasks[key]?.children?.some(completed)))return '此修改会影响已完成节点，当前任务中不能修改。';return '';}
export function structuralLock(s){return s.viewMode==='execution'||!!executionOf(s);}
export function createExecutionState(definition,ids=null){
 const context={...definition,...structuredClone({nodes:definition.nodes,edges:definition.edges,history:[],embeddedCanvasPositions:definition.embeddedCanvasPositions||{},canvasSelection:definition.canvasSelection||[]}),runs:definition.runs,viewMode:'execution',activeRunId:null};
 const existing=definition.runs.find(r=>r.executionVersion===1);if(existing){context.activeRunId=existing.id;for(const node of context.nodes){const task=existing.tasks[node.id];if(completed(task)){const saved=existing.workingDefinition?.nodes?.find(n=>n.id===node.id)||existing.snapshot.nodes.find(n=>n.id===node.id);node.params=structuredClone(!Array.isArray(task.completedInput)&&task.completedInput||saved?.params||node.params);}}}
 const run=beginExecution(context,ids,!existing);context.activeRunId=run.id;return context;
}
export function beginExecution(s,ids=null,fresh=false){
 const previous=fresh?null:executionOf(s);if(previous?.status==='成功'&&s.nodes.every(n=>completed(previous.tasks[n.id])))return previous;
 const reference={id:s.workflowId,name:s.name,revision:s.revision,algorithm:s.nodes.find(n=>n.type==='macro')?.params.case||'generic'};
 const r=previous||{id:`run-demo-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,executionVersion:1,definitionRef:reference,status:'部分完成',time:timeNow(),progress:0,reportStatus:'等待上游',solver:'原型调度演示',demo:true,snapshot:structuredClone({workflowId:s.workflowId,name:s.name,description:s.description||'',applicationType:reference.algorithm,nodes:s.nodes,edges:s.edges,revision:s.revision}),tasks:{},batches:[],logs:['本地执行演示；不调用真实计算。']};
 r.parameterGroups??=s.nodes.filter(n=>n.type==='batch').map(n=>({nodeId:n.id,groups:batchCombinations(n.params)}));
 for(const n of s.nodes)r.tasks[n.id]??={nodeId:n.id,status:'未提交',progress:0,attempts:0,logs:[]};
 childTasks(s,r);
 const targets=ids?.length?[...relatedIds(s,ids,true)]:s.nodes.map(n=>n.id);
 const batch={time:timeNow(),targets:[...targets],snapshot:structuredClone({nodes:s.nodes,edges:s.edges,revision:s.revision})};r.batches.push(batch);
 for(const id of targets){const t=r.tasks[id];if(t&&!completed(t)){t.requested=true;if(t.status!=='已阻塞'&&t.status!=='失败')t.status='待运行';for(const child of t.children||[])if(!completed(child)){child.requested=true;if(!['已阻塞','失败'].includes(child.status))child.status='待运行';}}}
 r.paused=false;r.logs.push(`${batch.time} · ${ids?.length?'提交所选及上游依赖':'继续/提交全部未完成节点'}，已完成节点保留`);
 if(!previous)s.runs.push(r);if(s.viewMode==='execution')s.activeRunId=r.id;syncExecution(s);return r;
}
export function syncExecution(s){const r=executionOf(s);if(!r)return;for(const n of s.nodes){const t=r.tasks[n.id];if(!t)continue;for(const child of t.children||[])if(!completed(child)&&['等待上游','已暂停','已阻塞','失败'].includes(t.status)){child.status=t.status;child.reason=t.reason||'';}n.status=t.status==='已完成'?'成功':t.status==='未提交'?'待运行':t.status;}
 ensureWorkflowTasks(s,r);
 const tasks=Object.values(r.tasks),done=tasks.filter(completed).length;r.progress=Math.round(tasks.reduce((sum,t)=>sum+t.progress,0)/Math.max(1,tasks.length));
 if(done===tasks.length&&tasks.length){r.status='成功';r.reportStatus='已生成';r.finishedAt??=timeNow();}
 else if(r.paused)r.status='已暂停';else if(tasks.some(t=>t.status==='运行中'||t.status==='待运行'&&t.requested))r.status='运行中';else if(tasks.some(t=>['已阻塞','失败'].includes(t.status)))r.status='已阻塞';else r.status='部分完成';
}
export function advanceExecution(s){const r=executionOf(s);if(!r||r.paused||r.status==='成功')return false;let changed=false;const problems=check(s);
 for(const n of orderNodes(s)){const t=r.tasks[n.id];if(!t?.requested||completed(t)||['已阻塞','失败'].includes(t.status))continue;
 const upstream=s.edges.filter(e=>e.to===n.id).map(e=>r.tasks[e.from]);if(upstream.some(t=>!completed(t))){if(t.status!=='等待上游'){t.status='等待上游';changed=true;}continue;}
 const invalid=problems.filter(p=>!p.nodeId||p.nodeId===n.id);if(invalid.length){t.status='已阻塞';t.reason=invalid.map(p=>p.field+'：'+p.reason).join('；');t.logs.push(`${timeNow()} · 参数检验未通过：${t.reason}`);changed=true;continue;}
 if(t.children?.length){for(const child of t.children){if(completed(child)||['已阻塞','失败'].includes(child.status))continue;if(child.status!=='运行中'){child.status='运行中';child.startedAt=timeNow();child.attempts++;child.input=groupInput(n.params,child.group,n.id);child.parameterSnapshot=groupSnapshot(s,child.group);child.logs.push(`${timeNow()} · 参数组 ${child.groupIndex} 开始`);}else{child.progress=Math.min(100,child.progress+20);if(child.progress===100){child.status='已完成';child.completedInput=structuredClone(child.input);child.finishedAt=timeNow();}}}t.progress=Math.round(t.children.reduce((a,c)=>a+c.progress,0)/t.children.length);t.status=t.children.every(completed)?'已完成':t.children.some(c=>c.status==='运行中')?'运行中':'已阻塞';t.attempts=Math.max(...t.children.map(c=>c.attempts));if(completed(t)){t.completedInput=structuredClone(t.children.map(c=>c.completedInput));t.finishedAt=timeNow();}changed=true;continue;}
 if(t.status!=='运行中'){t.status='运行中';t.startedAt=timeNow();t.attempts++;t.input=structuredClone(n.params);t.attemptHistory??=[];t.attemptHistory.push({time:t.startedAt,input:structuredClone(t.input)});t.logs.push(`${timeNow()} · 第${t.attempts}次开始，使用当前输入`);changed=true;continue;}
 t.progress=Math.min(100,t.progress+(['microCompute','schedule'].includes(n.type)?20:100));changed=true;
 if(t.progress===100){t.status='已完成';t.finishedAt=timeNow();t.completedInput=structuredClone(t.input);t.logs.push(`${timeNow()} · 演示完成，输入与结果锁定`);r.logs.push(`${n.name} · 已完成`);}
 }
 syncExecution(s);return changed;
}
export function retryExecutionTask(s,id){const r=executionOf(s)||(s.viewMode==='definition'?s.runs.find(r=>r.executionVersion===1):null),t=r?.tasks[id];if(!t||completed(t))return false;for(const child of t.children||[])if(!completed(child)){child.status='待运行';child.reason='';child.progress=0;}t.status='待运行';t.reason='';t.progress=0;t.requested=true;t.logs.push(`${timeNow()} · 用户重试`);r.paused=false;syncExecution(s);return true;}
export function editExecutionInput(s,id){const r=executionOf(s);if(!r)return;for(const key of relatedIds(s,[id])){const t=r.tasks[key];if(!t||completed(t))continue;for(const child of t.children||[])if(!completed(child)){child.progress=0;child.status=t.requested?'待运行':'未提交';child.reason='';}t.progress=0;t.status=t.requested?'待运行':'未提交';t.reason='';t.logs.push(`${timeNow()} · 输入更新，等待使用新配置`);}syncExecution(s);}
export function pauseExecution(s){const r=executionOf(s);if(!r)return;r.paused=true;r.logs.push(`${timeNow()} · 暂停执行，保留已完成结果`);for(const t of Object.values(r.tasks))if(t.status==='运行中')t.status='已暂停';syncExecution(s);}
export function executionScenario(s,scenario){
 // A new record is used so prior execution snapshots remain intact.
 const r=beginExecution(s,null,true);
 r.scenario=scenario;r.logs.push(`演示场景：${scenario}`);const ordered=orderNodes(s),firstCalc=ordered.find(n=>n.type==='microCompute'),scheduler=ordered.find(n=>n.type==='schedule');
 for(const n of ordered){const t=r.tasks[n.id];t.progress=0;t.status='待运行';t.requested=scenario!=='部分运行';}
 const mark=n=>{const t=r.tasks[n.id];t.status='已完成';t.progress=100;t.requested=true;t.attempts=1;for(const child of t.children||[]){child.status='已完成';child.progress=100;child.completedInput=structuredClone(child.input);}t.completedInput=structuredClone(n.params);t.logs=[`${timeNow()} · 已完成（演示）`];};
 if(scenario==='全部完成')ordered.forEach(mark);
 else if(scenario==='部分运行'){const ids=relatedIds(s,[firstCalc?.id||ordered[0].id],true);ordered.filter(n=>ids.has(n.id)).forEach(mark);for(const n of ordered)if(!ids.has(n.id))r.tasks[n.id].status='未提交';}
 else if(scenario==='节点阻塞'){for(const n of ordered){if(['start','micro'].includes(n.type))mark(n);}const t=r.tasks[firstCalc?.id||scheduler?.id];if(t){t.status='已阻塞';t.progress=40;t.reason='计算服务暂不可用，请检查参数后重试。';t.logs.push(`${timeNow()} · 计算服务暂不可用（演示）`);}}
 syncExecution(s);return r;
}
