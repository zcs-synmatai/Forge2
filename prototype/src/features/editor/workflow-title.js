import {algorithmName} from './algorithm-inputs.js';
export function workflowTitle(s){
 const algorithm=algorithmName(s.nodes.find(n=>n.type==='macro')?.params.case||s.applicationType);
 const name=String(s.name||'');
 // Older example names already include the algorithm. Avoid displaying it twice.
 const suffix=name.startsWith(algorithm)?name.slice(algorithm.length):null;
 return {algorithm,name:suffix!==null&&/^\s*[·.．]/.test(suffix)?suffix.replace(/^\s*[·.．]\s*/,''):name};
}
