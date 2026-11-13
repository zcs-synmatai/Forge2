import {mountPanelWindows} from './panel-windows.js';
import {openBatchParameters} from './batch-parameters.js';
import {initializeTimCubeDefaults} from './tim-defaults.js';
import {applyMaterialPropertyInputs,prepareMaterialProperties,mountMaterialPropertyEditor,materialPropertyIssues} from './material-properties.js';
import {mountWorkspaceSplit} from './workspace-split.js';
import {workflowTitle} from './workflow-title.js';
import {inspectionStatuses} from './validation-state.js';
import {createExampleDefinition} from './task-examples.js';
import {extrusionFields,timFields} from './algorithm-fields.js';
import {extrusionInput,timInput} from './algorithm-inputs.js';
import {applicationLabels,reflowPipe,pipeSegmentSummary} from './application-models.js';
import {executionOf,editLockReason,structuralLock,beginExecution,createExecutionState,advanceExecution,syncExecution,editExecutionInput,retryExecutionTask,pauseExecution,executionScenario} from './execution.js';
import {renderExecutionPanel} from './execution-panel.js';
import {openMicroModeling} from './micro-modeling-dialog.js';
import {macroToolbar,openMacroSettings,openMaterials,openPrimitive} from './macro-tools.js';
import {macroMaterials,hasCompositeGeometry,macroSettings,addPlateletMaterial} from './macro-state.js';
import {icon} from '../../shared/icons.js';
import {esc,kinds,makeNode,createEditor,initializeBlankWorkflow,outputOf,inputsOf,connect,invalidate,check,orderNodes,canRunNode,timeNow,migrateEditor,macroParams,reportConclusion} from './model.js';
import {ensureMaterialNodes,materialForNode,microCalculations} from './material-bindings.js';
import {renderCompositePreview} from './composite-preview.js';
import {createMolecule,moleculeFormula} from './molecule.js';
import {renderMolecule} from './molecule-preview.js';
import {openMoleculeEditor} from './molecule-editor.js';
import {mountCalculationCanvas} from './infinite-canvas.js';
import {FlowCanvasModel} from './canvas-runtime/canvas-model.js';
const canvasHistories=new Map();

const storageKey=id=>`forge-editor-current:${id}`;
const cache=new Map(),executionCache=new Map(),running=new Map();
export function loadEditor(workflow){if(cache.has(workflow.id))return cache.get(workflow.id);let result;try{const saved=JSON.parse((localStorage.getItem(storageKey(workflow.id))||localStorage.getItem(`forge-editor-v1:${workflow.id}`)));if(saved?.workflowId===workflow.id)result=migrateEditor(saved);}catch{}result??=workflow.exampleScenario?createExampleDefinition(workflow):createEditor(workflow);if(!result.nodes.length&&!result.runs.length&&workflow.nodeCount===0)initializeBlankWorkflow(result);if(initializeTimCubeDefaults(result)){for(const n of result.nodes.filter(n=>n.type==='macro'&&n.params.case==='tim'))invalidate(result,n.id);result.revision++;result.checkedRevision=null;}result.description??=workflow.description||'';result.viewMode='definition';delete result.activeRunId;cache.set(workflow.id,result);return result;}
export function loadExecutionEditor(workflow,runId){
 const definition=loadEditor(workflow),run=definition.runs.find(r=>r.id===runId);if(!run)return null;
 const key=workflow.id+':'+runId;if(executionCache.has(key))return executionCache.get(key);
 const saved=run.workingDefinition||run.snapshot||{},context={...definition,...structuredClone(saved),workflowId:workflow.id,name:run.definitionRef?.name||saved.name||definition.name,description:saved.description??run.snapshot?.description??definition.description??'',runs:definition.runs,viewMode:'execution',activeRunId:run.id,selected:saved.selected||saved.nodes?.find(n=>n.type==='macro')?.id||definition.selected};
 executionCache.set(key,context);syncExecution(context);return context;
}
const field=(key,label,value,unit='',type='number')=>`<label class="field"><span>${label}</span><div class="unit-input"><input data-param="${key}" name="${key}" type="${type}" step="any" value="${esc(value)}">${unit?`<small>${unit}</small>`:''}</div></label>`;
const select=(key,label,value,options)=>`<label class="field"><span>${label}</span><select data-param="${key}">${options.map(o=>`<option value="${esc(Array.isArray(o)?o[0]:o)}" ${(Array.isArray(o)?o[0]:o)===value?'selected':''}>${esc(Array.isArray(o)?o[1]:o)}</option>`).join('')}</select></label>`;
const button=(action,text,glyph='',extra='')=>`<button type="button" class="btn" data-editor="${action}" ${extra}>${glyph?icon(glyph):''}${text}</button>`;
export function renderEditor(s){const title=workflowTitle(s);return `<div class="editor-page model-first-editor without-copilot" data-ui>
  <section class="task-header"><div><button class="editor-back" data-return-editor="/models" aria-label="返回建模">${icon('chevron')}</button><div class="editor-title"><div class="title-row"><h1 class="workflow-heading-name"><span class="workflow-algorithm-label" aria-label="算法类型：${esc(title.algorithm)}">${esc(title.algorithm)}.</span><input data-workflow-name aria-label="工作流名称" value="${esc(title.name)}"></h1></div><input class="workflow-remark" data-workflow-description aria-label="建模备注" placeholder="添加备注…" maxlength="300" value="${esc(s.description||'')}"><small id="editor-save" class="sr-only" role="status">已保存在本机（演示）</small></div></div><div class="header-actions"><div id="editor-header-context"></div>${button('validate','建模检验','check')}<button class="btn primary" data-editor="run">${icon('play')}运行工作流</button></div></section>
  <div class="editor-run-strip" id="editor-run-strip"></div>
  <main class="workbench">
    <div class="right-workspace">
      <div class="model-flow-split">
      <section class="detail-panel" id="editor-detail" aria-label="节点模型与配置"></section>
      <div class="workspace-splitter" role="separator" aria-label="调整建模与工作流宽度" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="70" aria-valuenow="55" tabindex="0"><span></span></div>
      <section class="flow-panel dependency-panel">
        <div class="section-heading"><h2>计算依赖图 <span class="inspection-badge" data-inspection="workflow" aria-label="流程检验状态"></span><span id="editor-count"></span></h2><div class="workflow-heading-actions">${button('add','添加计算节点','plus')}${button('toggle-flow-fullscreen','全屏','expand','aria-label="全屏工作流" aria-pressed="false"')}</div></div>
        <div class="dependency-canvas rf-main task-canvas-surface editor-infinite-surface" id="editor-infinite" aria-label="计算工作流无限画布"></div>
        <div class="pipeline-footer"><span>连线表示参数依赖 · 拖动卡片调整位置</span><div class="graph-tools">${button('connect','连接映射')}<span id="editor-zoom" class="sr-only" aria-label="画布缩放比例">100%</span></div></div>
      </section>
      </div>
      <section class="execution-panel" id="execution-panel" aria-label="计算任务列表"></section>
      <footer class="workspace-footer"><span>SynMatAI · 计算工作流</span><span>原型演示 · 模型与数值均为示意</span></footer>
    </div>
  </main></div>`;}

