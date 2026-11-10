import {esc} from './model.js';

export const propertyOptions=['tg','tc','CTE'];
const algorithmProperties={
 extrusion:[['density','密度','kg/m³'],['viscosity','黏度','Pa·s'],['conductivity','热导率','W/(m·K)'],['specificHeat','比热','J/(kg·K)']],
 tim:[['conductivity','热导率','W/(m·K)']]
};
export const materialPropertyOptions=algorithm=>algorithmProperties[algorithm]||propertyOptions.map(key=>[key,key,'']);
export function prepareMaterialProperties(structure,n){
 const entries=materialPropertyOptions(n.params.case);
 if(!entries.some(([key])=>key===structure.keyProperty))structure.keyProperty=entries[0][0];
 structure.propertyConfigs??={};
 for(const [key]of entries){const config=structure.propertyConfigs[key];if(config?.manual?.value!==undefined)continue;
  const value=n.params.case==='extrusion'?n.params[key]:key==='conductivity'?(structure.region==='matrix'?n.params.matrix:structure.conductivity):undefined;
  if(value!==undefined){structure.propertyConfigs[key]??={method:'MD',MD:{},DFT:{},manual:{}};structure.propertyConfigs[key].manual??={};structure.propertyConfigs[key].manual.value=value;}
 }
 const selected=structure.keyProperty;for(const [key]of entries){structure.keyProperty=key;structureProperty(structure);}structure.keyProperty=selected;
}
export function materialPropertyIssues(structure,algorithm){
 const issues=[];
 for(const [key,label]of materialPropertyOptions(algorithm)){
  const c=structure.propertyConfigs?.[key];if(!c)continue;
  const add=message=>issues.push([label,message]);
  const positive=(value,integer=false)=>value!==''&&value!==undefined&&Number.isFinite(Number(value))&&Number(value)>0&&(!integer||Number.isInteger(Number(value)));
  if(c.method==='manual'){if(!positive(c.manual?.value))add('请输入大于零的有效参数值');}
  else if(c.method==='MD'){const v=c.MD||{};if(!positive(v.chains,true))add('计算链数须为正整数');if(v.advanced){if(![v.start,v.end,v.equilibrium].every(x=>positive(x))||Number(v.end)<=Number(v.start))add('温度须大于零，结束温度须高于开始温度');if(!positive(v.frames,true)||!positive(v.interval,true))add('帧与间隔须为正整数');}}
  else if(c.method==='DFT'){const v=c.DFT||{};if(!['calculationType','functional','basisSet','method'].every(k=>String(v[k]||'').trim()))add('请完整选择 DFT 计算设置');for(const k of ['excitedStates','charge','unpairedElectrons'])if(v[k]===''||v[k]===undefined||!Number.isInteger(Number(v[k]))||(k!=='charge'&&Number(v[k])<0))add('激发态数量和未成对电子数须为非负整数，分子电荷须为整数');}
  else add('请选择 MD、DFT 或手动输入');
 }
 return issues;
}
export function mountMaterialPropertyEditor(container,getStructure,algorithm){
 const collect=()=>{const s=getStructure();if(s)storePropertyValues(s,Object.fromEntries([...container.querySelectorAll('[data-property-value]')].map(input=>[input.dataset.propertyValue,input.value])));};
 const render=()=>{container.innerHTML=renderMaterialProperties(getStructure(),algorithm);};
 container.addEventListener('change',e=>{const s=getStructure();if(!s)return;collect();if(e.target.hasAttribute('data-key-property')){s.keyProperty=e.target.value;render();}});
 container.addEventListener('click',e=>{const b=e.target.closest('button'),s=getStructure();if(!b||!s)return;collect();const config=structureProperty(s);if(b.dataset.propertyMethod)config.method=b.dataset.propertyMethod;if(b.hasAttribute('data-property-advanced'))config.MD.advanced=!config.MD.advanced;if(b.dataset.propertyStep){const input=container.querySelector(`[data-property-value="${b.dataset.propertyStep}"]`),min=input.hasAttribute('min')?Number(input.min):-Infinity;storePropertyValues(s,{[b.dataset.propertyStep]:String(Math.max(min,(Number(input.value)||0)+Number(b.dataset.step)))});}render();});
 return {collect,render};
}
export function applyMaterialPropertyInputs(n,materials){
 if(!algorithmProperties[n.params.case])return;
 for(const material of materials)for(const [key]of materialPropertyOptions(n.params.case)){
  const config=material.propertyConfigs?.[key],raw=config?.manual?.value,value=Number(raw);
  if(config?.method!=='manual'||raw===''||!Number.isFinite(value)||value<=0)continue;
  material[key]=value;
  if(n.params.case==='extrusion')n.params[key]=value;
  if(n.params.case==='tim'&&key==='conductivity'&&material.region==='matrix')n.params.matrix=value;
 }
 const fillers=materials.filter(m=>m.region==='filler');
 if(n.params.case==='tim'&&fillers.length===1)n.params.filler=fillers[0].conductivity;
}
export const acquisitionFields={
 MD:[['chains','计算链数'],['start','开始温度'],['end','结束温度'],['equilibrium','平衡温度'],['frames','帧'],['interval','间隔']],
 DFT:[['calculationType','计算类型'],['functional','泛函'],['basisSet','基组'],['method','方法'],['excitedStates','激发态数量'],['charge','分子电荷'],['unpairedElectrons','未成对电子数']],
 manual:[['value','参数值']]
};
const defaults={MD:{chains:5,start:100,end:600,equilibrium:100,frames:200,interval:1000,advanced:true},DFT:{calculationType:'紫外可见光谱',functional:'B3LYP',basisSet:'6-31g',method:'RKS',excitedStates:10,charge:0,unpairedElectrons:0}};
export function structureProperty(structure){
 structure.keyProperty??='tg';structure.propertyConfigs??={};
 const config=structure.propertyConfigs[structure.keyProperty]??={method:'MD',MD:{},DFT:{},manual:{}};
 for(const method of ['MD','DFT']){config[method]??={};for(const [key,value]of Object.entries(defaults[method]))if(config[method][key]===undefined||config[method][key]==='')config[method][key]=value;}
 return config;
}
export function storePropertyValues(structure,values){const config=structureProperty(structure);config[config.method]={...config[config.method],...values};}
const options=(items,current)=>[...new Set([...(items.includes(current)?[]:[current]),...items])].map(value=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(value)}</option>`).join('');
function stepper(key,label,value,suffix='',min=0){return `<div class="calculation-number-row"><div class="calculation-stepper"><button type="button" data-property-step="${key}" data-step="-1" aria-label="减少${label}">−</button><input type="number" step="1" ${min===null?'':`min="${min}"`} data-property-value="${key}" value="${esc(value)}" aria-label="${label}"><button type="button" data-property-step="${key}" data-step="1" aria-label="增加${label}">＋</button></div>${suffix?`<span>${suffix}</span>`:''}</div>`;}
export function renderMaterialProperties(structure,algorithm){
 if(!structure)return '<p class="macro-note">添加结构后可设置关键物性参数。</p>';
 const config=structureProperty(structure),values=config[config.method]||{};
 const entries=materialPropertyOptions(algorithm),[,label,unit]=entries.find(([key])=>key===structure.keyProperty)||entries[0];
 const property=`<label class="macro-field calculation-property"><span>属性${unit?'（'+unit+'）':''}</span><select data-key-property>${entries.map(([key,name])=>`<option value="${key}" ${key===structure.keyProperty?'selected':''}>${name}</option>`).join('')}</select></label>`;
 const methods=`<div class="calculation-method"><span>模拟方法</span><div class="calculation-method-buttons" role="group" aria-label="模拟方法">${[['MD','MD'],['DFT','DFT'],['manual','手动输入']].map(([id,label])=>`<button type="button" data-property-method="${id}" aria-pressed="${config.method===id}">${label}</button>`).join('')}</div></div>`;
 let fields='';
 if(config.method==='MD')fields=`<section class="calculation-group"><h4>基本设置</h4>${stepper('chains','计算链数',values.chains,'链',1)}</section>${property}<section class="calculation-group"><h4>高级设置</h4><button type="button" class="calculation-switch" data-property-advanced role="switch" aria-label="高级设置" aria-checked="${values.advanced}"><span></span></button></section>${values.advanced?`<section class="calculation-group"><h4>温度 (K)</h4><div class="calculation-temperature">${stepper('start','开始温度',values.start,'开始')}${stepper('end','结束温度',values.end,'结束')}${stepper('equilibrium','平衡温度',values.equilibrium,'平衡')}</div></section><section class="calculation-group"><h4>数据点</h4><div class="calculation-data-points">${stepper('frames','帧',values.frames,'帧',1)}${stepper('interval','间隔',values.interval,'间隔',1)}</div></section>`:''}`;
 if(config.method==='DFT')fields=`${property}<div class="dft-settings">${[['calculationType','计算类型',['紫外可见光谱','结构优化','单点能','振动频率']],['functional','泛函',['B3LYP','PBE','PBE0']],['basisSet','基组',['6-31g','6-31g(d)','def2-SVP']],['method','方法',['RKS','UKS']]].map(([key,label,items])=>`<label class="macro-field"><span>${label}</span><select data-property-value="${key}">${options(items,values[key])}</select></label>`).join('')}${[['excitedStates','激发态数量',0],['charge','分子电荷',null],['unpairedElectrons','未成对电子数',0]].map(([key,label,min])=>`<div class="macro-field"><span>${label}</span>${stepper(key,label,values[key],'',min)}</div>`).join('')}</div>`;
 if(config.method==='manual')fields=`${property}<label class="macro-field"><span>参数值${unit?'（'+unit+'）':''}</span><input type="${algorithmProperties[algorithm]?'number':'text'}" ${algorithmProperties[algorithm]?'min="0" step="any" required':''} data-property-value="value" value="${esc(values.value??'')}" placeholder="请输入${esc(label)}"></label>`;
 const hint=algorithmProperties[algorithm]?`<p class="macro-note">${algorithm==='extrusion'?'挤出模拟':'TIM 导热'}所需材料物性：${entries.map(([,name])=>name).join('、')}。各项获取方式分别保存。</p>`:'';
 return `<div class="material-calculation-config">${hint}${methods}${fields}</div>`;
}
