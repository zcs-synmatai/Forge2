import {multiscaleExampleDefinitions} from '../src/features/editor/task-examples.js';
import test from "node:test";
import assert from "node:assert/strict";
import { getStoredWorkflows, removeWorkflowById, saveDeletedWorkflowIds, workflowSeed } from "../src/data/workflows.js";
import { filterWorkflows, runStatusOf } from "../src/features/workflows/filtering.js";

const baseFilters = { query: "", type: "全部", definitionStatus: "全部", runStatus: "全部", sortDirection: "desc" };

test("seed includes the five required demo workflows", () => {
  assert.equal(workflowSeed.length, 5);
  assert.deepEqual(workflowSeed.map((item) => item.id), ["wf-tim-001", "wf-flow-001", "wf-tim-002", "wf-flow-002", "wf-tim-003"]);
});

test("search for 导热 finds matching records", () => {
  const result = filterWorkflows(workflowSeed, { ...baseFilters, query: "导热" });
  assert.equal(result.length, 2);
  assert.ok(result.every((item) => `${item.name}${item.description}`.includes("导热")));
});

test("type and independent status filters compose", () => {
  const result = filterWorkflows(workflowSeed, { ...baseFilters, type: "流动", definitionStatus: "草稿", runStatus: "失败" });
  assert.deepEqual(result.map((item) => item.id), ["wf-flow-002"]);
});

test("a workflow without a run has 尚未运行 status", () => {
  assert.equal(runStatusOf(workflowSeed.find((item) => item.id === "wf-tim-002")), "尚未运行");
});

test("removeWorkflowById removes only the selected workflow", () => {
  const result = removeWorkflowById(workflowSeed, "wf-flow-001");
  assert.equal(result.length, workflowSeed.length - 1);
  assert.ok(!result.some((item) => item.id === "wf-flow-001"));
  assert.equal(workflowSeed.length, 5);
});

test("deleted seed workflows stay hidden after data reload", () => {
  const values = new Map();
  global.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
  saveDeletedWorkflowIds(["wf-tim-001"]);
  const result = getStoredWorkflows();
  assert.equal(result.length, workflowSeed.length + multiscaleExampleDefinitions.length - 1);
  assert.ok(!result.some((item) => item.id === "wf-tim-001"));
  delete global.localStorage;
});
