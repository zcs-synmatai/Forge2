import {esc} from './model.js';
import {createMolecule,elements,moleculePresets,removeAtom,validateMolecule} from './molecule.js';
import {renderMolecule} from './molecule-preview.js';

export function openMoleculeEditor(openDialog,initial,onApply){
  let draft=structuredClone(initial);
  const dialog=openDialog(`<form class="dialog-form molecule-editor"><div class="dialog-copy"><h2>修改分子</h2><p>编辑当前微观节点的本地结构草稿，应用后下游结果需重新计算。</p></div><div class="molecule-editor-layout"><div class="molecule-editor-preview"></div><div class="molecule-editor-fields"><label class="field"><span>分子名称</span><input name="moleculeName" aria-label="分子名称" maxlength="80" required value="${esc(draft.name)}"></label><label class="field"><span>载入示例结构</span><select name="moleculePreset" aria-label="载入示例结构"><option value="custom">当前结构</option>${Object.entries(moleculePresets).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')}</select></label><div class="molecule-table-heading"><h3>原子与坐标（Å）</h3><button type="button" class="btn" data-molecule-add-atom>＋ 添加原子</button></div><div class="molecule-table-scroll"><table class="molecule-table molecule-atoms-table"><thead><tr><th>编号</th><th>元素</th><th>X</th><th>Y</th><th>Z</th><th></th></tr></thead><tbody data-molecule-atoms></tbody></table></div><div class="molecule-table-heading"><h3>化学键</h3><button type="button" class="btn" data-molecule-add-bond>＋ 添加化学键</button></div><div class="molecule-table-scroll"><table class="molecule-table"><thead><tr><th>起点原子</th><th>终点原子</th><th>键级</th><th></th></tr></thead><tbody data-molecule-bonds></tbody></table></div></div></div><p class="binding-note">结构示意，不执行化学有效性校验、构象优化或真实微观计算。修改前的任务结果与执行快照保留。</p><p class="editor-form-error" role="alert" data-molecule-error></p><div class="dialog-actions"><button class="btn" type="button" data-dialog-close>取消</button><button class="btn primary" type="submit">应用修改</button></div></form>`);
  dialog.classList.add('molecule-dialog');
  const viewer=renderMolecule(dialog.querySelector('.molecule-editor-preview'),draft);
  const error=message=>dialog.querySelector('[data-molecule-error]').textContent=message||'';
  function tables(){
    dialog.querySelector('[data-molecule-atoms]').innerHTML=draft.atoms.map((a,i)=>`<tr><td>${i+1}</td><td><select data-atom="${i}" data-atom-field="element" aria-label="原子 ${i+1} 元素">${elements.map(e=>`<option ${e===a.element?'selected':''}>${e}</option>`).join('')}</select></td>${['x','y','z'].map(k=>`<td><input type="number" step="any" data-atom="${i}" data-atom-field="${k}" value="${a[k]}" aria-label="原子 ${i+1} ${k.toUpperCase()}"></td>`).join('')}<td><button type="button" class="text-btn" data-molecule-remove-atom="${i}" aria-label="删除原子 ${i+1}">删除</button></td></tr>`).join('');
    dialog.querySelector('[data-molecule-bonds]').innerHTML=draft.bonds.map((b,i)=>`<tr>${['from','to'].map(k=>`<td><select data-bond="${i}" data-bond-field="${k}" aria-label="化学键 ${i+1} ${k==='from'?'起点':'终点'}">${draft.atoms.map((a,j)=>`<option value="${j}" ${j===b[k]?'selected':''}>${j+1} · ${a.element}</option>`).join('')}</select></td>`).join('')}<td><select data-bond="${i}" data-bond-field="order" aria-label="化学键 ${i+1} 键级">${[[1,'单键'],[2,'双键'],[3,'三键']].map(([n,label])=>`<option value="${n}" ${n===b.order?'selected':''}>${label}</option>`).join('')}</select></td><td><button type="button" class="text-btn" data-molecule-remove-bond="${i}" aria-label="删除化学键 ${i+1}">删除</button></td></tr>`).join('')||'<tr><td colspan="4">暂无化学键</td></tr>';
    dialog.querySelector('[data-molecule-add-atom]').disabled=draft.atoms.length>=100;
    dialog.querySelector('[data-molecule-add-bond]').disabled=draft.atoms.length<2;
    update();
  }
  function update(){const message=validateMolecule(draft);error(message);if(!draft.atoms.some(a=>!['x','y','z'].every(k=>Number.isFinite(a[k]))))viewer.update(draft);}
  dialog.addEventListener('input',e=>{
    if(e.target.name==='moleculeName')draft.name=e.target.value;
    if(e.target.dataset.atom!==undefined){const a=draft.atoms[Number(e.target.dataset.atom)],key=e.target.dataset.atomField;a[key]=key==='element'?e.target.value:e.target.value===''?NaN:Number(e.target.value);draft.preset='custom';}
    if(e.target.dataset.bond!==undefined){draft.bonds[Number(e.target.dataset.bond)][e.target.dataset.bondField]=Number(e.target.value);draft.preset='custom';}
    update();
  });
  dialog.addEventListener('change',e=>{if(e.target.name==='moleculePreset'&&e.target.value!=='custom'){draft=createMolecule(e.target.value);dialog.querySelector('[name="moleculeName"]').value=draft.name;tables();}});
  dialog.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-molecule-add-atom')){draft.atoms.push({element:'C',x:Math.max(0,...draft.atoms.map(a=>Number.isFinite(a.x)?a.x:0))+1.4,y:0,z:0});draft.preset='custom';tables();}
    if(b.dataset.moleculeRemoveAtom!==undefined){removeAtom(draft,Number(b.dataset.moleculeRemoveAtom));draft.preset='custom';tables();}
    if(b.hasAttribute('data-molecule-add-bond')){let pair;for(let i=0;i<draft.atoms.length&&!pair;i++)for(let j=i+1;j<draft.atoms.length&&!pair;j++)if(!draft.bonds.some(a=>a.from===i&&a.to===j||a.from===j&&a.to===i))pair={from:i,to:j,order:1};if(pair){draft.bonds.push(pair);draft.preset='custom';tables();}else error('所有原子对均已连接');}
    if(b.dataset.moleculeRemoveBond!==undefined){draft.bonds.splice(Number(b.dataset.moleculeRemoveBond),1);draft.preset='custom';tables();}
  });
  dialog.querySelector('form').onsubmit=e=>{e.preventDefault();draft.name=draft.name.trim();const message=validateMolecule(draft);if(message){error(message);return;}onApply(structuredClone(draft));dialog.close();};
  dialog.addEventListener('close',()=>viewer.destroy(),{once:true});tables();
}
