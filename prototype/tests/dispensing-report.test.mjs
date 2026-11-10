import test from 'node:test';
import assert from 'node:assert/strict';
import {dispensingData as d} from '../src/features/reports/dispensing-data.js';
import {comparisonChart,renderDispensingReport} from '../src/features/reports/dispensing-report.js';
test('source report values retain pressure, diameter order and missing measurements',()=>{
 assert.deepEqual(d.diameters,[.4,.45,.48,.5,.55]);
 assert.deepEqual(d.flow['0.2'].simulation,[.0273,.0433,.0558,.0654,.0952]);
 assert.equal(d.flow['0.4'].simulation[0],null);
 assert.equal(d.flow['0.4'].experiment,.1204);
 assert.equal(d.viscosity.length,7);assert.ok(Math.abs(d.fit.r2-.99886108149609332)<1e-12);
});
test('pressure switch uses corresponding experimental line and omits missing simulation points',()=>{
 const low=comparisonChart('0.2'),high=comparisonChart('0.4');
 assert.match(low,/0.0494/);assert.match(high,/0.1204/);
 assert.equal((low.match(/class="plot-point"/g)||[]).length,5);
 assert.equal((high.match(/class="plot-point"/g)||[]).length,4);
 assert.doesNotMatch(high,/NaN|null|undefined/);
});
test('reference report remains distinct from uncompleted run, preserves provenance and escapes task title',()=>{
 const html=renderDispensingReport({workflow:{name:'<task>'},run:{id:'r1',status:'运行中',reportStatus:'等待上游'},back:'/edit'});
 assert.match(html,/本次报告尚未就绪/);assert.match(html,/参考报告展示/);assert.match(html,/&lt;task&gt;/);
 assert.match(html,/Workbook1.xlsx/);assert.match(html,/data-report-panel="inputs"/);
});
