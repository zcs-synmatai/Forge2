import test from 'node:test';
import assert from 'node:assert/strict';
import {macroParams} from '../src/features/editor/model.js';
import {initializeTimCubeDefaults} from '../src/features/editor/tim-defaults.js';
test('TIM starts with a cube and upgrades only the untouched former flat default',()=>{
 const defaults=macroParams('tim');assert.deepEqual([defaults.length,defaults.width,defaults.height],[10,10,10]);
 const n={id:'macro',type:'macro',params:{case:'tim',length:10,width:10,height:2}},s={nodes:[n],history:[],runs:[{snapshot:{nodes:[structuredClone(n)]}}]};
 assert.equal(initializeTimCubeDefaults(s),true);assert.equal(n.params.height,10);assert.equal(s.runs[0].snapshot.nodes[0].params.height,2);assert.equal(initializeTimCubeDefaults(s),false);
 const custom={nodes:[{...n,params:{case:'tim',length:20,width:10,height:2}}],history:[]};assert.equal(initializeTimCubeDefaults(custom),false);assert.equal(custom.nodes[0].params.height,2);
 const edited={nodes:[{...n,params:{case:'tim',length:10,width:10,height:2}}],history:[{id:'macro',text:'保存节点参数，相关下游结果已过期'}]};assert.equal(initializeTimCubeDefaults(edited),false);
});
