import {algorithmName} from '../editor/algorithm-inputs.js';
import { filterOptions } from "../../data/workflows.js";
import { filterWorkflows, hasActiveFilters, runStatusOf } from "./filtering.js";
import { icon } from "../../shared/icons.js";

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function optionList(options, selected,placeholder) {
  return options.map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value==='全部'&&placeholder?placeholder:value}</option>`).join("");
}

function statusTone(status) {
  return ({ "可运行": "positive", "成功": "positive", "运行中": "running", "需更新": "warning", "失败": "negative", "草稿": "neutral" })[status] || "neutral";
}

function rowTemplate(item) {
  const runStatus = runStatusOf(item);
  const run = item.latestRun;
  return `<tr data-workflow-id="${item.id}">
    <td class="workflow-cell">
      <button class="workflow-link" data-action="edit" data-id="${item.id}">${escapeHtml(item.name)}</button>
      <span>${escapeHtml(item.description)}</span>
    </td>
    <td><span class="type-tag">${escapeHtml(algorithmName(item.type))}</span></td>
    <td class="num"><strong>${item.nodeCount}</strong><span> 个节点</span></td>
    <td><span class="status-chip ${statusTone(item.definitionStatus)}">${escapeHtml(item.definitionStatus)}</span>${item.definitionStatus === "需更新" ? `<button class="inline-info" data-tip="工作流输入已变更；最近的成功记录仍保留，但基于旧输入。" aria-label="查看需更新说明">${icon("info")}</button>` : ""}</td>
    <td class="run-cell">
      <div><span class="run-dot ${statusTone(runStatus)}"></span><strong>${runStatus}</strong>${run?.stale ? '<span class="stale-note">旧输入</span>' : ""}</div>
      ${run ? `<span>${run.time}${run.progress ? ` · ${run.progress}` : ""}</span>` : '<span>暂无执行记录</span>'}
      ${run?.reason ? `<button class="failure-reason" data-tip="${escapeHtml(run.reason)}" data-action="locate" data-id="${item.id}">查看原因并定位</button>` : ""}
    </td>
    <td class="time-cell num">${item.updatedAt.replace(" ", "<br>")}</td>
    <td class="actions-cell">
      <button class="text-action" data-action="edit" data-id="${item.id}">编辑</button>
      ${run ? `<button class="text-action secondary" data-action="runs" data-id="${item.id}" data-run-id="${run.id}">查看作业</button>` : ""}
      <div class="more-wrap"><button class="more-btn" data-action="more" data-id="${item.id}" aria-label="更多操作" aria-expanded="false">${icon("more")}</button></div>
    </td>
  </tr>`;
}

export function renderWorkflowPage(state) {
  const rows = filterWorkflows(state.workflows, state.filters);
  const active = hasActiveFilters(state.filters);
  return `<main class="page-main" data-ui>
    <section class="page-heading" aria-labelledby="page-title">
      <div><h1 id="page-title">跨尺度建模与工作流管理</h1><p>维护可复用的建模与工作流配置，修改参数后可多次提交计算任务</p></div>
      <button class="btn primary" data-action="new">${icon("plus")}新建建模</button>
    </section>
    <section class="list-sheet" aria-label="工作流列表">
      <div class="filter-bar">
        <label class="search-field"><span class="sr-only">搜索工作流名称</span>${icon("search")}<input type="search" value="${escapeHtml(state.filters.query)}" placeholder="搜索工作流名称" data-filter="query" /></label>
        <label class="select-field"><span class="sr-only">算法类型</span><select data-filter="type" aria-label="算法类型" data-empty="${state.filters.type==='全部'}">${optionList(filterOptions.type, state.filters.type,'请选择算法类型')}</select></label>
        <label class="select-field"><span class="sr-only">定义状态</span><select data-filter="definitionStatus" aria-label="定义状态" data-empty="${state.filters.definitionStatus==='全部'}">${optionList(filterOptions.definitionStatus, state.filters.definitionStatus,'请选择定义状态')}</select></label>
        <button class="clear-filters ${active ? "" : "is-disabled"}" data-action="clear-filters" ${active ? "" : "disabled"}>清空筛选</button>
      </div>
      <div class="table-scroll">
        <table>
          <thead><tr><th>工作流名称</th><th>模拟算法</th><th class="num">节点数</th><th>定义状态</th><th>最近执行</th><th class="num"><button class="sort-button" data-action="sort">更新时间 ${icon("sort")}</button></th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>${rows.map(rowTemplate).join("")}</tbody>
        </table>
        ${rows.length ? "" : `<div class="empty-list"><div class="empty-flow-mark">${icon("flow")}</div><h2>${state.workflows.length && active ? "未找到匹配的工作流" : "还没有计算工作流"}</h2><p>${active ? "调整搜索词或筛选条件后再试。" : "创建一个工作流，开始连接微观与宏观计算。"}</p><button class="btn ${active ? "" : "primary"}" data-action="${active ? "clear-filters" : "new"}">${active ? "清空筛选" : "新建任务"}</button></div>`}
      </div>
      <footer class="list-footer"><span>共 ${rows.length} 条</span><div><label>每页 <select aria-label="每页条数"><option>10 条</option><option>20 条</option></select></label><button class="page-button" disabled>上一页</button><span class="current-page">1</span><button class="page-button" disabled>下一页</button></div></footer>
    </section>
  </main>`;
}

export function newWorkflowDialog() {
  return `<form class="dialog-form" data-form="new">
    <div class="dialog-copy"><h2>新建建模与工作流</h2></div>
    <label class="form-field"><span>建模名称</span><input name="name" value="未命名工作流" required maxlength="40" /></label>
    <label class="form-field"><span>备注说明</span><textarea name="description" rows="2" maxlength="300" placeholder="填写建模用途或补充说明（选填）"></textarea></label>
    <fieldset><legend>模拟算法</legend>
      <label class="start-option"><input type="radio" name="template" value="extrusion" /><span><strong>挤出模拟</strong><small>四段圆管模型，设置整体材料物性和入口/出口边界</small></span></label>
      <label class="start-option"><input type="radio" name="template" value="tim" /><span><strong>TIM 导热</strong><small>长方体与填料模型，设置热物性和温度边界</small></span></label>
      <label class="start-option selected"><input type="radio" name="template" value="blank" checked /><span><strong>通用示例</strong><small>保留基础节点，从空模型开始配置</small></span></label>
    </fieldset>
    <div class="dialog-actions"><button type="button" class="btn" data-dialog-close>取消</button><button class="btn primary" type="submit">创建并编辑</button></div>
  </form>`;
}

export function nameDialog(item, mode) {
  const copy = mode === "copy";
  return `<form class="dialog-form compact" data-form="${mode}" data-id="${item.id}">
    <div class="dialog-copy"><h2>${copy ? "复制工作流" : "重命名工作流"}</h2><p>${copy ? "节点与配置将被复制，历史作业不会带入。" : "新名称会立即更新到工作流列表。"}</p></div>
    <label class="form-field"><span>工作流名称</span><input name="name" value="${escapeHtml(copy ? `${item.name} 副本` : item.name)}" required maxlength="40" /></label>
    <div class="dialog-actions"><button type="button" class="btn" data-dialog-close>取消</button><button class="btn primary" type="submit">${copy ? "复制并打开编辑" : "保存名称"}</button></div>
  </form>`;
}

export function deleteWorkflowDialog(item) {
  const running = item.latestRun?.status === "运行中";
  return `<form class="dialog-form compact delete-workflow-form" data-form="delete" data-id="${item.id}">
    <div class="dialog-copy"><h2>删除工作流</h2><p>确定删除“${escapeHtml(item.name)}”吗？</p></div>
    <div class="delete-warning">${icon("info")}<p><strong>此操作不可撤销。</strong><span>工作流定义与编排入口将从列表中移除；已有作业与结果记录不会被删除。${running ? " 当前运行中的作业仍会继续执行。" : ""}</span></p></div>
    <div class="dialog-actions"><button type="button" class="btn" data-dialog-close>取消</button><button class="btn danger" type="submit">确认删除</button></div>
  </form>`;
}
