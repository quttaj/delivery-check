import test from 'node:test';
import assert from 'node:assert/strict';
import {logDeduplication,logFinalSkuCounts,logOccurrenceStage} from '../lib/sku-diagnostics';

const occurrence={occurrenceRef:'T1',observedSku:'BM-FM-35-0500',textBox:{x:.1,y:.2,w:.2,h:.04},apiKey:'sk-secret',image_url:'data:image/jpeg;base64,secret'};

test('developer diagnostics expose pipeline stages without arbitrary or secret fields',()=>{
 const lines:string[]=[];const sink=(line:string)=>lines.push(line),context={traceId:'trace-1',photoIndex:0};
 logOccurrenceStage(true,context,'raw_model_occurrences',[occurrence],sink);
 logOccurrenceStage(true,context,'validated_occurrences',[occurrence],sink);
 logDeduplication(true,context,[occurrence],[{removed:{...occurrence,occurrenceRef:'T2'},keptOccurrenceRef:'T1',reason:'Near-identical text region.'}],sink);
 logFinalSkuCounts(true,'trace-1',[{attributes:[{field:'sku',observed:'BM-FM-35-0500'}]},{attributes:[{field:'sku',observed:'BM-FM-35-0500'}]}],sink);
 assert.equal(lines.length,4);
 for(const stage of ['raw_model_occurrences','validated_occurrences','deduplication','final_sku_counts'])assert.ok(lines.some(line=>line.includes(`\"stage\":\"${stage}\"`)));
 assert.ok(lines.some(line=>line.includes('\"count\":2')));
 assert.equal(lines.join('\n').includes('sk-secret'),false);
 assert.equal(lines.join('\n').includes('base64,secret'),false);
});

test('developer diagnostics are silent unless explicitly enabled',()=>{
 const lines:string[]=[];
 logOccurrenceStage(false,{traceId:'trace-2'},'raw_model_occurrences',[occurrence],line=>lines.push(line));
 assert.deepEqual(lines,[]);
});
