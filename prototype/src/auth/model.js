export function validateAuthConfig(config){
 if(!config||typeof config.enabled!=='boolean')throw new Error('请检查enabled配置。');
 if(!config.enabled)return config;
 if(!Number.isFinite(config.sessionHours)||config.sessionHours<=0||config.sessionHours>168)throw new Error('sessionHours须在0至168小时之间。');
 if(typeof config.sessionVersion!=='string'||!config.sessionVersion.trim())throw new Error('请设置sessionVersion。');
 if(!Array.isArray(config.users)||!config.users.length)throw new Error('请至少配置一个演示账号。');
 const names=new Set();for(const user of config.users){if(typeof user.username!=='string'||!user.username.trim()||user.username!==user.username.trim()||typeof user.password!=='string'||!user.password||names.has(user.username))throw new Error('账号不能为空、重复或包含首尾空格，密码不能为空。');names.add(user.username);}
 return config;
}
export function matchDemoUser(config,username,password){return config.users?.find(u=>u.username===username.trim()&&u.password===password)||null;}
export function createDemoSession(config,user,now=Date.now()){return {username:user.username,displayName:user.displayName||user.username,version:config.sessionVersion,expiresAt:now+config.sessionHours*3600000};}
export function validDemoSession(config,session,now=Date.now()){return !!(session&&session.version===config.sessionVersion&&Number.isFinite(session.expiresAt)&&session.expiresAt>now&&session.expiresAt<=now+config.sessionHours*3600000&&config.users?.some(u=>u.username===session.username));}
