import test from 'node:test';
import assert from 'node:assert/strict';
import {structureProperty,storePropertyValues,renderMaterialProperties,acquisitionFields} from '../src/features/editor/material-properties.js';
import {materialPropertyOptions,prepareMaterialProperties,applyMaterialPropertyInputs,materialPropertyIssues} from '../src/features/editor/material-properties.js';

test('acquisition settings survive switching property, method and serialization independently',()=>{
 const structure={};
 storePropertyValues(structure,{chains:'12',temperature:'300'});
 structureProperty(structure).method='DFT';storePropertyValues(structure,{charge:'-1',functional:'PBE'});
 structure.keyProperty='CTE';structureProperty(structure).method='manual';storePropertyValues(structure,{value:'0.0001'});
 const saved=JSON.parse(JSON.stringify(structure));
 saved.keyProperty='tg';assert.equal(structureProperty(saved).MD.chains,'12');assert.equal(structureProperty(saved).DFT.charge,'-1');
 saved.keyProperty='CTE';assert.equal(structureProperty(saved).manual.value,'0.0001');
 const other={};assert.equal(structureProperty(other).MD.chains,5);
});
test('MD and DFT expose requested fields and manual entry has one value field',()=>{
 assert.equal(acquisitionFields.MD.length,6);assert.equal(acquisitionFields.DFT.length,7);
 const s={};structureProperty(s).method='manual';assert.equal((renderMaterialProperties(s).match(/data-property-value=/g)||[]).length,1);
});
test('algorithm properties replace legacy choices without deleting previous acquisition settings',()=>{
 const m={keyProperty:'tg',propertyConfigs:{tg:{method:'MD',MD:{chains:12}}}},n={params:{case:'extrusion',density:1200,viscosity:.8,conductivity:.24,specificHeat:1500}};
 prepareMaterialProperties(m,n);
 assert.deepEqual(materialPropertyOptions('extrusion').map(([key])=>key),['density','viscosity','conductivity','specificHeat']);
 assert.equal(m.keyProperty,'density');assert.equal(m.propertyConfigs.tg.MD.chains,12);
 const html=renderMaterialProperties(m,'extrusion');assert.ok(html.includes('比热'));assert.ok(!html.includes('value="tg"'));assert.ok(html.includes('kg/m³'));
 m.keyProperty='viscosity';structureProperty(m).method='manual';storePropertyValues(m,{value:'2.5'});
 prepareMaterialProperties(m,n);assert.equal(m.propertyConfigs.viscosity.manual.value,'2.5');
 const saved=JSON.parse(JSON.stringify(m));applyMaterialPropertyInputs(n,[saved]);assert.equal(n.params.viscosity,2.5);assert.equal(n.params.density,1200);
});
test('TIM material thermal properties use conductivity while geometry and boundary inputs remain separate',()=>{
 const n={params:{case:'tim',matrix:.24,filler:30,hot:80,resistance:.001}},m={region:'matrix'},f={region:'filler',conductivity:30};
 for(const s of [m,f])prepareMaterialProperties(s,n);
 assert.deepEqual(materialPropertyOptions('tim').map(([key])=>key),['conductivity']);
 assert.equal(m.propertyConfigs.conductivity.manual.value,.24);assert.equal(f.propertyConfigs.conductivity.manual.value,30);
 structureProperty(m).method='manual';storePropertyValues(m,{value:'.5'});structureProperty(f).method='manual';storePropertyValues(f,{value:'45'});
 applyMaterialPropertyInputs(n,[m,f]);assert.equal(n.params.matrix,.5);assert.equal(n.params.filler,45);assert.equal(n.params.hot,80);assert.equal(n.params.resistance,.001);
 assert.ok(!renderMaterialProperties(m,'tim').includes('value="CTE"'));
});
test('MD and DFT configurations do not fabricate computed material values',()=>{
 const n={params:{case:'extrusion',density:1200,viscosity:.8}},m={keyProperty:'viscosity',propertyConfigs:{viscosity:{method:'DFT',manual:{value:8}}}};
 applyMaterialPropertyInputs(n,[m]);assert.equal(n.params.viscosity,.8);
});
test('active acquisition methods validate their own parameters rather than legacy node temperature and steps',()=>{
 const n={params:{case:'extrusion',density:1200,viscosity:.8,conductivity:.24,specificHeat:1500}},m={};prepareMaterialProperties(m,n);
 assert.deepEqual(materialPropertyIssues(m,'extrusion'),[]);
 m.propertyConfigs.density.MD.chains=0;assert.match(materialPropertyIssues(m,'extrusion')[0][1],/计算链数/);
 m.propertyConfigs.density.method='DFT';m.propertyConfigs.density.DFT.charge=-1;assert.deepEqual(materialPropertyIssues(m,'extrusion'),[]);
 m.propertyConfigs.density.DFT.excitedStates=-1;assert.ok(materialPropertyIssues(m,'extrusion').length);
 m.propertyConfigs.density.method='manual';m.propertyConfigs.density.manual.value=1100;assert.deepEqual(materialPropertyIssues(m,'extrusion'),[]);
});
