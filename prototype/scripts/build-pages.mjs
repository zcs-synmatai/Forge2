import {cp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const out=join(root,'dist'),base='/Forge2';
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['src','config','case'])await cp(join(root,name),join(out,name),{recursive:true});
await cp(join(root,'public'),out,{recursive:true});
await cp(join(root,'index.html'),join(out,'index.html'));
async function transform(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await transform(path);else if(/\.(js|css|html)$/.test(path)){let text=await readFile(path,'utf8');text=text.replaceAll('/assets/',base+'/assets/').replaceAll('/src/',base+'/src/').replaceAll('/case/',base+'/case/');text=text.replaceAll('href="/multiscale',`href="${base}/multiscale`).replaceAll('href="/demo',`href="${base}/demo`);if(path===join(out,'src','app.js')){text=text.replaceAll('location.pathname',`(location.pathname.replace(/^\\/Forge2(?=\\/|$)/, '') || '/')`);text=text.replace('history.pushState({}, "", path);',`history.pushState({}, "", path.startsWith('${base}/')?path:'${base}'+path);`);}await writeFile(path,text);}}}
await transform(out);
const recovery=`<script>const r=new URLSearchParams(location.search).get('__route');if(r&&r.startsWith('/Forge2/'))history.replaceState(null,'',r);</script>`;
const html=await readFile(join(out,'index.html'),'utf8');await writeFile(join(out,'index.html'),html.replace('<head>','<head>'+recovery));
await writeFile(join(out,'404.html'),`<!doctype html><meta charset="utf-8"><script>location.replace('/Forge2/?__route='+encodeURIComponent(location.pathname+location.search+location.hash));</script>`);
await writeFile(join(out,'.nojekyll'),'');console.log('GitHub Pages output: '+out);
