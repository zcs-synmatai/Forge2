export const simulationAlgorithms=[['extrusion','挤出模拟'],['tim','TIM 导热'],['blank','通用示例']];
export const algorithmName=value=>value==='extrusion'||value==='挤出模拟'?'挤出模拟':value==='tim'||value==='TIM 导热'?'TIM 导热':'通用示例';
export function ensureAlgorithmInputs(n){
 const p=n.params;if(p.case==='extrusion'){
  const defaults={density:1200,viscosity:.8,conductivity:.24,specificHeat:1500,inletType:'pressure',inletMassFlow:.05,inletVelocity:.1,inletPressure:.2,outletType:'pressure',outletPressure:0,outletMassFlow:.05};
  for(const [key,value]of Object.entries(defaults))if(p[key]===undefined)p[key]=value;
 }
 return p;
}
export function extrusionInput(p){
 const inletKey={massFlow:'inletMassFlow',velocity:'inletVelocity',pressure:'inletPressure'}[p.inletType],outletKey={pressure:'outletPressure',massFlow:'outletMassFlow'}[p.outletType];
 return {algorithm:'extrusion',geometry:p.modeling,material:{density:p.density,viscosity:p.viscosity,conductivity:p.conductivity,specificHeat:p.specificHeat},inlet:{type:p.inletType,value:p[inletKey],unit:p.inletType==='massFlow'?'g/s':p.inletType==='velocity'?'m/s':'MPa'},outlet:{type:p.outletType,value:p[outletKey],unit:p.outletType==='massFlow'?'g/s':'MPa'}};
}
export function extrusionIssues(p){
 const issues=[],positive=(key,label)=>{if(p[key]===''||!Number.isFinite(Number(p[key]))||Number(p[key])<=0)issues.push([label,'请输入大于零的数值']);};
 for(const [key,label]of [['density','密度'],['viscosity','黏度'],['conductivity','热导率'],['specificHeat','比热']])positive(key,label);
 const active={massFlow:'inletMassFlow',velocity:'inletVelocity',pressure:'inletPressure'}[p.inletType];
 if(!active)issues.push(['入口边界','请选择一种入口输入']);else if(p.inletType==='pressure'){if(p[active]===''||!Number.isFinite(Number(p[active])))issues.push(['入口压力','请输入有效压力']);}else positive(active,p.inletType==='massFlow'?'入口质量流量':'入口速度');
 const outlet={pressure:'outletPressure',massFlow:'outletMassFlow'}[p.outletType];
 if(!outlet)issues.push(['出口边界','请选择出口边界类型']);else if(p.outletType==='massFlow')positive(outlet,'出口质量流量');else if(p[outlet]===''||!Number.isFinite(Number(p[outlet])))issues.push(['出口压力','请输入有效压力']);
 return issues;
}
export function timInput(p){return {algorithm:'tim',geometry:{type:'cuboid',length:p.length,width:p.width,height:p.height,unit:'mm'},particles:{presets:(p.materials||[]).filter(m=>m.region==='filler').map(m=>({structureId:m.id,preset:m.shape||'sphere',size:'fixed-preset'})),distribution:p.distribution,seed:p.seed,minGap:p.gap,unit:'mm'},thermal:{matrixConductivity:p.matrix,fillerConductivity:p.filler,interfaceResistance:p.resistance},boundary:{direction:p.direction,hot:p.hot,cold:p.cold,temperatureUnit:'°C',sides:'adiabatic'}};}
