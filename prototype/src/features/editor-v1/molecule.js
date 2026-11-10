export const elements=['C','H','O','N','S','P','F','Cl'];
export const moleculePresets={butane:'丁烷',ethanol:'乙醇',benzene:'苯'};
export function createMolecule(preset='butane'){
  const atom=(element,x,y,z)=>({element,x,y,z});let atoms,bonds;
  if(preset==='ethanol'){
    atoms=[atom('C',-1.25,0,0),atom('C',0,.65,0),atom('O',1.2,0,.2),atom('H',-2,.7,.1),atom('H',-1.4,-.5,.9),atom('H',-1.35,-.5,-.9),atom('H',0,1.25,.9),atom('H',0,1.25,-.9),atom('H',1.9,.55,.2)];
    bonds=[[0,1],[1,2],[0,3],[0,4],[0,5],[1,6],[1,7],[2,8]];
  }else if(preset==='benzene'){
    atoms=Array.from({length:6},(_,i)=>atom('C',Math.cos(i*Math.PI/3)*1.4,Math.sin(i*Math.PI/3)*1.4,0));
    atoms.push(...Array.from({length:6},(_,i)=>atom('H',Math.cos(i*Math.PI/3)*2.45,Math.sin(i*Math.PI/3)*2.45,0)));
    bonds=Array.from({length:6},(_,i)=>({from:i,to:(i+1)%6,order:i%2?1:2}));bonds.push(...Array.from({length:6},(_,i)=>({from:i,to:i+6,order:1})));
  }else{
    preset='butane';atoms=[atom('C',-1.8,.85,0),atom('C',-.6,-.15,0),atom('C',.65,.6,.3),atom('C',1.85,-.35,.3),atom('H',-2.65,.35,0),atom('H',-1.85,1.45,.85),atom('H',-1.85,1.45,-.85),atom('H',-.65,-.8,.9),atom('H',-.65,-.8,-.9),atom('H',.65,1.25,1.15),atom('H',.65,1.25,-.55),atom('H',2.7,.15,.3),atom('H',1.85,-1,.9),atom('H',1.85,-1,-.5)];
    bonds=[[0,1],[1,2],[2,3],[0,4],[0,5],[0,6],[1,7],[1,8],[2,9],[2,10],[3,11],[3,12],[3,13]];
  }
  return {name:moleculePresets[preset],preset,atoms,bonds:bonds.map(b=>Array.isArray(b)?{from:b[0],to:b[1],order:1}:b)};
}
export function moleculeFormula(molecule){const counts={};for(const a of molecule.atoms)counts[a.element]=(counts[a.element]||0)+1;return ['C','H',...Object.keys(counts).filter(e=>!['C','H'].includes(e)).sort()].filter(e=>counts[e]).map(e=>e+(counts[e]>1?counts[e]:'')).join('');}
export function validateMolecule(molecule){
  if(!molecule?.name?.trim())return '请填写分子名称';
  if(!Array.isArray(molecule.atoms)||!molecule.atoms.length)return '至少需要一个原子';
  if(molecule.atoms.length>100)return '当前原型最多预览 100 个原子';
  if(molecule.atoms.some(a=>!elements.includes(a.element)||!['x','y','z'].every(k=>Number.isFinite(a[k]))))return '请检查原子元素与坐标，坐标必须是有限数值';
  const positions=new Set();for(const a of molecule.atoms){const key=[a.x,a.y,a.z].join(',');if(positions.has(key))return '原子坐标重复，请调整后再应用';positions.add(key);}
  const seen=new Set();for(const b of molecule.bonds){if(!Number.isInteger(b.from)||!Number.isInteger(b.to)||!molecule.atoms[b.from]||!molecule.atoms[b.to]||b.from===b.to)return '化学键必须连接两个不同的有效原子';if(![1,2,3].includes(b.order))return '键级只支持单键、双键或三键';const key=[b.from,b.to].sort((a,b)=>a-b).join('-');if(seen.has(key))return '同一对原子不能重复添加化学键';seen.add(key);}
  return null;
}
export function removeAtom(molecule,index){molecule.atoms.splice(index,1);molecule.bonds=molecule.bonds.filter(b=>b.from!==index&&b.to!==index).map(b=>({...b,from:b.from>index?b.from-1:b.from,to:b.to>index?b.to-1:b.to}));}
