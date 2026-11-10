import {createEditor} from './model.js';
import {ensureMaterialNodes} from './material-bindings.js';
import {executionScenario,advanceExecution} from './execution.js';

export const multiscaleExampleDefinitions=[
 {id:'wf-example-extrusion-running',name:'挤出模拟 · 运行中示例',type:'挤出模拟',applicationType:'extrusion',exampleScenario:'全部运行',nodeCount:7,definitionStatus:'可运行',description:'四段管路计算进行中，已完成节点只读，后续节点可配置',updatedAt:'2026-11-10 10:50'},
 {id:'wf-example-tim-blocked',name:'TIM 导热 · 节点阻塞示例',type:'TIM 导热',applicationType:'tim',exampleScenario:'节点阻塞',nodeCount:9,definitionStatus:'可运行',description:'一个物性计算节点阻塞，可处理后继续运行',updatedAt:'2026-11-10 10:40'},
 {id:'wf-example-extrusion-partial',name:'挤出模拟 · 部分完成示例',type:'挤出模拟',applicationType:'extrusion',exampleScenario:'部分运行',nodeCount:7,definitionStatus:'可运行',description:'微观材料计算已完成，继续执行后续跨尺度计算',updatedAt:'2026-11-10 10:30'},
 {id:'wf-example-tim-completed',name:'TIM 导热 · 已完成示例',type:'TIM 导热',applicationType:'tim',exampleScenario:'全部完成',nodeCount:9,definitionStatus:'可运行',description:'全部节点完成，任务配置与执行输入只读保留',updatedAt:'2026-11-10 10:20'},
];

export function createExampleDefinition(workflow){
 const s=createEditor({...workflow,latestRun:null});ensureMaterialNodes(s);s.runs=[];s.checkedRevision=s.revision;s.definition='可运行';
 const run=executionScenario(s,workflow.exampleScenario);
 if(workflow.exampleScenario==='全部运行'){
  for(let i=0;i<60;i++){if(s.nodes.find(n=>n.type==='macro')?.status==='运行中')break;advanceExecution(s);}
 }else if(workflow.exampleScenario==='节点阻塞'){
  for(let i=0;i<40&&run.status!=='已阻塞';i++)advanceExecution(s);
 }
 run.id='task-'+workflow.id.replace('wf-example-','');run.time=workflow.updatedAt;run.demoFixture=true;
 for(const task of Object.values(run.tasks)){if(task.attempts)task.startedAt=workflow.updatedAt;if(task.status==='已完成')task.finishedAt=workflow.updatedAt;}
 run.logs.push('预置跨尺度任务：运行中状态供演示观察，点击“继续运行”或“重试”后推进本地计算。');
 run.workingDefinition=structuredClone({nodes:s.nodes,edges:s.edges,revision:s.revision,checkedRevision:s.checkedRevision,selected:s.nodes.find(n=>n.type==='macro')?.id,history:[],embeddedCanvasPositions:{}});
 s.viewMode='definition';return s;
}
