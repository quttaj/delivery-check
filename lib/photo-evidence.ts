export type EvidenceBox={x:number;y:number;w:number;h:number};
export type DeduplicationRemoval={removed:any;keptOccurrenceRef:string;reason:string};

const clamp=(value:unknown,min:number,max:number)=>Math.min(max,Math.max(min,Number.isFinite(Number(value))?Number(value):min));
const cleanBox=(candidate:any):EvidenceBox=>{
 const x=clamp(candidate?.x,0,.999),y=clamp(candidate?.y,0,.999);
 return {x,y,w:clamp(candidate?.w,.001,1-x),h:clamp(candidate?.h,.001,1-y)};
};
const area=(box:EvidenceBox)=>box.w*box.h;
const intersectionArea=(a:EvidenceBox,b:EvidenceBox)=>{
 const width=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
 const height=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 return width*height;
};
const normalizedSku=(value:unknown)=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');

function duplicateEvidence(a:any,b:any){
 if(!normalizedSku(a.observedSku)||normalizedSku(a.observedSku)!==normalizedSku(b.observedSku))return null;
 const first=a.textBox as EvidenceBox,second=b.textBox as EvidenceBox;
 const intersection=intersectionArea(first,second);
 const firstArea=area(first),secondArea=area(second);
 const smaller=Math.min(firstArea,secondArea),larger=Math.max(firstArea,secondArea);
 const overlap=intersection/Math.max(.000001,smaller);
 const union=firstArea+secondArea-intersection;
 const iou=intersection/Math.max(.000001,union);
 const areaRatio=smaller/Math.max(.000001,larger);
 const dx=Math.abs(first.x+first.w/2-(second.x+second.w/2));
 const dy=Math.abs(first.y+first.h/2-(second.y+second.h/2));
 const sameRegion=overlap>=.92&&iou>=.78&&areaRatio>=.78
  &&dx<=Math.max(.004,Math.min(first.w,second.w)*.12)
  &&dy<=Math.max(.004,Math.min(first.h,second.h)*.12);
 return sameRegion?{overlap,iou,areaRatio,dx,dy}:null;
}

// Normalize representation without dropping observations. This lets the route
// validate and log every model-returned occurrence before deduplication.
export function normalizeModelEvidence(value:any){
 if(!value||typeof value!=='object'||!Array.isArray(value.observations))return value;
 return {...value,observations:value.observations.map((source:any)=>({
  ...source,
  occurrenceRef:String(source?.occurrenceRef||'').trim(),
  observedSku:String(source?.observedSku||'').trim(),
  textBox:cleanBox(source?.textBox)
 }))};
}

export function deduplicateModelEvidence(value:any):{evidence:any;removed:DeduplicationRemoval[]}{
 if(!value||typeof value!=='object'||!Array.isArray(value.observations))return {evidence:value,removed:[]};
 const kept:any[]=[],removed:DeduplicationRemoval[]=[];
 for(const item of value.observations){
  const duplicate=kept.map(previous=>({previous,metrics:duplicateEvidence(previous,item)})).find(candidate=>candidate.metrics);
  if(!duplicate){kept.push(item);continue;}
  const metrics=duplicate.metrics!;
  removed.push({
   removed:item,
   keptOccurrenceRef:String(duplicate.previous.occurrenceRef||''),
   reason:`Same normalized SKU and near-identical text region: overlap ${(metrics.overlap*100).toFixed(1)}%, IoU ${(metrics.iou*100).toFixed(1)}%, area ratio ${(metrics.areaRatio*100).toFixed(1)}%, center delta ${metrics.dx.toFixed(4)}/${metrics.dy.toFixed(4)}.`
  });
 }
 return {evidence:{...value,observations:kept},removed};
}

export function evidenceBoxForObservation(item:any):EvidenceBox{
 return cleanBox(item?.textBox);
}
