import test from 'node:test';
import assert from 'node:assert/strict';
import {matchSku,normalizeSku} from '../lib/sku-match.mjs';

const rows=[
 {id:'1',sku:'SS-SC-16-0200'},
 {id:'2',sku:'GH-CB-82-0200'}
];

test('normalizes printed separators without changing identity',()=>assert.equal(normalizeSku('ss sc-16 0200'),'SSSC160200'));
test('exact SKU selects its document row',()=>assert.deepEqual(matchSku(rows,'SS-SC-16-0200'),{row:rows[0],status:'matched'}));
test('same product-family SKU with a changed variant is a mismatch',()=>assert.deepEqual(matchSku(rows,'SS-SC-20-0200'),{row:rows[0],status:'mismatch'}));
test('unrelated SKU is a standalone unexpected item',()=>assert.deepEqual(matchSku(rows,'BM-FM-35-0500'),{row:null,status:'unexpected'}));
test('ambiguous family SKU is not forced onto a row',()=>{const ambiguous=[...rows,{id:'3',sku:'SS-SC-18-0200'}];assert.equal(matchSku(ambiguous,'SS-SC-20-0200').status,'unexpected');});
test('hidden SKU stays unreadable',()=>assert.equal(matchSku(rows,'').status,'unreadable'));
