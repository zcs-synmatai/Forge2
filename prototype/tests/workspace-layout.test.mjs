import test from 'node:test';
import assert from 'node:assert/strict';
import {clampSplit} from '../src/features/editor/workspace-split.js';
import {extrusionFields,timFields} from '../src/features/editor/algorithm-fields.js';
import {createEditor} from '../src/features/editor/model.js';
test('split width stays within usable limits for both work areas',()=>{
 assert.equal(clampSplit(10),30);assert.equal(clampSplit(95),70);assert.equal(clampSplit(62),62);assert.equal(clampSplit(null),55);
});
test('algorithm menu excludes duplicated material and geometry inputs',()=>{
 const s=createEditor({id:'layout-test',name:'test',applicationType:'extrusion',type:'挤出模拟',nodeCount:7}),n=s.nodes.find(n=>n.type==='macro');
 const html=extrusionFields(n,['边界条件']);
 assert.ok(html.includes('入口输入'));assert.ok(!html.includes('data-param="density"'));assert.ok(!html.includes('四段几何尺寸'));
 const t=createEditor({id:'tim-layout-test',name:'test',applicationType:'tim',type:'TIM 导热',nodeCount:9}).nodes.find(n=>n.type==='macro');
 const geometry=timFields(t,['几何与颗粒']),boundary=timFields(t,['温度边界']);
 assert.ok(geometry.includes('data-param="length"'));assert.ok(!geometry.includes('data-param="hot"'));
 assert.ok(boundary.includes('data-param="hot"'));assert.ok(!boundary.includes('data-param="matrix"'));
});
