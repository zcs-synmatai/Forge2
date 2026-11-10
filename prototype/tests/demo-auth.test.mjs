import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAuthConfig,matchDemoUser,createDemoSession,validDemoSession} from '../src/auth/model.js';
const config={enabled:true,platformName:'平台',sessionHours:8,sessionVersion:'v1',users:[{username:'demo',password:'Test!123',displayName:'演示'}]};
test('demo login matches configured credentials without trimming the password',()=>{
 assert.equal(matchDemoUser(config,' demo ','Test!123')?.displayName,'演示');
 assert.equal(matchDemoUser(config,'demo','test!123'),null);assert.equal(matchDemoUser(config,'demo','Test!123 '),null);
});
test('session expires and changing version or removing user invalidates it',()=>{
 const session=createDemoSession(config,config.users[0],1000);
 assert.ok(validDemoSession(config,session,1001));assert.ok(!('password'in session));
 assert.equal(validDemoSession(config,session,session.expiresAt),false);
 assert.equal(validDemoSession({...config,sessionVersion:'v2'},session,1001),false);
 assert.equal(validDemoSession({...config,users:[]},session,1001),false);
 assert.equal(validDemoSession(config,{...session,expiresAt:1e20},1001),false);
});
test('malformed account config fails closed; disabled config needs no credentials',()=>{
 assert.equal(validateAuthConfig(config),config);assert.doesNotThrow(()=>validateAuthConfig({enabled:false}));
 for(const change of [{users:[]},{sessionHours:0},{sessionVersion:''},{users:[config.users[0],config.users[0]]}])assert.throws(()=>validateAuthConfig({...config,...change}));
});
