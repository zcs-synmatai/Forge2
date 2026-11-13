import {renderMolecularPage,mountMolecularPage} from './features/modeling/molecular-page.js';
import {renderModelingPage,deleteMolecularRecord,modelingRecords,localMoleculeRecords,moleculeRecordsKey} from './features/modeling/modeling-page.js';
import {openMicroModeling} from './features/editor/micro-modeling-dialog.js';
import {createMolecule} from './features/editor/molecule.js';
import { getDeletedWorkflowIds, isBuiltinWorkflow, getStoredWorkflows, removeWorkflowById, saveCustomWorkflows, saveDeletedWorkflowIds, workflowSeed } from "./data/workflows.js";
import { renderShell } from "./shared/shell.js";
import {toggleSidebar} from './shared/sidebar.js';
import { icon } from "./shared/icons.js";
import { deleteWorkflowDialog, nameDialog, newWorkflowDialog, renderWorkflowPage } from "./features/workflows/workflow-list.js";
import { loadEditor,loadExecutionEditor,renderEditor,mountEditor } from './features/editor/workbench.js';
import {loadEditor as loadEditorV1,renderEditor as renderEditorV1,mountEditor as mountEditorV1} from './features/editor-v1/workbench.js';
import {loadPhysicalModel,savePhysicalModel} from './features/physical-model/model.js';
import {renderPhysicalEditor,mountPhysicalEditor} from './features/physical-model/workbench.js';
import { esc,reportConclusion,invalidate,timeNow } from './features/editor/model.js';
import {renderDispensingReport,mountDispensingReport} from './features/reports/dispensing-report.js';
import {isAuthenticated,showLogin,logout} from './auth/auth.js';
import {collectTasks} from './features/tasks/task-data.js';
import {renderTaskManager,mountTaskManager,taskViewState} from './features/tasks/task-manager.js';

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const state = {
  workflows: getStoredWorkflows(),
  filters: { query: "", type: "全部", definitionStatus: "全部", runStatus: "全部", sortDirection: "desc" }
};
let disposeEditor = () => {};
const taskManagementView=taskViewState();

function editorUpdate(s) {
  const workflow=state.workflows.find(w=>w.id===s.workflowId);
  if (!workflow) return;
  workflow.name=s.name; workflow.description=s.description??workflow.description??''; workflow.nodeCount=s.nodes.length; workflow.definitionStatus=s.definition;
  const cases=new Set(s.nodes.filter(n=>n.type==='macro').map(n=>n.params.case));workflow.type=cases.size===1&&cases.has('tim')?'TIM 导热':cases.size===1&&cases.has('extrusion')?'挤出模拟':'通用示例';
  const run=s.runs.at(-1);
  if(run)workflow.latestRun={id:run.id,status:run.status,time:run.time,stale:s.definition==='需更新'};
  try {localStorage.setItem(`forge-workflow-meta:${workflow.id}`, JSON.stringify({name:workflow.name,description:workflow.description,type:workflow.type,nodeCount:workflow.nodeCount,definitionStatus:workflow.definitionStatus,latestRun:workflow.latestRun}));}catch{}
}

