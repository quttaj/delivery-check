import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/analyze/route';
import {createPhotoAnalysisPayload} from '../lib/photo-analysis';
import {MAX_ANALYZE_REQUEST_BYTES} from '../lib/image-preparation';

const s=(id:number,text:string,x:number,y:number)=>({id,text,x,y,w:.08,h:.02});
const segments=[
 s(1,'Row',.05,.2),s(2,'Product',.2,.2),s(3,'SKU',.6,.2),s(4,'Quantity',.82,.2),
 s(5,'1',.05,.26),s(6,'Fresh Milk',.2,.26),s(7,'BM-FM-35-0500',.6,.26),s(8,'1',.82,.26)
];
const originalFetch=globalThis.fetch;
const keyName='OPENAI_'+'API_KEY';
const originalKey=process.env[keyName];
const originalModel=process.env.OPENAI_MODEL;

test.afterEach(()=>{
 globalThis.fetch=originalFetch;
 if(originalKey===undefined)delete process.env[keyName];else process.env[keyName]=originalKey;
 if(originalModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=originalModel;
});

test('one application request makes one mocked AI call for its indexed photograph',async()=>{
 process.env[keyName]='offline';
 delete process.env.OPENAI_MODEL;
 let calls=0,openAiBody:any;
 globalThis.fetch=async(_input,init)=>{
  calls+=1;openAiBody=JSON.parse(String(init?.body));
  const extraction={observations:[{occurrenceRef:'T1',observedSku:'BM-FM-35-0500',textBox:{x:.1,y:.2,w:.2,h:.04}}]};
  return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(extraction)}]}],usage:{input_tokens:1000,output_tokens:100,input_tokens_details:{cached_tokens:0}}}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const payload=createPhotoAnalysisPayload({captureMode:'parts',captureConfirmed:true,segments,photo:{name:'third.jpg',data:'data:image/jpeg;base64,AAAA'},photoIndex:2,photoCount:3});
 const response=await POST(new Request('http://localhost/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:payload}));
 const data:any=await response.json();
 assert.equal(response.status,200);
 assert.equal(calls,1);
 assert.equal(openAiBody.model,'gpt-5.4-mini');
 assert.equal(openAiBody.input[0].content.filter((item:any)=>item.type==='input_image').length,1);
 assert.match(openAiBody.instructions,/strict SKU-FIRST text-reading task/);
 assert.equal(data.photoEvidence[0].photoIndex,2);
 assert.equal(data.photoEvidence[0].unitId,'P3-T1');
 assert.equal(data.metrics.attempts,1);
 assert.ok(data.metrics.costUSD>0);
});

test('the route rejects an oversized individual request before any AI call',async()=>{
 process.env[keyName]='offline';
 let calls=0;globalThis.fetch=async()=>{calls+=1;throw Error('must not be called');};
 const body='A'.repeat(MAX_ANALYZE_REQUEST_BYTES+1);
 const response=await POST(new Request('http://localhost/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body}));
 const data:any=await response.json();
 assert.equal(response.status,413);
 assert.match(data.error,/photograph is too large/i);
 assert.equal(calls,0);
});
