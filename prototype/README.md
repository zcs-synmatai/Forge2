# Forge 多尺度计算原型

原型默认启用演示登录。账号与密码在 [`config/demo-auth.json`](./config/demo-auth.json) 配置，默认账号`demo`、密码`SynMatAI2026!`。配置及静态部署说明见[演示登录配置](./docs/演示登录配置.md)。这是前端演示门槛，不用于保护敏感数据。

当前已实现“计算工作流”列表和独立的工作流编辑工作台，提供节点配置、参数映射、依赖校验、演示执行与报告预览。工作台基于 SynMatAI 当前计算模拟页面迁移，在本项目独立维护。

```powershell
npm run dev
```

打开 `http://127.0.0.1:4173/multiscale/workflows`。

当前工作台：`/multiscale/workflows/wf-tim-001/edit`，保留 V1 内容并将模型配置移至上方，工作流画布移至下方，左侧 Copilot 支持收起展开。原布局保留为“演示说明 → 工作流编辑 V1”，可直达 `/demo/workflow-editor-v1?workflowId=wf-tim-001`。启动目录为 `D:\Forge2.0\prototype`；没有 npm 时执行 `node scripts/dev-server.mjs`。

## 目录

- `src/app.js`：路由与页面状态
- `src/data/`：跨页面共用演示数据
- `src/features/workflows/`：工作流列表页渲染与交互
- `src/features/editor/`：工作台、依赖模型、几何预览
- `src/features/editor-v1/`：保留的 V1 工作流编辑版本
- `src/features/physical-model/`：当前物理建模与材料窗口，见 `docs/physical-model.md`
- `src/features/editor/canvas-runtime/`：源任务工作台共用的无限画布控制器与相机模型
- `src/styles/synmatai/`：源计算模拟页面的本地样式副本
- `src/shared/`：公共外壳与 SVG 图标
- `src/styles/`：品牌令牌、公共布局、组件与页面样式
- `public/assets/brand/`：迁移自参考项目的品牌资源
- `tests/`：数据与筛选逻辑测试

迁移来源、独立开发边界与新增交互见 `docs/editor-migration.md`。所有计算、模型预览和报告均为本地原型演示。

两个布局均使用“微观模拟 → 宏观建模 → 计算调度 → 结果呈现”四类节点。当前版只将宏观建模 / 节点配置窗口放到画布上方，不替换原有区域。TIM 和圆管流动均为模型案例；V1 保留独立演示数据。

V1 画布操作沿用源任务工作台：V/H 切换指针和抓手，滚轮平移、Ctrl+滚轮缩放、Shift+滚轮横移、空格拖动；单击选中、双击配置、四侧端口连接。创建菜单、框选多选、吸附、自动布局、缩略图、撤销/重做均复用源实现。

当前节点链路为：开始 → 微观建模 → 微观物性计算 → 宏观建模 → 计算调度 → 结果呈现 → 结束。一个微观模型可对应多个物性计算；节点配置通过弹窗完成，上方始终显示宏观模型。运行前校验有向无环依赖、唯一入口／出口及所有分支的完整连接。


当前界面采用统一可读性字号：正文和表单 14px、导航 15px、辅助说明约 12px，按钮和输入框同步扩大。工作流节点默认以 80% 视图定位，保留适应全部与 100% 缩放。样式在 `src/styles/readability.css` 集中维护，归档 V1 不应用该样式。