function renderRunPage(workflowId,runId) {
  const workflow=state.workflows.find(w=>w.id===workflowId);
  if(!workflow)return placeholderPage('runs',workflowId,runId);
  const versionV1=new URLSearchParams(location.search).get('version')==='v1';
  const s=(versionV1?loadEditorV1:loadEditor)(workflow),run=s.runs.find(r=>r.id===runId)||s.runs.at(-1);
  const back=`${versionV1?'/demo/workflow-editor-v1?workflowId='+workflow.id+'&nodeId=':'/multiscale/workflows/'+workflow.id+'/edit?nodeId='}${encodeURIComponent(new URLSearchParams(location.search).get('nodeId')||s.selected||'')}`;
  const completed=run?.status==='成功'&&run.reportStatus==='已生成';
  const actualInputs=run?.executionVersion===1?`<details><summary>节点实际执行输入与提交批次（只读）</summary><pre>${esc(JSON.stringify({batches:run.batches,nodes:Object.fromEntries(Object.entries(run.tasks).map(([id,t])=>[id,{status:t.status,completedInput:t.completedInput,attemptHistory:t.attemptHistory}]))},null,2))}</pre></details>`:'';
  if(!versionV1)return renderShell(renderDispensingReport({workflow:{...workflow,name:run?.definitionRef?.name||run?.snapshot?.name||workflow.name},run,back,actualInputs}),'runs');
  return renderShell(`<main class="page-main results-preview" data-ui><button class="back-link" data-return-editor="${back}">← 返回工作流工作台</button><section class="placeholder-sheet"><h1>作业与结果</h1><p>${esc(workflow.name)} · ${esc(run?.id||'尚未运行')} · 原型演示</p><div class="run-summary"><strong>${esc(run?.status||'尚未运行')}</strong><span>报告：${esc(run?.reportStatus||'等待上游结果')}</span><span>执行：${esc(run?.solver||'原型演示')}</span></div><h2>结果报告与仿真结论</h2>${completed?`<div class="editor-report"><strong>仿真结果报告 · 演示</strong><p>${reportConclusion(run)}</p><button class="btn" data-return-editor="${back.replace(/nodeId=.*/,`nodeId=${s.nodes.find(n=>n.type==='result')?.id||''}`)}">打开结果呈现节点</button></div>`:'<p>等待求解与报告完成后提供报告文件和文本结论。</p>'}<details><summary>执行日志</summary><pre>${esc(run?.logs?.join('\n')||'历史演示记录，无新增执行日志。')}</pre></details><details><summary>本次执行输入快照（只读）</summary><pre>${esc(JSON.stringify(run?.snapshot||{},null,2))}</pre></details>${actualInputs}</section></main>`, 'runs');
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function navigate(path) {
  history.pushState({}, "", path);
  render();
  window.scrollTo(0,0);
}

function placeholderPage(kind, workflowId, runId) {
  const workflow = state.workflows.find((item) => item.id === workflowId);
  const isRun = kind === "runs";
  const title = isRun ? "作业与结果" : workflow?.name || "工作流编排工作台";
  const active = isRun ? "runs" : "workflows";
  return renderShell(`<main class="page-main placeholder-page" data-ui>
    <button class="back-link" data-action="back">${icon("chevron", "back-icon")}返回跨尺度模拟</button>
    <section class="placeholder-sheet">
      <span class="prototype-badge inline">原型演示</span>
      <h1>${title}</h1>
      <p>${isRun ? `已定位到执行记录 ${runId || "—"}。作业与结果页面将在下一阶段开发。` : "已进入独立工作台路由。编排工作台将基于参考项目的“任务工作台 → 计算模拟”页面继续迁移。"}</p>
      ${workflow ? `<dl><div><dt>工作流</dt><dd>${workflow.name}</dd></div><div><dt>定义状态</dt><dd>${workflow.definitionStatus}</dd></div><div><dt>节点数</dt><dd>${workflow.nodeCount} 个节点</dd></div></dl>` : ""}
      <button class="btn primary" data-action="back">返回列表</button>
    </section>
  </main>`, active);
}

function render() {
  disposeEditor();disposeEditor=()=>{};
  if(!isAuthenticated()){showLogin(app,render);return;}
  document.body.classList.remove('login-active');document.title='SynMatAI · 跨尺度模拟';
  const path=location.pathname,query=new URLSearchParams(location.search);
  const isTaskList=path==='/tasks'||path==='/multiscale/runs'&&!query.get('workflowId');
  const editMatch=path.match(/^\/multiscale\/workflows\/([^/]+)\/edit(?:\/materials\/([^/]+))?$/);
  const isV1=path==='/demo/workflow-editor-v1';
  const source=path.startsWith('/models/molecules/')?'/src/styles/editor-source.css':isV1?'/src/styles/editor-v1-source.css':editMatch?(editMatch[2]?'/src/styles/physical-source.css':'/src/styles/editor-source.css'):path==='/multiscale/runs'&&!isTaskList?'/src/styles/editor-source.css':null;
  let stylesheet=document.querySelector('#editor-styles');
  if(source){
    if(!stylesheet||stylesheet.dataset.source!==source){stylesheet?.remove();stylesheet=document.createElement('link');stylesheet.id='editor-styles';stylesheet.rel='stylesheet';stylesheet.href=source;stylesheet.dataset.source=source;stylesheet.onload=()=>{stylesheet.dataset.ready='true';render();};document.head.append(stylesheet);}
    if(stylesheet.dataset.ready!=='true'){app.innerHTML=renderShell('<main class="page-main">正在加载建模工作台…</main>');bindCommonState();return;}
  }else stylesheet?.remove();
  if(path.startsWith('/models/molecules/')){
    const id=decodeURIComponent(path.slice('/models/molecules/'.length)),record=id==='new'?null:modelingRecords(state.workflows,loadEditor).molecular.find(r=>r.id===id),molecule=record?.molecule||createMolecule();
    const savedModelId=record?.id||'molecule-'+Date.now();
    if(id==='new')molecule.name='未命名分子模型';
    app.innerHTML=renderShell(renderMolecularPage(molecule.name),'modeling');
    disposeEditor=mountMolecularPage(app.querySelector('.molecular-page'),molecule,{navigate,openDialog,notify,modelId:savedModelId,onSave:m=>{if(!record||record.local){const rows=localMoleculeRecords(),item=rows.find(x=>x.id===savedModelId);if(item)Object.assign(item,{name:m.name,molecule:m,time:timeNow()});else rows.unshift({id:savedModelId,name:m.name,molecule:m,time:timeNow()});localStorage.setItem(moleculeRecordsKey,JSON.stringify(rows));}else{record.node.params.molecule=m;for(const macro of record.state.nodes.filter(n=>n.type==='macro'))for(const [materialId,microId]of Object.entries(macro.materialNodes||{}))if(microId===record.node.id){const structure=macro.params.materials?.find(x=>x.id===materialId);if(structure)structure.molecule=structuredClone(m);}invalidate(record.state,record.node.id);record.state.revision++;record.state.checkedRevision=null;localStorage.setItem('forge-editor-current:'+record.workflow.id,JSON.stringify(record.state));editorUpdate(record.state);}notify('分子建模记录已保存');}});
  }
  else if(path==='/models'){app.innerHTML=renderShell(renderModelingPage(state.workflows,loadEditor),'modeling');}
  else if(isTaskList){app.innerHTML=renderShell(renderTaskManager(),'runs');disposeEditor=mountTaskManager(app.querySelector('.task-manager'),{getRecords:()=>collectTasks(state.workflows,loadEditor),view:taskManagementView,navigate,openDialog,notify});}
  else if(isV1){
    const workflow=state.workflows.find(w=>w.id===(query.get('workflowId')||'wf-tim-001'));
    if(!workflow){app.innerHTML=placeholderPage('edit',query.get('workflowId'));return;}
    const s=loadEditorV1(workflow),selected=query.get('nodeId');if(s.nodes.some(n=>n.id===selected))s.selected=selected;
    app.innerHTML=renderShell(renderEditorV1(s),'workflows',{workflowId:workflow.id,isV1:true});
    app.querySelector('.breadcrumbs').innerHTML='<span>演示说明</span>'+icon('chevron')+'<strong>工作流编辑 V1</strong>';
    disposeEditor=mountEditorV1(app.querySelector('.editor-page'),s,{notify,openDialog,navigate:url=>navigate(url.startsWith('/multiscale/runs?')?url+'&version=v1':url),onUpdate:()=>{}});
  }else if(editMatch){
    const workflow=state.workflows.find(w=>w.id===decodeURIComponent(editMatch[1]));
    if(!workflow){app.innerHTML=placeholderPage('edit',editMatch[1]);return;}
    if(!editMatch[2]){
      const s=query.get('executionId')?loadExecutionEditor(workflow,query.get('executionId')):loadEditor(workflow),selectedId=query.get('nodeId');if(!s){app.innerHTML=renderShell('<main class="page-main"><h1>未找到执行任务</h1><button class="btn" data-action="back">返回建模列表</button></main>');return;}
      if(s.nodes.some(n=>n.id===selectedId))s.selected=selectedId;
      else if(s.editorLayout!=='model-first')s.selected=s.nodes.find(n=>n.type==='macro')?.id||s.selected;
      s.editorLayout='model-first';
      app.innerHTML=renderShell(renderEditor(s),'workflows',{workflowId:workflow.id});
      app.querySelector('.breadcrumbs').innerHTML='<span>跨尺度模拟</span>'+icon('chevron')+'<strong>'+esc(s.name)+'</strong>'+icon('chevron')+'<strong>'+(s.viewMode==='execution'?'执行任务':'编辑')+'</strong>';
      disposeEditor=mountEditor(app.querySelector('.editor-page'),s,{notify,navigate,openDialog,onUpdate:editorUpdate,onCopy:copyModelFromEditor});
      bindCommonState();return;
    }
    const s=loadPhysicalModel(workflow),materialId=editMatch[2]?decodeURIComponent(editMatch[2]):null;
    app.innerHTML=renderShell(renderPhysicalEditor(s,materialId),'workflows',{workflowId:workflow.id});
    const material=s.materials.find(m=>m.id===materialId);
    app.querySelector('.breadcrumbs').innerHTML='<span>跨尺度模拟</span>'+icon('chevron')+'<strong>'+esc(s.name)+'</strong>'+icon('chevron')+'<strong>物理建模'+(materialId?' / '+esc(material?.name||'材料'):'')+'</strong>';
    disposeEditor=mountPhysicalEditor(app.querySelector('.physical-editor'),s,{materialId,notify,navigate,openDialog,onUpdate:model=>{workflow.name=model.name;const material=model.materials.find(m=>m.id===materialId);app.querySelector('.breadcrumbs').innerHTML='<span>跨尺度模拟</span>'+icon('chevron')+'<strong>'+esc(model.name)+'</strong>'+icon('chevron')+'<strong>物理建模'+(materialId?' / '+esc(material?.name||'材料'):'')+'</strong>';try{const key='forge-workflow-meta:'+workflow.id;localStorage.setItem(key,JSON.stringify({...JSON.parse(localStorage.getItem(key)||'{}'),name:model.name}));}catch{}}});
  }else if(path==='/multiscale/runs'){app.innerHTML=renderRunPage(query.get('workflowId'),query.get('runId'));const report=app.querySelector('.dispensing-report');if(report)disposeEditor=mountDispensingReport(report);}
  else app.innerHTML=renderShell(renderWorkflowPage(state),'workflows');
  bindCommonState();
}

function bindCommonState() {
  document.querySelector('[data-sidebar-toggle]')?.addEventListener('click',toggleSidebar);
  document.querySelector("[data-mobile-menu]")?.addEventListener("click", () => document.querySelector("#sidebar")?.classList.toggle("open"));
}

function openDialog(content) {
  const dialog = document.createElement("dialog");
  dialog.className = "app-dialog";
  dialog.innerHTML = `<button class="dialog-close" data-dialog-close aria-label="关闭">${icon("close")}</button>${content}`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.addEventListener("click", (event) => { if (event.target === dialog || event.target.closest("[data-dialog-close]")) dialog.close(); });
  dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector("input")?.select());
  return dialog;
}

