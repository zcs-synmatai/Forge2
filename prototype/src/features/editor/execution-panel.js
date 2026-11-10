import {collectTasks} from '../tasks/task-data.js';
import {renderTaskCard} from '../tasks/task-card.js';
import {esc,kinds,orderNodes} from './model.js';
import {executionOf,editLockReason} from './execution.js';
export function renderExecutionPanel(s,filter='全部'){
 if(s.viewMode==='definition'){
  const records=collectTasks([{id:s.workflowId,name:s.name,type:s.nodes.find(n=>n.type==='macro')?.params.case}],()=>s).filter(t=>t.type==='跨尺度模拟'&&t.workflowId===s.workflowId);
  return `<div class="execution-list-heading"><div><h2>关联计算任务 <span>${records.length}</span></h2><p>当前建模提交的跨尺度任务，每次运行独立保留输入快照。</p></div><button class="btn" data-editor="all-tasks">任务管理</button></div>${records.length?`<div class="linked-cross-scale-tasks">${records.map(t=>renderTaskCard(t,false,{linked:true})).join('')}</div>`:'<p class="definition-run-empty">尚未提交计算任务。完成建模后，点击“提交计算任务”。</p>'}`;
 }


 let sorted;try{sorted=orderNodes(s);}catch{sorted=s.nodes;}
 const r=executionOf(s),nodes=sorted.filter(n=>['microCompute','schedule'].includes(n.type));
 const state=n=>r?.tasks[n.id]?.status||'未提交';
 const filtered=nodes.filter(n=>filter==='全部'||filter==='有问题'&&['已阻塞','失败'].includes(state(n))||filter===state(n)||filter==='待运行'&&['未提交','等待上游','已暂停'].includes(state(n)));
 return `<div class="execution-list-heading"><div><h2>计算任务 <span>${nodes.length}</span></h2><p>${r?'已完成任务只读，未完成任务可调整后继续运行':'运行后可在这里查看计算进度、诊断问题并重试。'}</p></div><label class="execution-scenario">演示场景<select data-execution-scenario aria-label="演示场景"><option value="">选择状态预览</option>${['全部运行','部分运行','节点阻塞','全部完成'].map(x=>`<option>${x}</option>`).join('')}</select></label></div>
 <div class="execution-filters" role="group" aria-label="计算任务筛选">${['全部','运行中','有问题','待运行','已完成'].map(f=>`<button type="button" data-task-filter="${f}" aria-pressed="${filter===f}">${f}${f==='有问题'?` <span>${nodes.filter(n=>['已阻塞','失败'].includes(state(n))).length}</span>`:''}</button>`).join('')}<span class="execution-demo-note">本地计算演示</span></div>
 <div class="execution-table-scroll"><table class="execution-table"><thead><tr><th>计算任务</th><th>类型</th><th>状态</th><th>进度</th><th>依赖与诊断</th><th>操作</th></tr></thead><tbody>${filtered.map(n=>{const t=r?.tasks[n.id],status=state(n),upstream=s.edges.filter(e=>e.to===n.id).map(e=>s.nodes.find(x=>x.id===e.from)?.name).filter(Boolean),locked=editLockReason(s,n.id);return `<tr data-task-row="${esc(n.id)}"><td><button class="task-name" data-task-action="locate" data-task-id="${esc(n.id)}">${esc(n.name)}</button><small>${t?.attempts?'第'+t.attempts+'次执行':'尚未开始'}${locked?' · 已锁定':''}</small></td><td>${kinds[n.type]}</td><td><span class="execution-status" data-state="${status}">${status}</span></td><td><div class="task-progress"><span style="width:${t?.progress||0}%"></span></div><small>${t?.progress||0}%</small></td><td class="task-diagnosis">${esc(t?.reason||(['等待上游','未提交','待运行'].includes(status)?'等待 '+upstream.join('、'):status==='已完成'?'计算完成，输入与结果已锁定':status==='已暂停'?'执行已暂停，可继续运行':'正在执行本地计算演示'))}</td><td><div class="task-actions"><button data-task-action="configure" data-task-id="${esc(n.id)}">${locked?'查看配置':'配置'}</button>${['已阻塞','失败'].includes(status)?`<button class="task-retry" data-task-action="retry" data-task-id="${esc(n.id)}">重试</button>`:''}<button data-task-action="logs" data-task-id="${esc(n.id)}">日志</button></div></td></tr>`;}).join('')||'<tr><td colspan="6" class="task-empty">没有符合条件的计算任务</td></tr>'}</tbody></table></div>`;
}
