import {algorithmName} from '../editor/algorithm-inputs.js';
export function runStatusOf(workflow) {
  return workflow.latestRun?.status || "尚未运行";
}

export function filterWorkflows(workflows, filters) {
  const query = filters.query.trim().toLocaleLowerCase("zh-CN");
  return workflows
    .filter((item) => !query || `${item.name} ${item.description}`.toLocaleLowerCase("zh-CN").includes(query))
    .filter((item) => filters.type === "全部" || algorithmName(item.type) === algorithmName(filters.type))
    .filter((item) => filters.definitionStatus === "全部" || item.definitionStatus === filters.definitionStatus)
    .filter((item) => filters.runStatus === "全部" || runStatusOf(item) === filters.runStatus)
    .sort((a, b) => {
      const direction = filters.sortDirection === "asc" ? 1 : -1;
      return a.updatedAt.localeCompare(b.updatedAt) * direction;
    });
}

export function hasActiveFilters(filters) {
  return Boolean(filters.query.trim()) || filters.type !== "全部" || filters.definitionStatus !== "全部" || filters.runStatus !== "全部";
}
