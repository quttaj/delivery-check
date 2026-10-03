import test from 'node:test';
import assert from 'node:assert/strict';
import {photoExtraction} from '../lib/schema';

const textBox={x:.1,y:.2,w:.18,h:.04};
const observation=(occurrenceRef:string,observedSku='BM-FM-35-0500',x=.1)=>({occurrenceRef,observedSku,textBox:{...textBox,x}});

test('response validation accepts separate readable occurrences with the same SKU',()=>{
 const parsed=photoExtraction.parse({observations:[observation('T1'),observation('T2','BM-FM-35-0500',.6)]});
 assert.equal(parsed.observations.length,2);
 assert.deepEqual(parsed.observations.map(item=>item.observedSku),['BM-FM-35-0500','BM-FM-35-0500']);
});

test('response validation rejects duplicate occurrence references',()=>{
 const duplicate=photoExtraction.safeParse({observations:[observation('T1'),observation('T1','BM-FM-35-0500',.6)]});
 assert.equal(duplicate.success,false);
});

test('response validation rejects empty or boxless observations',()=>{
 assert.equal(photoExtraction.safeParse({observations:[observation('T1','')]}).success,false);
 assert.equal(photoExtraction.safeParse({observations:[{occurrenceRef:'T2',observedSku:'BM-FM-35-0500'}]}).success,false);
});
