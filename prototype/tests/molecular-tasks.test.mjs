import test from 'node:test';
import assert from 'node:assert/strict';
import {submitMolecularTask,molecularTasks,configKey} from '../src/features/modeling/molecular-tasks.js';
import {createMolecule} from '../src/features/editor/molecule.js';
import {collectTasks} from '../src/features/tasks/task-data.js';
test('molecular submissions preserve independent snapshots and link to task management',()=>{const store=new Map();global.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};try{const molecule=createMolecule('benzene'),settings={keyProperty:'tg',propertyConfigs:{tg:{method:'MD',MD:{chains:5}}}};const first=submitMolecularTask('model-a',molecule,settings);settings.propertyConfigs.tg.MD.chains=12;molecule.name='modified';submitMolecularTask('model-a',molecule,settings);const records=molecularTasks();assert.equal(records.length,2);const saved=records.find(t=>t.id===first.id);assert.equal(saved.params.configuration.MD.chains,5);assert.equal(saved.params.molecule.name,'苯');assert.equal(collectTasks([],()=>null).filter(t=>t.modelId==='model-a').length,2);assert.notEqual(configKey('a'),configKey('b'));}finally{delete global.localStorage;}});
