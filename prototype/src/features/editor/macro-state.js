import {createMolecule} from './molecule.js';
export const materialLibrary=[
 {id:'epoxy',name:'环氧树脂',category:'聚合物',color:'#a8bdd7',density:1200,conductivity:.24},
 {id:'silicone',name:'硅橡胶',category:'聚合物',color:'#99bfc1',density:1100,conductivity:.2},
 {id:'alumina',name:'氧化铝',category:'陶瓷',color:'#b394dc',density:3950,conductivity:30},
 {id:'bn',name:'氮化硼',category:'陶瓷',color:'#d8b78c',density:2100,conductivity:60},
 {id:'aluminum',name:'铝',category:'金属',color:'#8da9bd',density:2700,conductivity:237},
 {id:'copper',name:'铜',category:'金属',color:'#c28a72',density:8960,conductivity:401}
];
export function macroMaterials(n){return n.params.materials||[
 {id:'matrix',name:'基体材料',category:'自定义',region:'matrix',color:'#a8bdd7',density:1200,conductivity:Number(n.params.matrix)||.24},
 {id:'filler',name:n.params.case==='tim'?'球状填料':'填料材料',shape:'sphere',category:'自定义',region:'filler',color:'#b394dc',density:3950,conductivity:Number(n.params.filler)||30}
];}
// Assigned structures provide the composite preview, including tasks created from blank.
export function hasCompositeGeometry(n){return n.params.geometryKind!=='pipe'&&(!n.params.blankGeometry||macroMaterials(n).some(m=>m.region==='matrix'&&m.material?.libraryId));}
export function initializeFillerShapes(n){
 if(n.params.case!=='tim'||n.params.fillerShapesVersion===2)return false;
 const materials=structuredClone(macroMaterials(n)),fillers=materials.filter(m=>m.region==='filler');
 n.params.previousDemoMaterials??=structuredClone(materials);
 if(fillers[0]){fillers[0].shape='sphere';if(fillers[0].name==='填料材料')fillers[0].name='球状填料';}
 for(const filler of fillers.slice(1))filler.region='none';
 n.params.materials=materials;n.params.fillerShapesVersion=2;return true;
}
export function addPlateletMaterial(n){
 const materials=structuredClone(macroMaterials(n));let material=materials.find(m=>m.region==='none'&&m.shape==='platelet');
 if(material)material.region='filler';else{let id='platelet';while(materials.some(m=>m.id===id))id+='-new';material={id,name:'片状填料',shape:'platelet',category:'自定义',region:'filler',color:'#8daebc',density:2100,conductivity:60};materials.push(material);}
 n.params.materials=materials;return material;
}
export function libraryAssignment(id){const item=materialLibrary.find(m=>m.id===id);if(!item)return null;return {libraryId:item.id,name:item.name,category:item.category,density:item.density,conductivity:item.conductivity,moleculeId:'demo-molecule-'+item.id,dataStatus:'原型示意数据',molecule:createMolecule()};}
export function modelStructures(n){let number=0;return macroMaterials(n).map(m=>{
 if(m.region!=='matrix')number++;if(n.params.case==='extrusion'&&m.name==='整体材料')return {...m,name:'流体材料',structureName:'流体材料'};if(m.structureName)return m;
 const match=materialLibrary.find(item=>m.name.includes(item.name))||(/^(基体材料|球状填料|填料材料|片状填料)$/.test(m.name)?materialLibrary.find(item=>item.id===(m.region==='matrix'?'epoxy':m.shape==='platelet'?'bn':'alumina')):null);
 const material=m.material||{...(match?libraryAssignment(match.id):{libraryId:'local-'+m.id,name:m.name,category:m.category||'原模型材料',moleculeId:'local-molecule-'+m.id,dataStatus:'原模型示意数据',molecule:createMolecule()}),density:m.density,conductivity:m.conductivity};
 const name=m.region==='matrix'?'基底':'材料'+number;return {...m,name,structureName:name,material};
 });}
export function assignStructureMaterial(structure,libraryId){const material=libraryAssignment(libraryId);if(!material)throw new Error('请选择有效的材料库记录');delete structure.molecule;structure.material=material;structure.density=material.density;structure.conductivity=material.conductivity;return structure;}
export function macroSettings(n){if(n.params.case==='tim'){const p=n.params;return {...(p.modeling||{}),length:p.length,width:p.width,height:p.height,unit:'mm',meshSize:p.mesh,meshOrder:'一阶',physics:'稳态导热',hot:p.hot,cold:p.cold,hotFace:p.direction+'+',coldFace:p.direction+'−',study:'稳态',tolerance:p.modeling?.tolerance||.001,primitives:p.modeling?.primitives||[],distribution:p.distribution,seed:p.seed,gap:p.gap};}return n.params.modeling||{length:10,width:10,height:10,unit:'mm',meshSize:1,meshOrder:'一阶',physics:'稳态导热',hot:80,cold:20,hotFace:'Z+',coldFace:'Z−',study:'稳态',tolerance:.001};}
export function validateMacroSettings(v){
 for(const key of ['length','width','height','meshSize','tolerance'])if(!(Number(v[key])>0))return '尺寸、网格尺寸与收敛容差必须大于零';
 if(v.meshSize>Math.min(v.length,v.width,v.height))return '网格尺寸不能超过最小几何尺寸';
 if(v.hotFace===v.coldFace)return '热端和冷端不能选择同一表面';
 if(!Number.isFinite(Number(v.hot))||!Number.isFinite(Number(v.cold))||Number(v.hot)<=Number(v.cold))return '热端温度须高于冷端温度';
 return null;
}
export function validateMaterials(materials){
 const domains=materials.length&&materials.every(m=>m.region==='domain'||m.region==='none');
 if(!domains&&materials.filter(m=>m.region==='matrix').length!==1)return '请且仅为一个材料分配基体域';
 if(!domains&&!materials.some(m=>m.region==='filler'))return '至少为一种材料分配填料域';
 const ids=new Set();
 for(const m of materials){if(m.structureName&&!m.material?.libraryId)return '请为每个结构选择对应的材料库材料';if(!m.id||ids.has(m.id))return '材料标识重复';ids.add(m.id);if(!m.name.trim())return '请填写材料名称';if(!/^#[0-9a-f]{6}$/i.test(m.color))return '请选择有效材料颜色';if(!(Number(m.density)>0)||!(Number(m.conductivity)>0))return '密度与热导率必须大于零';if(!['matrix','filler','domain','none'].includes(m.region))return '材料区域无效';}
 return null;
}
export function particleMaterial(materials,index){const fillers=materials.filter(m=>m.region==='filler');return fillers[index%fillers.length]||null;}
