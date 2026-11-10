import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectionStatuses} from '../src/features/editor/validation-state.js';
const s={revision:2,checkedRevision:null,nodes:[{id:'macro',type:'macro'},{id:'compute',type:'microCompute'}]};
test('model parameters and workflow connections report separate inspection outcomes',()=>{
 assert.deepEqual(inspectionStatuses(s),{model:'待检验',workflow:'待检验'});
 assert.deepEqual(inspectionStatuses(s,[{nodeId:'macro',field:'密度',reason:'必须大于零'}]),{model:'需处理',workflow:'已检验'});
 assert.deepEqual(inspectionStatuses(s,[{nodeId:'macro',field:'开始路径',reason:'节点未连接到开始节点'}]),{model:'已检验',workflow:'需处理'});
 assert.deepEqual(inspectionStatuses(s,[{nodeId:'compute',field:'计算温度',reason:'必须大于零'}]),{model:'已检验',workflow:'需处理'});
});
