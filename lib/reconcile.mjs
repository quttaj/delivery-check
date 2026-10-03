// Vision proposes independently readable printed-SKU regions. This
// deterministic reducer owns every match, quantity comparison and verdict.
export function reconcile(rows,observations,captureIssue=''){
 const groups=new Map();
 for(const observation of observations){
  if(!observation.unitId)continue;
  const key=`${observation.photoIndex}:${observation.unitId}`;
  groups.set(key,[...(groups.get(key)||[]),observation]);
 }

 const units=[...groups].map(([id,evidence])=>{
  const checks=evidence.flatMap(item=>item.attributes.filter(attribute=>attribute.field==='sku'));
  const rowIds=[...new Set(evidence.map(item=>item.rowId).filter(Boolean))];
  const statuses=[...new Set(checks.map(check=>check.status))];
  const conflict=rowIds.length>1||statuses.length>1;
  const check=checks[0]||{field:'sku',expected:'',observed:'',status:'unreadable'};
  return {id,evidence,rowId:rowIds.length===1?rowIds[0]:null,check,conflict};
 });

 // A readable non-matching SKU is its own finding even when it is similar
 // enough to reference one expected row. It never replaces that row's exact
 // SKU quantity verdict.
 const nonMatchingGroups=new Map();
 for(const unit of units.filter(item=>!item.conflict&&(item.check.status==='unexpected'||item.check.status==='mismatch'))){
  const key=`${unit.check.status}:${unit.check.observed}:${unit.rowId||''}`;
  const current=nonMatchingGroups.get(key)||{id:key,sku:unit.check.observed,status:unit.check.status,rowId:unit.rowId,count:0,evidence:[],unitIds:[]};
  current.count+=1;current.evidence.push(...unit.evidence);current.unitIds.push(unit.id);nonMatchingGroups.set(key,current);
 }
 const rowById=new Map(rows.map(row=>[row.id,row]));
 const unexpected=[...nonMatchingGroups.values()].map(finding=>{
  const expected=finding.rowId?rowById.get(finding.rowId):null;
  const noun=finding.count===1?'occurrence':'occurrences';
  const reason=finding.status==='mismatch'&&expected
   ?`${finding.count} independently readable ${noun} show SKU ${finding.sku}, different from expected SKU ${expected.sku} on row ${expected.id}.`
   :`${finding.count} independently readable ${noun} show SKU ${finding.sku}, which does not match any packing-list row.`;
  return {...finding,expectedSku:expected?.sku||null,reason};
 });

 const unverified=units.filter(unit=>unit.conflict||unit.check.status==='unreadable').map(unit=>({
  id:unit.id,sku:unit.check.observed||'',status:'unverified',count:1,reason:unit.conflict?'Conflicting evidence was returned for this printed occurrence. It was not counted.':'This observation does not contain a readable SKU and was not counted.',evidence:unit.evidence
 }));
 const deliveryCompletenessUnverified=Boolean(captureIssue)||unverified.length>0;

 const reportRows=rows.map(row=>{
  const related=units.filter(unit=>unit.rowId===row.id&&!unit.conflict);
  const counted=related.filter(unit=>unit.check.status==='matched');
  const wrong=related.filter(unit=>unit.check.status==='mismatch');
  let status='unverified';
  let reason='No independently readable occurrence of this SKU is supported by the images. This is not proof that the item was not delivered.';
  if(counted.length>row.quantity){
   status='extra';
   reason=`${counted.length} independently readable occurrences of SKU ${row.sku} are visible; ${row.quantity} ordered.`;
  }else if(counted.length===row.quantity){
   status='matched';
   reason=`SKU ${row.sku} and visible quantity match the document row.`;
   if(deliveryCompletenessUnverified)reason+=' The confirmed count is established, but overall delivery completeness remains unverified.';
  }else if(counted.length){
   status='partial';
   reason=`${counted.length} independently readable occurrence(s) of SKU ${row.sku} are visible; ${row.quantity} ordered. The remainder is unverified, not missing.`;
  }
  if(wrong.length)reason+=` ${wrong.length} related wrong-SKU occurrence(s) are reported separately.`;
  const evidence=observations.filter(observation=>observation.rowId===row.id);
  return {...row,name:row.description,count:counted.length,confirmedCount:counted.length,status,reason,units:related,evidence,unitIds:counted.map(unit=>unit.id)};
 });

 const allVerified=!captureIssue&&!unexpected.length&&!unverified.length&&reportRows.every(row=>row.status==='matched');
 return {rows:reportRows,unexpected,unverified,allVerified};
}
