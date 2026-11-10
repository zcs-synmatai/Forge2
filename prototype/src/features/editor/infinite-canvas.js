import {executionOf,editLockReason,structuralLock} from './execution.js';
import {FlowCanvasV2} from './canvas-runtime/canvas-view.js';
import {esc,kinds,inputsOf,outputOf} from './model.js';
import {icon} from '../../shared/icons.js';

// This is the calculation adapter for the same controller used by TaskCanvasWorkspace.
export function mountCalculationCanvas(main,agent,state,ctx){
  const byId=id=>state.nodes.find(n=>n.id===id);
  const tasks=state.nodes.map(n=>({...n,status:state.viewMode==='definition'?(state.checkedRevision===state.revision?'已检验':'待检验'):executionOf(state)?.tasks[n.id]?.status||n.status,stage:'calculation',custom:n.id.startsWith('node-')}));
  const edges=state.edges.map(e=>[e.from,e.to,`${e.output} → ${e.input} · ${e.unit}`,'dependency',{fromPort:e.fromPort,toPort:e.toPort}]);
  const glyph=n=>icon(n.type==='micro'?'molecule':n.type==='result'?'file':n.type==='macro'?'grid':'flow');
  const graphHTML=tasks.map(n=>`<div class="rf-task-node tc-node-task calculation-canvas-node${['start','end'].includes(n.type)?' calculation-terminal':''}" data-node-type="${esc(n.type)}" data-flow-task="${esc(n.id)}" data-execution-state="${esc(n.status)}" role="group" tabindex="0" aria-label="${esc(n.name)}"><div class="rf-task-node-top"><span>${esc(n.id)}</span><em>${kinds[n.type]}</em><small class="calculation-status" data-status="${esc(n.status)}">${n.status==='已过期'?'待更新':esc(n.status)}</small></div><strong class="tc-task-title" title="${esc(n.name)}">${glyph(n)}<span>${esc(n.name)}</span></strong><div class="tc-work-meta"><span class="rf-task-owner">${esc(n.params.materialRef?.name?n.params.materialRef.name+' · '+outputOf(n)[1]:outputOf(n)[1])}</span><span class="rf-task-scope">${esc(outputOf(n)[2])}</span></div><button type="button" class="tc-node-chat" data-node-chat="${esc(n.id)}" aria-label="引用 ${esc(n.name)} 到 Copilot" title="引用此节点到对话">${icon('chat')}</button><span class="rf-task-output"></span></div>`).join('');
  const initialPositions=Object.fromEntries(state.nodes.map(n=>[n.id,state.embeddedCanvasPositions?.[n.id]||{x:n.x,y:n.y}]));

  let controller,config;
  const updateConfig=ids=>{if(config){config.style.display=ids.length&&byId(ids.at(-1))?.type!=='macro'?'':'none';config.textContent=ids.length&&editLockReason(state,ids.at(-1))?'查看配置':'打开配置';}};
  controller=FlowCanvasV2.mount(main,{
    key:`calculation-model-first-v6/${state.workflowId}`,markerId:'calculation-canvas-arrow',ariaLabel:'计算工作流无限画布',constrainWheelPan:true,
    initialPositions,agent:agent||main,embedded:true,onViewChange:ctx.view,workArea:()=>({x:16,y:14,width:Math.max(160,main.clientWidth-32),height:Math.max(160,main.clientHeight-84)}),agentCollapsed:false,fixedPanelsWidth:18,phase:'calculation',stage:{id:'计算工作流',title:'节点编排与参数依赖'},
    tasks,edges,graphHTML,nodeTooltip:false,readOnly:structuralLock(state),allowDeleteEdge:!structuralLock(state),canStartLink:()=>!structuralLock(state),nodeLocked:id=>!!editLockReason(state,id),
    selected:null,focusId:state.selected,focusOnMount:true,fitOnMount:!!state.blankWorkflowInitialized&&!Object.keys(state.embeddedCanvasPositions||{}).length,
    canUndo:ctx.canUndo(),canRedo:ctx.canRedo(),outputLabel:id=>byId(id)?.type==='macro'?'在上方建模窗口编辑':'双击打开节点配置',
    nodeInfo:id=>{const n=byId(id);return {id:n.id,name:n.name,owner:`${kinds[n.type]} · 定义 v${n.version}`,status:n.status,condition:n.type==='macro'?'单击选中；在上方宏观建模窗口编辑。选中后拖动卡片，或使用右上角拖动柄。仅支持相邻阶段正向连线。':'单击选中；双击打开节点配置；选中后拖动卡片，或使用右上角拖动柄。仅支持相邻阶段正向连线。',deliverables:[{name:`${outputOf(n)[1]} · ${outputOf(n)[2]}`,available:n.status==='成功'}]};},
    edgeInfo:index=>{const e=state.edges[index];return {from:byId(e.from).name,to:byId(e.to).name,deliverables:[{name:`${e.output} → ${e.input}\n阶段关系：${kinds[byId(e.from).type]} → ${kinds[byId(e.to).type]}\n来源 v${byId(e.from).version} · ${state.runs.at(-1)?.id||'当前定义'}`,available:byId(e.from).status==='成功'}]};},
    onSelectionChange:ids=>{updateConfig(ids);state.canvasSelection=ids;if(ids.length)ctx.select(ids.at(-1),false);},
    onOpenNode:id=>ctx.select(id,true),onEdge:index=>ctx.editEdge(state.edges[index]),onDeleteEdge:index=>ctx.deleteEdge(state.edges[index]),
    onConnect:(from,to,fromPort,toPort)=>ctx.connect(from,to,fromPort,toPort),
    onAddToChat:ids=>ctx.context(ids),onCreateFromSelection:ids=>controller.openCreateMenu(ids),
    onCreateNode:(type,point,ids)=>ctx.create(type,point,ids),
    onCreateFromPort:(source,point,type)=>ctx.create(type,point,[source.id],source.side),
    onDeleteSelection:ids=>ctx.remove(ids),
    onInfo:()=>ctx.info('单击选择，双击配置；V/H 切换指针/抓手。滚轮平移，Ctrl/⌘+滚轮缩放，Shift+滚轮横移，空格或中键拖动画布。端口支持拖线及 Enter 键连接；Shift+Enter 从端口创建下游。'),
    onDraw:rects=>{state.embeddedCanvasPositions=Object.fromEntries(Object.entries(rects).map(([id,r])=>[id,{x:r.x,y:r.y}]));},
  });

  // Reuse the task workbench's node-type menu; only replace its business types.
  main.querySelector('.fc-create-menu').setAttribute('aria-label','选择节点类型');
  main.querySelector('.fc-create-menu').innerHTML='<strong>添加计算节点</strong>'+Object.entries(kinds).map(([id,name])=>`<button role="menuitem" data-create-type="${id}">${icon(id==='micro'?'molecule':id==='macro'?'grid':id==='result'?'file':'flow')}<span>${name}</span></button>`).join('');
  main.querySelector('[data-rf-editor="add"]').onclick=()=>controller.openCreateMenu();
  main.querySelector('[data-rf-editor="undo"]').onclick=()=>ctx.undo(false);
  main.querySelector('[data-rf-editor="redo"]').onclick=()=>ctx.undo(true);
  main.querySelector('[data-selection-new]').textContent='新建节点';
  main.querySelector('[data-fc-info]').title='画布操作说明';
  main.querySelector('[data-fc-current]').textContent='当前节点';
  main.querySelector('[data-fc-current]').disabled=!state.selected;
  main.querySelector('[data-fc-layout]').disabled=!state.nodes.length;
  main.querySelector('[data-fc-current]').onclick=()=>controller.focus(state.selected);
  config=document.createElement('button');config.className='calculation-open-config';config.type='button';config.textContent='打开配置';config.onclick=()=>{const id=controller.selectedNodeIds().at(-1);if(id)ctx.select(id,true);};main.querySelector('.fc-selection-bar [data-selection-chat]').before(config);main.querySelector('[data-selection-chat]').style.display='none';updateConfig(controller.selectedNodeIds());
  main.querySelectorAll('.fc-node').forEach(card=>{
    card.draggable=!!agent;
    card.onkeydown=e=>{if(e.target===card&&e.key==='Enter'){e.preventDefault();ctx.select(card.dataset.flowTask,true);}if(e.target===card&&e.shiftKey&&e.key==='F10'){e.preventDefault();ctx.select(card.dataset.flowTask,true);}};
    card.oncontextmenu=e=>{e.preventDefault();if(!e.target.closest('.fc-node-operations,.fc-port,.fc-drag-handle'))ctx.select(card.dataset.flowTask,true);};
    card.querySelector('[data-node-chat]').style.display='none';card.querySelector('[data-node-chat]').onclick=()=>ctx.context([card.dataset.flowTask]);
    // The task canvas distinguishes selected layout drag from unselected context drag.
    card.ondragstart=e=>e.preventDefault();
    card.addEventListener('pointerdown',e=>{
      if(!agent)return;if(e.button!==0||card.dataset.selected==='true'||e.target.closest('button,input,select,textarea'))return;
      e.preventDefault();e.stopPropagation();const start={x:e.clientX,y:e.clientY};let moved=false,ghost;
      card.setPointerCapture(e.pointerId);const composer=agent.querySelector('.copilot-composer');
      const hit=event=>{const r=composer.getBoundingClientRect();return event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;};
      const move=event=>{if(!moved&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>6){moved=true;ghost=document.createElement('div');ghost.className='tc-file-drag-ghost';ghost.textContent=byId(card.dataset.flowTask).name;document.body.append(ghost);}if(ghost){ghost.style.left=(event.clientX+14)+'px';ghost.style.top=(event.clientY+12)+'px';}composer.classList.toggle('is-context-drop-target',moved&&hit(event));};
      const finish=event=>{const accept=moved&&hit(event);ghost?.remove();composer.classList.remove('is-context-drop-target');card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',finish);card.removeEventListener('pointercancel',cancel);if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);if(moved)card.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();},{capture:true,once:true});if(accept)ctx.context([card.dataset.flowTask]);};
      const cancel=()=>finish({clientX:-1,clientY:-1});card.addEventListener('pointermove',move);card.addEventListener('pointerup',finish);card.addEventListener('pointercancel',cancel);
    });
  });
  main.addEventListener('keydown',key);function key(e){if(e.target.closest('input,textarea,select,[contenteditable]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();ctx.undo(e.shiftKey);}else if((e.key==='Delete'||e.key==='Backspace')&&!e.target.closest('[data-canvas-edge]')){const ids=controller.selectedNodeIds();if(ids.length){e.preventDefault();ctx.remove(ids);}}}
  const palette=document.createElement('aside');palette.className='tc-agent-palette calculation-palette';palette.setAttribute('aria-label','计算节点快捷创建');palette.innerHTML='<small>计算节点</small>'+[['start','开始'],['micro','微观建模'],['microCompute','物性计算'],['macro','宏观建模'],['schedule','调度'],['result','结果'],['end','结束']].map(([id,label])=>`<button type="button" data-calc-create="${id}" aria-label="创建${kinds[id]}" title="拖到画布创建，点击也可创建">${icon(id==='micro'?'molecule':id==='macro'?'grid':id==='result'?'file':'flow')}<span>${label}</span></button>`).join('');main.append(palette);
  palette.querySelectorAll('button').forEach(b=>{let suppress=false;b.onclick=()=>{if(suppress){suppress=false;return;}ctx.create(b.dataset.calcCreate,controller.creationPoint(),[]);};b.onpointerdown=e=>{if(e.button!==0)return;const start={x:e.clientX,y:e.clientY};let dragging=false,ghost; b.setPointerCapture(e.pointerId);const move=event=>{if(!dragging&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>6){dragging=true;ghost=document.createElement('div');ghost.className='tc-file-drag-ghost';ghost.textContent=kinds[b.dataset.calcCreate];document.body.append(ghost);}if(ghost){ghost.style.left=event.clientX+14+'px';ghost.style.top=event.clientY+12+'px';}};const end=event=>{const hit=document.elementFromPoint(event.clientX,event.clientY),valid=dragging&&hit?.closest('.fc-viewport')&&!hit.closest('.fc-node,.fc-agent'),point=controller.worldPosition(event.clientX,event.clientY);ghost?.remove();b.removeEventListener('pointermove',move);b.removeEventListener('pointerup',end);b.removeEventListener('pointercancel',cancel);if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);suppress=dragging;if(valid)ctx.create(b.dataset.calcCreate,point,[],null,true);};const cancel=()=>end({clientX:-1,clientY:-1});b.addEventListener('pointermove',move);b.addEventListener('pointerup',end);b.addEventListener('pointercancel',cancel);};});
  if(!state.nodes.length){const empty=document.createElement('div');empty.className='calculation-empty';empty.innerHTML=`${icon('flow')}<strong>添加第一个计算节点</strong><span>点击添加计算节点或底部 ＋ 开始编排</span>`;main.querySelector('.fc-viewport').append(empty);}
  const openNode=e=>{const card=e.target.closest('.fc-node');if(!card||e.target.closest('.fc-port,.fc-drag-handle,input,select,textarea'))return;e.preventDefault();e.stopImmediatePropagation();ctx.select(card.dataset.flowTask,true);};
  main.addEventListener('dblclick',openNode,true);
  return {controller,destroy(){main.removeEventListener('dblclick',openNode,true);main.removeEventListener('keydown',key);controller.destroy();}};
}

