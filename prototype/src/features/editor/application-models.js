import {ensureAlgorithmInputs} from './algorithm-inputs.js';
import {libraryAssignment} from './macro-state.js';

export const applicationLabels={extrusion:'挤出模拟',tim:'TIM 导热',blank:'通用示例'};
export function pipeApplication(kind){
 const extrusion=kind==='extrusion';
 const specs=extrusion?[['cylinder',120,20,20],['cone',60,20,10],['cylinder',60,10,10],['cone',80,10,5]]:[['cylinder',100,5,5]];
 const primitives=specs.map(([type,height,radius,endRadius],i)=>({id:`${kind}-segment-${i+1}`,structureId:`${kind}-structure-${i+1}`,name:extrusion?`第${i+1}段 · ${type==='cone'?'圆锥过渡段':'圆柱段'}`:'圆管结构',type,height,radius,endRadius,axis:'x',pipeSegment:true,order:i,x:0,y:0,z:0}));
 const modeling={length:1,width:1,height:1,unit:'mm',meshSize:1,meshOrder:'一阶',physics:'流动',hot:80,cold:20,hotFace:'Z+',coldFace:'Z−',study:'稳态',tolerance:.001,primitives};
 reflowPipe(modeling);
 let materials=primitives.map((p,i)=>({id:p.structureId,geometryId:p.id,name:p.name,structureName:p.name,region:'domain',shape:p.type,color:['#a8bdd7','#b394dc','#8daebc','#bba8d0'][i],density:1200,conductivity:.24,material:libraryAssignment('epoxy')}));
 if(extrusion){materials=[extrusionMaterial(materials[0])];for(const part of primitives)part.structureId=materials[0].id;}
 const result={geometryKind:'pipe',...(extrusion?{materialScope:'whole-model',extrusionMaterialVersion:2}:{}),modelName:extrusion?'四段挤出模型':'简单圆管',materials,modeling};if(extrusion)return ensureAlgorithmInputs({params:{...result,case:'extrusion'}});return result;
}
export function extrusionMaterial(source){
 const material={...structuredClone(source||{}),id:'extrusion-material',name:'流体材料',structureName:'流体材料',region:'domain',shape:'whole',color:source?.color||'#a8bdd7',density:source?.density||1200,conductivity:source?.conductivity||.24,material:structuredClone(source?.material||libraryAssignment('epoxy'))};
 delete material.geometryId;return material;
}
export function reflowPipe(settings,changedId){
 const parts=settings.primitives.filter(p=>p.pipeSegment).sort((a,b)=>a.order-b.order);
 const changed=parts.findIndex(p=>p.id===changedId);
 if(changed>=0){
  const visited=new Set();
  const edited=parts[changed],shape=edited.crossSection||'circle';
  const setInterface=(i,value)=>{if(visited.has(i))return;visited.add(i);const left=parts[i-1],right=parts[i];
   if(shape==='rectangle'){
    if(left?.crossSection==='rectangle'){const straight=left.inletLength===left.outletLength&&left.inletWidth===left.outletWidth;[left.outletLength,left.outletWidth]=value;if(straight){[left.inletLength,left.inletWidth]=value;setInterface(i-1,value);}}
    if(right?.crossSection==='rectangle'){const straight=right.inletLength===right.outletLength&&right.inletWidth===right.outletWidth;[right.inletLength,right.inletWidth]=value;if(straight){[right.outletLength,right.outletWidth]=value;setInterface(i+1,value);}}
   }else{
    if(left&&left.crossSection!=='rectangle'){if(left.type==='cylinder'){left.radius=value;left.endRadius=value;setInterface(i-1,value);}else left.endRadius=value;}
    if(right&&right.crossSection!=='rectangle'){right.radius=value;if(right.type==='cylinder'){right.endRadius=value;setInterface(i+1,value);}}
   }
  };
  setInterface(changed,shape==='rectangle'?[edited.inletLength,edited.inletWidth]:edited.radius);
  setInterface(changed+1,shape==='rectangle'?[edited.outletLength,edited.outletWidth]:edited.type==='cylinder'?edited.radius:edited.endRadius);
 }
 const length=parts.reduce((sum,p)=>sum+Number(p.height),0);let cursor=-length/2;
 for(const [index,part]of parts.entries()){part.order=index;part.x=cursor+Number(part.height)/2;part.y=0;part.z=0;cursor+=Number(part.height);}
 if(parts.length){settings.length=length;settings.width=Math.max(...parts.map(p=>p.crossSection==='rectangle'?Math.max(p.inletLength,p.outletLength):Math.max(p.radius,p.endRadius||p.radius)*2));settings.height=Math.max(...parts.map(p=>p.crossSection==='rectangle'?Math.max(p.inletWidth,p.outletWidth):Math.max(p.radius,p.endRadius||p.radius)*2));settings.meshSize=Math.min(settings.meshSize,settings.width,settings.height);}
 return settings;
}
export function pipeSegmentSummary(p,unit='mm'){
 const section=p.crossSection==='rectangle'?`方形 · 入口 ${p.inletLength} × ${p.inletWidth} → 出口 ${p.outletLength} × ${p.outletWidth}`:`圆形 · 入口半径 ${p.radius} → 出口半径 ${p.endRadius??p.radius}`;
 return `长度 ${p.height} ${unit} · ${section} ${unit}`;
}
export function createPipeSegment(settings){
 const parts=settings.primitives.filter(p=>p.pipeSegment).sort((a,b)=>a.order-b.order),last=parts.at(-1),sequence=Math.max(0,...parts.map(p=>Number(p.name.match(/第(\d+)段/)?.[1])||0))+1;
 parts.forEach((p,index)=>p.order=index);
 const radius=last?.endRadius??last?.radius??10;
 return {id:'pipe-segment-'+Date.now(),structureId:last?.structureId||'extrusion-material',name:`第${sequence}段 · 管段`,type:'cylinder',height:60,radius,endRadius:radius,crossSection:last?.crossSection||'circle',inletLength:last?.outletLength??radius*2,inletWidth:last?.outletWidth??radius*2,outletLength:last?.outletLength??radius*2,outletWidth:last?.outletWidth??radius*2,axis:'x',pipeSegment:true,order:parts.length,x:0,y:0,z:0};
}