export function mountEditor(root,s,{notify,navigate,openDialog,onUpdate,onCopy}){
  if(s.viewMode!=='execution')ensureMaterialNodes(s);
  const executionKey=s.workflowId+':'+(s.activeRunId||'definition');
  if(executionOf(s)?.status==='运行中'&&!executionOf(s)?.demoFixture&&!running.has(executionKey)&&new URLSearchParams(location.search).get('autostart')!=='1'){pauseExecution(s);}
  const q=selector=>root.querySelector(selector);let cleanupPreview=()=>{},timer=running.get(executionKey)||null,disposed=false;
  const node=id=>s.nodes.find(n=>n.id===id);const selected=()=>node(s.selected);let issues=null,canvasView=null;
  let taskFilter='全部';
  const editable=n=>{const reason=editLockReason(s,n?.id);if(reason)notify(reason);return !reason;};
  const graphEditable=()=>{if(structuralLock(s)){notify('当前为执行任务，依赖结构已固定。请打开关联建模复用或调整工作流。');return false;}return true;};
  function materialsEditable(n,next){
    if(!next)return true;
    for(const old of macroMaterials(n)){
      const replacement=next.find(m=>m.id===old.id);if(JSON.stringify(old)===JSON.stringify(replacement))continue;
      const micro=node(n.materialNodes?.[old.id]);if(!micro)continue;
      const withoutProperties=value=>{const copy=structuredClone(value||{});delete copy.keyProperty;delete copy.propertyConfigs;return copy;};
      const changesStructure=JSON.stringify(withoutProperties(old))!==JSON.stringify(withoutProperties(replacement));
      const affected=changesStructure?[micro]:s.edges.filter(e=>e.from===micro.id).map(e=>node(e.to));
      if(affected.some(item=>item&&editLockReason(s,item.id))){notify('此结构关联的节点已完成，请保留已锁定结构及物性配置。');return false;}
    }
    if(structuralLock(s)&&next.length!==macroMaterials(n).length){notify('执行期间结构数量已固定，可修改未完成节点参数。');return false;}
    return true;
  }
  function showCompletedNode(n){const r=executionOf(s),t=r?.tasks[n.id];openDialog(`<div class="dialog-form"><h2>${esc(n.name)} · 只读配置</h2><div class="execution-lock-note">${esc(editLockReason(s,n.id))}</div><p>完成时间：${esc(t?.finishedAt||'演示记录')} · 执行次数：${t?.attempts||1}</p><pre class="task-log">${esc(JSON.stringify(t?.completedInput||n.params,null,2))}</pre><div class="dialog-actions"><button class="btn" data-dialog-close>关闭</button></div></div>`);}
  let flowFullscreen=false,restoreScroll={x:0,y:0},autoFitFrame=0;
  const detailNode=()=>materialForNode(s,s.selected)?.macro||node(s.activeMacroId)||s.nodes.find(n=>n.type==='macro');
  const canvasHistory=canvasHistories.get(executionKey)||{undo:[],redo:[]};canvasHistories.set(executionKey,canvasHistory);
  const definitionSnapshot=()=>structuredClone({nodes:s.nodes,edges:s.edges,revision:s.revision,definition:s.definition,selected:s.selected,embeddedCanvasPositions:s.embeddedCanvasPositions});
  function remember(){canvasHistory.undo.push(definitionSnapshot());canvasHistory.redo=[];}
  function undoCanvas(redo=false){if(!graphEditable())return;const from=redo?canvasHistory.redo:canvasHistory.undo,to=redo?canvasHistory.undo:canvasHistory.redo;if(!from.length)return;to.push(definitionSnapshot());const previous=from.pop(),currentRevision=s.revision;Object.assign(s,previous);issues=null;s.revision=Math.max(currentRevision,previous.revision)+1;s.checkedRevision=null;record(redo?'重做画布修改':'撤销画布修改');refresh();}
  function selectCanvasNode(id,open=false){const n=node(id);if(!n)return;if(s.selected===id&&!open)return;s.selected=id;if(['microCompute','schedule'].includes(n.type)){s.factorTaskFilter={nodeId:id,key:null};taskFilter='全部';q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);}if(n.type==='macro')s.activeMacroId=id;const binding=materialForNode(s,id);if(binding)s.activeMacroId=binding.macro.id;s.tab='model';save();renderDetail();renderChat();if(open)openNodeConfiguration(n);}
  function addCanvasContext(){}
  function createCanvasNode(type,point,before=[],fromSide='right',exact=false){if(!graphEditable())return;if(!kinds[type])return;if(['start','end'].includes(type)&&s.nodes.some(n=>n.type===type))return notify('工作流只能保留一个'+kinds[type]+'节点');remember();const n=makeNode(type,`node-${Date.now()}`);const positions=s.embeddedCanvasPositions||{};const sizes=Object.fromEntries(Object.keys(positions).map(id=>[id,{width:196,height:126}]));const preferred=FlowCanvasModel.newNodePosition(before,[],positions,sizes,{width:196,height:126},point,exact);n.x=preferred.x;n.y=preferred.y;s.nodes.push(n);if(n.type==='batch'){const model=s.nodes.find(a=>['micro','macro'].includes(a.type)&&(before.length?before.includes(a.id):a.type==='macro')),expected=model?.type==='micro'?'microCompute':'schedule',edge=model&&s.edges.find(e=>e.from===model.id&&node(e.to)?.type===expected);if(edge){s.edges=s.edges.filter(e=>e!==edge);connect(s,model.id,n.id);connect(s,n.id,edge.to);before=before.filter(id=>id!==model.id);}}if(n.type==='macro')ensureMaterialNodes(s);s.embeddedCanvasPositions??={};s.embeddedCanvasPositions[n.id]=preferred;let message='已创建 '+n.name;for(const id of before){const error=connect(s,id,n.id,inputsOf(n)[0]?.[0]);if(!error){const edge=s.edges.find(e=>e.from===id&&e.to===n.id);edge.fromPort=fromSide||'right';edge.toPort='left';}else message+='；'+error;}s.revision++;s.checkedRevision=null;s.definition='草稿';s.selected=n.id;record('新增计算节点 '+n.name);refresh();canvasView?.controller.selectNode(n.id);notify(message);}
  function removeCanvasNodes(ids){if(!graphEditable())return;if(ids.some(id=>editLockReason(s,id)))return notify('已执行节点及其依赖不可删除，请复制建模后调整');const nodes=ids.map(node).filter(Boolean);if(!nodes.length)return;const affected=s.edges.filter(e=>ids.includes(e.from)||ids.includes(e.to));const d=openDialog(`<div class="dialog-form"><h2>删除所选节点</h2><p>将删除 ${nodes.length} 个节点及 ${affected.length} 条连接，历史执行记录保留。可使用撤销恢复。</p><p>${nodes.map(n=>esc(n.name)).join('、')}</p><div class="dialog-actions"><button class="btn" data-dialog-close>取消</button><button class="btn primary" data-confirm-canvas-delete>确认删除</button></div></div>`);d.querySelector('[data-confirm-canvas-delete]').onclick=()=>{if(!graphEditable())return;remember();ids.forEach(id=>invalidate(s,id));s.nodes=s.nodes.filter(n=>!ids.includes(n.id));s.edges=s.edges.filter(e=>!ids.includes(e.from)&&!ids.includes(e.to));s.selected=s.nodes[0]?.id||null;s.inspectorOpen=false;s.contextReferences=(s.contextReferences||[]).filter(id=>node(id));record('删除画布节点 '+nodes.map(n=>n.name).join('、'));d.close();refresh();};}
  function deleteCanvasEdge(edge,direct=false){if(direct){if(!graphEditable())return;remember();s.edges=s.edges.filter(e=>e.id!==edge.id);change(edge.to,'删除工作流连线');return;}if(!graphEditable())return;if(!edge)return;const d=openDialog(`<div class="dialog-form"><h2>删除连线</h2><p>${esc(node(edge.from).name)} → ${esc(node(edge.to).name)}</p><p>${esc(edge.output)} → ${esc(edge.input)} · ${esc(edge.unit)}</p><p>可撤销恢复，历史执行快照保留。</p><div class="dialog-actions"><button class="btn" data-dialog-close>取消</button><button class="btn primary" data-confirm-canvas-edge>确认删除连线</button></div></div>`);d.querySelector('[data-confirm-canvas-edge]').onclick=()=>{if(!graphEditable())return;remember();s.edges=s.edges.filter(e=>e.id!==edge.id);change(edge.to,'删除输入映射 '+edge.input);d.close();};}
  function reconnectCanvasEdge(edge,end,id,side){if(!graphEditable()||!edge)return;const candidate=structuredClone(s);candidate.edges=candidate.edges.filter(e=>e.id!==edge.id);const from=end==='from'?id:edge.from,to=end==='to'?id:edge.to;if(candidate.edges.some(e=>e.from===from&&e.to===to))return notify('这两个节点之间已存在连线');const error=connect(candidate,from,to,inputsOf(node(to))[0]?.[0]);if(error)return notify(error);remember();const next=candidate.edges.find(e=>e.from===from&&e.to===to);next.fromPort=end==='from'?side:edge.fromPort;next.toPort=end==='to'?side:edge.toPort;s.edges=candidate.edges;invalidate(s,edge.to);change(to,'改接工作流连线');notify('连线已更新');}
  function connectCanvasNodes(from,to,fromPort,toPort){if(!graphEditable())return;const target=node(to),source=node(from);if(!target||!source)return;if(s.edges.some(e=>e.from===from&&e.to===to))return notify('这两个节点之间已存在连线，可通过连线操作编辑映射');const old=definitionSnapshot(),error=connect(s,from,to,inputsOf(target)[0]?.[0]);if(error)return notify(error);canvasHistory.undo.push(old);canvasHistory.redo=[];const edge=s.edges.find(e=>e.from===from&&e.to===to);edge.fromPort=fromPort;edge.toPort=toPort;s.selected=to;record('连接 '+kinds[source.type]+' → '+kinds[target.type]);refresh();}

  function save(){
    const label=q('#editor-save');if(label){label.classList.add('sr-only');label.textContent='保存中…';}
    try{const source=s.viewMode==='execution'?cache.get(s.workflowId):s;if(s.viewMode==='execution'){const run=s.runs.find(r=>r.id===s.activeRunId);if(run)run.workingDefinition=structuredClone({nodes:s.nodes,edges:s.edges,revision:s.revision,checkedRevision:s.checkedRevision,selected:s.selected,history:s.history,embeddedCanvasPositions:s.embeddedCanvasPositions||{}});if(source){source.nodes=structuredClone(s.nodes);source.edges=structuredClone(s.edges);source.revision=s.revision;source.checkedRevision=s.checkedRevision;}}localStorage.setItem(storageKey(s.workflowId),JSON.stringify(source));if(label)label.textContent=s.viewMode==='execution'?'任务设置已保存在本机（演示）':'已保存在本机（演示）';onUpdate(source);}
    catch{if(label){label.classList.remove('sr-only');label.innerHTML='保存失败 <button data-editor="retry-save">重试</button>';}}
  }
  function record(text,id=s.selected){s.history.unshift({id,text,time:timeNow()});save();}
  function refresh(){if(disposed)return;syncExecution(s);renderHeader();renderRun();syncStageHeight();renderGraph();renderDetail();renderChat();q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);}
  function refreshExecution(){
    if(!!editLockReason(s,detailNode()?.id)!==!!q('#editor-detail')?.querySelector('.execution-lock-note'))renderDetail();
    renderHeader();renderRun();q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);
    for(const card of q('#editor-infinite').querySelectorAll('[data-flow-task]')){const status=executionOf(s)?.tasks[card.dataset.flowTask]?.status;if(!status)continue;card.dataset.executionState=status;const label=card.querySelector('.calculation-status');if(label){label.dataset.status=status;label.textContent=status;}}
    refreshValidationLabels();
    const config=q('.calculation-open-config');if(config)config.textContent=editLockReason(s,s.selected)?'查看配置':'打开配置';
  }
  function refreshValidationLabels(){const statuses=inspectionStatuses(s,issues);for(const label of root.querySelectorAll('[data-inspection]')){const status=statuses[label.dataset.inspection];label.textContent=status;label.dataset.state=status;}}
  function renderHeader(){const r=executionOf(s)||(s.viewMode==='definition'?s.runs.find(r=>r.executionVersion===1):null),runButton=q('[data-editor="run"]');runButton.disabled=!!timer||!!r&&s.nodes.every(n=>r.tasks[n.id]?.status==='已完成');runButton.innerHTML=icon('play')+(r?'继续未完成任务':'提交计算任务');q('#editor-infinite').dataset.busy=String(!!timer);q('[data-editor="add"]').disabled=structuralLock(s);q('[data-editor="connect"]').disabled=structuralLock(s);q('[data-workflow-name]').readOnly=s.viewMode==='execution';q('[data-workflow-description]').readOnly=s.viewMode==='execution';}
  function pick(id){selectCanvasNode(id,true);canvasView?.controller.selectNode(id);canvasView?.controller.focus(id);}
  function renderGraph(){
    const agent=q('.copilot'),main=q('#editor-infinite');canvasView?.destroy();
    q('#editor-count').textContent=s.nodes.length+' 个工作流节点';
    canvasView=mountCalculationCanvas(main,agent,s,{
      canUndo:()=>canvasHistory.undo.length>0,canRedo:()=>canvasHistory.redo.length>0,undo:undoCanvas,
      select:selectCanvasNode,context:addCanvasContext,create:createCanvasNode,remove:removeCanvasNodes,
      toggleFactor:id=>{s.expandedFactorNodes??=[];s.expandedFactorNodes=s.expandedFactorNodes.includes(id)?s.expandedFactorNodes.filter(x=>x!==id):[...s.expandedFactorNodes,id];refresh();},filterFactor:(id,key)=>{s.factorTaskFilter={nodeId:id,key};taskFilter='全部';q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);q('#execution-panel').scrollIntoView({behavior:'smooth',block:'nearest'});},connect:connectCanvasNodes,reconnect:reconnectCanvasEdge,editEdge:edge=>connectDialog(edge),deleteEdge:deleteCanvasEdge,
      info:notify,view:camera=>{q('#editor-zoom').textContent=Math.round(camera.zoom*100)+'%';},
    });
    requestAnimationFrame(()=>{if(!disposed)syncStageHeight();});
  }
  function syncStageHeight(){if(flowFullscreen){const sidebar=document.querySelector('.sidebar');root.style.setProperty('--workflow-shell-left',(sidebar?.getBoundingClientRect().right||0)+'px');}canvasView?.controller.refreshLayout();}
  function fitCanvasAfterLayout(afterFit){
    cancelAnimationFrame(autoFitFrame);let previousSize='',attempts=0;
    const fit=()=>{
      if(disposed)return;syncStageHeight();
      const canvas=q('#editor-infinite'),size=canvas.clientWidth+'x'+canvas.clientHeight;
      if(size!==previousSize&&attempts++<6){previousSize=size;autoFitFrame=requestAnimationFrame(fit);return;}
      autoFitFrame=0;canvasView?.controller.fit();afterFit?.();
    };
    autoFitFrame=requestAnimationFrame(fit);
  }
  function toggleFlowFullscreen(force){
    const next=typeof force==='boolean'?force:!flowFullscreen;if(next===flowFullscreen)return;
    if(next)restoreScroll={x:window.scrollX,y:window.scrollY};
    flowFullscreen=next;root.classList.toggle('workflow-fullscreen',next);document.body.classList.toggle('workflow-fullscreen-active',next);
    const button=q('[data-editor="toggle-flow-fullscreen"]');button.innerHTML=icon(next?'restore':'expand')+(next?'恢复':'全屏');button.setAttribute('aria-label',next?'恢复工作流布局':'全屏工作流');button.setAttribute('aria-pressed',String(next));
    syncStageHeight();fitCanvasAfterLayout(()=>{if(!next)window.scrollTo(restoreScroll.x,restoreScroll.y);button.focus({preventScroll:true});});
  }
  const escapeFullscreen=e=>{if(e.key==='Escape'&&flowFullscreen&&!document.querySelector('dialog[open]')){e.preventDefault();toggleFlowFullscreen(false);}};
  document.addEventListener('keydown',escapeFullscreen);
  function openModelSettings(kind='algorithm'){
    const n=detailNode();if(!n||!editable(n))return;
    const geometry=kind==='geometry',p=n.params;
    const fields=geometry?timFields(n,['几何与颗粒']):select('case','模拟算法',['tim','extrusion'].includes(p.case)?p.case:'blank',Object.entries(applicationLabels))+field('modelName','模型名称',p.modelName,'','text')+(p.case==='extrusion'?extrusionFields(n,['边界条件']):p.case==='tim'?field('resistance','基体–填料界面热阻',p.resistance,'m²·K/W')+timFields(n,['温度边界']):paramsFor({...n,type:p.case}));
    const d=openDialog(`<form class="dialog-form model-settings-form" data-editor-form="params"><h2>${geometry?'几何与颗粒':'算法设置'}</h2><div class="model-settings-fields">${fields}</div><p class="macro-note">${geometry?'几何尺寸与颗粒分布在此设置。':'材料物性统一在“材料管理”中设置。'}</p><div class="dialog-actions"><button type="button" class="btn" data-dialog-close>取消</button><button class="btn primary">应用设置</button></div></form>`);
    d.classList.add('model-settings-dialog');const form=d.querySelector('form');if(geometry)form.querySelector('.algorithm-field-group>summary')?.remove();
    form.querySelector('[data-param=case]')?.setAttribute('disabled','');
    const boundaries=()=>form.querySelectorAll('[data-inlet-kind],[data-outlet-kind]').forEach(group=>{const inlet=group.hasAttribute('data-inlet-kind');const value=form.querySelector(`[data-param=${inlet?'inletType':'outletType'}]`)?.value;group.hidden=(inlet?group.dataset.inletKind:group.dataset.outletKind)!==value;group.querySelectorAll('input').forEach(input=>input.disabled=group.hidden);});boundaries();
    form.addEventListener('change',e=>{if(e.target.matches('[data-param=case]')){onChange(e);d.close();return;}boundaries();});
    form.onsubmit=e=>{e.preventDefault();commitParams(form);d.close();};
  }
  function paramsFor(n){
    const p=n.params,g=s.group;
    if(n.type==='macro')return select('case','模拟算法',['tim','extrusion'].includes(p.case)?p.case:'blank',Object.entries(applicationLabels))+field('modelName','模型名称',p.modelName,'','text')+paramsFor({...n,type:p.case});
    if(n.type==='extrusion')return extrusionFields(n);
    if(n.type==='tim')return timFields(n);
    if(n.type==='generic'||n.type==='blank')return '<h3>通用宏观模型</h3>'+field('description','模型说明',p.description,'','text')+'<p class="binding-note">几何、网格、材料与边界属于宏观模型内部配置；具体物理模型与算法接口待接入。</p>';
    if(n.type==='schedule')return '<h3>宏观模拟计算</h3>'+select('strategy','调度策略',p.strategy,['按依赖执行'])+select('resource','计算资源',p.resource,['本地演示'])+field('cores','并行核数',p.cores)+field('retries','失败重试次数',p.retries)+'<p class="binding-note">接收宏观模型，按依赖提交计算并向结果呈现传递输出。当前为本地原型演示。</p>';
    if(n.type==='microCompute')return `<h3>微观物性计算</h3>${select('property','计算物性',p.property,[['thermal_conductivity','热导率'],['density','密度'],['viscosity','黏度'],['elastic_modulus','弹性模量']])}${field('temperature','计算温度',p.temperature,'K')}${field('steps','计算步数',p.steps)}${field('task','任务引用',p.task,'','text')}<p class="binding-note">使用上游分子模型计算所选物性。参数仅用于原型演示，尚未接入真实计算。</p>`;
    if(n.type==='result')return `<h3>结果呈现</h3>${select('format','报告格式',p.format,['PDF'])}${select('presentation','呈现方式',p.presentation,['报告与文本结论'])}<div class="node-state-message">求解状态：${esc(s.runs.at(-1)?.status||'尚未运行')}<br>报告状态：${esc(s.runs.at(-1)?.reportStatus||'等待上游结果')}</div>${button('results','查看作业与结果','file')}${button('report-fail','演示：报告生成失败')}${button('report-retry','重试生成报告')}`;
    if(n.type==='flow')return `<h3>简单圆管流动</h3>${field('length','圆管长度',p.length,'mm')}${field('diameter','内径',p.diameter,'mm')}${field('density','密度',p.density,'kg/m³')}${field('temperature','生产温度',p.temperature,'K')}${field('consistency','稠度系数（示例）',p.consistency,'Pa·sⁿ')}${field('exponent','幂律指数（示例）',p.exponent)}<p class="binding-note">引用已有广义牛顿模型；具体支持清单待算法接口确认。</p>${field('inlet','入口速度',p.inlet,'m/s')}${field('outlet','出口表压',p.outlet,'Pa')}<p class="binding-note">壁面：无滑移 · 出口面 ${p.outlet===''?'未绑定':'outlet-1'}</p>`;
    if(g==='geometry'){
      const a=p;
      return `<h3>几何设置</h3><p class="binding-note">长方体基体 · 非接触颗粒预设</p>${field('length','长度',a.length,'mm')}${field('width','宽度',a.width,'mm')}${field('height','厚度',a.height,'mm')}${select('particle','颗粒预设',a.particle,['球形'])}${select('distribution','填充分布',a.distribution,['均一','随机'])}${field('seed','随机种子',a.seed)}${field('target','目标填充率（待确认输入）',a.target,'%')}${field('gap','最小间隙',a.gap,'mm')}<p class="binding-note">实际填充率来自生成结果，不能用目标值替代。</p>`;
    }
    if(g==='mesh')return `<h3>网格设置</h3>${field('mesh','网格尺寸',p.mesh||.2,'mm')}<p class="binding-note">几何检查通过后生成网格。工具及文件格式待算法契约确认。</p>${button('geometry-check','检查几何','check')}`;
    if(g==='materials')return `<h3>材料与界面</h3>${select('source','基体热导率来源',p.source,['引用上游','手工输入'])}${field('matrix','基体热导率',p.matrix,'W/(m·K)')}${field('filler','填料热导率',p.filler,'W/(m·K)')}${field('resistance','界面热阻',p.resistance,'m²·K/W')}<p class="binding-note">微观数据的物性映射在当前宏观模型内配置；手工值需由用户确认。</p>${button('missing','演示：缺少填料热导率')}`;
    if(g==='boundary')return `<h3>边界条件</h3>${select('direction','计算方向',p.direction,['X','Y','Z'])}${field('hot','热端温度',p.hot,'°C')}${field('cold','冷端温度',p.cold,'°C')}<label class="field"><span>侧面边界</span><input value="绝热（固定）" readonly></label>`;
    return '<h3>求解设置</h3><div class="node-state-message">执行：工作流本地演示<br>三维 · 稳态 · 纯导热<br>不包含其他物理场。</div>';
  }
  function editMolecule(n){openMoleculeEditor(openDialog,n.params.molecule||createMolecule(),next=>{if(JSON.stringify(next)===JSON.stringify(n.params.molecule||createMolecule()))return notify('分子结构未发生变化');remember();n.params.molecule=next;n.params.moleculeSource='local-draft';change(n.id,'修改分子结构：'+next.name+'；下游结果需更新');notify('分子结构已应用，请重新检查并运行工作流');});}
  function showMicroEditor(micro,title,materialName=''){
    if(micro&&!editable(micro)){showCompletedNode(micro);return;}
    openMicroModeling(openDialog,micro?.params.molecule||createMolecule(),{title,materialName,onApply:next=>{if(!micro||!editable(micro))return;if(JSON.stringify(next)===JSON.stringify(micro.params.molecule))return notify('分子结构未发生变化');remember();micro.params.molecule=next;micro.params.moleculeSource='local-draft';const binding=materialForNode(s,micro.id),structure=binding&&macroMaterials(binding.macro).find(m=>m.id===binding.material);if(structure)structure.molecule=structuredClone(next);change(micro.id,'修改微观分子模型：'+next.name);notify('已应用微观模型，下游结果需重新校验');}});
  }
  function openMaterialMicroModel(n,material){const micro=node(n.materialNodes?.[material]),structure=macroMaterials(n).find(m=>m.id===material);showMicroEditor(micro,(structure?.name||'材料')+' · 微观建模',structure?.material?.name||'');}
  function openMaterialCalculation(n){
    const binding=materialForNode(s,n.id),macro=binding?.macro||detailNode(),original=binding&&macroMaterials(macro).find(m=>m.id===binding.material),locked=editLockReason(s,n.id);
    const draft=structuredClone(original||{name:n.name,keyProperty:n.params.keyProperty,propertyConfigs:n.params.materialProperties||{}});
    if(locked&&n.params.materialProperties)draft.propertyConfigs=structuredClone(n.params.materialProperties);
    const algorithm=macro?.params.case||n.params.materialAlgorithm||'generic';prepareMaterialProperties(draft,{params:macro?.params||{case:algorithm}});
    const d=openDialog(`<form class="dialog-form material-compute-form"><h2>${esc(n.name)} · 计算配置</h2><p class="macro-note">${esc(draft.name)}${original?.material?.name?' · '+esc(original.material.name):''} · 与材料管理中的关键物性参数同步</p>${locked?`<div class="execution-lock-note">${esc(locked)}</div>`:''}<h3>关键物性参数</h3><div data-computation-properties></div><p class="macro-error" role="alert"></p><div class="dialog-actions"><button type="button" class="btn" data-dialog-close>${locked?'关闭':'取消'}</button>${locked?'':'<button class="btn primary">保存配置</button>'}</div></form>`);d.classList.add('material-compute-dialog');
    const editor=mountMaterialPropertyEditor(d.querySelector('[data-computation-properties]'),()=>draft,algorithm);editor.render();
    if(locked)d.querySelectorAll('[data-computation-properties] input,[data-computation-properties] select,[data-computation-properties] button').forEach(el=>el.disabled=true);
    d.querySelector('form').onsubmit=e=>{e.preventDefault();if(locked||!editable(n))return;editor.collect();const errors=materialPropertyIssues(draft,algorithm);if(errors.length){d.querySelector('.macro-error').textContent=errors.map(x=>x.join('：')).join('；');return;}
      if(original){const materials=structuredClone(macroMaterials(macro)),item=materials.find(m=>m.id===draft.id);Object.assign(item,{keyProperty:draft.keyProperty,propertyConfigs:draft.propertyConfigs});if(!editable(macro)||!materialsEditable(macro,materials))return;applyMaterials(macro,materials,'计算配置已保存，材料管理已同步');}
      else{remember();Object.assign(n.params,{materialProperties:draft.propertyConfigs,keyProperty:draft.keyProperty,materialAlgorithm:algorithm});change(n.id,'保存关键物性计算配置');notify('计算配置已保存');}
      d.close();};
  }
  function openNodeConfiguration(n){
    if(n.type==='macro')return;
    if(n.type==='batch'){openBatchParameters(openDialog,s,n,{locked:editLockReason(s,n.id),onSave:params=>{if(!editable(n))return;remember();n.params=params;change(n.id,'保存因子设计');notify('因子设计已保存');}});return;}
    if(n.type==='microCompute'){openMaterialCalculation(n);return;}
    if(editLockReason(s,n.id)){showCompletedNode(n);return;}
    if(n.type==='micro'){
      const binding=materialForNode(s,n.id);
      if(binding)return openMaterialMicroModel(binding.macro,binding.material);
      showMicroEditor(n,'微观建模');return;
    }
    if(['start','end'].includes(n.type)){openDialog(`<div class="dialog-form"><h2>${kinds[n.type]}节点</h2><p>${n.type==='start'?'工作流的唯一入口，连接微观建模节点。':'工作流的唯一出口，汇总结果呈现节点。'}运行前将检查所有节点是否位于完整的开始到结束路径上。</p><div class="dialog-actions"><button class="btn" data-dialog-close>关闭</button></div></div>`);return;}
    const draft=structuredClone(n);
    const dialog=openDialog(`<form class="dialog-form node-config-form"><h2>${esc(n.name)} · 节点配置</h2><p class="binding-note">${kinds[n.type]} · 参数保存后，下游结果将标记为需更新。</p><div data-node-config-fields>${paramsFor(draft)}</div><p class="node-config-error" role="alert"></p><div class="dialog-actions"><button type="button" class="btn" data-dialog-close>取消</button><button type="submit" class="btn primary">保存配置</button></div></form>`);dialog.classList.add('node-config-dialog');
    // Configuration uses its own draft; the macro preview stays mounted behind the dialog.
    const collect=()=>{for(const input of dialog.querySelectorAll('[data-param]'))draft.params[input.dataset.param]=input.type==='number'?(input.value===''?'':Number(input.value)):input.value;};
    dialog.querySelector('[data-node-config-fields]').addEventListener('change',e=>{if(e.target.matches('[data-param="case"]')){draft.params=macroParams(e.target.value);dialog.querySelector('[data-node-config-fields]').innerHTML=paramsFor(draft);dialog.querySelectorAll('[data-editor]').forEach(b=>b.remove());}});
    dialog.querySelectorAll('[data-editor]').forEach(b=>b.remove());
    dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(!editable(n))return;collect();const errors=check({...s,nodes:s.nodes.map(item=>item.id===n.id?draft:item)}).filter(i=>i.nodeId===n.id&&!['开始路径','结束路径','连线方向'].includes(i.field)&&!i.reason.includes('缺少前一阶段'));if(errors.length){dialog.querySelector('.node-config-error').textContent=errors.map(i=>i.field+'：'+i.reason).join('；');return;}if(JSON.stringify(draft.params)!==JSON.stringify(n.params)){remember();n.params=draft.params;if(n.type==='microCompute'){n.params.field=n.params.property;const names={thermal_conductivity:'热导率',density:'密度',viscosity:'黏度',elastic_modulus:'弹性模量'},binding=materialForNode(s,n.id);n.name=(binding?(macroMaterials(binding.macro).find(m=>m.id===binding.material)?.name||'材料')+' · ':'')+names[n.params.property]+'计算';}change(n.id,'保存节点配置：'+n.name);}dialog.close();notify('节点配置已保存');};
  }
  function renderDetail(){
    cleanupPreview();const panel=q('#editor-detail'),n=detailNode();if(!n){panel.innerHTML='<div class="empty-state">添加宏观建模节点，开始搭建模型。</div>';return;}
    s.tab='model';
    panel.innerHTML=`<div class="detail-heading macro-compact-heading"><h2>${n.type==='macro'?'计算建模':esc(n.name)}<span class="inspection-badge" data-inspection="model" aria-label="建模检验状态"></span></h2><div class="detail-actions">${button('run-node','运行此节点','play',canRunNode(s,n)&&!timer?'':'disabled')}${n.params.case==='tim'?button('ai-edit','AI 辅助修改','spark'):''}${button('delete','删除节点')}</div></div><div id="editor-detail-body"></div>`;
    const body=q('#editor-detail-body');const lockReason=editLockReason(s,n.id);
    const model=n.type==='macro',report=n.type==='result',micro=n.type==='micro';
    body.innerHTML=`${macroToolbar(n.params.geometryKind==='pipe')}<div class="thermal-layout"><div class="thermal-preview">${micro?'<div id="editor-molecule-preview"></div>':model?'<div id="editor-preview"></div>':report?renderReport(s):`<div class="editor-info-visual">${icon(n.type==='micro'?'molecule':'flow')}<strong>${esc(n.name)}</strong><span>${esc(outputOf(n)[1])}</span><div class="property-output">${n.type==='micro'?'引用已有微观任务及其结构化输出':n.type==='schedule'?'依赖调度 · 资源配置 · 执行输出':'模型定义 · 输入映射 · 案例配置'}<br>原型演示</div></div>`}</div></div><section class="editor-validation" aria-label="建模检验"><div class="model-validation-heading"><h3>建模检验</h3><span class="${issues&&!issues.length?'check-success':''}">${issues?issues.length?issues.length+' 项问题':'检验通过':'尚未检验当前修改'}</span>${button('validate','建模检验','check')}</div>${issues?.length?`<div class="editor-validation-body">${issues.map(i=>`<button data-select-node="${i.nodeId||''}"><strong>${esc(i.name)} · ${esc(i.field)}</strong><span>${esc(i.reason)} → 定位</span></button>`).join('')}</div>`:''}</section>`;
    if(n.params.case==='extrusion')q('.macro-tools [data-macro-tool=materials]').insertAdjacentHTML('afterend','<button type="button" data-editor="model-settings">'+icon('flow')+'算法设置</button>');
    body.querySelectorAll('[data-inlet-kind],[data-outlet-kind]').forEach(group=>group.querySelectorAll('input').forEach(input=>input.disabled=group.hidden));
    if(structuralLock(s)){body.querySelector('[data-param=case]')?.setAttribute('disabled','');panel.querySelector('[data-editor=delete]')?.setAttribute('disabled','');}
    if(lockReason){body.insertAdjacentHTML('afterbegin',`<div class="execution-lock-note">${esc(lockReason)} 模型仍可旋转和查看。</div>`);body.querySelectorAll('.thermal-properties input,.thermal-properties select,.thermal-properties button,[data-macro-tool],[data-editor=model-settings]').forEach(el=>el.disabled=true);panel.querySelectorAll('[data-editor=delete],[data-editor=ai-edit],[data-editor=run-node]').forEach(el=>el.disabled=true);}
    if(micro){const viewer=renderMolecule(q('#editor-molecule-preview'),n.params.molecule||createMolecule(),{onEdit:()=>editMolecule(n)});cleanupPreview=()=>viewer.destroy();}
    if(model)cleanupPreview=renderCompositePreview(q('#editor-preview'),{toolbarHost:q('.macro-tools'),onAddMaterial:()=>editMaterials(n,undefined,true),materials:macroMaterials(n),settings:{...macroSettings(n),showComposite:hasCompositeGeometry(n),geometryKind:n.params.geometryKind,materialScope:n.params.materialScope},onDeletePrimitive:id=>{if(!editable(n))return;const settings=structuredClone(macroSettings(n));if(!settings.primitives?.some(p=>p.id===id))return;settings.primitives=settings.primitives.filter(p=>p.id!==id);saveGeometrySettings(n,settings);notify('几何体已删除');},onPrimitive:(type,id)=>{if(editable(n))openPrimitive(type,n,{openDialog,onSave:settings=>saveGeometrySettings(n,settings)},id);},onExport:url=>{const d=openDialog(`<div class="dialog-form"><h2>模型截图</h2><img class="model-export-image" src="${url}" alt="当前宏观模型截图"><div class="dialog-actions"><button type="button" class="btn" data-dialog-close>关闭</button><a class="btn primary" download="宏观模型预览.png" href="${url}">保存 PNG</a></div></div>`);d.classList.add('model-export-dialog');},onViewChange:view=>{for(const [key,value]of Object.entries(view)){const button=q('.macro-tools [data-model-view="'+key+'"]');if(button)button.setAttribute('aria-pressed',String(value));}},onEditMaterial:id=>editMaterials(n,id),onDeleteStructure:id=>deleteStructure(n,id),selectedMaterial:materialForNode(s,s.selected)?.material||null,onSelect:material=>{const id=material?n.materialNodes?.[material]:n.id;if(!node(id))return;s.selected=id;s.tab='model';save();renderChat();canvasView?.controller.selectNode(id);},onMicroModel:material=>openMaterialMicroModel(n,material)});
    if(structuralLock(s))body.querySelectorAll('[data-add-demo-material],[data-composite-delete]').forEach(el=>el.disabled=true);
    if(lockReason)body.querySelectorAll('[data-primitive],[data-composite-edit],[data-composite-dimensions],[data-composite-delete],[data-add-demo-material]').forEach(el=>el.disabled=true);
    refreshValidationLabels();
  }
  function saveGeometrySettings(n,settings){if(!editable(n))return;if(n.params.geometryKind==='pipe'&&!materialsEditable(n,macroMaterials(n).filter(m=>!m.geometryId||settings.primitives.some(p=>p.id===m.geometryId))))return;
    remember();if(n.params.geometryKind==='pipe')reflowPipe(settings);n.params.modeling=settings;
    if(n.params.geometryKind==='pipe'){
      const materials=macroMaterials(n).filter(m=>!m.geometryId||settings.primitives.some(p=>p.id===m.geometryId));
      for(const material of materials){const part=settings.primitives.find(p=>p.id===material.geometryId);if(part){material.name=material.structureName=part.name;}}
      if(n.params.case==='flow'){const part=settings.primitives.find(p=>p.pipeSegment);if(part){n.params.length=part.height;n.params.diameter=part.radius*2;}}
      applyMaterials(n,materials,'结构尺寸与模型已更新',true);return;
    }
    change(n.id,'更新几何体');
  }
  function editMaterials(n,initialId,addStructure=false){if(!editable(n)||!materialsEditable(n))return;if(addStructure&&!graphEditable())return;openMaterials(n,{openDialog,initialId,addStructure,getMicroModel:m=>{const original=macroMaterials(n).find(x=>x.id===m.id),micro=node(n.materialNodes?.[m.id]);return original?.material?.libraryId===m.material?.libraryId?micro?.params.molecule:m.material?.molecule;},canEditMicroModel:id=>!editLockReason(s,n.materialNodes?.[id]),onSave:materials=>applyMaterials(n,materials)});}
  function deleteStructure(n,id){if(!editable(n)||!materialsEditable(n))return;
    const materials=macroMaterials(n),target=materials.find(m=>m.id===id);
    if(target?.region!=='filler'||materials.filter(m=>m.region==='filler').length<=1)return;
    applyMaterials(n,materials.filter(m=>m.id!==id),'已删除'+target.name+'，模型与工作流节点已同步');
  }
  function applyMaterials(n,materials,message='材料已应用，微观建模与计算节点已同步',remembered=false){if(!editable(n)||!materialsEditable(n,materials))return;
    if(!remembered)remember();applyMaterialPropertyInputs(n,materials);const assigned=new Set(materials.filter(m=>m.region!=='none').map(m=>m.id)),removed=new Set();
    for(const [id,microId]of Object.entries(n.materialNodes||{}))if(!assigned.has(id)){removed.add(microId);for(const e of s.edges.filter(e=>e.from===microId))if(node(e.to)?.type==='microCompute')removed.add(e.to);delete n.materialNodes[id];}
    s.nodes=s.nodes.filter(item=>!removed.has(item.id));s.edges=s.edges.filter(e=>!removed.has(e.from)&&!removed.has(e.to));
    for(const structure of materials){const old=macroMaterials(n).find(m=>m.id===structure.id),micro=node(n.materialNodes?.[structure.id]);if(micro&&JSON.stringify(old?.propertyConfigs)!==JSON.stringify(structure.propertyConfigs)){for(const calc of microCalculations(s,micro.id))invalidate(s,calc.id);}if(micro&&structure.molecule&&JSON.stringify(old?.molecule)!==JSON.stringify(structure.molecule)){micro.params.molecule=structuredClone(structure.molecule);micro.params.moleculeSource='local-draft';invalidate(s,micro.id);}if(micro&&old?.material?.libraryId!==structure.material?.libraryId&&structure.material?.molecule){micro.params.molecule=structuredClone(structure.material.molecule);invalidate(s,micro.id);}}
    n.params.materials=materials;if(n.params.geometryKind==='pipe'){for(const material of materials){const part=n.params.modeling.primitives.find(p=>p.id===material.geometryId);if(part)part.name=material.name;}}const matrix=materials.find(m=>m.region==='matrix'),fillers=materials.filter(m=>m.region==='filler');if(matrix)n.params.matrix=matrix.conductivity;if(fillers.length===1)n.params.filler=fillers[0].conductivity;
    ensureMaterialNodes(s);if(!node(s.selected))s.selected=n.id;change(n.id,'更新模型材料与区域分配');notify(message);
  }
  function renderReport(state){const r=state.runs.at(-1),ready=r?.status==='成功'&&r.reportStatus==='已生成';return `<div class="editor-report"><div class="report-file">${icon('file')}<strong>${ready?'仿真结果报告.pdf':'等待上游结果'}</strong><span>${esc(r?.id||'尚未运行')} · 原型演示</span></div>${ready?`<h3>本次仿真结论</h3><p>${reportConclusion(r)}</p>${button('preview-report','预览报告','file')}${button('download-report','下载报告','download')}${button('copy-conclusion','复制结论','copy')}`:`<p>求解与报告状态分别维护。报告生成完成后显示文件和文本结论。</p>`}</div>`;}
  function renderChat(){}
  function renderRun(){const r=s.viewMode==='execution'?s.runs.find(r=>r.id===s.activeRunId):s.runs.at(-1),managed=executionOf(s);q('#editor-header-context').innerHTML=button('copy-model','复制建模','copy');if(s.viewMode==='definition'){q('#editor-run-strip').innerHTML='';return;}if(managed){const tasks=Object.values(managed.tasks),done=tasks.filter(t=>t.status==='已完成').length,blocked=tasks.filter(t=>['已阻塞','失败'].includes(t.status)).length;const scope=tasks.filter(t=>t.requested).length<s.nodes.length?'部分运行':'全部运行';q('#editor-run-strip').innerHTML=`<div class="execution-run-summary"><strong>跨尺度模拟任务 · ${scope}</strong><span class="execution-status" data-state="${managed.status==='成功'?'已完成':managed.status}">${managed.status==='成功'?'全部完成':managed.status}</span><span>已完成 ${done} / ${tasks.length}</span>${blocked?`<span class="execution-status" data-state="已阻塞">${blocked} 项阻塞</span>`:''}${managed.demoFixture&&!timer&&managed.status==='运行中'?'<small>运行状态演示，点击继续运行推进</small>':''}<small>任务 ${esc(managed.id)} · 配置 v${managed.definitionRef?.revision??managed.snapshot?.revision??'—'}</small><div class="execution-run-actions">${timer?button('cancel','暂停执行'):managed.status!=='成功'?button('run','继续运行','play'):''}${button('open-definition','打开关联建模')}${button('results','查看报告')}</div></div>`;return;}
    q('#editor-run-strip').innerHTML=r?`<div class="run-summary"><strong>${esc(r.status)}</strong><span>${esc(r.id)} · 报告${esc(r.reportStatus)}</span>${button('open-definition','打开关联建模')}${button('results','查看报告')}</div>`:'';
  }
  function change(id,text){invalidate(s,id);editExecutionInput(s,id);node(id).version++;issues=null;record(text,id);refresh();}
  function commitParams(form=q('[data-editor-form="params"]')){const n=detailNode();if(!n||!editable(n))return;remember();const inputs=[...form.querySelectorAll('[data-param]')];let changed=new Set();for(const input of inputs){if(input.dataset.param==='case')continue;if(input.type==='radio'&&!input.checked)continue;const target=n;if(!target)continue;const value=input.type==='number'?(input.value===''?'':Number(input.value)):input.value;if(target.params[input.dataset.param]!==value){target.params[input.dataset.param]=value;changed.add(target.id);}}for(const input of form.querySelectorAll('[data-tim-preset]')){const structure=macroMaterials(n).find(m=>m.id===input.dataset.timPreset);if(structure&&structure.shape!==input.value){structure.shape=input.value;changed.add(n.id);}}if(changed.size&&n.params.case==='extrusion')n.params.algorithmInput=extrusionInput(n.params);if(changed.size&&n.params.case==='tim')n.params.algorithmInput=timInput(n.params);if(changed.size&&n.params.case==='flow'&&n.params.geometryKind==='pipe'){const part=n.params.modeling.primitives.find(p=>p.pipeSegment);if(part){part.height=Number(n.params.length);part.radius=part.endRadius=Number(n.params.diameter)/2;reflowPipe(n.params.modeling);}}for(const id of changed)change(id,'保存节点参数，相关下游结果已过期');if(!changed.size)notify('参数未发生变化');else notify('已保存参数，请建模检验后重新执行');}
  function validate(){issues=check(s);s.checkedRevision=issues.length?null:s.revision;if(!issues.length)s.definition='可运行';else s.definition='草稿';record(`建模检验：${issues.length?issues.length+' 项问题':'检查通过'}`);refresh();notify(issues.length?`发现 ${issues.length} 项问题，可在配置下方定位`:'依赖与演示参数检查通过');}
  function startExecutionClock(){
    if(timer)return;
    const tick=()=>{const r=executionOf(s);if(!r||r.paused||r.status!=='运行中'){clearInterval(timer);running.delete(executionKey);timer=null;if(!disposed)refresh();return;}
      const wasModelLocked=!!editLockReason(s,detailNode()?.id);advanceExecution(s);save();if(!disposed){refreshExecution();if(!wasModelLocked&&editLockReason(s,detailNode()?.id))renderDetail();}document.dispatchEvent(new CustomEvent('forge:run-progress',{detail:s.workflowId}));};
    timer=setInterval(tick,1400);running.set(executionKey,timer);renderHeader();renderRun();
  }
  function run(onlySelected=false){
    if(timer)return;const r=executionOf(s);if(r?.status==='成功'&&s.nodes.every(n=>r.tasks[n.id]?.status==='已完成'))return notify('本次建模已完成。请新增节点或复制建模后重新计算。');
    const problems=check(s);if(problems.length){issues=problems;refresh();return notify('输入或依赖未通过检验，请先处理问题');}
    const ids=onlySelected?(s.canvasSelection?.length?s.canvasSelection:[s.selected]).filter(Boolean):null;s.checkedRevision=s.revision;s.definition='可运行';
    for(const n of s.nodes.filter(n=>n.type==='macro')){if(n.params.case==='extrusion')n.params.algorithmInput=extrusionInput(n.params);if(n.params.case==='tim')n.params.algorithmInput=timInput(n.params);}if(s.viewMode==='definition'){
      const context=createExecutionState(s,ids),run=context.runs.at(-1);executionCache.set(s.workflowId+':'+run.id,context);save();navigate(`/multiscale/workflows/${s.workflowId}/edit?executionId=${encodeURIComponent(run.id)}&autostart=1`);return;
    }
    beginExecution(s,ids);record(onlySelected?'提交所选节点及上游依赖':'运行全部未完成节点');startExecutionClock();refresh();
  }
  function connectDialog(edge){if(!graphEditable())return;const n=selected();const content=`<form class="dialog-form" data-local-form="connect"><div class="dialog-copy"><h2>连接映射</h2><p>微观建模与宏观建模可直接连接相应计算节点，也可先连接因子设计；因子设计可连接微观物性计算或宏观模拟计算。工作流必须保持有向无环。</p></div><label class="form-field"><span>上游节点</span><select name="from">${s.nodes.map(a=>`<option value="${a.id}" ${a.id===edge?.from?'selected':''}>${esc(a.name)} · ${outputOf(a)[2]}</option>`).join('')}</select></label><label class="form-field"><span>目标输入</span><select name="target">${s.nodes.flatMap(a=>inputsOf(a).map(p=>`<option value="${a.id}|${p[0]}" ${(edge?edge.to===a.id&&edge.input===p[0]:n?.id===a.id)?'selected':''}>${esc(a.name)} / ${p[1]} · ${p[2]}</option>`)).join('')}</select></label><p class="editor-form-error" role="alert"></p><div class="dialog-actions"><button class="btn" type="button" data-dialog-close>取消</button><button class="btn primary">确认映射</button></div></form>`;const d=openDialog(content);d.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);if(!f.get('target')){d.querySelector('.editor-form-error').textContent='请先添加具有输入端口的节点';return;}const [to,input]=f.get('target').split('|');const before=definitionSnapshot();const err=connect(s,f.get('from'),to,input);if(err){d.querySelector('.editor-form-error').textContent=err;return;}canvasHistory.undo.push(before);canvasHistory.redo=[];record('更新数据映射：'+input,to);d.close();refresh();};}
  function aiDialog(){const n=detailNode();if(!n||!editable(n))return;const old=n.params.seed??42;const d=openDialog(`<div class="dialog-form"><div class="dialog-copy"><h2>AI 辅助修改 · 演示</h2><p>仅展示用户确认流程，不自动生成物性或代替算法校验。</p></div><div class="ai-diff"><strong>几何随机种子</strong><dl><dt>修改前 → 修改后</dt><dd>${old} → ${Number(old)+1}</dd></dl><p>改变颗粒排布示意，相关下游输出将过期。</p></div><div class="dialog-actions"><button class="btn" data-dialog-close>取消</button><button class="btn primary" data-apply-ai>确认并应用</button></div></div>`);d.querySelector('[data-apply-ai]').onclick=()=>{const g=n;if(!editable(g))return;if(!g)return notify('请先选择 TIM 宏观模型案例');g.params.seed=Number(old)+1;g.params.distribution='随机';change(g.id,`应用 AI 演示修改：随机种子 ${old} → ${g.params.seed}`);d.close();};}
  function reportText(){const r=s.viewMode==='execution'?s.runs.find(r=>r.id===s.activeRunId):s.runs.at(-1);return `SynMatAI 仿真结果报告（原型演示）\n执行：${r?.id}\n执行：工作流本地演示\n${reportConclusion(r)}`;}
  function showResults(){const r=s.viewMode==='execution'?s.runs.find(r=>r.id===s.activeRunId):s.runs.at(-1);if(!r)return notify('尚无执行记录');save();navigate(`/multiscale/runs?workflowId=${s.workflowId}&runId=${r.id}&nodeId=${s.selected||''}`);}
  root.addEventListener('click',onClick);root.addEventListener('change',onChange);root.addEventListener('submit',onSubmit);root.addEventListener('input',onInput);root.addEventListener('keydown',onKey);
  function onClick(e){
    const taskToggle=e.target.closest('[data-workflow-task-toggle]');if(taskToggle){const id=taskToggle.dataset.workflowTaskToggle;s.expandedWorkflowTasks??=[];s.expandedWorkflowTasks=s.expandedWorkflowTasks.includes(id)?s.expandedWorkflowTasks.filter(x=>x!==id):[...s.expandedWorkflowTasks,id];q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);return;}

    const groupRetry=e.target.closest('[data-factor-retry]');if(groupRetry){if(retryExecutionTask(s,groupRetry.dataset.factorRetry)){save();startExecutionClock();refresh();}return;}

    const childTask=e.target.closest('[data-factor-task]');if(childTask){const task=(executionOf(s)||s.runs.find(r=>r.executionVersion===1))?.tasks[childTask.dataset.factorTaskParent]?.children?.find(t=>t.id===childTask.dataset.factorTask);if(!task)return;openDialog(`<div class="dialog-form"><h2>参数组 ${task.groupIndex} · 任务详情</h2><p>${esc(task.status)} · ${task.progress}%</p><h3>本组输入快照</h3><pre class="task-log">${esc(JSON.stringify({input:task.completedInput||task.input,upstreamParameters:task.parameterSnapshot},null,2))}</pre><h3>传递的因子参数</h3><pre class="task-log">${esc(JSON.stringify(task.group.values,null,2))}</pre><h3>日志</h3><pre class="task-log">${esc(task.logs.join('\n')||'尚未开始')}</pre><div class="dialog-actions"><button class="btn" data-dialog-close>关闭</button></div></div>`);return;}

    if(e.target.closest('[data-clear-factor-filter]')){delete s.factorTaskFilter;q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);return;}

    const filter=e.target.closest('[data-task-filter]');if(filter){taskFilter=filter.dataset.taskFilter;q('#execution-panel').innerHTML=renderExecutionPanel(s,taskFilter);return;}
    const taskAction=e.target.closest('[data-task-action]');if(taskAction){const id=taskAction.dataset.taskId,n=node(id),action=taskAction.dataset.taskAction,r=executionOf(s)||s.runs.find(r=>r.executionVersion===1),t=r?.tasks[id];
      if(action==='locate'){selectCanvasNode(id);canvasView?.controller.selectNode(id);canvasView?.controller.focus(id);q('.dependency-panel').scrollIntoView({behavior:'smooth',block:'center'});}
      if(action==='configure')openNodeConfiguration(n);
      if(action==='retry'){const problems=check(s).filter(i=>i.nodeId===id||!i.nodeId);if(problems.length)return notify(problems[0].reason);if(retryExecutionTask(s,id)){record('重试任务 '+n.name,id);startExecutionClock();refresh();}}
      if(action==='logs')openDialog(`<div class="dialog-form"><h2>${esc(n.name)} · 执行日志</h2><p>${esc(t?.status||'未提交')} · ${esc(r?.id||'尚无执行记录')}</p><pre class="task-log">${esc(t?.logs?.join('\n')||'任务尚未开始，暂无日志。')}</pre>${t?.reason?`<p>${esc(t.reason)}</p>`:''}<div class="dialog-actions"><button class="btn" data-dialog-close>关闭</button></div></div>`);
      return;
    }

    const pipeEdit=e.target.closest('[data-editor="edit-geometry"]');if(pipeEdit){const n=detailNode();if(!editable(n))return;const part=n?.params.modeling?.primitives.find(p=>p.id===pipeEdit.dataset.id);if(part)openPrimitive(part.type,n,{openDialog,onSave:settings=>saveGeometrySettings(n,settings)},part.id);return;}
    const modelTool=e.target.closest('[data-macro-tool]');if(modelTool){const n=detailNode();if(!n||!editable(n))return;const kind=modelTool.dataset.macroTool;if(kind==='geometry'&&n.params.case==='tim'){openModelSettings('geometry');return;}if(kind==='geometry'&&n.params.geometryKind==='pipe'){const parts=n.params.modeling.primitives.filter(p=>p.pipeSegment),d=openDialog(`<div class="dialog-form"><h2>结构尺寸</h2>${parts.sort((a,b)=>a.order-b.order).map(p=>`<button type="button" class="pipe-segment-editor" data-pipe-part="${p.id}"><strong>${esc(p.name)}</strong><span>${esc(pipeSegmentSummary(p))}</span></button>`).join('')||'<p class="macro-note">尚无管段，点击添加管段开始搭建。</p>'}${n.params.case==='extrusion'?'<button type="button" class="btn" data-add-pipe-segment>'+icon('plus')+'添加管段</button>':''}<div class="dialog-actions"><button class="btn" data-dialog-close>关闭</button></div></div>`);const add=d.querySelector('[data-add-pipe-segment]');if(add)add.onclick=()=>{d.close();openPrimitive('cylinder',n,{openDialog,pipeSegment:true,onSave:settings=>saveGeometrySettings(n,settings)});};d.querySelectorAll('[data-pipe-part]').forEach(b=>b.onclick=()=>{const part=parts.find(p=>p.id===b.dataset.pipePart);d.close();openPrimitive(part.type,n,{openDialog,onSave:settings=>saveGeometrySettings(n,settings)},part.id);});return;}if(kind==='materials')editMaterials(n);else openMacroSettings(kind,n,{openDialog,onSave:(settings,tool)=>{if(!editable(n))return;remember();n.params.modeling=settings;if(n.params.case==='tim'){Object.assign(n.params,{length:settings.length,width:settings.width,height:settings.height,mesh:settings.meshSize,hot:settings.hot,cold:settings.cold,direction:settings.hotFace[0]});}change(n.id,'更新'+({geometry:'几何',mesh:'网格',physics:'物理场与边界',study:'研究'}[tool])+'设置');notify('设置已应用');}});return;}
    const modelView=e.target.closest('[data-model-view]');if(modelView){cleanupPreview.view?.(modelView.dataset.modelView);return;}

    const pickButton=e.target.closest('[data-select-node]');if(pickButton){if(pickButton.dataset.wasDragged){delete pickButton.dataset.wasDragged;return;}if(node(pickButton.dataset.selectNode))pick(pickButton.dataset.selectNode);return;}
    const group=e.target.closest('[data-group]');if(group){s.group=group.dataset.group;save();renderDetail();return;}
    const tab=e.target.closest('[data-editor-tab]');if(tab){s.tab=tab.dataset.editorTab;save();renderDetail();return;}
    const edge=e.target.closest('[data-edge]');if(edge){connectDialog(s.edges.find(a=>a.id===edge.dataset.edge));return;}
    const ref=e.target.closest('[data-remove-reference]');if(ref){s.contextReferences=s.contextReferences.filter(id=>id!==ref.dataset.removeReference);save();renderChat();return;}
    const action=e.target.closest('[data-editor]')?.dataset.editor;if(!action)return;
    if(action==='model-settings'){if(detailNode()?.params.case==='extrusion')openModelSettings();return;}
    if(action==='all-tasks'){navigate('/tasks');return;}
    if(action==='open-task'){const id=e.target.closest('[data-run-id]')?.dataset.runId;if(id)navigate(`/multiscale/workflows/${s.workflowId}/edit?executionId=${encodeURIComponent(id)}`);return;}
    if(action==='open-definition'){navigate(`/multiscale/workflows/${s.workflowId}/edit`);return;}
    if(action==='copy-model'){onCopy?.(s);return;}
    if(action==='open-latest-task'){const r=s.runs.at(-1);if(r)navigate(`/multiscale/workflows/${s.workflowId}/edit?executionId=${encodeURIComponent(r.id)}`);return;}
    if(action==='toggle-flow-fullscreen'){toggleFlowFullscreen();return;}
    if(action==='toggle-copilot'){s.copilotCollapsed=!s.copilotCollapsed;root.classList.toggle('copilot-is-collapsed',s.copilotCollapsed);save();if(flowFullscreen)fitCanvasAfterLayout();else requestAnimationFrame(syncStageHeight);return;}
    if(action==='zoom-in')canvasView?.controller.zoomIn();if(action==='zoom-out')canvasView?.controller.zoomOut();if(action==='fit')canvasView?.controller.fit();
    if(action==='validate')validate();if(action==='run')run();if(action==='run-node'){if(e.target.closest('#editor-detail')){s.canvasSelection=[detailNode().id];s.selected=detailNode().id;}run(true);}if(action==='add')canvasView?.controller.openCreateMenu();if(action==='delete')removeCanvasNodes([detailNode()?.id]);if(action==='connect')connectDialog();if(action==='save-params')commitParams();if(action==='ai-edit')aiDialog();if(action==='retry-save')save();
    if(action==='report-fail'||action==='report-retry'){const r=s.runs.at(-1);if(r?.status!=='成功')return notify('请先完成求解演示');r.reportStatus=action==='report-fail'?'失败':'已生成';selected().status=action==='report-fail'?'失败':'成功';record(action==='report-fail'?'报告生成失败（演示）；求解成功状态保留':'重新生成演示报告');refresh();}if(action==='results')showResults();if(action==='existing')notify('打开系统已有微观模拟（原型入口）');
    if(action==='disconnect'){const id=e.target.closest('[data-id]').dataset.id,edge=s.edges.find(a=>a.id===id);if(edge){remember();s.edges=s.edges.filter(a=>a.id!==id);change(edge.to,'断开输入映射 '+edge.input);}}
    if(action==='missing'){selected().params.filler='';change(selected().id,'清空填料热导率（演示）');}
    if(action==='upstream-wait'){invalidate(s,selected().id);selected().status='等待上游';record('已有微观任务尚未完成（演示）');refresh();}
    if(action==='upstream-ready'){selected().status='成功';record('恢复已有微观结果（演示）');refresh();}
    if(action==='geometry-check'){const found=check(s).filter(i=>node(i.nodeId)?.type==='macro');notify(found.length?found[0].reason:'几何预设检查通过：颗粒保留间隙（演示）');}
    if(action==='cancel'){pauseExecution(s);clearInterval(timer);running.delete(executionKey);timer=null;record('已暂停执行，完成结果保留');refresh();}
    if(action==='fit')canvasView?.controller.fit();
    if(action==='preview-report')openDialog(`<div class="dialog-form"><h2>仿真结果报告 · 演示</h2><p class="report-preview">${esc(reportText()).replaceAll('\n','<br>')}</p><div class="dialog-actions"><button class="btn" data-dialog-close>关闭</button></div></div>`);
    if(action==='download-report'){downloadReportPdf(reportText(),s.runs.at(-1).id);}
    if(action==='copy-conclusion')navigator.clipboard.writeText(reportText()).then(()=>notify('仿真结论已复制')).catch(()=>notify('请打开报告手动复制结论'));
  }
  function onInput(e){if(e.target.matches('[data-workflow-description]')){if(s.viewMode==='execution')return;s.description=e.target.value;save();return;}if(e.target.id==='editor-chat'){s.draft=e.target.value;save();}}
  function onChange(e){
    if(e.target.matches('[data-param="inletType"],[data-param="outletType"]')){const inlet=e.target.dataset.param==='inletType';q('.thermal-properties').querySelectorAll(inlet?'[data-inlet-kind]':'[data-outlet-kind]').forEach(group=>{group.hidden=(inlet?group.dataset.inletKind:group.dataset.outletKind)!==e.target.value;group.querySelectorAll('input').forEach(input=>input.disabled=group.hidden);});return;}

    if(e.target.matches('[data-execution-scenario]')){const scenario=e.target.value;e.target.value='';if(!scenario)return;const dialog=openDialog(`<div class="dialog-form"><h2>预览${esc(scenario)}场景</h2><p>为当前任务新增一条本地演示执行记录。保留原配置和历史记录，不调用真实计算。</p><div class="dialog-actions"><button class="btn" data-dialog-close>取消</button><button class="btn primary" data-confirm-scenario>进入演示场景</button></div></div>`);dialog.querySelector('[data-confirm-scenario]').onclick=()=>{const problems=check(s);if(problems.length){issues=problems;dialog.close();refresh();notify('请先完成建模检验中的配置问题，再预览执行场景');return;}clearInterval(timer);running.delete(executionKey);timer=null;if(s.viewMode==='definition'){const context=createExecutionState(s),initial=context.runs.pop(),run=executionScenario(context,scenario);executionCache.set(s.workflowId+':'+run.id,context);save();dialog.close();navigate(`/multiscale/workflows/${s.workflowId}/edit?executionId=${encodeURIComponent(run.id)}${['全部运行','节点阻塞'].includes(scenario)?'&autostart=1':''}`);return;}executionScenario(s,scenario);record('切换演示场景：'+scenario);taskFilter='全部';dialog.close();refresh();if(['全部运行','节点阻塞'].includes(scenario))startExecutionClock();requestAnimationFrame(()=>q('.dependency-panel').scrollIntoView({behavior:'smooth',block:'start'}));};return;}
if(e.target.matches('[data-standard-view]')){cleanupPreview.view?.(e.target.value);return;}if(e.target.matches('[data-param="case"]')){const n=detailNode();if(n?.type==='macro'){if(!editable(n)||!graphEditable()){renderDetail();return;}remember();n.caseConfigurations??={};n.caseConfigurations[n.params.case]=structuredClone(n.params);n.params=structuredClone(n.caseConfigurations[e.target.value]||macroParams(e.target.value));s.group='geometry';applyMaterials(n,macroMaterials(n),'已切换应用类型',true);}return;}if(e.target.matches('[data-workflow-name]')){if(!e.target.value.trim()){e.target.value=workflowTitle(s).name;return notify('工作流名称不能为空');}s.name=e.target.value.trim();record('重命名工作流');}}
  function onSubmit(e){if(!e.target.matches('[data-editor-form]'))return;e.preventDefault();if(e.target.dataset.editorForm==='params')commitParams();else{const input=q('#editor-chat'),text=input.value.trim();if(!text)return;s.messages.push({user:true,text},{text:`当前节点：${selected()?.name||'未选择'}。${/修改|优化/.test(text)?'可使用右侧“AI 辅助修改”预览差异并确认应用。':'请使用“建模检验”验证模型与工作流配置。'}本回复为本地演示，不生成未知物性。`});s.draft='';input.value='';save();renderChat();q('#editor-conversation').scrollTop=q('#editor-conversation').scrollHeight;}}
  function onKey(e){if(e.target.matches('[data-edge]')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();connectDialog(s.edges.find(a=>a.id===e.target.dataset.edge));}}
  const progress=e=>{if(e.detail===s.workflowId){timer=running.get(executionKey)||null;refreshExecution();}};document.addEventListener('forge:run-progress',progress);
  const cleanupPanels=mountPanelWindows(root,()=>fitCanvasAfterLayout());
  const cleanupSplit=mountWorkspaceSplit(q('.model-flow-split'),()=>fitCanvasAfterLayout());
  save();refresh();fitCanvasAfterLayout();
  if(s.viewMode==='execution'&&new URLSearchParams(location.search).get('autostart')==='1'){history.replaceState({},'',location.pathname+'?executionId='+encodeURIComponent(s.activeRunId));startExecutionClock();}
  const sidebarResize=()=>fitCanvasAfterLayout();window.addEventListener('forge:sidebar-resize',sidebarResize);
  const sizeObserver=new ResizeObserver(syncStageHeight);sizeObserver.observe(q('.task-header'));sizeObserver.observe(q('#editor-run-strip'));window.addEventListener('resize',syncStageHeight);
  return ()=>{disposed=true;window.removeEventListener('forge:sidebar-resize',sidebarResize);cleanupPanels();cleanupSplit();cancelAnimationFrame(autoFitFrame);document.body.classList.remove('workflow-fullscreen-active');document.removeEventListener('keydown',escapeFullscreen);canvasView?.destroy();sizeObserver.disconnect();window.removeEventListener('resize',syncStageHeight);cleanupPreview();document.removeEventListener('forge:run-progress',progress);root.removeEventListener('click',onClick);root.removeEventListener('change',onChange);root.removeEventListener('submit',onSubmit);root.removeEventListener('input',onInput);root.removeEventListener('keydown',onKey);};
}

