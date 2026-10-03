import test from 'node:test';
import assert from 'node:assert/strict';
import {photoExtraction} from '../lib/schema';
import {deduplicateModelEvidence,normalizeModelEvidence,evidenceBoxForObservation} from '../lib/photo-evidence';
import {matchSku} from '../lib/sku-match.mjs';
import {reconcile} from '../lib/reconcile.mjs';

type MockOccurrence={occurrenceRef:string;observedSku:string;textBox:{x:number;y:number;w:number;h:number}};
const milk={id:'1',description:'Fresh Milk',quantity:3,sourceIds:[1],sku:'BM-FM-35-0500',unit:'pc'};
const occurrence=(occurrenceRef:string,x:number,sku=milk.sku,changes:Partial<MockOccurrence['textBox']>={}):MockOccurrence=>({
 occurrenceRef,observedSku:sku,textBox:{x,y:.4,w:.12,h:.04,...changes}
});

function report(rows:any[],mockedAiResponse:{observations:MockOccurrence[]}){
 const validated=photoExtraction.parse(normalizeModelEvidence(mockedAiResponse));
 const deduplicated=deduplicateModelEvidence(validated);
 const extraction=deduplicated.evidence;
 const observations=extraction.observations.map((item:any)=>{
  const matched=matchSku(rows,item.observedSku),row=matched.row;
  return {unitId:`P1-${item.occurrenceRef}`,photoIndex:0,rowId:row?.id||null,box:evidenceBoxForObservation(item),reason:'Complete printed SKU occurrence.',request:'',attributes:[{field:'sku',expected:row?.sku||'',observed:item.observedSku,status:matched.status}]};
 });
 return {extraction,removed:deduplicated.removed,result:reconcile(rows,observations)};
}

test('three overlapping identical packages with one readable SKU confirm exactly one',()=>{
 const {result}=report([milk],{observations:[occurrence('T1',.42)]});
 assert.equal(result.rows[0].count,1);
 assert.equal(result.rows[0].status,'partial');
 assert.match(result.rows[0].reason,/remainder is unverified, not missing/i);
});

test('two independently readable occurrences of the same SKU count twice',()=>{
 const expected={...milk,quantity:2};
 const {result}=report([expected],{observations:[occurrence('T1',.12),occurrence('T2',.62)]});
 assert.equal(result.rows[0].count,2);
 assert.equal(result.rows[0].status,'matched');
});

test('two obscured copies are omitted instead of inferred or confirmed',()=>{
 const {result}=report([{...milk,quantity:2}],{observations:[]});
 assert.equal(result.rows[0].count,0);
 assert.equal(result.rows[0].status,'unverified');
 assert.match(result.rows[0].reason,/not proof.*not delivered/i);
});

test('one unexpected readable SKU is reported as unexpected',()=>{
 const {result}=report([milk],{observations:[occurrence('T1',.2,'GH-CC-45-0250')]});
 assert.equal(result.unexpected.length,1);
 assert.equal(result.unexpected[0].sku,'GH-CC-45-0250');
 assert.equal(result.unexpected[0].status,'unexpected');
});

test('more readable occurrences than ordered reports excess quantity',()=>{
 const expected={...milk,quantity:1};
 const {result}=report([expected],{observations:[occurrence('T1',.1),occurrence('T2',.6)]});
 assert.equal(result.rows[0].count,2);
 assert.equal(result.rows[0].status,'extra');
});

test('nearby repeated labels remain separate occurrences',()=>{
 const expected={...milk,quantity:2};
 const {extraction,result}=report([expected],{observations:[occurrence('T1',.1),occurrence('T2',.17)]});
 assert.equal(extraction.observations.length,2);
 assert.equal(result.rows[0].count,2);
});

test('duplicate observations of the same physical text region count once',()=>{
 const expected={...milk,quantity:1};
 const {extraction,removed,result}=report([expected],{observations:[occurrence('T1',.1),occurrence('T2',.102,undefined,{y:.401,w:.119,h:.04})]});
 assert.equal(extraction.observations.length,1);
 assert.equal(removed.length,1);
 assert.equal(result.rows[0].count,1);
 assert.equal(result.rows[0].status,'matched');
});
