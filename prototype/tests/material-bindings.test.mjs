import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditor,makeNode} from '../src/features/editor/model.js';
import {ensureMaterialNodes,materialForNode} from '../src/features/editor/material-bindings.js';
const sample=()=>createEditor({id:'test',name:'test',type:'TIM 导热',definitionStatus:'可运行'});
test('material-local molecular edits bind to their own model node without changing library references',()=>{
 const s=sample();ensureMaterialNodes(s);const macro=s.nodes.find(n=>n.type==='macro'),[first,second]=macro.params.materials;
 const libraryMolecule=structuredClone(first.material.molecule),otherId=macro.materialNodes[second.id],other=structuredClone(s.nodes.find(n=>n.id===otherId).params.molecule);
 first.molecule=structuredClone(libraryMolecule);first.molecule.name='当前结构的分子草稿';ensureMaterialNodes(s);
 assert.equal(s.nodes.find(n=>n.id===macro.materialNodes[first.id]).params.molecule.name,'当前结构的分子草稿');
 assert.deepEqual(first.material.molecule,libraryMolecule);assert.deepEqual(s.nodes.find(n=>n.id===otherId).params.molecule,other);
});
test('each model material has its own connected microscopic node and stable reverse lookup',()=>{
  const s=sample(),snapshot=structuredClone(s.runs),original=s.nodes.find(n=>n.type==='micro');
  assert.equal(ensureMaterialNodes(s),true);
  const macro=s.nodes.find(n=>n.type==='macro');
  assert.equal(macro.materialNodes.filler,original.id);
  assert.notEqual(macro.materialNodes.matrix,macro.materialNodes.filler);
  for(const material of ['matrix','filler']){
    const id=macro.materialNodes[material];
    const calc=s.edges.find(e=>e.from===id&&s.nodes.find(n=>n.id===e.to)?.type==='microCompute');assert.ok(calc);assert.ok(s.edges.some(e=>e.from===calc.to&&e.to===macro.id));assert.deepEqual(materialForNode(s,calc.to),{macro,material});
    assert.deepEqual(materialForNode(s,id),{macro,material});
  }
  assert.equal(ensureMaterialNodes(s),false);
  assert.equal(s.nodes.length,9);
  assert.deepEqual(s.runs,snapshot);
});
test('existing extra upstream node is reused without replacing its molecule',()=>{
  const s=sample(),extra=makeNode('micro','custom');extra.params.molecule.name='saved molecule';
  const calc=makeNode('microCompute','custom-calc');s.nodes.push(extra,calc);s.edges.push({from:'start',to:'custom'},{from:'custom',to:calc.id},{from:calc.id,to:'macro'});
  ensureMaterialNodes(s);
  assert.equal(s.nodes.length,9);
  assert.equal(s.nodes.find(n=>n.id==='macro').materialNodes.matrix,'custom');
  assert.equal(extra.params.molecule.name,'saved molecule');
});
test('multiple macro models cannot share one material simulation binding',()=>{
  const s=sample();s.nodes.push(makeNode('macro','other'));
  ensureMaterialNodes(s);
  const ids=s.nodes.filter(n=>n.type==='macro').flatMap(n=>Object.values(n.materialNodes));
  assert.equal(new Set(ids).size,4);
});
