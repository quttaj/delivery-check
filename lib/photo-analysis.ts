import {reconcile} from './reconcile.mjs';
import {MAX_ANALYZE_REQUEST_BYTES} from './image-preparation';

type ResponseStatus={ok:boolean;status:number;statusText?:string};
type Metrics={
 elapsedMs?:number;model?:string;inputTokens?:number;outputTokens?:number;cachedTokens?:number;
 attempts?:number;costUSD?:number|null;pricingAssumptions?:string|null
};
export type PhotoAnalysisResult={photoEvidence:any[];metrics:Metrics};

export class PhotoAnalysisError extends Error{
 metrics:Metrics|null;
 constructor(message:string,metrics:Metrics|null=null){super(message);this.name='PhotoAnalysisError';this.metrics=metrics;}
}

export function createPhotoAnalysisPayload({captureMode,captureConfirmed,segments,photo,photoIndex,photoCount}:{captureMode:string;captureConfirmed:boolean;segments:unknown[];photo:{name:string;data:string};photoIndex:number;photoCount:number}){
 return JSON.stringify({captureMode,captureConfirmed,segments,photo,photoIndex,photoCount});
}

export function utf8ByteLength(value:string){return new TextEncoder().encode(value).byteLength;}

export function assertPhotoPayloadFits(payload:string,photoIndex:number){
 if(utf8ByteLength(payload)>MAX_ANALYZE_REQUEST_BYTES)throw new PhotoAnalysisError(`Photo ${photoIndex+1} is too large to analyze safely. Replace it with a smaller JPEG or crop unused background while keeping the SKU labels clear.`);
}

export function parsePhotoAnalysisResponse(response:ResponseStatus,bodyText:string,photoIndex:number):PhotoAnalysisResult{
 let data:any=null;
 try{data=bodyText?JSON.parse(bodyText):null;}catch{}
 if(response.status===413)throw new PhotoAnalysisError(`Photo ${photoIndex+1} is too large for the server. Replace it with a smaller JPEG or crop unused background while keeping the SKU labels clear.`,data?.metrics||null);
 if(!data||typeof data!=='object'){
  const detail=response.status?` (HTTP ${response.status}${response.statusText?` ${response.statusText}`:''})`:'';
  throw new PhotoAnalysisError(`Photo ${photoIndex+1} received an unexpected server response${detail}. No delivery conclusion was made.`);
 }
 if(!response.ok)throw new PhotoAnalysisError(typeof data.error==='string'?data.error:`Photo ${photoIndex+1} could not be analyzed. No delivery conclusion was made.`,data.metrics||null);
 if(!Array.isArray(data.photoEvidence)||!data.metrics)throw new PhotoAnalysisError(`Photo ${photoIndex+1} returned an incomplete analysis response. No delivery conclusion was made.`,data.metrics||null);
 return data as PhotoAnalysisResult;
}

const finite=(value:unknown)=>Number.isFinite(Number(value));

export function aggregateAnalysisMetrics(metricsValues:Metrics[],totalMs:number,pdfMs:number,success=true){
 const attempted=metricsValues.filter(metrics=>Number(metrics.attempts||0)>0);
 const costUSD=attempted.length&&attempted.every(metrics=>finite(metrics.costUSD))?attempted.reduce((sum,metrics)=>sum+Number(metrics.costUSD),0):null;
 const assumptions=[...new Set(metricsValues.map(metrics=>metrics.pricingAssumptions).filter((value):value is string=>typeof value==='string'&&Boolean(value)))];
 const models=[...new Set(metricsValues.map(metrics=>metrics.model).filter((value):value is string=>typeof value==='string'&&Boolean(value)))];
 return {
  elapsedMs:metricsValues.reduce((sum,metrics)=>sum+Number(metrics.elapsedMs||0),0),totalMs,pdfMs,success,
  model:models.length===1?models[0]:models.join(', '),
  inputTokens:metricsValues.reduce((sum,metrics)=>sum+Number(metrics.inputTokens||0),0),
  outputTokens:metricsValues.reduce((sum,metrics)=>sum+Number(metrics.outputTokens||0),0),
  cachedTokens:metricsValues.reduce((sum,metrics)=>sum+Number(metrics.cachedTokens||0),0),
  attempts:metricsValues.reduce((sum,metrics)=>sum+Number(metrics.attempts||0),0),costUSD,
  pricingAssumptions:assumptions.length===1?assumptions[0]:assumptions.join(' ')
 };
}

export function combinePhotoAnalysis(rows:any[],results:PhotoAnalysisResult[],totalMs:number,pdfMs:number){
 const photoEvidence=results.flatMap(result=>result.photoEvidence);
 return {...reconcile(rows,photoEvidence),metrics:aggregateAnalysisMetrics(results.map(result=>result.metrics),totalMs,pdfMs,true)};
}

export function measuredFailureCost(results:PhotoAnalysisResult[],errors:unknown[]){
 const metrics=[...results.map(result=>result.metrics),...errors.map(error=>error instanceof PhotoAnalysisError?error.metrics:null).filter((value):value is Metrics=>Boolean(value))];
 return metrics.reduce((sum,item)=>finite(item.costUSD)?sum+Number(item.costUSD):sum,0);
}
