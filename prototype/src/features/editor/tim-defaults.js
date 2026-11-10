// Upgrade the old untouched 10 × 10 × 2 demo preset; keep custom geometry and run snapshots.
export function initializeTimCubeDefaults(s){
 let changed=false;
 for(const n of s.nodes.filter(n=>n.type==='macro'&&n.params.case==='tim')){
  const p=n.params;if(p.timCubeDefaultVersion===1)continue;
  const geometryEdited=s.history?.some(item=>item.id===n.id&&/更新几何|保存节点参数/.test(item.text||''));
  if(p.length===10&&p.width===10&&p.height===2&&!geometryEdited&&!p.modeling?.primitives?.length){p.height=10;if(p.modeling)p.modeling.height=10;changed=true;}
  p.timCubeDefaultVersion=1;
 }
 return changed;
}
