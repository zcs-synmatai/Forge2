import {check} from './model.js';
export function inspectionStatuses(s,issues=null){
 if(issues===null&&s.checkedRevision!==s.revision)return {model:'待检验',workflow:'待检验'};
 const found=issues??check({...s,viewMode:'definition'});
 const isModel=i=>s.nodes.find(n=>n.id===i.nodeId)?.type==='macro'&&!['连线方向','开始路径','结束路径'].includes(i.field)&&!i.reason.includes('缺少前一阶段');
 return {model:found.some(isModel)?'需处理':'已检验',workflow:found.some(i=>!isModel(i))?'需处理':'已检验'};
}
