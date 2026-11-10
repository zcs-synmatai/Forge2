import {algorithmName} from '../features/editor/algorithm-inputs.js';
import {multiscaleExampleDefinitions} from '../features/editor/task-examples.js';
import {migrateEditor} from '../features/editor/model.js';

export const workflowSeed = [
  {
    id: "wf-tim-001",
    name: "颗粒填充 TIM 导热评估",
    description: "评估填料体积分数、界面热阻与取向对等效热导率的影响",
    type: "TIM 导热",
    nodeCount: 4,
    definitionStatus: "可运行",
    latestRun: { id: "run-tim-003", status: "成功", time: "2026-10-28 09:20" },
    updatedAt: "2026-10-28 09:42"
  },
  {
    id: "wf-flow-001",
    name: "圆管非牛顿流动计算",
    description: "计算幂律流体在圆管内的压降与速度分布",
    type: "流动",
    nodeCount: 4,
    definitionStatus: "可运行",
    latestRun: { id: "run-flow-002", status: "运行中", time: "2026-10-28 10:05", progress: "4 / 5 节点完成" },
    updatedAt: "2026-10-28 10:08"
  },
  {
    id: "wf-tim-002",
    name: "填料取向对导热的影响",
    description: "比较随机、平面取向和轴向取向填料的导热差异",
    type: "TIM 导热",
    nodeCount: 4,
    definitionStatus: "草稿",
    latestRun: null,
    updatedAt: "2026-10-27 18:16"
  },
  {
    id: "wf-flow-002",
    name: "变径圆管压降分析",
    description: "分析入口收缩比变化对局部阻力与总压降的影响",
    type: "流动",
    nodeCount: 4,
    definitionStatus: "草稿",
    latestRun: { id: "run-flow-004", status: "失败", time: "2026-10-28 08:30", reason: "出口面未绑定，边界条件校验未通过" },
    updatedAt: "2026-10-28 08:34"
  },
  {
    id: "wf-tim-003",
    name: "界面热阻敏感性算例",
    description: "扫描颗粒—基体界面热阻，识别等效热导率敏感区间",
    type: "TIM 导热",
    nodeCount: 4,
    definitionStatus: "需更新",
    latestRun: { id: "run-tim-005", status: "成功", time: "2026-10-27 16:40", stale: true },
    updatedAt: "2026-10-28 09:10"
  }
];

export const demoRecords = Object.freeze(workflowSeed.map((item) => Object.freeze(item)));

export const filterOptions = {
  type: ["全部", "挤出模拟", "TIM 导热", "通用示例"],
  definitionStatus: ["全部", "草稿", "可运行", "需更新"],
  runStatus: ["全部", "尚未运行", "排队中", "运行中", "成功", "失败", "已取消"]
};

const CUSTOM_WORKFLOWS_KEY = "forge-workflows-v1";
const DELETED_WORKFLOWS_KEY = "forge-workflows-deleted-v1";
const builtins=[...workflowSeed,...multiscaleExampleDefinitions];
export const isBuiltinWorkflow=id=>builtins.some(w=>w.id===id);

export function removeWorkflowById(workflows, workflowId) {
  return workflows.filter((item) => item.id !== workflowId);
}

export function getDeletedWorkflowIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(DELETED_WORKFLOWS_KEY) || "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function getStoredWorkflows() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_WORKFLOWS_KEY) || "[]");
    const deletedIds = new Set(getDeletedWorkflowIds());
    return [...structuredClone(builtins), ...saved.filter(item=>!isBuiltinWorkflow(item.id))].filter((item) => !deletedIds.has(item.id)).map(item => {
      const current={...item,...JSON.parse(localStorage.getItem(`forge-workflow-meta:${item.id}`)||'{}')};
      const editor=JSON.parse(localStorage.getItem(`forge-editor-current:${item.id}`)||localStorage.getItem(`forge-editor-v1:${item.id}`)||'null');
      if(editor){const migrated=migrateEditor(editor);current.description=migrated.description??current.description;current.nodeCount=migrated.nodes.length;current.definitionStatus=migrated.definition;}
      else current.nodeCount=current.nodeCount||0;
      if(!current.applicationType&&item.type==='流动')current.applicationType='flow';current.type=algorithmName(current.type);return current;
    });
  } catch {
    return structuredClone(builtins).filter(item=>!getDeletedWorkflowIds().includes(item.id)).map(item=>({...item,type:algorithmName(item.type),...(item.type==='流动'?{applicationType:'flow'}:{})}));
  }
}

export function saveCustomWorkflows(allWorkflows) {
  const custom = allWorkflows.filter((item) => !isBuiltinWorkflow(item.id));
  localStorage.setItem(CUSTOM_WORKFLOWS_KEY, JSON.stringify(custom));
}

export function saveDeletedWorkflowIds(ids) {
  localStorage.setItem(DELETED_WORKFLOWS_KEY, JSON.stringify([...new Set(ids)]));
}
