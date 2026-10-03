import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicateModelEvidence,evidenceBoxForObservation,normalizeModelEvidence} from '../lib/photo-evidence';

const observation=(occurrenceRef:string,x=.2,changes:Record<string,unknown>={})=>({
 occurrenceRef,observedSku:'BM-FM-35-0500',textBox:{x,y:.58,w:.16,h:.05},...changes
});

test('normalization preserves all model-returned occurrences for validation and diagnostics',()=>{
 const normalized=normalizeModelEvidence({observations:[observation('T1'),observation('T2',.202)]});
 assert.deepEqual(normalized.observations.map((item:any)=>item.occurrenceRef),['T1','T2']);
});

test('near-identical duplicate SKU regions are removed with an auditable reason',()=>{
 const normalized=normalizeModelEvidence({observations:[
  observation('T1'),
  observation('T2',.202,{textBox:{x:.202,y:.581,w:.159,h:.05}})
 ]});
 const result=deduplicateModelEvidence(normalized);
 assert.deepEqual(result.evidence.observations.map((item:any)=>item.occurrenceRef),['T1']);
 assert.equal(result.removed.length,1);
 assert.equal(result.removed[0].keptOccurrenceRef,'T1');
 assert.match(result.removed[0].reason,/near-identical text region.*IoU/i);
});

test('nearby repeated labels remain separate even when their boxes overlap',()=>{
 const normalized=normalizeModelEvidence({observations:[observation('T1',.2),observation('T2',.24)]});
 const result=deduplicateModelEvidence(normalized);
 assert.equal(result.evidence.observations.length,2);
 assert.equal(result.removed.length,0);
});

test('different SKU strings are never deduplicated by region alone',()=>{
 const normalized=normalizeModelEvidence({observations:[observation('T1'),observation('T2',.202,{observedSku:'BM-FM-15-0500'})]});
 assert.equal(deduplicateModelEvidence(normalized).evidence.observations.length,2);
});

test('evidence uses a clamped normalized text region',()=>{
 const normalized=normalizeModelEvidence({observations:[observation('T1',.9,{textBox:{x:.9,y:.95,w:.5,h:.4}})]});
 const box=evidenceBoxForObservation(normalized.observations[0]);
 assert.equal(box.x,.9);
 assert.equal(box.y,.95);
 assert.ok(Math.abs(box.w-.1)<1e-12);
 assert.ok(Math.abs(box.h-.05)<1e-12);
 assert.ok(box.x+box.w<=1&&box.y+box.h<=1);
});
