import { icon } from "./icons.js";
import {sidebarCollapsed} from './sidebar.js';
import {authUser,authEnabled} from '../auth/auth.js';

const navItems = [
  ["molecule", "首页", "molecules"],
  ["grid", "建模", "modeling"],
  ["file", "任务管理", "runs"]
];

export function renderShell(content, active = "workflows", options = {}) {
  const currentUser=authUser();const userName=String(currentUser?.displayName||'林晓').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const collapsed=sidebarCollapsed();
  return `
    <aside class="sidebar ${collapsed?'is-collapsed':'is-expanded'}" id="sidebar">
      <a class="brand" href="/multiscale/workflows" data-route aria-label="SynMatAI 新研智材">
        <img src="/assets/brand/synmatai-logo.png" alt="SynMatAI 新研智材" />
      </a>
      <div class="workspace-label">材料研发平台</div>
      <nav aria-label="系统导航">
        ${navItems.map(([glyph, label, key]) => `<button class="nav-item ${active === key ? "active" : ""}" data-nav="${key}" aria-label="${label}" title="${label}" ${active === key ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${label}</span></button>`).join("")}
      </nav>
      <div class="sidebar-bottom">
        <details class="demo-menu recycle-menu"><summary class="help-btn" aria-label="回收站" title="回收站：备用菜单">${icon('trash')}<span>回收站</span><i class="demo-caret">${icon('chevron')}</i></summary><div class="demo-submenu"><button data-nav="micro-simulation">微观模拟</button><button data-nav="workflows" ${active==='workflows'?'aria-current="page"':''}>跨尺度模拟</button></div></details>
        <button class="sidebar-toggle" data-sidebar-toggle aria-controls="sidebar" aria-expanded="${!collapsed}" aria-label="${collapsed?'展开主菜单':'收起主菜单'}" title="${collapsed?'展开主菜单':'收起主菜单'}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m7-11-3 3 3 3"/></svg><span>${collapsed?'展开菜单':'收起菜单'}</span></button>
        <details class="demo-menu" ${options.isV1?'open':''}><summary class="help-btn" aria-label="演示说明">${icon("info")}<span>演示说明</span><i class="demo-caret">${icon('chevron')}</i></summary><div class="demo-submenu"><button data-demo-help>原型使用说明</button><a href="/demo/workflow-editor-v1?workflowId=${encodeURIComponent(options.workflowId||'wf-tim-001')}" data-route class="${options.isV1?'selected':''}" ${options.isV1?'aria-current="page"':''}>工作流编辑 <span>V1</span></a></div></details>
        <div class="profile"><span class="avatar">${userName.slice(0,1)}</span><div><strong>${userName}</strong><small>材料研究员</small></div>${authEnabled()?'<button class="demo-logout" data-demo-logout aria-label="退出登录" title="退出登录"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h12"/></svg></button>':'<span class="profile-dots">···</span>'}</div>
      </div>
    </aside>
    <div class="app-shell">
      <header class="topbar">
        <button class="mobile-menu" data-mobile-menu aria-label="打开导航">${icon("menu")}</button>
        <div class="breadcrumbs"><span>材料研发平台</span>${icon("chevron")}<strong>${active === "runs" ? "任务管理" : active === "modeling" ? "建模" : "跨尺度模拟"}</strong></div>
        <span class="prototype-badge">原型演示</span>
        <button class="icon-btn" aria-label="帮助" data-demo-help>${icon("info")}</button>
      </header>
      ${content}
    </div>`;
}