// A small valid PDF containing the demonstration report as a Unicode raster page.
function downloadReportPdf(text,id){
  const c=document.createElement('canvas');c.width=1240;c.height=1754;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#243044';ctx.font='28px "Microsoft YaHei", sans-serif';let y=110;for(const line of text.split('\n')){let row='';for(const ch of line){if(ctx.measureText(row+ch).width>1040){ctx.fillText(row,100,y);y+=50;row='';}row+=ch;}ctx.fillText(row,100,y);y+=65;}const image=Uint8Array.from(atob(c.toDataURL('image/jpeg',.9).split(',')[1]),ch=>ch.charCodeAt(0));const enc=new TextEncoder(),parts=[],offsets=[0];let offset=0;const push=t=>{const bytes=typeof t==='string'?enc.encode(t):t;parts.push(bytes);offset+=bytes.length;};push('%PDF-1.4\n');const object=(num,body)=>{offsets[num]=offset;push(`${num} 0 obj\n${body}\nendobj\n`);};object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');offsets[4]=offset;push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`);push(image);push('\nendstream\nendobj\n');const commands='q 595 0 0 842 0 0 cm /Im0 Do Q';object(5,`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);const xref=offset;push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);const url=URL.createObjectURL(new Blob(parts,{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=`${id}-仿真结果报告-原型演示.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
