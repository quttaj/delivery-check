import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_ANALYZE_REQUEST_BYTES} from '../lib/image-preparation';
import {assertPhotoPayloadFits,combinePhotoAnalysis,createPhotoAnalysisPayload,measuredFailureCost,parsePhotoAnalysisResponse,PhotoAnalysisError} from '../lib/photo-analysis';

const sku='BM-FM-35-0500';
const row=(quantity:number)=>({id:'1',description:'Fresh Milk',quantity,sourceIds:[1],sku,unit:'pc'});
const evidence=(photoIndex:number)=>({unitId:`P${photoIndex+1}-T1`,photoIndex,rowId:'1',box:{x:.1,y:.2,w:.2,h:.04},reason:'Complete printed SKU occurrence.',attributes:[{field:'sku',expected:sku,observed:sku,status:'matched'}]});
const result=(photoIndex:number,costUSD=.001)=>({
 photoEvidence:[evidence(photoIndex)],
 metrics:{elapsedMs:100+photoIndex,model:'gpt-5.4-mini',inputTokens:1000,outputTokens:100,cachedTokens:0,attempts:1,costUSD,pricingAssumptions:'gpt-5.4-mini test rates'}
});

test('single-photo analysis produces the existing confirmed result',()=>{
 const combined=combinePhotoAnalysis([row(1)],[result(0)],250,12);
 assert.equal(combined.rows[0].status,'matched');
 assert.equal(combined.rows[0].count,1);
 assert.equal(combined.metrics.attempts,1);
 assert.equal(combined.metrics.totalMs,250);
});

test('two non-overlapping photos count identical SKUs separately and keep photo references',()=>{
 const combined=combinePhotoAnalysis([row(2)],[result(0),result(1)],400,15);
 assert.equal(combined.rows[0].count,2);
 assert.equal(combined.rows[0].status,'matched');
 assert.deepEqual(combined.rows[0].evidence.map((item:any)=>item.photoIndex),[0,1]);
 assert.equal(combined.metrics.attempts,2);
 assert.equal(combined.metrics.inputTokens,2000);
 assert.equal(combined.metrics.elapsedMs,201);
 assert.equal(combined.metrics.totalMs,400);
 assert.equal(combined.metrics.costUSD,.002);
});

test('three photo results combine into one delivery report',()=>{
 const combined=combinePhotoAnalysis([row(3)],[result(0),result(1),result(2)],500,18);
 assert.equal(combined.rows[0].count,3);
 assert.deepEqual(combined.rows[0].evidence.map((item:any)=>item.unitId),['P1-T1','P2-T1','P3-T1']);
 assert.equal(combined.metrics.attempts,3);
 assert.equal(combined.metrics.costUSD,.003);
});

test('each browser payload contains one photograph and is measured with UTF-8 encoding overhead',()=>{
 const payload=createPhotoAnalysisPayload({captureMode:'parts',captureConfirmed:true,segments:[{id:1,text:'Mléko'}],photo:{name:'photo.jpg',data:'data:image/jpeg;base64,AAAA'},photoIndex:1,photoCount:3});
 const parsed=JSON.parse(payload);
 assert.equal(parsed.photo.name,'photo.jpg');
 assert.equal('photos' in parsed,false);
 assert.equal(parsed.photoIndex,1);
 assert.equal(parsed.photoCount,3);
 assert.doesNotThrow(()=>assertPhotoPayloadFits(payload,1));
});

test('an individually oversized photograph is rejected with a clear message before upload',()=>{
 const oversized=JSON.stringify({photo:{data:`data:image/jpeg;base64,${'A'.repeat(MAX_ANALYZE_REQUEST_BYTES)}`}});
 assert.throws(()=>assertPhotoPayloadFits(oversized,2),/Photo 3 is too large.*smaller JPEG.*crop unused background/i);
});

test('plain-text 413 and other non-JSON responses become understandable errors',()=>{
 assert.throws(()=>parsePhotoAnalysisResponse({ok:false,status:413,statusText:'Payload Too Large'},'Request Entity Too Large',1),/Photo 2 is too large for the server/i);
 assert.throws(()=>parsePhotoAnalysisResponse({ok:false,status:502,statusText:'Bad Gateway'},'<html>gateway error</html>',0),/unexpected server response \(HTTP 502 Bad Gateway\)/i);
});

test('measurable costs from completed and failed paid calls are retained',()=>{
 const failure=new PhotoAnalysisError('Validation failed',{attempts:1,costUSD:.002});
 assert.equal(measuredFailureCost([result(0,.001)],[failure]),.003);
});
