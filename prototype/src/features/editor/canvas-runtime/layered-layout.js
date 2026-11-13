// Layer long edges through virtual slots so shorter branches keep their lanes.
export function layeredPositions(tasks,edges,sizes={}){
 const ids=new Set(tasks.map(t=>t.id)),links=edges.filter(e=>ids.has(e[0])&&ids.has(e[1])),connected=new Set(links.flatMap(e=>e.slice(0,2))),nodes=new Map(tasks.map(t=>[t.id,{id:t.id,rank:0,before:[],after:[],virtual:false}]));
 for(const [a,b]of links){nodes.get(a).after.push(b);nodes.get(b).before.push(a);}
 const pending=new Map([...nodes].map(([id,n])=>[id,n.before.length])),queue=[...nodes.values()].filter(n=>!n.before.length).map(n=>n.id);
 for(let i=0;i<queue.length;i++){const n=nodes.get(queue[i]);for(const id of n.after){const to=nodes.get(id);to.rank=Math.max(to.rank,n.rank+1);pending.set(id,pending.get(id)-1);if(!pending.get(id))queue.push(id);}}
 if(queue.length!==tasks.length)throw new Error('流程存在循环，无法排列。');
 for(const n of nodes.values()){n.before=[];n.after=[];}
 links.forEach(([a,b],edgeIndex)=>{let previous=a;for(let rank=nodes.get(a).rank+1;rank<nodes.get(b).rank;rank++){let id='__layout_'+edgeIndex+'_'+rank;while(nodes.has(id))id+='_';nodes.set(id,{id,rank,before:[],after:[],virtual:true});nodes.get(previous).after.push(id);nodes.get(id).before.push(previous);previous=id;}nodes.get(previous).after.push(b);nodes.get(b).before.push(previous);});
 const layers=[];for(const n of nodes.values())if(n.virtual||connected.has(n.id))(layers[n.rank]??=[]).push(n);
 const order=()=>new Map(layers.flatMap(g=>(g||[]).map((n,i)=>[n.id,(i+.5)/g.length])));
 for(let pass=0;pass<12;pass++){const down=pass%2===0,index=order(),groups=down?layers:[...layers].reverse();for(const group of groups){if(!group)continue;const original=new Map(group.map((n,i)=>[n.id,i])),center=n=>{const peers=n[down?'before':'after'];return peers.length?peers.reduce((sum,id)=>sum+index.get(id),0)/peers.length:index.get(n.id);};group.sort((a,b)=>center(a)-center(b)||original.get(a.id)-original.get(b.id));}}
 const height=n=>n.virtual?0:(sizes[n.id]?.height||150),width=n=>sizes[n.id]?.width||244,gap=56,step=Math.max(150,...tasks.map(t=>sizes[t.id]?.height||150))+gap;
 const count=Math.max(1,...layers.map(g=>g?.length||0)),ys=new Map();for(const group of layers)if(group)group.forEach((n,i)=>ys.set(n.id,180+step*((count-group.length)/2+i)+step/2));
 const median=values=>{values.sort((a,b)=>a-b);const i=Math.floor(values.length/2);return values.length%2?values[i]:(values[i-1]+values[i])/2;};
 for(let pass=0;pass<8;pass++){const down=pass%2===0;for(const group of down?layers:[...layers].reverse()){if(!group)continue;const desired=group.map(n=>{const peers=n[down?'before':'after'],usable=peers.filter(id=>nodes.get(id)[down?'after':'before'].length===1);return usable.length?median(usable.map(id=>ys.get(id))):peers.length>1?median(peers.map(id=>ys.get(id))):ys.get(n.id);});
 // Repeated symmetric projection keeps order and real-node clearance without biasing a lane.
 for(let sweep=0;sweep<group.length*3;sweep++)for(let i=1;i<group.length;i++){const minimum=(height(group[i-1])+height(group[i]))/2+gap,overlap=minimum-(desired[i]-desired[i-1]);if(overlap>0){desired[i-1]-=overlap/2;desired[i]+=overlap/2;}}
 group.forEach((n,i)=>ys.set(n.id,desired[i]));}}
 const result={};let x=100;for(const group of layers){if(!group)continue;for(const n of group)if(!n.virtual)result[n.id]={x,y:ys.get(n.id)-height(n)/2};x+=Math.max(120,...group.filter(n=>!n.virtual).map(width))+112;}
 let y=Math.max(180,...Object.entries(result).map(([id,p])=>p.y+(sizes[id]?.height||150)))+96;for(const t of tasks)if(!connected.has(t.id)){result[t.id]={x:100,y};y+=(sizes[t.id]?.height||150)+gap;}
 return result;
}
