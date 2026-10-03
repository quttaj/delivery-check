type Sink=(line:string)=>void;
type Context={traceId:string;photoIndex?:number};

const safeBox=(value:any)=>({x:Number(value?.x),y:Number(value?.y),w:Number(value?.w),h:Number(value?.h)});
const safeOccurrence=(value:any)=>({
 occurrenceRef:String(value?.occurrenceRef||''),
 observedSku:String(value?.observedSku||''),
 textBox:safeBox(value?.textBox)
});
const emit=(enabled:boolean,event:Record<string,unknown>,sink:Sink)=>{
 if(enabled)sink(`[DeliveryCheck SKU diagnostics] ${JSON.stringify(event)}`);
};

export function logOccurrenceStage(enabled:boolean,context:Context,stage:'raw_model_occurrences'|'validated_occurrences',occurrences:unknown,sink:Sink=console.info){
 emit(enabled,{...context,stage,occurrences:Array.isArray(occurrences)?occurrences.map(safeOccurrence):[]},sink);
}

export function logDeduplication(enabled:boolean,context:Context,kept:unknown,removed:unknown,sink:Sink=console.info){
 const safeRemoved=Array.isArray(removed)?removed.map((item:any)=>({
  removed:safeOccurrence(item?.removed),keptOccurrenceRef:String(item?.keptOccurrenceRef||''),reason:String(item?.reason||'')
 })):[];
 emit(enabled,{...context,stage:'deduplication',kept:Array.isArray(kept)?kept.map(safeOccurrence):[],removed:safeRemoved},sink);
}

export function countSkuOccurrences(observations:any[]){
 const counts=new Map<string,{sku:string;count:number}>();
 for(const observation of observations){
  const sku=String(observation?.attributes?.find((attribute:any)=>attribute?.field==='sku')?.observed||'').trim();
  const key=sku.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!key)continue;
  const current=counts.get(key)||{sku,count:0};
  current.count+=1;counts.set(key,current);
 }
 return [...counts.values()];
}

export function logFinalSkuCounts(enabled:boolean,traceId:string,observations:any[],sink:Sink=console.info){
 emit(enabled,{traceId,stage:'final_sku_counts',counts:countSkuOccurrences(observations)},sink);
}
