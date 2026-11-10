import {prepareMaterialProperties} from './material-properties.js';
import {ensureAlgorithmInputs} from './algorithm-inputs.js';
import {extrusionMaterial} from './application-models.js';
import {macroMaterials,initializeFillerShapes,modelStructures} from './macro-state.js';
import {makeNode,connect,invalidate} from './model.js';

export const materialNames={matrix:'基体材料',filler:'填料材料'};
const feeds=(s,modelId,macroId)=>s.edges.some(e=>e.from===modelId&&(e.to===macroId||s.edges.some(next=>next.from===e.to&&next.to===macroId)));
export function ensureMaterialNodes(state){
 for(const n of state.nodes.filter(n=>n.type==='macro'))ensureAlgorithmInputs(n);
  let changed=false;
  for(const macro of state.nodes.filter(n=>n.type==='macro'&&n.params.case==='extrusion'))changed=unifyExtrusionMaterial(state,macro)||changed;
  const used=new Set();const reserved=new Set(state.nodes.filter(n=>n.type==='macro').flatMap(n=>Object.values(n.materialNodes||{})));
  for(const macro of state.nodes.filter(n=>n.type==='macro')){
    if(initializeFillerShapes(macro)){
      changed=true;const inactive=new Set(macroMaterials(macro).filter(m=>m.region==='none').map(m=>m.id)),removed=new Set();
      for(const [material,id]of Object.entries(macro.materialNodes||{}))if(inactive.has(material)){removed.add(id);for(const e of state.edges.filter(e=>e.from===id))if(state.nodes.find(n=>n.id===e.to)?.type==='microCompute')removed.add(e.to);delete macro.materialNodes[material];}if(removed.size)invalidate(state,macro.id);
      state.nodes=state.nodes.filter(n=>!removed.has(n.id));state.edges=state.edges.filter(e=>!removed.has(e.from)&&!removed.has(e.to));if(removed.has(state.selected))state.selected=macro.id;
    }
    macro.params.materials=modelStructures(macro);
    macro.materialNodes??={};
    for(const entry of macroMaterials(macro).filter(m=>m.region!=='none').sort((a,b)=>(a.id==='filler'?0:a.region==='matrix'?1:2)-(b.id==='filler'?0:b.region==='matrix'?1:2))){const material=entry.id;prepareMaterialProperties(entry,macro);
      let micro=state.nodes.find(n=>n.id===macro.materialNodes[material]&&n.type==='micro'&&!used.has(n.id));
      if(!micro){
        micro=state.nodes.find(n=>n.type==='micro'&&!used.has(n.id)&&!reserved.has(n.id)&&feeds(state,n.id,macro.id));
        if(!micro){
          let id=`${macro.id}-${material}-micro`,suffix=1;
          while(state.nodes.some(n=>n.id===id))id=`${macro.id}-${material}-micro-${suffix++}`;
          const positions=state.nodes.filter(n=>n.type==='micro').map(n=>state.embeddedCanvasPositions?.[n.id]||n);
          micro=makeNode('micro',id);micro.x=positions[0]?.x??macro.x-470;micro.y=positions.length?Math.max(...positions.map(p=>p.y))+155:macro.y;
          state.embeddedCanvasPositions??={};state.embeddedCanvasPositions[id]={x:micro.x,y:micro.y};state.nodes.push(micro);
          const calc=makeNode('microCompute',id+'-compute');calc.x=micro.x+235;calc.y=micro.y;state.nodes.push(calc);state.embeddedCanvasPositions[calc.id]={x:calc.x,y:calc.y};
          const start=state.nodes.find(n=>n.type==='start');if(start)connect(state,start.id,micro.id);
          connect(state,micro.id,calc.id);connect(state,calc.id,macro.id);
        }
        macro.materialNodes[material]=micro.id;changed=true;
      }
      used.add(micro.id);
      micro.materialBinding={macroId:macro.id,material};
      if(entry.molecule){micro.params.molecule=structuredClone(entry.molecule);micro.params.moleculeSource='local-draft';}
      micro.params.materialRef=entry.material?{libraryId:entry.material.libraryId,name:entry.material.name,moleculeId:entry.material.moleculeId}:micro.params.materialRef;
      const oldName=micro.name.replace(' · 微观建模','');const name=entry.name+' · 微观建模';
      if(micro.name!==name){micro.name=name;changed=true;}
      for(const calc of state.nodes.filter(n=>n.type==='microCompute'&&state.edges.some(e=>e.from===micro.id&&e.to===n.id))){
        if(macro.params.materialScope==='whole-model')calc.name=entry.name+' · 材料计算';
        if(entry.propertyConfigs){calc.params.materialProperties=structuredClone(entry.propertyConfigs);calc.params.materialAlgorithm=macro.params.case;calc.params.keyProperty=entry.keyProperty;}
        if(entry.material)calc.params.materialRef={libraryId:entry.material.libraryId,name:entry.material.name,moleculeId:entry.material.moleculeId};
        if(['物性计算','热导率计算','密度计算','黏度计算','弹性模量计算'].includes(calc.name.split(' · ').at(-1)))calc.name=entry.name+' · '+calc.name.split(' · ').at(-1);
        if(calc.name.startsWith(oldName+' · '))calc.name=entry.name+calc.name.slice(oldName.length);
        if(calc.name==='微观物性计算'){calc.name=entry.name+' · 物性计算';changed=true;}
      }
    }
  }
  return changed;
}
export function unifyExtrusionMaterial(state,macro){
 if(macro.params.extrusionMaterialVersion===2)return false;
 const old=macroMaterials(macro),whole=extrusionMaterial(old[0]),bindings=Object.entries(macro.materialNodes||{}),keep=bindings.find(([material,id])=>material===old[0]?.id&&state.nodes.some(n=>n.id===id))?.[1]||bindings[0]?.[1],removed=new Set();
 for(const [,id]of bindings)if(id!==keep){removed.add(id);for(const e of state.edges.filter(e=>e.from===id))if(state.nodes.find(n=>n.id===e.to)?.type==='microCompute')removed.add(e.to);}
 macro.extrusionMigrationBackup={materials:structuredClone(old),bindings:structuredClone(macro.materialNodes||{}),nodes:structuredClone(state.nodes.filter(n=>removed.has(n.id))),edges:structuredClone(state.edges.filter(e=>removed.has(e.from)||removed.has(e.to)))};
 state.nodes=state.nodes.filter(n=>!removed.has(n.id));state.edges=state.edges.filter(e=>!removed.has(e.from)&&!removed.has(e.to));
 if(removed.has(state.selected))state.selected=macro.id;
 macro.params.materials=[whole];macro.params.materialScope='whole-model';macro.params.extrusionMaterialVersion=2;macro.materialNodes=keep?{[whole.id]:keep}:{};
 for(const part of macro.params.modeling?.primitives||[])if(part.pipeSegment)part.structureId=whole.id;
 if(keep){const calc=state.edges.filter(e=>e.from===keep).map(e=>state.nodes.find(n=>n.id===e.to)).find(n=>n?.type==='microCompute');if(calc)invalidate(state,calc.id);}
 return true;
}
export function materialForNode(state,id){
  const modelIds=[id,...state.edges.filter(e=>e.to===id&&state.nodes.find(n=>n.id===e.from)?.type==='micro').map(e=>e.from)];
  for(const macro of state.nodes.filter(n=>n.type==='macro'))for(const [material,nodeId]of Object.entries(macro.materialNodes||{}))if(modelIds.includes(nodeId))return {macro,material};
  return null;
}
