import {initializeAuth,showLogin} from './auth/auth.js';
const root=document.querySelector('#app');
root.innerHTML='<p class="login-loading" role="status">正在打开工作空间…</p>';
try{await initializeAuth();await import('./app.js');}
catch(error){console.error('演示入口初始化失败',error);showLogin(root,()=>location.reload(),{error:'登录配置加载失败，请检查配置文件或刷新重试。',retry:true});}
