import {createEditor,macroParams} from '../editor/model.js';
import {createMolecule} from '../editor/molecule.js';

export const physicalKey=id=>`forge-physical-model-v2:${id}`;
export const materialRoute=(workflowId,materialId)=>`/multiscale/workflows/${encodeURIComponent(workflowId)}/edit/materials/${encodeURIComponent(materialId)}`;
const cache=new Map();
export function createPhysicalModel(workflow,legacy){
  const source=legacy||createEditor(workflow),macro=source.nodes?.find(n=>n.type==='macro'||n.type==='tim'||n.type==='flow'),micro=source.nodes?.find(n=>n.type==='micro');
  const caseType=macro?.params.case||(['tim','flow'].includes(macro?.type)?macro.type:workflow.type==='流动'?'flow':workflow.type==='TIM 导热'?'tim':'generic');
  const params={...macroParams(caseType),...source.nodes?.find(n=>n.type==='geometry')?.params,...macro?.params};
  const material=(id,name,region,conductivity,density='',molecule=null)=>({id,name,region,conductivity,density,molecule,source:'本地原型示例',task:micro?.params.task||'',notes:''});
  const materials=caseType==='tim'?[material('matrix','基体材料','基体区域',params.matrix,'',structuredClone(micro?.params.molecule||createMolecule())),material('filler','填料材料','颗粒区域',params.filler)]:caseType==='flow'?[material('fluid','流体材料','流体域','',params.density,structuredClone(micro?.params.molecule||createMolecule()))]:[];
  return {version:2,workflowId:workflow.id,name:workflow.name,case:caseType,geometry:params,materials,selectedMaterial:materials[0]?.id||null,section:'geometry',physics:caseType==='tim'?'三维稳态导热':caseType==='flow'?'圆管流动':'待配置',revision:1,checkedRevision:null,history:[],scheduler:{cores:4,retries:0}};
}
export function loadPhysicalModel(workflow){
  if(cache.has(workflow.id))return cache.get(workflow.id);let model;
  try{const saved=JSON.parse(localStorage.getItem(physicalKey(workflow.id)));if(saved?.version===2&&saved.workflowId===workflow.id)model=saved;}catch{}
  if(!model){let legacy;try{legacy=JSON.parse(localStorage.getItem(`forge-editor-v1:${workflow.id}`));}catch{}model=createPhysicalModel(workflow,legacy);}
  cache.set(workflow.id,model);return model;
}
export function savePhysicalModel(model){localStorage.setItem(physicalKey(model.workflowId),JSON.stringify(model));}
export function touchModel(model,text){model.revision++;model.checkedRevision=null;model.history.unshift({text,time:new Date().toISOString()});}
export function checkPhysicalModel(model){
  const errors=[];if(model.case==='generic')errors.push('请先创建几何并选择物理模型');
  for(const key of model.case==='flow'?['length','diameter']:['length','width','height'])if(!(Number(model.geometry[key])>0))errors.push('几何尺寸必须大于零');
  if(!model.materials.length)errors.push('请为模型添加材料');
  for(const m of model.materials){if(!m.name.trim())errors.push('材料名称不能为空');if(m.region==='未分配')errors.push(m.name+'：请绑定模型区域');if(model.case==='tim'&&!(Number(m.conductivity)>0))errors.push(m.name+'：请填写有效热导率');if(m.density!==''&&!(Number(m.density)>0))errors.push(m.name+'：密度必须大于零');}
  if(model.case==='tim'&&!(Number(model.geometry.hot)>Number(model.geometry.cold)))errors.push('热端温度须高于冷端温度');
  return errors;
}
export function updateMaterial(model,id,values){const material=model.materials.find(m=>m.id===id);if(!material)throw Error('材料不存在');Object.assign(material,values);touchModel(model,'更新材料：'+material.name);return material;}