function closeMenus() {
  document.querySelectorAll(".row-menu").forEach((menu) => menu.remove());
  document.querySelectorAll(".more-btn[aria-expanded=true]").forEach((button) => button.setAttribute("aria-expanded", "false"));
  document.querySelectorAll(".info-popover").forEach((tip) => tip.remove());
}

app.addEventListener("input", (event) => {
  if(event.target.matches('[data-model-search]')){const column=event.target.closest('.model-record-column'),query=event.target.value.trim().toLocaleLowerCase(),cards=[...column.querySelectorAll('.model-record-card')];let visible=0;for(const card of cards){card.hidden=!card.textContent.toLocaleLowerCase().includes(query);if(card.closest('.model-record-wrap'))card.closest('.model-record-wrap').hidden=card.hidden;if(!card.hidden)visible++;}const count=column.querySelector('header>div>span');if(count)count.textContent=String(visible);let empty=column.querySelector('[data-model-search-empty]');if(!empty){empty=document.createElement('p');empty.className='model-record-empty';empty.dataset.modelSearchEmpty='';empty.textContent='没有找到匹配的模型';column.querySelector('.model-record-list').append(empty);}empty.hidden=visible>0||!query;return;}

  const filter = event.target.dataset.filter;
  if (filter === "query") {
    state.filters.query = event.target.value;
    render();
    requestAnimationFrame(() => {
      const input = document.querySelector('[data-filter="query"]');
      input?.focus();
      input?.setSelectionRange(state.filters.query.length, state.filters.query.length);
    });
  }
});

