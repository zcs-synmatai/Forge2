const key='forge-sidebar-collapsed';
export function sidebarCollapsed(){try{return localStorage.getItem(key)==='true';}catch{return false;}}
export function toggleSidebar(){
 const sidebar=document.querySelector('#sidebar');if(!sidebar)return;
 const collapsed=!sidebar.classList.contains('is-collapsed');
 sidebar.classList.toggle('is-collapsed',collapsed);sidebar.classList.toggle('is-expanded',!collapsed);
 const button=sidebar.querySelector('[data-sidebar-toggle]');
 button.setAttribute('aria-expanded',String(!collapsed));button.setAttribute('aria-label',collapsed?'展开主菜单':'收起主菜单');button.title=collapsed?'展开主菜单':'收起主菜单';
 button.querySelector('span').textContent=collapsed?'展开菜单':'收起菜单';
 sidebar.querySelector('.demo-menu')?.removeAttribute('open');
 try{localStorage.setItem(key,String(collapsed));}catch{}
 window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('forge:sidebar-resize'));
}
