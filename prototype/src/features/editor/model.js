import {materialPropertyIssues} from './material-properties.js';
import {extrusionIssues} from './algorithm-inputs.js';
import {validatePrimitive} from './primitives.js';
import {pipeApplication} from './application-models.js';
import {hasCompositeGeometry,validateMaterials,validateMacroSettings} from './macro-state.js';
import {createMolecule,validateMolecule} from './molecule.js';
export const esc = (value = "") => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const kinds={start:'开始',micro:'微观建模',microCompute:'微观物性计算',macro:'宏观建模',schedule:'计算调度',result:'结果呈现',end:'结束'};
export const stages=Object.keys(kinds);
export function reportConclusion(r){const nodes=r?.snapshot.nodes||[];if(nodes.some(n=>n.type==='flow'||n.params?.case==='flow'))return '简单圆管流动示例已完成，参数与边界见执行快照；未连接真实算法。';if(nodes.some(n=>n.type==='tim'||n.params?.case==='tim'))return 'TIM 内置演示样本：有效热导率 2.46 W/(m·K)，实际填充率 18.7%，仅对应 300 K 基体物性与 Z 向稳态导热工况；不由当前修改参数推算。';return '通用工作流演示完成。模型和调度配置见执行快照，未接入真实算法，不生成物理计算指标。';}
export const timeNow=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date());
export function macroParams(caseType='generic'){
  const common={case:caseType,modelName:'通用宏观模型',description:''};
  if(caseType==='tim')return {...common,modelName:'颗粒填充 TIM',length:10,width:10,height:10,timCubeDefaultVersion:1,particle:'球形',distribution:'均一',seed:42,target:20,gap:.1,mesh:.2,matrix:.24,filler:30,resistance:.000001,direction:'Z',hot:80,cold:20,source:'引用上游'};
  if(caseType==='extrusion')return {...common,...pipeApplication('extrusion')};
  if(caseType==='blank')return {...common,case:'generic',modelName:'未命名物理模型',blankGeometry:true,materials:[]};
  if(caseType==='flow')return {...common,...pipeApplication('flow'),modelName:'简单圆管流动',length:100,diameter:10,density:1200,model:'已有任务模型（待接口确认）',consistency:.8,exponent:.65,temperature:298,inlet:.1,outlet:0};
  return common;
}
export function makeNode(type,id=type){
  if(!kinds[type])throw new Error('未知节点类型：'+type);
  return {id,type,name:kinds[type],status:'待校验',version:1,x:10+stages.indexOf(type)*235,y:85,params:type==='micro'?{molecule:createMolecule()}:type==='microCompute'?{property:'thermal_conductivity',temperature:300,steps:10000,task:'md-epoxy-021',field:'thermal_conductivity',method:'已有标量结果'}:type==='macro'?macroParams():type==='schedule'?{strategy:'按依赖执行',resource:'本地演示',cores:4,retries:0}:{format:'PDF',presentation:'报告与文本结论'}};
}
export function outputOf(n){return {start:['start','开始','—'],micro:['structure','分子结构','—'],microCompute:['microData','物性计算结果','—'],macro:['model','宏观模型','—'],schedule:['execution','计算结果','—'],result:['artifact','展示与报告','—'],end:['complete','完成','—']}[n.type];}
export function inputsOf(n){return {start:[],micro:[['start','开始','—']],microCompute:[['structure','分子结构','—']],macro:[['microData','微观模拟数据','—']],schedule:[['model','宏观模型','—']],result:[['execution','计算结果','—']],end:[['artifact','展示与报告','—']]}[n.type]||[];}
export function connectionError(a,b){
  if(!a||!b)return '连接节点不存在';
  if(a.id===b.id)return '不能连接节点自身';
  const next=stages[stages.indexOf(a.type)+1];
  if(!next)return '结束节点不能连接下游';
  if(b.type!==next)return kinds[a.type]+'只能连接至'+kinds[next]+'；不支持反向、同阶段或跨阶段连接';
  return null;
}
export function connect(state,from,to,input){
  const a=state.nodes.find(n=>n.id===from),b=state.nodes.find(n=>n.id===to),error=connectionError(a,b);
  if(error)return error;
  const port=inputsOf(b)[0];if(input&&input!==port[0])return '目标输入不属于当前阶段';
  const visited=new Set(),reaches=id=>{if(id===from)return true;if(visited.has(id))return false;visited.add(id);return state.edges.filter(e=>e.from===id).some(e=>reaches(e.to));};
  if(reaches(to))return '连接将形成循环依赖';
  state.edges=state.edges.filter(e=>!(e.from===from&&e.to===to));
  state.edges.push({id:from+'-'+to+'-'+port[0],from,to,input:port[0],output:outputOf(a)[0],unit:'—',factor:1});
  invalidate(state,to);return null;
}
export function createEditor(workflow){
  const blank=workflow.applicationType==='blank'||workflow.nodeCount===0,caseType=workflow.applicationType|| (workflow.type==='挤出模拟'?'extrusion':workflow.type==='流动'?'flow':workflow.type==='TIM 导热'?'tim':'generic');
  const nodes=stages.map(t=>makeNode(t));nodes.find(n=>n.type==='macro').params=macroParams(caseType);
  const s={schemaVersion:5,layoutVersion:5,workflowId:workflow.id,name:workflow.name,description:workflow.description||'',applicationType:caseType,nodes,edges:[],selected:blank?null:'macro',group:'geometry',tab:'model',history:[],messages:[],draft:'',runs:[],revision:1,checkedRevision:1,definition:workflow.definitionStatus};
  for(let i=0;i<nodes.length-1;i++)connect(s,nodes[i].id,nodes[i+1].id);
  s.nodes.forEach(n=>n.status=workflow.definitionStatus==='可运行'?'成功':'待校验');
  if(workflow.id==='wf-flow-002')nodes.find(n=>n.type==='macro').params.outlet='';
  if(workflow.definitionStatus==='需更新')nodes.filter(n=>n.type!=='micro').forEach(n=>n.status='已过期');
  if(workflow.latestRun)s.runs.push({id:workflow.latestRun.id,status:workflow.latestRun.status,time:workflow.latestRun.time,progress:workflow.latestRun.status==='运行中'?80:100,reportStatus:workflow.latestRun.status==='成功'?'已生成':'等待上游',snapshot:structuredClone({nodes:s.nodes,edges:s.edges,revision:s.revision}),solver:'原型调度演示',demo:true});
  s.definition=workflow.definitionStatus;s.checkedRevision=s.definition==='可运行'?s.revision:null;if(blank)initializeBlankWorkflow(s);return s;
}
// Blank tasks retain the editing tools and a connected, unconfigured workflow scaffold.
export function initializeBlankWorkflow(s){
  if(s.blankWorkflowInitialized)return s;
  s.blankWorkflowInitialized=true;
  if(!s.nodes.length){s.nodes=stages.map(t=>makeNode(t));s.edges=[];for(let i=0;i<s.nodes.length-1;i++)connect(s,s.nodes[i].id,s.nodes[i+1].id);}
  const macro=s.nodes.find(n=>n.type==='macro');
  if(macro)macro.params={...macroParams('blank'),modelName:'未命名物理模型',blankGeometry:true,materials:[]};
  for(const n of s.nodes){n.status='待校验';if(n.type==='micro'){n.params.molecule={...createMolecule(),atoms:[],bonds:[]};}if(n.type==='microCompute')n.params.task='';}
  s.nodes.forEach((n,i)=>{n.x=20+i*300;n.y=85;});for(const edge of s.edges){edge.fromPort='right';edge.toPort='left';}
  s.selected=macro?.id||null;s.definition='草稿';s.checkedRevision=null;s.embeddedCanvasPositions={};s.canvasSelection=[];
  return s;
}
export function migrateEditor(s){
  if(s.schemaVersion>=3)return ensureWorkflowTerminals(splitMicroscopicNodes(s));
  s.legacyDefinition??=structuredClone({nodes:s.nodes,edges:s.edges,history:s.history,selected:s.selected,revision:s.revision});
  const old=s.nodes,edges=s.edges;
  const retained=old.filter(n=>['micro','tim','flow','report'].includes(n.type)).map(n=>{
    if(n.type==='micro')return {...n,type:'micro',params:{...n.params,...old.find(a=>a.type==='extract')?.params}};
    if(n.type==='report')return {...n,type:'result',name:'结果呈现',params:makeNode('result').params};
    return {...n,type:'macro',name:'宏观建模',params:{...macroParams(n.type),...(n.type==='tim'?old.find(a=>a.type==='geometry')?.params:{}),...n.params,case:n.type,binding:old.find(a=>a.type==='mapping')?.params}};
  });
  if(!retained.some(n=>n.type==='macro')&&old.some(n=>['geometry','mapping','extract'].includes(n.type)))retained.push(makeNode('macro'));
  const macros=retained.filter(n=>n.type==='macro');
  for(const n of macros){const scheduler=makeNode('schedule','schedule-'+n.id);scheduler.status='待校验';retained.push(scheduler);}
  s.nodes=retained;s.edges=[];
  const hadPath=(from,to,seen=new Set())=>{if(from===to)return true;if(seen.has(from))return false;seen.add(from);return edges.filter(e=>e.from===from).some(e=>hadPath(e.to,to,seen));};
  for(const n of macros){
    for(const micro of retained.filter(a=>a.type==='micro'))if(hadPath(micro.id,n.id)||macros.length===1)s.edges.push({from:micro.id,to:n.id,input:'microData',factor:1});
    const scheduler=retained.find(a=>a.id==='schedule-'+n.id);connect(s,n.id,scheduler.id);
    for(const result of retained.filter(a=>a.type==='result'))if(hadPath(n.id,result.id)||macros.length===1)connect(s,scheduler.id,result.id);
  }
  retained.forEach((n,i)=>{n.x=10+stages.indexOf(n.type)*235;n.y=30+retained.slice(0,i).filter(a=>a.type===n.type).length*155;});
  s.schemaVersion=3;s.layoutVersion=3;s.embeddedCanvasPositions={};s.canvasSelection=[];
  s.selected=retained.some(n=>n.id===s.selected)?s.selected:macros[0]?.id||retained[0]?.id||null;
  s.contextReferences=(s.contextReferences||[]).filter(id=>retained.some(n=>n.id===id));
  s.checkedRevision=null;s.definition='需更新';
  s.history.unshift({id:s.selected,text:'迁移为微观模拟、宏观建模、计算调度、结果呈现四阶段；原定义与历史快照保留',time:timeNow()});
  return ensureWorkflowTerminals(splitMicroscopicNodes(s));
}
export function splitMicroscopicNodes(s){
  if(s.schemaVersion>=4)return s;
  for(const micro of s.nodes.filter(n=>n.type==='micro')){
    const outgoing=s.edges.filter(e=>e.from===micro.id&&s.nodes.find(n=>n.id===e.to)?.type==='macro');
    if(!outgoing.length)continue;
    let id=micro.id+'-compute',suffix=1;while(s.nodes.some(n=>n.id===id))id=micro.id+'-compute-'+suffix++;
    const calc=makeNode('microCompute',id);calc.params={...calc.params,...structuredClone(micro.params)};delete calc.params.molecule;calc.status=micro.status;
    calc.x=micro.x+235;calc.y=micro.y;s.nodes.push(calc);
    s.edges=s.edges.filter(e=>!outgoing.includes(e));
    connect(s,micro.id,calc.id);for(const edge of outgoing){connect(s,calc.id,edge.to);const next=s.edges.find(e=>e.from===calc.id&&e.to===edge.to);Object.assign(next,{factor:edge.factor??1,fromPort:edge.fromPort,toPort:edge.toPort});}
    for(const key of ['task','field','method'])delete micro.params[key];
  }
  s.schemaVersion=4;s.layoutVersion=4;s.embeddedCanvasPositions={};s.canvasSelection=[];
  s.nodes.forEach((n,i)=>{n.x=10+stages.indexOf(n.type)*235;n.y=30+s.nodes.slice(0,i).filter(a=>a.type===n.type).length*155;});
  return s;
}
export function ensureWorkflowTerminals(s){
  if(s.schemaVersion>=5)return s;
  if(s.nodes.length){
    const start=s.nodes.find(n=>n.type==='start')||makeNode('start','workflow-start');
    const end=s.nodes.find(n=>n.type==='end')||makeNode('end','workflow-end');
    if(!s.nodes.includes(start))s.nodes.unshift(start);if(!s.nodes.includes(end))s.nodes.push(end);
    for(const model of s.nodes.filter(n=>n.type==='micro'))if(!s.edges.some(e=>e.from===start.id&&e.to===model.id))connect(s,start.id,model.id);
    for(const result of s.nodes.filter(n=>n.type==='result'))if(!s.edges.some(e=>e.from===result.id&&e.to===end.id))connect(s,result.id,end.id);
    s.embeddedCanvasPositions={};s.nodes.forEach((n,i)=>{n.x=10+stages.indexOf(n.type)*235;n.y=30+s.nodes.slice(0,i).filter(a=>a.type===n.type).length*155;});
  }
  s.schemaVersion=5;s.layoutVersion=5;return s;
}
export function invalidate(s,id){const visited=new Set();const visit=key=>{if(visited.has(key))return;visited.add(key);const n=s.nodes.find(n=>n.id===key);if(n)n.status='已过期';s.edges.filter(e=>e.from===key).forEach(e=>visit(e.to));};visit(id);s.revision++;s.definition='需更新';}
export function check(s){
  const issues=[],add=(n,field,reason)=>issues.push({nodeId:n.id,name:n.name,field,reason});
  if(!s.nodes.length)return [{nodeId:null,name:'工作流',field:'节点',reason:'请添加第一个计算节点'}];
  for(const terminal of ['start','end'])if(s.nodes.filter(n=>n.type===terminal).length>1)issues.push({nodeId:null,name:'工作流',field:kinds[terminal],reason:'只能保留一个'+kinds[terminal]+'节点'});
  for(const type of stages)if(!s.nodes.some(n=>n.type===type))issues.push({nodeId:null,name:'工作流',field:kinds[type],reason:'缺少'+kinds[type]+'阶段节点'});
  for(const n of s.nodes){
    if(!kinds[n.type]){add(n,'节点类型','不支持的节点类型');continue;}
    for(const input of inputsOf(n))if(!s.edges.some(e=>e.to===n.id&&e.input===input[0]))add(n,input[1],'缺少前一阶段的输入连接');
    const p=n.params;
    if(n.type==='micro'&&p.molecule){const error=validateMolecule(p.molecule);if(error)add(n,'分子结构',error);}
    if(n.type==='microCompute'&&!p.materialProperties&&!p.task)add(n,'微观任务','请选择已有微观模拟任务');
    if(n.type==='microCompute'&&n.status==='等待上游'&&s.viewMode!=='definition'&&s.runs.at(-1)?.executionVersion!==1)add(n,'已有任务','上游微观模拟尚未完成');
    if(n.type==='microCompute'&&p.materialProperties){for(const [field,reason]of materialPropertyIssues({propertyConfigs:p.materialProperties},p.materialAlgorithm))add(n,field,reason);}
    if(n.type==='microCompute'&&!p.materialProperties){
      if(!['thermal_conductivity','density','viscosity','elastic_modulus'].includes(p.property))add(n,'物性','请选择支持的计算物性');
      if(!(Number(p.temperature)>0))add(n,'计算温度','必须大于零');
      if(!Number.isInteger(Number(p.steps))||p.steps<1)add(n,'计算步数','请输入正整数');
    }
    if(n.type==='macro'){
      if(p.case==='extrusion')for(const [field,reason]of extrusionIssues(p))add(n,field,reason);
      for(const part of p.modeling?.primitives||[]){const error=validatePrimitive(part);if(error)add(n,part.name,error);}
      if(!hasCompositeGeometry(n)&&!p.modeling?.primitives?.length)add(n,'几何模型','请使用建模工具创建几何体');
      if(p.materials){const error=validateMaterials(p.materials);if(error)add(n,'材料分配',error);}
      if(p.modeling){const error=validateMacroSettings(p.modeling);if(error)add(n,'建模设置',error);}
      if(!p.modelName?.trim())add(n,'模型名称','请填写宏观模型名称');
      if(p.case==='tim'){
        for(const k of ['length','width','height','gap','mesh'])if(!(Number(p[k])>0))add(n,k,'必须大于 0');
        if(Number(p.gap)*2>=Math.min(p.length,p.width,p.height))add(n,'最小间隙','间隙超出基体可用尺寸');
        if(p.target<=0||p.target>35)add(n,'目标填充率','当前 TIM 演示预设支持 0–35%');
        for(const k of ['matrix','filler'])if(!(Number(p[k])>0))add(n,k==='filler'?'填料热导率':'基体热导率','缺少有效热导率');
        if(p.resistance===''||Number(p.resistance)<0)add(n,'界面热阻','必须填写非负值');
        if(p.hot===''||p.cold===''||!(Number(p.hot)>Number(p.cold)))add(n,'边界温度','热端温度须高于冷端温度');
      }
      if(p.case==='flow'){
        for(const k of ['length','diameter','density','consistency','inlet'])if(!(Number(p[k])>0))add(n,k,'必须填写大于零的参数');
        if(p.outlet==='')add(n,'出口面','出口面未绑定');
      }
    }
    if(n.type==='schedule'){
      if(!Number.isInteger(Number(p.cores))||p.cores<1)add(n,'并行核数','请输入正整数');
      if(!Number.isInteger(Number(p.retries))||p.retries<0)add(n,'失败重试','请输入非负整数');
    }
  }
  for(const e of s.edges){const a=s.nodes.find(n=>n.id===e.from),b=s.nodes.find(n=>n.id===e.to);const err=connectionError(a,b);if(err||!inputsOf(b).some(p=>p[0]===e.input))issues.push({nodeId:e.to,name:b?.name||'连接',field:'连线方向',reason:err||'目标阶段输入无效'});}
  const traverse=(ids,reverse=false)=>{const seen=new Set(ids),pending=[...ids];while(pending.length){const id=pending.pop();for(const e of s.edges)if((reverse?e.to:e.from)===id){const next=reverse?e.from:e.to;if(!seen.has(next)){seen.add(next);pending.push(next);}}}return seen;};
  const reachable=traverse(s.nodes.filter(n=>n.type==='start').map(n=>n.id)),finishes=traverse(s.nodes.filter(n=>n.type==='end').map(n=>n.id),true);
  for(const n of s.nodes){if(!reachable.has(n.id))add(n,'开始路径','节点未连接到开始节点');if(!finishes.has(n.id))add(n,'结束路径','节点无法到达结束节点');}
  try{orderNodes(s);}catch{issues.push({nodeId:null,name:'工作流',field:'依赖',reason:'存在循环或无效依赖'});}
  return issues;
}
export function orderNodes(s){const result=[],pending=[...s.nodes];while(pending.length){const ready=pending.filter(n=>s.edges.filter(e=>e.to===n.id).every(e=>result.some(a=>a.id===e.from)));if(!ready.length)throw new Error('存在循环或无效依赖');result.push(...ready);for(const n of ready)pending.splice(pending.indexOf(n),1);}return result;}
export function canRunNode(s,n){if(s.viewMode==='definition')return !!n&&s.checkedRevision===s.revision&&!check(s).length;return !!n&&s.checkedRevision===s.revision&&!check(s).some(i=>i.nodeId===n.id||!i.nodeId)&&s.edges.filter(e=>e.to===n.id).every(e=>s.nodes.find(a=>a.id===e.from)?.status==='成功');}