app.addEventListener("change", (event) => {
  const filter = event.target.dataset.filter;
  if (filter) {
    state.filters[filter] = event.target.value;
    render();
  }
});

app.addEventListener("click", (event) => {
  const removeMolecule=event.target.closest('[data-delete-molecule]'),removeCross=event.target.closest('[data-delete-cross-model]');
  if(removeMolecule||removeCross){event.preventDefault();event.stopPropagation();if(removeCross){const model=state.workflows.find(w=>w.id===removeCross.dataset.deleteCrossModel);if(model)openDialog(deleteWorkflowDialog(model));return;}const id=removeMolecule.dataset.deleteMolecule,record=modelingRecords(state.workflows,loadEditor).molecular.find(r=>r.id===id);if(!record)return;const d=openDialog(`<div class="dialog-form"><h2>删除分子模型</h2><p>确定删除“${esc(record.name)}”的建模记录？${record.workflow?'关联跨尺度建模使用的分子结构和已有任务快照会保留。':'已有计算任务快照会保留。'}</p><div class="dialog-actions"><button type="button" class="btn" data-dialog-close>取消</button><button type="button" class="btn danger-menu-item" data-confirm-delete-model>确认删除</button></div></div>`);d.querySelector('[data-confirm-delete-model]').onclick=()=>{deleteMolecularRecord(id);d.close();render();notify('分子模型记录已删除');};return;}

  if(event.target.closest('[data-demo-logout]')){logout();render();return;}
  const route=event.target.closest("a[data-route]");if(route&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey){event.preventDefault();return navigate(route.getAttribute("href"));}
  const returnButton=event.target.closest('[data-return-editor]');if(returnButton)return navigate(returnButton.dataset.returnEditor);
  const help = event.target.closest("[data-demo-help]");
  if (help) return notify("当前为交互原型，数据与计算结果均为演示内容。");
  const newModel=event.target.closest('[data-model-new]');
  if(newModel&&['tim','extrusion'].includes(newModel.dataset.modelNew)){const kind=newModel.dataset.modelNew,id='wf-demo-'+Date.now(),w={id,name:kind==='tim'?'未命名 TIM 建模':'未命名挤出建模',description:'',applicationType:kind,type:kind==='tim'?'TIM 导热':'挤出模拟',nodeCount:kind==='tim'?9:7,definitionStatus:'草稿',latestRun:null,updatedAt:timeNow()};state.workflows.push(w);saveCustomWorkflows(state.workflows);navigate('/multiscale/workflows/'+id+'/edit');return;}
  if(newModel){if(newModel.dataset.modelNew==='choose'){const d=openDialog(`<div class="dialog-form"><h2>新建建模</h2><div class="model-create-shortcuts"><button data-create-molecular>${icon('molecule')}分子建模${icon('chevron')}</button><button data-create-multiscale>${icon('flow')}跨尺度建模${icon('chevron')}</button></div></div>`);d.querySelector('[data-create-molecular]').onclick=()=>{d.close();navigate('/models/molecules/new');};d.querySelector('[data-create-multiscale]').onclick=()=>{d.close();openDialog(newWorkflowDialog());};}else navigate('/models/molecules/new');return;}
  const moleculeCard=event.target.closest('[data-model-molecule]');if(moleculeCard){navigate('/models/molecules/'+encodeURIComponent(moleculeCard.dataset.modelMolecule));return;}
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    const target = nav.dataset.nav;
    if(target === "modeling") navigate("/models");
    else if (target === "workflows") navigate("/multiscale/workflows");
    else if (target === "runs") navigate("/tasks");
    else notify(`${nav.textContent.trim()}为系统已有功能，本轮不重建。`);
    return;
  }
  const tipButton = event.target.closest("[data-tip]");
  if (tipButton && !event.target.closest('[data-action="locate"]')) {
    closeMenus();
    const tip = document.createElement("div");
    tip.className = "info-popover";
    tip.textContent = tipButton.dataset.tip;
    tipButton.parentElement.append(tip);
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  const item = state.workflows.find((workflow) => workflow.id === action.dataset.id);
  if (action.dataset.action === "new") {document.querySelector("dialog")?.close();openDialog(newWorkflowDialog());}
  if (action.dataset.action === "edit" && item) {
    if (item.latestRun?.status === "运行中") notify("正在运行的作业使用提交时快照；本次编辑只影响后续运行。");
    navigate(`/multiscale/workflows/${item.id}/edit`);
  }
  if (action.dataset.action === "runs" && item) navigate(`/multiscale/runs?workflowId=${item.id}&runId=${action.dataset.runId}`);
  if (action.dataset.action === "locate" && item) {
    notify(item.latestRun.reason);
    navigate(`/multiscale/workflows/${item.id}/edit?nodeId=flow`);
  }
  if (action.dataset.action === "back") navigate("/multiscale/workflows");
  if (action.dataset.action === "clear-query") { state.filters.query = ""; render(); }
  if (action.dataset.action === "clear-filters") { state.filters = { ...state.filters, query: "", type: "全部", definitionStatus: "全部", runStatus: "全部" }; render(); }
  if (action.dataset.action === "sort") { state.filters.sortDirection = state.filters.sortDirection === "desc" ? "asc" : "desc"; render(); }
  if (action.dataset.action === "more" && item) {
    closeMenus();
    action.setAttribute("aria-expanded", "true");
    const menu = document.createElement("div");
    menu.className = "row-menu";
    menu.innerHTML = `<button data-menu-action="copy">${icon("copy")}复制</button><button class="danger-menu-item" data-menu-action="delete">${icon("trash")}删除</button>`;
    menu.addEventListener("click", (menuEvent) => {
      const target = menuEvent.target.closest("[data-menu-action]");
      if (target) openDialog(target.dataset.menuAction === "delete" ? deleteWorkflowDialog(item) : nameDialog(item, target.dataset.menuAction));
      closeMenus();
    });
    action.parentElement.append(menu);
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".more-wrap") && !event.target.closest(".inline-info")) closeMenus();
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  const formType = form.dataset.form;
  if (formType === "delete") {
    const item = state.workflows.find((workflow) => workflow.id === form.dataset.id);
    if (!item) return notify("未找到需要删除的工作流。");
    state.workflows = removeWorkflowById(state.workflows, item.id);
    saveCustomWorkflows(state.workflows);
    if (isBuiltinWorkflow(item.id)) saveDeletedWorkflowIds([...getDeletedWorkflowIds(), item.id]);
    document.querySelector("dialog")?.close();
    render();
    notify(`已删除工作流“${item.name}”。`);
    return;
  }
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  if (!name) return notify("请输入工作流名称。");
  const now = "2026-10-28 11:20";
  if (formType === "new") {
    const template = data.get("template");
    const id = `wf-demo-${Date.now()}`;
    const nodeCount = template === "blank" ? 0 : 9;
    state.workflows.push({ id, name, applicationType:template, description: String(data.get("description")||"").trim(), type: template === "extrusion" ? "挤出模拟" : template === "tim" ? "TIM 导热" : "通用示例", nodeCount, definitionStatus: "草稿", latestRun: null, updatedAt: now });
    saveCustomWorkflows(state.workflows);
    document.querySelector("dialog")?.close();
    navigate(`/multiscale/workflows/${id}/edit`);
  }
  if (formType === "rename") {
    const item = state.workflows.find((workflow) => workflow.id === form.dataset.id);
    if (item) { item.name = name; item.updatedAt = now; saveCustomWorkflows(state.workflows); }
    document.querySelector("dialog")?.close();
    render();
    notify("工作流名称已更新。");
  }
  if (formType === "copy") {
    const source = state.workflows.find((workflow) => workflow.id === form.dataset.id);
    if (source) {
      const copy = { ...source, id: `wf-copy-${Date.now()}`, name, latestRun: null, definitionStatus: "草稿", updatedAt: now };
      state.workflows.push(copy);
      try {const editor=loadEditor(source);localStorage.setItem(`forge-editor-current:${copy.id}`,JSON.stringify({...structuredClone(editor),workflowId:copy.id,name:copy.name,runs:[],history:[],messages:[],definition:'草稿',checkedRevision:null,viewMode:'definition',activeRunId:null,nodes:editor.nodes.map(n=>({...structuredClone(n),status:'待校验'}))}));}catch{}
      try{const physical=structuredClone(loadPhysicalModel(source));physical.workflowId=copy.id;physical.name=copy.name;physical.history=[];physical.checkedRevision=null;savePhysicalModel(physical);}catch{}
      saveCustomWorkflows(state.workflows);
      document.querySelector("dialog")?.close();
      notify("已复制物理模型；历史作业已清空。");
      navigate(`/multiscale/workflows/${copy.id}/edit`);
    }
  }
});

window.addEventListener("popstate", render);
window.addEventListener('forge:auth-expired',render);
document.addEventListener('forge:run-progress',()=>{if(location.pathname==='/multiscale/runs')render();});
render();

function copyModelFromEditor(model){const source=state.workflows.find(w=>w.id===model.workflowId);if(!source)return;const id='wf-copy-'+Date.now(),name=model.name+' 副本',copy={...source,id,name,latestRun:null,definitionStatus:'草稿',updatedAt:timeNow()};const definition=structuredClone(model);Object.assign(definition,{workflowId:id,name,runs:[],history:[],messages:[],viewMode:'definition',checkedRevision:null,definition:'草稿'});delete definition.activeRunId;delete definition.factorTaskFilter;for(const n of definition.nodes)n.status='待校验';localStorage.setItem('forge-editor-current:'+id,JSON.stringify(definition));state.workflows.push(copy);saveCustomWorkflows(state.workflows);navigate('/multiscale/workflows/'+id+'/edit');notify('已复制建模与参数，新副本可重新提交计算');}
