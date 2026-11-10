# 无限画布迁移源

本目录直接迁入 `D:\Agent4\prototype\SynMatAI\apps\web\src\features\research-flow` 的共享控制器。这也是源项目 `workflow/task-canvas.js` 中 `TaskCanvasWorkspace` 使用的底层实现，未迁入项目流程 V3 或计算页旧分栏依赖图。

- `canvas-view.js`：FlowCanvasV2 原控制器；平移、缩放、手势、框选、多选、拖动、吸附、端口、工具条、创建菜单、缩略导航。
- `canvas-model.js`：原相机、曲线、布局、选区、吸附及创建位置计算。
- `draft-model.js`：原纯布局依赖辅助函数。

必要的本项目适配为 ES 模块、独立本机存储键 `forge-calculation-canvas-v1`、选中通知、节点尺寸观察、embedded 嵌入模式及浮窗开关。`infinite-canvas.js` 对应源 `TaskCanvasWorkspace` 的适配职责，连接四阶段节点、方向校验、Copilot 上下文、定义撤销和下方常驻配置。当前以 `nodeTooltip:false` 关闭悬停、聚焦及主动打开节点属性浮窗，节点配置直接在下方面板进行。

原任务画布样式保存在 `src/styles/synmatai/research-flow.css` 和 `task-canvas.css`；`editor-canvas.css` 仅负责依赖图矩形视口的嵌入适配；embedded 选项保留 Copilot 的原始 DOM 位置，外部缩放按钮通过控制器接口操作相机。运行时没有外部源码路径依赖。
