import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const required = [
  "index.html",
  "src/app.js",
  "src/data/workflows.js",
  "src/features/workflows/workflow-list.js",
  "src/features/editor-v1/workbench.js",
  "src/features/physical-model/workbench.js",
  "src/features/physical-model/model.js",
  "src/styles/editor-v1-source.css",
  "src/styles/physical-source.css",
  "src/shared/shell.js",
  "src/styles/main.css"
];

for (const file of required) {
  const content = await readFile(resolve(file), "utf8");
  if (!content.trim()) throw new Error(`${file} is empty`);
}

await import(pathToFileURL(resolve("src/data/workflows.js")));
await import(pathToFileURL(resolve("src/features/workflows/filtering.js")));
console.log("Project structure and modules are valid.");
