import {validateAuthConfig,matchDemoUser,createDemoSession,validDemoSession} from './model.js';
const key='forge-demo-session';let config=null,expiryTimer;
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function initializeAuth(){const response=await fetch(new URL('../../config/demo-auth.json',import.meta.url),{cache:'no-store'});if(!response.ok)throw new Error('无法读取登录配置');config=validateAuthConfig(await response.json());armExpiry();}
export function authEnabled(){return config?.enabled!==false;}
export function authUser(){try{const session=JSON.parse(sessionStorage.getItem(key)||'null');return config&&validDemoSession(config,session)?session:null;}catch{return null;}}
export function isAuthenticated(){return config?.enabled===false||!!authUser();}
function armExpiry(){clearTimeout(expiryTimer);const user=authUser();if(user)expiryTimer=setTimeout(()=>{logout();window.dispatchEvent(new CustomEvent('forge:auth-expired'));},Math.min(2147483647,Math.max(1,user.expiresAt-Date.now())));}
export function logout(){clearTimeout(expiryTimer);try{sessionStorage.removeItem(key);}catch{}}
export function showLogin(root,onSuccess,{error:initialError='',retry=false}={}){
 document.body.classList.add('login-active');document.title='登录 · SynMatAI';
 document.querySelector('#editor-styles')?.remove();document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 root.innerHTML=`<main class="login-page"><div class="login-brand"><img src="/assets/brand/synmatai-logo.png" alt="SynMatAI 新研智材"><span>跨尺度模拟</span></div><section class="login-panel" aria-labelledby="login-title"><div class="login-heading"><h1 id="login-title">登录${escape(config?.platformName||'材料研发平台')}</h1><p>使用分配的演示账号访问工作空间</p></div><form class="demo-login-form"><label for="demo-username">账号</label><input id="demo-username" name="username" autocomplete="username" placeholder="请输入账号" required maxlength="100" ${retry?'disabled':''}><label for="demo-password">密码</label><div class="login-password"><input id="demo-password" name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required ${retry?'disabled':''}><button type="button" data-toggle-password aria-label="显示密码" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div><p class="login-error" role="alert">${escape(initialError)}</p><button class="login-submit" type="${retry?'button':'submit'}" ${retry?'data-retry-auth':''}>${retry?'重新加载配置':'登录'}</button></form><div class="login-help">账号由演示负责人提供，如需访问请联系负责人。</div></section><footer class="login-footer">SynMatAI 新研智材 <span>·</span> 演示环境</footer></main>`;
 const form=root.querySelector('form'),password=form.elements.password;
 root.querySelector('[data-toggle-password]').onclick=e=>{const button=e.currentTarget,show=password.type==='password';password.type=show?'text':'password';button.setAttribute('aria-label',show?'隐藏密码':'显示密码');button.setAttribute('aria-pressed',String(show));};
 root.querySelector('[data-retry-auth]')?.addEventListener('click',()=>location.reload());
 form.onsubmit=e=>{e.preventDefault();if(retry)return;const error=root.querySelector('.login-error'),user=matchDemoUser(config,form.elements.username.value,password.value);if(!user){error.textContent='账号或密码不正确，请重新输入。';password.value='';password.focus();return;}
 try{const session=createDemoSession(config,user);sessionStorage.setItem(key,JSON.stringify(session));if(!authUser())throw new Error('storage');}catch{error.textContent='无法保存登录状态，请允许浏览器存储后重试。';return;}
 password.value='';armExpiry();document.body.classList.remove('login-active');document.title='SynMatAI · 跨尺度模拟';onSuccess();};
}
